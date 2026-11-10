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

create policy "AQW match members can send private presence"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'presence'
  and private.aqw_is_match_member(realtime.topic())
);


-- ---------------------------------------------------------------------------
-- Server-side question bank and match dispatcher (still DESIGN DRAFT ONLY).
-- Populate aqw_question_bank only through a trusted admin workflow.
-- question_payload shape: {"prompt":"...","options":[{"id":"a","text":"..."}], ...}
-- Do not put answer keys or explanations containing the answer in question_payload.
-- ---------------------------------------------------------------------------

create table private.aqw_question_bank (
  id bigint generated always as identity primary key,
  source_key text not null unique default gen_random_uuid()::text,
  category text not null default 'general',
  question_payload jsonb not null
    check (jsonb_typeof(question_payload) = 'object')
    check (jsonb_typeof(question_payload -> 'options') = 'array')
    check (not (question_payload ? 'correct_option_id')),
  correct_option_id text not null check (char_length(correct_option_id) between 1 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);


create or replace function private.aqw_validate_question_bank_row()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_option jsonb;
  v_seen_ids text[] := array[]::text[];
  v_option_id text;
begin
  if jsonb_typeof(new.question_payload -> 'prompt') is distinct from 'string'
     or coalesce(char_length(trim(new.question_payload ->> 'prompt')), 0) = 0 then
    raise exception 'Question prompt must be a non-empty string';
  end if;

  if jsonb_typeof(new.question_payload -> 'options') is distinct from 'array' then
    raise exception 'Question options must be an array';
  end if;
  if jsonb_array_length(new.question_payload -> 'options') not between 2 and 6 then
    raise exception 'A question must have between 2 and 6 options';
  end if;

  for v_option in
    select item.value
    from jsonb_array_elements(new.question_payload -> 'options') as item(value)
  loop
    if jsonb_typeof(v_option) is distinct from 'object'
       or jsonb_typeof(v_option -> 'id') is distinct from 'string'
       or jsonb_typeof(v_option -> 'text') is distinct from 'string' then
      raise exception 'Every option must have string id and text fields';
    end if;

    v_option_id := trim(v_option ->> 'id');
    if char_length(v_option_id) = 0
       or char_length(v_option_id) > 100
       or coalesce(char_length(trim(v_option ->> 'text')), 0) = 0 then
      raise exception 'Option IDs and text must be non-empty and bounded';
    end if;

    if v_option_id = any(v_seen_ids) then
      raise exception 'Option IDs must be unique within a question';
    end if;
    v_seen_ids := array_append(v_seen_ids, v_option_id);
  end loop;

  if not (new.correct_option_id = any(v_seen_ids)) then
    raise exception 'Correct option ID must exist in the options array';
  end if;

  return new;
end;
$$;

create trigger aqw_validate_question_bank_row
before insert or update of question_payload, correct_option_id
on private.aqw_question_bank
for each row execute function private.aqw_validate_question_bank_row();

alter table private.aqw_question_bank enable row level security;

alter table private.aqw_match_questions
  add column bank_question_id bigint references private.aqw_question_bank(id);
revoke all on all tables in schema private from anon, authenticated;
revoke all on all sequences in schema private from anon, authenticated;
revoke all on table private.aqw_question_bank from service_role;


-- Per-account join-code guessing throttle. This is separate from the match
-- dispatcher so rejected attempts still commit their counter increment.
create table private.aqw_match_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action = 'join_room'),
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  primary key (user_id, action)
);

alter table private.aqw_match_rate_limits enable row level security;
revoke all on table private.aqw_match_rate_limits from anon, authenticated, service_role;

