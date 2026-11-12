-- Server-authoritative elapsed-time validation for Speed Rush.
-- The client may still report its answer count; this migration only makes
-- the elapsed-time value originate from the database clock.

create table if not exists private.aqw_speed_rush_runs (
  run_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  finished_at timestamptz
);

create index if not exists aqw_speed_rush_runs_user_started_idx
  on private.aqw_speed_rush_runs(user_id, started_at desc);

revoke all on table private.aqw_speed_rush_runs from public, anon, authenticated, service_role;

create or replace function private.start_aqw_speed_rush()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_run_id uuid;
  v_started_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'ログインが必要です。' using errcode = '28000';
  end if;

  delete from private.aqw_speed_rush_runs
   where user_id = v_user_id
     and finished_at is null
     and expires_at < clock_timestamp() - interval '1 day';

  insert into private.aqw_speed_rush_runs(user_id, expires_at)
  values (v_user_id, clock_timestamp() + interval '3 minutes')
  returning run_id, started_at into v_run_id, v_started_at;

  return jsonb_build_object(
    'run_id', v_run_id,
    'started_at', v_started_at
  );
end;
$function$;

revoke all on function private.start_aqw_speed_rush() from public, anon;
grant execute on function private.start_aqw_speed_rush() to authenticated;

create or replace function public.start_aqw_speed_rush()
returns jsonb
language sql
set search_path to ''
as $function$
  select private.start_aqw_speed_rush();
$function$;

revoke all on function public.start_aqw_speed_rush() from public, anon;
grant execute on function public.start_aqw_speed_rush() to authenticated;

create or replace function private.submit_aqw_speed_rush(
  p_correct_count integer,
  p_elapsed_ms integer,
  p_run_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_run private.aqw_speed_rush_runs%rowtype;
  v_score public.aqw_speed_rush_scores%rowtype;
  v_elapsed_ms integer;
  v_inserted integer;
  v_updated boolean := false;
begin
  if v_user_id is null then
    raise exception 'ログインが必要です。' using errcode = '28000';
  end if;
  if p_run_id is null then
    raise exception 'プレイIDが不正です。' using errcode = '22023';
  end if;
  if p_correct_count is null or p_correct_count < 0 or p_correct_count > 10 then
    raise exception '正解数が不正です。' using errcode = '22023';
  end if;

  -- Lock and consume a server-issued run. p_elapsed_ms is intentionally ignored.
  select * into v_run
    from private.aqw_speed_rush_runs
   where run_id = p_run_id
     and user_id = v_user_id
     and finished_at is null
     and expires_at >= clock_timestamp()
   for update;

  if not found then
    raise exception '有効なプレイ開始記録がありません。最初からやり直してください。'
      using errcode = '22023';
  end if;

  v_elapsed_ms := floor(extract(epoch from (clock_timestamp() - v_run.started_at)) * 1000)::integer;

  if v_elapsed_ms < 1000 or v_elapsed_ms > 120000 then
    raise exception 'プレイ時間が有効範囲外です。' using errcode = '22023';
  end if;

  update private.aqw_speed_rush_runs
     set finished_at = clock_timestamp()
   where run_id = p_run_id
     and user_id = v_user_id;

  insert into private.aqw_speed_rush_attempts(user_id, run_id, correct_count, elapsed_ms)
  values (v_user_id, p_run_id, p_correct_count, v_elapsed_ms)
  on conflict (user_id, run_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select * into v_score from public.aqw_speed_rush_scores where user_id = v_user_id;
    return jsonb_build_object('updated', false, 'duplicate', true,
      'correct_count', v_score.correct_count, 'elapsed_ms', v_score.elapsed_ms,
      'updated_at', v_score.updated_at);
  end if;

  insert into public.aqw_speed_rush_scores(user_id, correct_count, elapsed_ms)
  values (v_user_id, p_correct_count, v_elapsed_ms)
  on conflict (user_id) do update
    set correct_count = excluded.correct_count,
        elapsed_ms = excluded.elapsed_ms,
        updated_at = now()
    where excluded.correct_count > public.aqw_speed_rush_scores.correct_count
       or (excluded.correct_count = public.aqw_speed_rush_scores.correct_count
           and excluded.elapsed_ms < public.aqw_speed_rush_scores.elapsed_ms)
  returning * into v_score;

  if found then
    v_updated := true;
  else
    select * into v_score from public.aqw_speed_rush_scores where user_id = v_user_id;
  end if;

  return jsonb_build_object('updated', v_updated, 'duplicate', false,
    'correct_count', v_score.correct_count, 'elapsed_ms', v_score.elapsed_ms,
    'updated_at', v_score.updated_at);
end;
$function$;

comment on function private.submit_aqw_speed_rush(integer, integer, uuid) is
  'Validates Speed Rush elapsed time using a server-issued run and database clock. Correct count remains client-reported and is not authoritative anti-cheat evidence.';

create or replace function public.submit_aqw_speed_rush(
  p_correct_count integer,
  p_elapsed_ms integer,
  p_run_id uuid
)
returns jsonb
language sql
set search_path to ''
as $function$
  select private.submit_aqw_speed_rush(p_correct_count, p_elapsed_ms, p_run_id);
$function$;

revoke all on function public.submit_aqw_speed_rush(integer, integer, uuid) from public, anon;
grant execute on function public.submit_aqw_speed_rush(integer, integer, uuid) to authenticated;
