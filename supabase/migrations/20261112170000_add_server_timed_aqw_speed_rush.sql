-- Server-authoritative timing for Speed Rush.
-- Correctness is still client-reported in this phase; see comments below.
create table if not exists private.aqw_speed_rush_sessions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid not null default gen_random_uuid(),
  started_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  primary key (user_id, run_id),
  constraint aqw_speed_rush_sessions_expiry_check
    check (expires_at > started_at),
  constraint aqw_speed_rush_sessions_completion_check
    check (completed_at is null or completed_at >= started_at)
);

create unique index if not exists aqw_speed_rush_one_active_session_per_user
  on private.aqw_speed_rush_sessions(user_id)
  where completed_at is null;

create index if not exists aqw_speed_rush_sessions_expiry_idx
  on private.aqw_speed_rush_sessions(expires_at)
  where completed_at is null;

alter table private.aqw_speed_rush_sessions enable row level security;
revoke all on table private.aqw_speed_rush_sessions from public, anon, authenticated, service_role;

create or replace function private.start_aqw_speed_rush()
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_run_id uuid;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then
    raise exception 'ログインが必要です。' using errcode = '28000';
  end if;

  -- Serialize starts for one account and close any abandoned previous attempt.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  delete from private.aqw_speed_rush_sessions
   where user_id = v_user_id
     and started_at < v_now - interval '30 days';

  update private.aqw_speed_rush_sessions
     set completed_at = v_now
   where user_id = v_user_id
     and completed_at is null;

  insert into private.aqw_speed_rush_sessions(user_id, expires_at)
  values (v_user_id, v_now + interval '2 minutes')
  returning run_id into v_run_id;

  return v_run_id;
end;
$function$;

revoke all on function private.start_aqw_speed_rush() from public, anon;
grant execute on function private.start_aqw_speed_rush() to authenticated;

create or replace function public.start_aqw_speed_rush()
returns uuid
language sql
security invoker
set search_path = ''
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
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_score public.aqw_speed_rush_scores%rowtype;
  v_started_at timestamptz;
  v_now timestamptz := clock_timestamp();
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

  -- Idempotent retry: a completed session cannot be scored twice.
  if exists (
    select 1
      from private.aqw_speed_rush_attempts
     where user_id = v_user_id
       and run_id = p_run_id
  ) then
    select * into v_score
      from public.aqw_speed_rush_scores
     where user_id = v_user_id;
    return jsonb_build_object(
      'updated', false,
      'duplicate', true,
      'correct_count', v_score.correct_count,
      'elapsed_ms', v_score.elapsed_ms,
      'updated_at', v_score.updated_at
    );
  end if;

  -- The browser-supplied p_elapsed_ms is deliberately ignored.
  update private.aqw_speed_rush_sessions
     set completed_at = v_now
   where user_id = v_user_id
     and run_id = p_run_id
     and completed_at is null
     and expires_at >= v_now
  returning started_at into v_started_at;

  if not found then
    if exists (
      select 1 from private.aqw_speed_rush_attempts
       where user_id = v_user_id and run_id = p_run_id
    ) then
      select * into v_score from public.aqw_speed_rush_scores where user_id = v_user_id;
      return jsonb_build_object(
        'updated', false,
        'duplicate', true,
        'correct_count', v_score.correct_count,
        'elapsed_ms', v_score.elapsed_ms,
        'updated_at', v_score.updated_at
      );
    end if;
    raise exception 'プレイセッションが存在しないか、期限切れまたは使用済みです。'
      using errcode = '22023';
  end if;

  v_elapsed_ms := floor(extract(epoch from (v_now - v_started_at)) * 1000)::integer;
  if v_elapsed_ms < 1000 or v_elapsed_ms > 120000 then
    raise exception 'サーバーで計測したプレイ時間が範囲外です。'
      using errcode = '22023';
  end if;

  insert into private.aqw_speed_rush_attempts(user_id, run_id, correct_count, elapsed_ms)
  values (v_user_id, p_run_id, p_correct_count, v_elapsed_ms)
  on conflict (user_id, run_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select * into v_score from public.aqw_speed_rush_scores where user_id = v_user_id;
    return jsonb_build_object(
      'updated', false,
      'duplicate', true,
      'correct_count', v_score.correct_count,
      'elapsed_ms', v_score.elapsed_ms,
      'updated_at', v_score.updated_at
    );
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

  return jsonb_build_object(
    'updated', v_updated,
    'duplicate', false,
    'correct_count', v_score.correct_count,
    'elapsed_ms', v_score.elapsed_ms,
    'updated_at', v_score.updated_at
  );
end;
$function$;

create or replace function public.submit_aqw_speed_rush(
  p_correct_count integer,
  p_elapsed_ms integer,
  p_run_id uuid
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private.submit_aqw_speed_rush(p_correct_count, p_elapsed_ms, p_run_id);
$function$;

revoke all on function private.submit_aqw_speed_rush(integer, integer, uuid) from public, anon;
grant execute on function private.submit_aqw_speed_rush(integer, integer, uuid) to authenticated;
revoke all on function public.submit_aqw_speed_rush(integer, integer, uuid) from public, anon;
grant execute on function public.submit_aqw_speed_rush(integer, integer, uuid) to authenticated;

comment on table private.aqw_speed_rush_sessions is
  'Server-issued Speed Rush sessions. Server timestamps determine elapsed time; answer correctness remains client-reported in this phase.';
comment on function public.submit_aqw_speed_rush(integer, integer, uuid) is
  'Submits Speed Rush score using server-measured session duration. p_elapsed_ms is retained for API compatibility and ignored.';
