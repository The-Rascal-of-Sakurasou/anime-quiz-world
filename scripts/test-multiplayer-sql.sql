\set ON_ERROR_STOP on

-- Disposable PostgreSQL compatibility harness for the AQW multiplayer SQL draft.
-- This is NOT a Supabase project and does not modify production.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end
$$;

create schema auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

create schema realtime;
create table realtime.messages (
  id bigint generated always as identity primary key,
  extension text not null,
  topic text not null
);
alter table realtime.messages enable row level security;
grant select, insert on realtime.messages to authenticated;
create or replace function realtime.topic()
returns text
language sql
stable
as $$
  select current_setting('realtime.topic', true)
$$;
grant usage on schema realtime to authenticated;
grant execute on function realtime.topic() to authenticated;

\ir ../docs/ONLINE_MULTIPLAYER_SCHEMA_DRAFT.sql

insert into auth.users(id) values
  ('10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002');

insert into private.aqw_question_bank(category, question_payload, correct_option_id)
select
  'integration-test',
  jsonb_build_object(
    'prompt', 'Integration question ' || n,
    'options', jsonb_build_array(
      jsonb_build_object('id', 'a', 'text', 'Correct'),
      jsonb_build_object('id', 'b', 'text', 'Incorrect')
    )
  ),
  'a'
from generate_series(1, 5) as n;

-- Invalid bank rows must be rejected by the trigger.
do $$
begin
  begin
    insert into private.aqw_question_bank(category, question_payload, correct_option_id)
    values (
      'integration-test',
      '{"prompt":"Invalid question","options":[{"id":"a","text":"Only option"}]}'::jsonb,
      'missing'
    );
    raise exception 'Invalid question bank row was unexpectedly accepted';
  exception
    when raise_exception then
      if sqlerrm = 'Invalid question bank row was unexpectedly accepted' then raise; end if;
  end;
end
$$;

set role authenticated;

do $$
begin
  begin
    perform public.aqw_match_dispatch(
      'get_match_state',
      '10000000-0000-4000-8000-000000000001',
      '{}'::jsonb
    );
    raise exception 'Authenticated role unexpectedly executed the privileged dispatcher';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.aqw_match_rate_limit('join_room', '10000000-0000-4000-8000-000000000001');
    raise exception 'Authenticated role unexpectedly executed the privileged rate limiter';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

reset role;

set role service_role;

do $$
declare
  v_match_id uuid;
  v_result jsonb;
  v_state jsonb;
  v_question_no integer;
  v_n integer;
  v_duplicate_rejected boolean := false;
