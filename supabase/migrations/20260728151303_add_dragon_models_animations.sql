alter table public.dragon_models
  add column animations jsonb not null default '{}'::jsonb;