create or replace function public.aqw_match_rate_limit(
  p_action text,
  p_actor_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempts integer;
begin
  if p_actor_id is null or p_action <> 'join_room' then
    raise exception 'Unsupported rate-limit request';
  end if;

  insert into private.aqw_match_rate_limits
    (user_id, action, window_started_at, attempts)
  values (p_actor_id, p_action, now(), 1)
  on conflict (user_id, action) do update
  set attempts = case
        when private.aqw_match_rate_limits.window_started_at < now() - interval '10 minutes'
          then 1
        else private.aqw_match_rate_limits.attempts + 1
      end,
      window_started_at = case
        when private.aqw_match_rate_limits.window_started_at < now() - interval '10 minutes'
          then now()
        else private.aqw_match_rate_limits.window_started_at
      end
  returning attempts into v_attempts;

  return v_attempts <= 10;
end;
$$;

revoke all on function public.aqw_match_rate_limit(text, uuid) from public, anon, authenticated;
grant execute on function public.aqw_match_rate_limit(text, uuid) to service_role;

-- Finalize results using only server-calculated answer rows.
create or replace function private.aqw_finalize_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.aqw_match_results
    (match_id, user_id, correct_count, total_points, rank)
  select
    p_match_id,
    p.user_id,
    count(a.user_id) filter (where a.is_correct)::smallint,
    coalesce(sum(a.points), 0)::integer,
    dense_rank() over (
      order by coalesce(sum(a.points), 0) desc,
               count(a.user_id) filter (where a.is_correct) desc,
               coalesce(sum(a.response_ms), 2147483647) asc
    )::smallint
  from private.aqw_match_players p
  left join private.aqw_match_answers a
    on a.match_id = p.match_id and a.user_id = p.user_id
  where p.match_id = p_match_id
  group by p.user_id;

  update private.aqw_match_rooms
  set status = 'completed', finished_at = now()
  where id = p_match_id and status = 'in_progress';
end;
$$;

-- Advance only after every currently connected/registered player answered,
-- or the server-side deadline elapsed. The next item is selected server-side.
create or replace function private.aqw_advance_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room private.aqw_match_rooms%rowtype;
  v_current private.aqw_match_questions%rowtype;
  v_answer_count integer;
  v_player_count integer;
  v_question_count integer;
  v_next_bank_id bigint;
  v_next_payload jsonb;
  v_next_correct text;
begin
  select * into v_room
  from private.aqw_match_rooms
  where id = p_match_id
  for update;

  if not found or v_room.status <> 'in_progress' then
    return;
  end if;

  select * into v_current
  from private.aqw_match_questions
  where match_id = p_match_id
  order by question_no desc
  limit 1
  for update;

  if not found then return; end if;

  select count(*) into v_player_count
  from private.aqw_match_players where match_id = p_match_id;
  select count(*) into v_answer_count
  from private.aqw_match_answers
  where match_id = p_match_id and question_no = v_current.question_no;

  if v_answer_count < v_player_count and now() < v_current.deadline_at then
    return;
  end if;

  select count(*) into v_question_count
  from private.aqw_match_questions where match_id = p_match_id;

  if v_question_count >= v_room.question_count then
    perform private.aqw_finalize_match(p_match_id);
    return;
  end if;

  select q.id, q.question_payload, q.correct_option_id
    into v_next_bank_id, v_next_payload, v_next_correct
  from private.aqw_question_bank q
  where q.is_active
    and not exists (
      select 1 from private.aqw_match_questions used
      where used.match_id = p_match_id
        and used.bank_question_id = q.id
    )
  order by random()
  limit 1;

  if v_next_payload is null then
    -- Never silently shorten a match: end it and rank the answers actually earned.
    perform private.aqw_finalize_match(p_match_id);
    return;
  end if;

  insert into private.aqw_match_questions
    (match_id, question_no, bank_question_id, question_payload, correct_option_id, opened_at, deadline_at)
  values
    (p_match_id, (v_question_count + 1)::smallint, v_next_bank_id, v_next_payload,
     v_next_correct, now(), now() + interval '20 seconds');
end;
$$;

create or replace function public.aqw_match_dispatch(
  p_action text,
  p_actor_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room private.aqw_match_rooms%rowtype;
  v_player private.aqw_match_players%rowtype;
  v_question private.aqw_match_questions%rowtype;
  v_match_id uuid;
  v_code_hash text;
  v_name text;
  v_ready boolean;
  v_max_players integer;
  v_question_count integer;
  v_count integer;
  v_answer_id text;
  v_correct boolean;
  v_response_ms integer;
  v_points integer;
  v_result jsonb;
begin
  if p_actor_id is null or p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid request';
  end if;

  v_name := left(trim(coalesce(p_payload ->> 'display_name', 'AQW User')), 40);
  if v_name = '' then v_name := 'AQW User'; end if;

  if p_action = 'create_room' then
    v_code_hash := p_payload ->> 'room_code_hash';
    v_max_players := coalesce((p_payload ->> 'max_players')::integer, 4);
    v_question_count := coalesce((p_payload ->> 'question_count')::integer, 10);
    if v_code_hash !~ '^[0-9a-f]{64}$'
       or v_max_players not between 2 and 8
       or v_question_count not between 5 and 20 then
      raise exception 'Invalid room settings';
    end if;

    insert into private.aqw_match_rooms
      (room_code_hash, host_user_id, max_players, question_count)
    values (v_code_hash, p_actor_id, v_max_players, v_question_count)
    returning * into v_room;

    insert into private.aqw_match_players
      (match_id, user_id, display_name, is_ready)
    values (v_room.id, p_actor_id, v_name, true);

    return jsonb_build_object(
      'match_id', v_room.id, 'status', v_room.status,
      'max_players', v_room.max_players, 'question_count', v_room.question_count
    );

  elsif p_action = 'join_room' then
    v_code_hash := p_payload ->> 'room_code_hash';
    if v_code_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid room code'; end if;

    select * into v_room from private.aqw_match_rooms
    where room_code_hash = v_code_hash for update;
    if not found or v_room.status <> 'waiting' or v_room.expires_at <= now() then
      raise exception 'Room not found or no longer available';
    end if;

    select * into v_player from private.aqw_match_players
    where match_id = v_room.id and user_id = p_actor_id;
    if not found then
      select count(*) into v_count from private.aqw_match_players
      where match_id = v_room.id;
      if v_count >= v_room.max_players then raise exception 'Room is full'; end if;
      insert into private.aqw_match_players(match_id, user_id, display_name)
      values (v_room.id, p_actor_id, v_name);
    else
      update private.aqw_match_players
      set display_name = v_name, last_seen_at = now(), disconnected_at = null
      where match_id = v_room.id and user_id = p_actor_id;
    end if;

    return jsonb_build_object('match_id', v_room.id, 'status', v_room.status);

  elsif p_action in ('set_ready', 'start_match', 'submit_answer',
                     'get_match_state', 'reconnect', 'leave_room') then
    v_match_id := (p_payload ->> 'match_id')::uuid;
    select * into v_room from private.aqw_match_rooms
    where id = v_match_id for update;
    if not found then raise exception 'Match not found'; end if;

    select * into v_player from private.aqw_match_players
    where match_id = v_match_id and user_id = p_actor_id for update;
    if not found then raise exception 'You are not a member of this match'; end if;

    if p_action = 'set_ready' then
      if v_room.status <> 'waiting' then raise exception 'Lobby is already closed'; end if;
      update private.aqw_match_players
      set is_ready = coalesce((p_payload ->> 'ready')::boolean, false),
          last_seen_at = now()
      where match_id = v_match_id and user_id = p_actor_id;
      return jsonb_build_object('match_id', v_match_id, 'ready',
        coalesce((p_payload ->> 'ready')::boolean, false));

    elsif p_action = 'start_match' then
      if v_room.host_user_id <> p_actor_id then raise exception 'Only the host can start'; end if;
      if v_room.status <> 'waiting' or v_room.expires_at <= now() then
        raise exception 'Room is no longer available';
      end if;
      select count(*) into v_count from private.aqw_match_players
      where match_id = v_match_id;
      if v_count < 2 then raise exception 'At least two players are required'; end if;
      if exists (select 1 from private.aqw_match_players
                 where match_id = v_match_id and not is_ready) then
        raise exception 'Every player must be ready';
      end if;
      select count(*) into v_count from private.aqw_question_bank where is_active;
      if v_count < v_room.question_count then
        raise exception 'Question bank does not contain enough active questions';
      end if;

      select q.id, q.question_payload, q.correct_option_id
        into v_question.bank_question_id, v_question.question_payload, v_question.correct_option_id
      from private.aqw_question_bank q
      where q.is_active
      order by random() limit 1;
      update private.aqw_match_rooms
      set status = 'in_progress', started_at = now()
      where id = v_match_id;
      insert into private.aqw_match_questions
        (match_id, question_no, bank_question_id, question_payload, correct_option_id, opened_at, deadline_at)
      values (v_match_id, 1, v_question.bank_question_id, v_question.question_payload,
              v_question.correct_option_id, now(), now() + interval '20 seconds');
      return jsonb_build_object('match_id', v_match_id, 'status', 'in_progress');

    elsif p_action = 'submit_answer' then
      if v_room.status <> 'in_progress' then raise exception 'Match is not in progress'; end if;
      if v_player.disconnected_at is not null then
        raise exception 'Player is disconnected; reconnect before answering';
      end if;
      select * into v_question from private.aqw_match_questions
      where match_id = v_match_id
        and question_no = (p_payload ->> 'question_no')::smallint
      for update;
      if not found then raise exception 'Question is not active'; end if;
      if v_question.question_no <> (
        select max(question_no) from private.aqw_match_questions where match_id = v_match_id
      ) then raise exception 'Question is no longer active'; end if;
      if now() > v_question.deadline_at then raise exception 'Answer deadline has passed'; end if;

      v_answer_id := p_payload ->> 'selected_option_id';
      if not exists (
        select 1
        from jsonb_array_elements(v_question.question_payload -> 'options') as option_row(value)
        where option_row.value ->> 'id' = v_answer_id
      ) then raise exception 'Selected option is invalid'; end if;

      v_correct := v_answer_id = v_question.correct_option_id;
      v_response_ms := greatest(0, least(20000,
        (extract(epoch from (now() - v_question.opened_at)) * 1000)::integer));
      v_points := case when v_correct
        then 1000 + (500 * (20000 - v_response_ms) / 20000)
        else 0 end;

      insert into private.aqw_match_answers
        (match_id, question_no, user_id, selected_option_id, is_correct, response_ms, points)
      values (v_match_id, v_question.question_no, p_actor_id, v_answer_id,
              v_correct, v_response_ms, v_points);

      perform private.aqw_advance_match(v_match_id);
      return jsonb_build_object('accepted', true, 'correct', v_correct, 'points', v_points);

    elsif p_action = 'get_match_state' then
      perform private.aqw_advance_match(v_match_id);
      select * into v_room from private.aqw_match_rooms where id = v_match_id;
      select * into v_question from private.aqw_match_questions
      where match_id = v_match_id order by question_no desc limit 1;

      select jsonb_agg(jsonb_build_object(
        'user_id', p.user_id, 'display_name', p.display_name, 'is_ready', p.is_ready,
        'total_points', coalesce(s.total_points, 0),
        'correct_count', coalesce(s.correct_count, 0),
        'has_answered', exists (
          select 1 from private.aqw_match_answers own_answer
          where own_answer.match_id = v_match_id
            and own_answer.question_no = v_question.question_no
            and own_answer.user_id = p.user_id
        ),
        'rank', res.rank
      ) order by coalesce(s.total_points, 0) desc, p.joined_at asc)
      into v_result
      from private.aqw_match_players p
      left join (
        select user_id, sum(points)::integer as total_points,
               count(*) filter (where is_correct)::integer as correct_count
        from private.aqw_match_answers where match_id = v_match_id group by user_id
      ) s on s.user_id = p.user_id
      left join private.aqw_match_results res
        on res.match_id = v_match_id and res.user_id = p.user_id
      where p.match_id = v_match_id;

      return jsonb_build_object(
        'match_id', v_match_id, 'status', v_room.status,
        'players', coalesce(v_result, '[]'::jsonb),
        'question', case when v_room.status = 'in_progress' and v_question.match_id is not null
          then jsonb_build_object(
            'question_no', v_question.question_no,
            'payload', v_question.question_payload,
            'deadline_at', v_question.deadline_at
          ) else null end
      );

    elsif p_action = 'reconnect' then
      if v_player.disconnected_at is not null
         and v_player.disconnected_at < now() - interval '5 minutes' then
        raise exception 'Reconnect window has expired';
      end if;
      update private.aqw_match_players
      set last_seen_at = now(), disconnected_at = null
      where match_id = v_match_id and user_id = p_actor_id;
      return jsonb_build_object('match_id', v_match_id, 'reconnected', true);

    elsif p_action = 'leave_room' then
      if v_room.status = 'waiting' then
        if v_room.host_user_id = p_actor_id then
          update private.aqw_match_rooms set status = 'cancelled' where id = v_match_id;
        end if;
        delete from private.aqw_match_players
        where match_id = v_match_id and user_id = p_actor_id;
      elsif v_room.status = 'in_progress' then
        update private.aqw_match_players
        set disconnected_at = now(), last_seen_at = now()
        where match_id = v_match_id and user_id = p_actor_id;
      end if;
      return jsonb_build_object('match_id', v_match_id, 'left', true);
    end if;
  end if;

  raise exception 'Unsupported action';
end;
$$;

-- The Edge Function is the only intended caller of the public dispatcher.
revoke all on function public.aqw_match_dispatch(text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.aqw_match_dispatch(text, uuid, jsonb) to service_role;
revoke all on function private.aqw_finalize_match(uuid) from public, anon, authenticated, service_role;
revoke all on function private.aqw_advance_match(uuid) from public, anon, authenticated, service_role;

-- Draft-only test checklist (run on a disposable database before deployment):
-- - unauthenticated requests and authenticated direct RPC calls are rejected by grants;
-- - non-members, non-host start, not-ready players, full/expired rooms are rejected;
-- - answer option IDs not present in the payload, duplicate and late answers are rejected;
-- - correct answer keys never appear in get_match_state or Realtime messages;
-- - simultaneous answers and simultaneous start requests serialize correctly;
-- - empty/undersized question bank prevents starting;
-- - disconnect/reconnect window, host departure, room cancellation, and ranking ties work.
