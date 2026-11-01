-- Cloud saves for Operation Desert 1973. Run once in the Supabase SQL editor.
create table if not exists public.irts_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.irts_saves enable row level security;
create policy "own row read"   on public.irts_saves for select using (auth.uid() = user_id);
create policy "own row insert" on public.irts_saves for insert with check (auth.uid() = user_id);
create policy "own row update" on public.irts_saves for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
