-- DEV ONLY: Allow all inserts into quotes table for testing
create policy "Allow all inserts for dev" on public.quotes
  for insert with check (true); 