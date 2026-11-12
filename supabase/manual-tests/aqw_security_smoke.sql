-- Manual AQW security regression test.
-- Run in the Supabase SQL Editor. All changes are rolled back.
begin;

do $setup$
begin
  perform set_config(
    'aqw_test.owner_id',
    (select user_id::text from private.site_admins limit 1),
    true
  );
end
$setup$;

-- Anonymous users may read only the public leaderboard RPCs.
set local role anon;
do $anon_checks$
declare
  v_count bigint;
begin
  if not has_function_privilege(current_user, 'public.get_aqw_player_leaderboard(text,text)', 'EXECUTE') then
    raise exception 'FAIL: anonymous player leaderboard RPC is not executable';
  end if;
  if not has_function_privilege(current_user, 'public.get_aqw_speed_rush_leaderboard(text)', 'EXECUTE') then
    raise exception 'FAIL: anonymous speed leaderboard RPC is not executable';
  end if;

  select count(*) into v_count from public.get_aqw_player_leaderboard('all', 'xp');
  select count(*) into v_count from public.get_aqw_speed_rush_leaderboard('all');

  if has_function_privilege(current_user, 'public.get_aqw_player_my_rank(text,text)', 'EXECUTE')
     or has_function_privilege(current_user, 'public.get_aqw_speed_rush_my_rank(text)', 'EXECUTE')
     or has_function_privilege(current_user, 'public.submit_aqw_player_run(uuid,integer,integer,integer,jsonb)', 'EXECUTE')
     or has_function_privilege(current_user, 'public.submit_aqw_speed_rush(integer,integer,uuid)', 'EXECUTE')
     or has_function_privilege(current_user, 'public.reset_aqw_player_records()', 'EXECUTE')
     or has_function_privilege(current_user, 'public.set_aqw_leaderboard_enabled(boolean)', 'EXECUTE') then
    raise exception 'FAIL: anonymous role can execute a personal or write RPC';
  end if;

  if has_table_privilege(current_user, 'private.aqw_player_stat_runs', 'SELECT')
     or has_table_privilege(current_user, 'private.aqw_speed_rush_attempts', 'SELECT')
     or has_table_privilege(current_user, 'private.site_admins', 'SELECT')
     or has_table_privilege(current_user, 'public.user_reports', 'SELECT')
     or has_table_privilege(current_user, 'public.user_blocks', 'SELECT') then
    raise exception 'FAIL: anonymous role can read a private table';
  end if;
end
$anon_checks$;

reset role;

