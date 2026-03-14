alter table model_configs alter column user_id drop not null;

drop policy "Users can insert own model configs" on model_configs;
drop policy "Users can update own model configs" on model_configs;
drop policy "Users can delete own model configs" on model_configs;

create policy "Anyone can insert model configs"
  on model_configs for insert
  with check (true);

create policy "Anyone can update model configs"
  on model_configs for update
  using (true);

create policy "Anyone can delete model configs"
  on model_configs for delete
  using (true);
