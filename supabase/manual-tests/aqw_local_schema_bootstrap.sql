-- LOCAL TEST FIXTURE ONLY.
-- The production database has this table, but its original creation SQL is not
-- present in the repository's tracked migration history. This file is injected
-- into a temporary CI checkout before the dependent migration is replayed.
-- Never apply this fixture to a hosted or production database.

create schema if not exists private;

create table if not exists private.aqw_player_stat_runs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid not null,
  correct_count integer not null check (correct_count >= 0),
  question_count integer not null,
  xp_earned integer not null check (xp_earned >= 0),
  created_at timestamptz not null default now(),
  question_results jsonb not null default '[]'::jsonb,
  constraint aqw_player_stat_runs_pkey primary key (user_id, run_id),
  constraint aqw_player_stat_runs_check check (question_count >= correct_count and question_count > 0),
  constraint aqw_player_stat_runs_question_results_check
    check (jsonb_typeof(question_results) = 'array' and jsonb_array_length(question_results) <= 10000)
);

alter table private.aqw_player_stat_runs enable row level security;
revoke all on table private.aqw_player_stat_runs from public, anon, authenticated;

drop policy if exists aqw_player_stat_runs_deny_client_access on private.aqw_player_stat_runs;
create policy aqw_player_stat_runs_deny_client_access
on private.aqw_player_stat_runs
for all to anon, authenticated
using (false)
with check (false);

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
