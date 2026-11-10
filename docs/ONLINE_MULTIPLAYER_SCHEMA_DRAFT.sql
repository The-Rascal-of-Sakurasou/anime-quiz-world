-- Anime Quiz World: proposed multiplayer schema (DESIGN DRAFT ONLY)
-- DO NOT RUN AGAINST PRODUCTION.
-- Review this with the matching Edge Functions and test on an isolated database first.
--
-- Security model:
-- * All match records and answer keys live in the non-exposed private schema.
-- * Browser clients do not receive table grants and never submit scores/correctness.
-- * Edge Functions verify the caller's JWT, then perform server-side operations with
--   the service-role client. Never ship the service-role key to the browser.
-- * Realtime Broadcast/Presence is private and membership-gated.

create schema if not exists private;

create table private.aqw_match_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code_hash text not null unique,
  host_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'waiting'
    check (status in ('waiting', 'in_progress', 'completed', 'cancelled')),
  max_players smallint not null default 4 check (max_players between 2 and 8),
  question_count smallint not null default 10 check (question_count between 5 and 20),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  started_at timestamptz,
  finished_at timestamptz,
  check (expires_at > created_at)
);

create index aqw_match_rooms_waiting_expiry_idx
  on private.aqw_match_rooms (expires_at)
  where status = 'waiting';

create table private.aqw_match_players (
  match_id uuid not null references private.aqw_match_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  is_ready boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  disconnected_at timestamptz,
  primary key (match_id, user_id)
);

create index aqw_match_players_user_joined_idx
  on private.aqw_match_players (user_id, joined_at desc);

create table private.aqw_match_questions (
  match_id uuid not null references private.aqw_match_rooms(id) on delete cascade,
  question_no smallint not null check (question_no between 1 and 20),
  question_payload jsonb not null,
  -- Keep this column server-side. Never include it in client responses or Realtime payloads.
  correct_option_id text not null,
  opened_at timestamptz not null,
  deadline_at timestamptz not null,
  primary key (match_id, question_no),
  check (deadline_at > opened_at)
);

create table private.aqw_match_answers (
  match_id uuid not null,
  question_no smallint not null,
  user_id uuid not null,
  selected_option_id text not null,
  answered_at timestamptz not null default now(),
  is_correct boolean not null,
  response_ms integer not null check (response_ms >= 0),
  points integer not null default 0 check (points >= 0),
  primary key (match_id, question_no, user_id),
  foreign key (match_id, question_no)
    references private.aqw_match_questions(match_id, question_no) on delete cascade,
  foreign key (match_id, user_id)
    references private.aqw_match_players(match_id, user_id) on delete cascade
);

create table private.aqw_match_results (
  match_id uuid not null references private.aqw_match_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  correct_count smallint not null check (correct_count >= 0),
  total_points integer not null check (total_points >= 0),
  rank smallint not null check (rank >= 1),
  completed_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

-- Defense in depth: no browser role gets direct table access.
alter table private.aqw_match_rooms enable row level security;
alter table private.aqw_match_players enable row level security;
alter table private.aqw_match_questions enable row level security;
alter table private.aqw_match_answers enable row level security;
alter table private.aqw_match_results enable row level security;

revoke all on all tables in schema private from anon, authenticated;
revoke all on all sequences in schema private from anon, authenticated;

-- Realtime authorization helper. The topic format is aqw-match:<match UUID>.
-- It returns true only for an authenticated user who belongs to that match.
create or replace function private.aqw_is_match_member(p_topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and p_topic ~ '^aqw-match:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and exists (
      select 1
      from private.aqw_match_players p
      where p.match_id = substring(p_topic from 11)::uuid
        and p.user_id = (select auth.uid())
    );
$$;

revoke all on function private.aqw_is_match_member(text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.aqw_is_match_member(text) to authenticated;

-- Private Realtime channels only. Realtime messages are transport, not authoritative state.
create policy "AQW match members can receive private events"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and private.aqw_is_match_member(realtime.topic())
);

create policy "AQW match members can send private presence and events"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension in ('broadcast', 'presence')
  and private.aqw_is_match_member(realtime.topic())
);

-- Follow-up implementation must add Edge Functions plus server-only SQL RPC entry points
-- in the exposed public schema. Revoke EXECUTE from PUBLIC, anon, and authenticated;
-- grant EXECUTE only to service_role. Those wrappers must call private implementation
-- functions and must never accept an unverified user ID from the browser.
-- Add operations for:
-- create_room, join_room, set_ready, start_match, submit_answer,
-- get_match_state, finish_match, reconnect, and leave_room.
-- Those operations must verify auth.uid() from the JWT and enforce state transitions.
-- Room codes must be generated with a cryptographically secure random source;
-- store only a keyed hash (HMAC) using a server-side secret, never the raw code.
-- The Edge Function must derive the player ID from the verified JWT, not request JSON.
-- The question payload sent to clients must omit correct_option_id.
-- Scores and rankings must be computed from private answers on the server.
--
-- Before production:
-- 1. Review and apply on a disposable development database.
-- 2. Confirm the Realtime public-access setting is disabled.
-- 3. Verify the Realtime RLS policies against actual private channel subscriptions.
-- 4. Add server operations and automated tests for replayed/late answers, full/expired
--    rooms, non-members, disconnect/reconnect, host departure, and duplicate joins.
-- 5. Run Supabase security advisors.