-- Users may submit reports, but cannot set moderation-owned columns.
do $column_checks$
begin
  if has_function_privilege('anon', 'private.is_user_blocked_between(uuid,uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'private.is_user_blocked_between(uuid,uuid)', 'EXECUTE')
     or position(
       'auth.uid()' in pg_get_functiondef('private.is_user_blocked_between(uuid,uuid)'::regprocedure)
     ) = 0 then
    raise exception 'FAIL: block lookup is not restricted to a caller-related pair';
  end if;

  if has_table_privilege('authenticated', 'public.aqw_match_rooms', 'SELECT')
     or has_table_privilege('authenticated', 'public.aqw_match_rooms', 'INSERT')
     or has_table_privilege('authenticated', 'public.aqw_match_rooms', 'UPDATE')
     or has_table_privilege('authenticated', 'public.aqw_match_rooms', 'DELETE')
     or has_table_privilege('authenticated', 'public.aqw_match_players', 'SELECT')
     or has_table_privilege('authenticated', 'public.aqw_match_players', 'INSERT')
     or has_table_privilege('authenticated', 'private.aqw_match_questions', 'SELECT')
     or has_table_privilege('authenticated', 'private.aqw_match_answers', 'SELECT') then
    raise exception 'FAIL: clients have direct access to match or answer tables';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.aqw_match_rooms'::regclass
      and conname = 'aqw_match_rooms_max_players_check'
      and pg_get_constraintdef(oid) like '%max_players = 2%'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.aqw_match_players'::regclass
      and conname = 'aqw_match_players_seat_check'
      and pg_get_constraintdef(oid) like '%seat <= 2%'
  ) then
    raise exception 'FAIL: database constraints do not enforce exactly two players';
  end if;

  if has_table_privilege('authenticated', 'public.user_reports', 'INSERT')
     or has_column_privilege('authenticated', 'public.user_reports', 'status', 'INSERT')
     or has_column_privilege('authenticated', 'public.user_reports', 'reviewed_at', 'INSERT')
     or has_column_privilege('authenticated', 'public.user_reports', 'reviewed_by', 'INSERT')
     or has_column_privilege('authenticated', 'public.user_reports', 'created_at', 'INSERT')
     or has_column_privilege('authenticated', 'public.user_reports', 'id', 'INSERT') then
    raise exception 'FAIL: users can set moderation-owned report fields';
  end if;

  if not has_column_privilege('authenticated', 'public.user_reports', 'reporter_id', 'INSERT')
     or not has_column_privilege('authenticated', 'public.user_reports', 'reported_user_id', 'INSERT')
     or not has_column_privilege('authenticated', 'public.user_reports', 'reason', 'INSERT')
     or not has_column_privilege('authenticated', 'public.user_reports', 'details', 'INSERT') then
    raise exception 'FAIL: report submission fields are not writable';
  end if;

  if has_table_privilege('authenticated', 'public.user_reports', 'UPDATE')
     or has_column_privilege('authenticated', 'public.user_reports', 'details', 'UPDATE')
     or has_column_privilege('authenticated', 'public.user_reports', 'reporter_id', 'UPDATE') then
    raise exception 'FAIL: users can update report content or ownership';
  end if;

  if not has_column_privilege('authenticated', 'public.user_reports', 'status', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.user_reports', 'reviewed_at', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.user_reports', 'reviewed_by', 'UPDATE') then
    raise exception 'FAIL: moderation update fields are not writable';
  end if;

  if has_table_privilege('authenticated', 'public.user_blocks', 'INSERT')
     or has_column_privilege('authenticated', 'public.user_blocks', 'created_at', 'INSERT')
     or not has_column_privilege('authenticated', 'public.user_blocks', 'blocker_id', 'INSERT')
     or not has_column_privilege('authenticated', 'public.user_blocks', 'blocked_id', 'INSERT') then
    raise exception 'FAIL: block insertion column privileges are incorrect';
  end if;
end
$column_checks$;

-- The site owner must fail the admin gate at AAL1.
do $set_aal1$
begin
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', current_setting('aqw_test.owner_id'),
      'role', 'authenticated',
      'aal', 'aal1'
    )::text,
    true
  );
end
$set_aal1$;

set local role authenticated;
do $owner_aal1$
begin
  if private.is_site_owner_mfa() then
    raise exception 'FAIL: site owner passed the admin gate at AAL1';
  end if;
end
$owner_aal1$;

-- The same site owner must pass only after AAL2 is present.
do $set_aal2$
begin
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', current_setting('aqw_test.owner_id'),
      'role', 'authenticated',
      'aal', 'aal2'
    )::text,
    true
  );
end
$set_aal2$;

do $owner_aal2$
begin
  if not private.is_site_owner_mfa() then
    raise exception 'FAIL: site owner with AAL2 was denied by the admin gate';
  end if;
end
$owner_aal2$;

-- A non-owner must never pass the admin gate, even with AAL2.
do $non_owner_aal2$
begin
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', '00000000-0000-0000-0000-000000000000',
      'role', 'authenticated',
      'aal', 'aal2'
    )::text,
    true
  );

  if private.is_site_owner_mfa() then
    raise exception 'FAIL: non-owner passed the admin gate at AAL2';
  end if;
end
$non_owner_aal2$;

rollback;
