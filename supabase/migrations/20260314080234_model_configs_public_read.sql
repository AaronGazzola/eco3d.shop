drop policy "Users can view own model configs" on model_configs;

create policy "Anyone can view model configs"
  on model_configs for select
  using (true);
