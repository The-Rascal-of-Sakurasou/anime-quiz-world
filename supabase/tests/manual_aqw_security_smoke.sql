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
     or has_function_privilege(current_user, 'public.submit_aqw_player_run(uuid,integer,integer,integer)', 'EXECUTE')
     or has_function_privilege(current_user, 'public.submit_aqw_speed_rush(integer,integer,uuid)', 'EXECUTE')
     or has_function_privilege(current_user, 'public.reset_aqw_player_records()', 'EXECUTE')
     or has_function_privilege(current_user, 'public.set_aqw_leaderboard_enabled(boolean)', 'EXECUTE') then
    raise exception 'FAIL: anonymous role can execute a personal or write RPC';
  end if;

  if has_table_privilege(current_user, 'private.aqw_player_stat_runs', 'SELECT')
     or has_table_privilege(current_user, 'private.aqw_speed_rush_attempts', 'SELECT')
     or has_table_privilege(current_user, 'private.site_admins', 'SELECT') then
    raise exception 'FAIL: anonymous role can read a private table';
  end if;
end
$anon_checks$;

reset role;

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
