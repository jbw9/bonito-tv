-- Heartive profiles: one row per profile, holding its synced library (see movies/assets/js/sync.js).
-- Paste into Supabase -> SQL Editor -> Run. Safe to run again.
create table if not exists public.profiles (
  name text primary key check (char_length(name) between 1 and 24),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles are shared" on public.profiles;
create policy "profiles are shared" on public.profiles for all to anon using (true) with check (true);
-- No delete: the public key can read, add and update profiles, never remove one.
revoke all on public.profiles from anon;
grant select, insert, update on public.profiles to anon;

-- Launcher game leaderboards (see app/js/scores.js): one row per new record.
create table if not exists public.scores (
  id bigint generated always as identity primary key,
  game text not null,
  name text not null check (char_length(name) between 1 and 24),
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);
alter table public.scores drop constraint if exists scores_game_check;
alter table public.scores add constraint scores_game_check check (game in ('flappy', 'dino', 'snake', 'stack'));
create index if not exists scores_game_score on public.scores (game, score desc);
alter table public.scores enable row level security;
drop policy if exists "scores are shared" on public.scores;
create policy "scores are shared" on public.scores for all to anon using (true) with check (true);
-- Read and add only: clear a board from the Supabase dashboard.
revoke all on public.scores from anon;
grant select, insert on public.scores to anon;
