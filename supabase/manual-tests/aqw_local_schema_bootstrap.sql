-- LOCAL TEST FIXTURE ONLY.
-- The production database has this table, but its original creation SQL is not
-- present in the repository's tracked migration history. This file is injected
-- into a temporary CI checkout before the dependent migration is replayed.
-- Never apply this fixture to a hosted or production database.

create schema if not exists private;

-- Column exists in the hosted profile schema but its original migration is not tracked.
-- Keep this compatibility addition confined to the disposable local test fixture.
alter table public.profiles
  add column if not exists leaderboard_enabled boolean not null default true;

create table if not exists private.aqw_player_stat_runs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid not null,
  correct_count integer not null check (correct_count >= 0),
  question_count integer not null,
  xp_earned integer not null check (xp_earned >= 0),
  created_at timestamptz not null default now(),
  constraint aqw_player_stat_runs_pkey primary key (user_id, run_id),
  constraint aqw_player_stat_runs_check check (question_count >= correct_count and question_count > 0)
);

alter table private.aqw_player_stat_runs enable row level security;
revoke all on table private.aqw_player_stat_runs from public, anon, authenticated;

-- The tracked feature migration creates the deny-all policy after this
-- baseline fixture is injected. Do not create it here, or replay duplicates it.

-- Public aggregate table present in production but absent from tracked migrations.
create table if not exists public.aqw_player_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_xp bigint not null default 0 check (total_xp >= 0),
  total_runs bigint not null default 0 check (total_runs >= 0),
  total_correct bigint not null default 0 check (total_correct >= 0),
  total_questions bigint not null default 0,
  updated_at timestamptz not null default now(),
  accuracy_rate numeric generated always as (
    case
      when total_questions > 0 then total_correct::numeric / total_questions::numeric
      else 0::numeric
    end
  ) stored
);

alter table public.aqw_player_stats enable row level security;
revoke all on table public.aqw_player_stats from public, anon, authenticated;

drop policy if exists aqw_player_stats_deny_client_access on public.aqw_player_stats;
create policy aqw_player_stats_deny_client_access
on public.aqw_player_stats
for all to anon, authenticated
using (false)
with check (false);


-- Production-only legacy RPC signatures are not represented in the tracked
-- migration history. These inert local placeholders let the privilege-hardening
-- migration replay against a disposable database; they are never deployed.
create or replace function public.reset_aqw_player_records()
returns jsonb language sql as $$ select '{}'::jsonb $$;

create or replace function public.set_aqw_leaderboard_enabled(boolean)
returns boolean language sql as $$ select false $$;

-- Matching private helper signatures are also present in the hosted project,
-- but their original definitions are not tracked in the migration history.
-- These inert local stubs allow the later permission migration to replay.
create or replace function private.reset_aqw_player_records()
returns jsonb language sql as $$ select '{}'::jsonb $$;

create or replace function private.set_aqw_leaderboard_enabled(boolean)
returns boolean language sql as $$ select false $$;

create or replace function private.submit_aqw_player_run(uuid, integer, integer, integer)
returns jsonb language sql as $$ select '{}'::jsonb $$;

-- Four-argument legacy overload referenced by the privilege migration.
create or replace function public.submit_aqw_player_run(uuid, integer, integer, integer)
returns jsonb language sql as $$ select '{}'::jsonb $$;
