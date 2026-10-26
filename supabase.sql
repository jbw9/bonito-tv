-- Paste into Supabase -> SQL Editor -> Run. Safe to run again.

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

-- Launcher jam (see app/js/jam.js and jam/index.html): guests' searches and song picks,
-- answered by the TV in `results`, plus one 'state' row per room with the queue.
-- Each TV has its own random room code (app/js/main.js), which its QR code hands to
-- phones. A request only sees and adds rows of the room in its x-room header, so rooms
-- can't be listed and a phone reaches only the TV it scanned.
create table if not exists public.jam (
  id bigint generated always as identity primary key,
  code text not null check (char_length(code) between 4 and 8),
  kind text not null,
  name text check (char_length(name) <= 24),
  query text not null check (char_length(query) between 1 and 200),
  title text check (char_length(title) <= 200),
  results jsonb,
  created_at timestamptz not null default now()
);
create index if not exists jam_code_id on public.jam (code, id);
alter table public.jam drop constraint if exists jam_kind_check;
alter table public.jam add constraint jam_kind_check check (kind in ('search', 'add', 'edit', 'state'));
alter table public.jam enable row level security;
drop policy if exists "jam is shared" on public.jam;
drop policy if exists "jam is per room" on public.jam;
create policy "jam is per room" on public.jam for all to anon
  using (code = current_setting('request.headers', true)::json ->> 'x-room')
  with check (code = current_setting('request.headers', true)::json ->> 'x-room');
-- Read, add and answer only. Requests are answered within seconds, so they're cleared
-- after a day; each room's 'state' row stays.
revoke all on public.jam from anon;
grant select, insert, update on public.jam to anon;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('jam-cleanup', '17 * * * *', $$delete from public.jam where kind <> 'state' and created_at < now() - interval '1 day'$$);

-- Ideas board on the website (index.html): anyone can post an idea and vote for one.
-- Votes only go up, one at a time, through vote_idea. To take down spam, set `hidden`
-- in the Table Editor.
create table if not exists public.ideas (
  id bigint generated always as identity primary key,
  text text not null check (char_length(text) between 3 and 280),
  name text check (char_length(name) <= 40),
  votes integer not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.ideas enable row level security;
drop policy if exists "ideas are public" on public.ideas;
create policy "ideas are public" on public.ideas for select to anon using (not hidden);
drop policy if exists "anyone can post an idea" on public.ideas;
create policy "anyone can post an idea" on public.ideas for insert to anon
  with check (votes = 0 and not hidden and created_at > now() - interval '1 minute');
revoke all on public.ideas from anon;
grant select, insert on public.ideas to anon;
create or replace function public.vote_idea(idea bigint) returns integer
  language sql security definer set search_path = public as $$
  update public.ideas set votes = votes + 1 where id = idea and not hidden returning votes;
$$;
revoke all on function public.vote_idea(bigint) from public;
grant execute on function public.vote_idea(bigint) to anon;
