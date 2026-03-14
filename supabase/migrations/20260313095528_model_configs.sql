create table model_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  stl_key text not null,
  name text not null,
  groups jsonb not null default '[]',
  model_rotation float4[] not null default '{0,0,0}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table model_configs enable row level security;

create policy "Users can view own model configs"
  on model_configs for select
  using (auth.uid() = user_id);

create policy "Users can insert own model configs"
  on model_configs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own model configs"
  on model_configs for update
  using (auth.uid() = user_id);

create policy "Users can delete own model configs"
  on model_configs for delete
  using (auth.uid() = user_id);