begin
  v_result := public.aqw_match_dispatch(
    'create_room',
    '10000000-0000-4000-8000-000000000001',
    jsonb_build_object(
      'room_code_hash', repeat('a', 64),
      'max_players', 2,
      'question_count', 5,
      'display_name', 'Host'
    )
  );
  v_match_id := (v_result ->> 'match_id')::uuid;
  if v_match_id is null then raise exception 'Room creation returned no match ID'; end if;

  perform public.aqw_match_dispatch(
    'join_room',
    '10000000-0000-4000-8000-000000000002',
    jsonb_build_object('room_code_hash', repeat('a', 64), 'display_name', 'Guest')
  );

  perform public.aqw_match_dispatch(
    'set_ready',
    '10000000-0000-4000-8000-000000000002',
    jsonb_build_object('match_id', v_match_id, 'ready', true)
  );

  begin
    perform public.aqw_match_dispatch(
      'join_room',
      '10000000-0000-4000-8000-000000000003',
      jsonb_build_object('room_code_hash', repeat('a', 64), 'display_name', 'Third')
    );
    raise exception 'Full room unexpectedly accepted another player';
  exception
    when raise_exception then
      if sqlerrm = 'Full room unexpectedly accepted another player' then raise; end if;
  end;

  begin
    perform public.aqw_match_dispatch(
      'start_match',
      '10000000-0000-4000-8000-000000000002',
      jsonb_build_object('match_id', v_match_id)
    );
    raise exception 'Non-host unexpectedly started the match';
  exception
    when raise_exception then
      if sqlerrm = 'Non-host unexpectedly started the match' then raise; end if;
  end;

  perform public.aqw_match_dispatch(
    'start_match',
    '10000000-0000-4000-8000-000000000001',
    jsonb_build_object('match_id', v_match_id)
  );

  perform public.aqw_match_dispatch(
    'leave_room',
    '10000000-0000-4000-8000-000000000002',
    jsonb_build_object('match_id', v_match_id)
  );
  begin
    perform public.aqw_match_dispatch(
      'submit_answer',
      '10000000-0000-4000-8000-000000000002',
      jsonb_build_object('match_id', v_match_id, 'question_no', 1, 'selected_option_id', 'b')
    );
    raise exception 'Disconnected player unexpectedly submitted an answer';
  exception
    when raise_exception then
      if sqlerrm = 'Disconnected player unexpectedly submitted an answer' then raise; end if;
  end;
  perform public.aqw_match_dispatch(
    'reconnect',
    '10000000-0000-4000-8000-000000000002',
    jsonb_build_object('match_id', v_match_id)
  );

  v_state := public.aqw_match_dispatch(
    'get_match_state',
    '10000000-0000-4000-8000-000000000001',
    jsonb_build_object('match_id', v_match_id)
  );
  if v_state ->> 'status' <> 'in_progress' then raise exception 'Match did not start'; end if;
  if (v_state -> 'question' ->> 'question_no')::integer <> 1 then
    raise exception 'First question was not returned';
  end if;
  if (v_state -> 'question' -> 'payload') ? 'correct_option_id' then
    raise exception 'Correct option ID leaked in match state';
  end if;

  -- Option IDs not in the question payload are rejected.
  begin
    perform public.aqw_match_dispatch(
      'submit_answer',
      '10000000-0000-4000-8000-000000000001',
      jsonb_build_object('match_id', v_match_id, 'question_no', 1, 'selected_option_id', 'not-an-option')
    );
    raise exception 'Unknown option ID was unexpectedly accepted';
  exception
    when raise_exception then
      if sqlerrm = 'Unknown option ID was unexpectedly accepted' then raise; end if;
  end;

  -- First answer is accepted; a duplicate answer for the same question is rejected.
  perform public.aqw_match_dispatch(
    'submit_answer',
    '10000000-0000-4000-8000-000000000001',
    jsonb_build_object('match_id', v_match_id, 'question_no', 1, 'selected_option_id', 'a')
  );
  begin
    perform public.aqw_match_dispatch(
      'submit_answer',
      '10000000-0000-4000-8000-000000000001',
      jsonb_build_object('match_id', v_match_id, 'question_no', 1, 'selected_option_id', 'a')
    );
  exception when unique_violation then
    v_duplicate_rejected := true;
  end;
  if not v_duplicate_rejected then raise exception 'Duplicate answer was not rejected'; end if;

  perform public.aqw_match_dispatch(
    'submit_answer',
    '10000000-0000-4000-8000-000000000002',
    jsonb_build_object('match_id', v_match_id, 'question_no', 1, 'selected_option_id', 'b')
  );

  for v_n in 2..5 loop
    perform public.aqw_match_dispatch(
      'submit_answer',
      '10000000-0000-4000-8000-000000000001',
      jsonb_build_object('match_id', v_match_id, 'question_no', v_n, 'selected_option_id', 'a')
    );
    perform public.aqw_match_dispatch(
      'submit_answer',
      '10000000-0000-4000-8000-000000000002',
      jsonb_build_object('match_id', v_match_id, 'question_no', v_n, 'selected_option_id', 'b')
    );
  end loop;

  v_state := public.aqw_match_dispatch(
    'get_match_state',
    '10000000-0000-4000-8000-000000000001',
    jsonb_build_object('match_id', v_match_id)
  );
  if v_state ->> 'status' <> 'completed' then raise exception 'Match did not complete'; end if;
  if v_state -> 'question' <> 'null'::jsonb then raise exception 'Completed match still exposes an active question'; end if;

  -- Ten join-code checks are allowed; the eleventh is denied.
  for v_n in 1..10 loop
    if public.aqw_match_rate_limit('join_room', '10000000-0000-4000-8000-000000000002') is not true then
      raise exception 'Join-code throttle blocked attempt % too early', v_n;
    end if;
  end loop;
  if public.aqw_match_rate_limit('join_room', '10000000-0000-4000-8000-000000000002') is not false then
    raise exception 'Join-code throttle did not block attempt 11';
  end if;

  raise notice 'AQW multiplayer integration flow passed for match %', v_match_id;
end
$$;

reset role;

select id as test_match_id
from private.aqw_match_rooms
where room_code_hash = repeat('a', 64)
\gset

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('realtime.topic', 'aqw-match:' || :'test_match_id', false);

insert into realtime.messages(extension, topic)
values ('presence', 'aqw-match:' || :'test_match_id');

do $$
begin
  begin
    insert into realtime.messages(extension, topic)
    values ('broadcast', 'aqw-match:' || current_setting('realtime.topic'));
    raise exception 'Authenticated client unexpectedly sent a broadcast';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

reset role;

do $$
declare
  v_result_count integer;
begin
  select count(*) into v_result_count
  from private.aqw_match_results
  where match_id = (
    select id from private.aqw_match_rooms where room_code_hash = repeat('a', 64)
  );
  if v_result_count <> 2 then
    raise exception 'Expected two persisted match results, got %', v_result_count;
  end if;
end
$$;

\echo 'AQW multiplayer SQL integration tests passed.'
