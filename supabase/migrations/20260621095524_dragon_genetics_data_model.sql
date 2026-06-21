-- Dragon genetics data model (Foundation A, OpenSpec: add-dragon-genetics-data-model)
-- Three orthogonal axes: variant (clade) x stage (egg/baby/adult/winged) x color genotype.
-- Genotypes store stable allele ids (never colors); a separate editable allele->filament binding
-- resolves color, so discontinuing a filament is a rebind with zero genotype migration.

create type dragon_stage as enum ('egg', 'baby', 'adult', 'winged');

-- Global, mutable filament supply. Discontinuation flips `available`; rows are never deleted while
-- an allele is bound (the binding fk is `on delete restrict`).
create table filament_colors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hex text not null,
  available boolean not null default true,
  brand text,
  sku text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A clade (e.g. cyber, fire). Owns its roles and genes; carries the print-color ceiling.
create table dragon_variants (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  max_print_colors int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-variant part-class taxonomy (dorsal/belly/eyes/horn), independent of the mechanical rig groups.
create table dragon_roles (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references dragon_variants(id) on delete cascade,
  key text not null,
  name text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, key)
);

-- Per-variant color locus; each gene colors exactly one role (1 gene <-> 1 role for v1).
create table dragon_genes (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references dragon_variants(id) on delete cascade,
  role_id uuid not null references dragon_roles(id) on delete restrict,
  key text not null,
  name text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, key)
);

-- Allele variants of a gene. Carry dominance + roll frequency + the editable filament binding.
create table dragon_alleles (
  id uuid primary key default gen_random_uuid(),
  gene_id uuid not null references dragon_genes(id) on delete cascade,
  filament_color_id uuid not null references filament_colors(id) on delete restrict,
  key text not null,
  name text not null,
  dominance_rank int not null default 0,
  frequency real not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gene_id, key)
);

-- One model per (variant, stage): stage geometry (stl_key + rig groups, same shape as model_configs)
-- plus role_tags mapping each segment id -> a role key of this variant.
create table dragon_models (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references dragon_variants(id) on delete cascade,
  stage dragon_stage not null,
  stl_key text not null,
  groups jsonb not null default '[]',
  role_tags jsonb not null default '{}',
  model_rotation float4[] not null default '{0,0,0}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, stage)
);

-- The persisted individual. genotype: { "<gene_key>": ["<allele_id_a>", "<allele_id_b>"] } (diploid).
create table dragons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  variant_id uuid not null references dragon_variants(id) on delete restrict,
  stage dragon_stage not null default 'egg',
  name text,
  genotype jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS ------------------------------------------------------------------------------------------------

alter table filament_colors enable row level security;
alter table dragon_variants enable row level security;
alter table dragon_roles enable row level security;
alter table dragon_genes enable row level security;
alter table dragon_alleles enable row level security;
alter table dragon_models enable row level security;
alter table dragons enable row level security;

-- Admin-authored definition tables: public read, admin write (is_admin() defined in the auth migration).
do $$
declare
  t text;
begin
  foreach t in array array[
    'filament_colors', 'dragon_variants', 'dragon_roles',
    'dragon_genes', 'dragon_alleles', 'dragon_models'
  ]
  loop
    execute format('create policy %I on %I for select using (true)', t || '_select_all', t);
    execute format('create policy %I on %I for insert to authenticated with check ((select is_admin()))', t || '_insert_admin', t);
    execute format('create policy %I on %I for update to authenticated using ((select is_admin())) with check ((select is_admin()))', t || '_update_admin', t);
    execute format('create policy %I on %I for delete to authenticated using ((select is_admin()))', t || '_delete_admin', t);
  end loop;
end $$;

-- Dragons: owner-scoped.
create policy "dragons_select_own"
  on dragons for select
  to authenticated
  using (auth.uid() = user_id);

create policy "dragons_insert_own"
  on dragons for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "dragons_update_own"
  on dragons for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "dragons_delete_own"
  on dragons for delete
  to authenticated
  using (auth.uid() = user_id);
