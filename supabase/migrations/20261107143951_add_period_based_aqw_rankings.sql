
create table private.aqw_speed_rush_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid not null,
  correct_count smallint not null check (correct_count between 0 and 10),
  elapsed_ms integer not null check (elapsed_ms between 1000 and 120000),
  created_at timestamptz not null default now(),
  constraint aqw_speed_rush_attempts_user_run_key unique (user_id, run_id)
);
alter table private.aqw_speed_rush_attempts enable row level security;
revoke all on table private.aqw_speed_rush_attempts from public, anon, authenticated;
create index aqw_speed_rush_attempts_period_idx
  on private.aqw_speed_rush_attempts (created_at desc, user_id, correct_count desc, elapsed_ms asc);

drop function if exists public.submit_aqw_speed_rush(integer, integer);
drop function if exists private.submit_aqw_speed_rush(integer, integer);

create or replace function private.submit_aqw_speed_rush(
  p_correct_count integer,
  p_elapsed_ms integer,
  p_run_id uuid
) returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_score public.aqw_speed_rush_scores%rowtype;
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
  if p_elapsed_ms is null or p_elapsed_ms < 1000 or p_elapsed_ms > 120000 then
    raise exception 'プレイ時間が不正です。' using errcode = '22023';
  end if;

  insert into private.aqw_speed_rush_attempts(user_id, run_id, correct_count, elapsed_ms)
  values (v_user_id, p_run_id, p_correct_count, p_elapsed_ms)
  on conflict (user_id, run_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select * into v_score from public.aqw_speed_rush_scores where user_id = v_user_id;
    return jsonb_build_object('updated', false, 'duplicate', true,
      'correct_count', v_score.correct_count, 'elapsed_ms', v_score.elapsed_ms,
      'updated_at', v_score.updated_at);
  end if;

  insert into public.aqw_speed_rush_scores(user_id, correct_count, elapsed_ms)
  values (v_user_id, p_correct_count, p_elapsed_ms)
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

create or replace function public.submit_aqw_speed_rush(
  p_correct_count integer,
  p_elapsed_ms integer,
  p_run_id uuid
) returns jsonb
language sql
set search_path to ''
as $function$
  select private.submit_aqw_speed_rush(p_correct_count, p_elapsed_ms, p_run_id);
$function$;
revoke all on function private.submit_aqw_speed_rush(integer, integer, uuid) from public, anon;
grant execute on function private.submit_aqw_speed_rush(integer, integer, uuid) to authenticated;
revoke all on function public.submit_aqw_speed_rush(integer, integer, uuid) from public, anon, authenticated;
grant execute on function public.submit_aqw_speed_rush(integer, integer, uuid) to authenticated;

create or replace function private.get_aqw_speed_rush_leaderboard(p_period text)
returns table(user_id uuid, correct_count smallint, elapsed_ms integer, username text, display_name text)
language plpgsql
security definer
set search_path to ''
as $function$
declare v_start timestamptz;
begin
  if p_period not in ('day','week','month','all') then
    raise exception '期間指定が不正です。' using errcode = '22023';
  end if;
  v_start := case p_period
    when 'day' then date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'
    when 'week' then date_trunc('week', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'
    when 'month' then date_trunc('month', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'
    else '-infinity'::timestamptz end;

  if p_period = 'all' then
    return query
      select s.user_id, s.correct_count, s.elapsed_ms, p.username, p.display_name
      from public.aqw_speed_rush_scores s
      join public.profiles p on p.id=s.user_id
      order by s.correct_count desc, s.elapsed_ms asc
      limit 20;
  else
    return query
      with best as (
        select distinct on (a.user_id)
          a.user_id, a.correct_count, a.elapsed_ms
        from private.aqw_speed_rush_attempts a
        where a.created_at >= v_start
        order by a.user_id, a.correct_count desc, a.elapsed_ms asc, a.created_at asc
      )
      select b.user_id, b.correct_count, b.elapsed_ms, p.username, p.display_name
      from best b join public.profiles p on p.id=b.user_id
      order by b.correct_count desc, b.elapsed_ms asc
      limit 20;
  end if;
end;
$function$;

create or replace function private.get_aqw_speed_rush_my_rank(p_period text)
returns bigint
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_start timestamptz;
  v_mine record;
  v_count bigint;
begin
  if v_user_id is null then return null; end if;
  if p_period not in ('day','week','month','all') then
    raise exception '期間指定が不正です。' using errcode = '22023';
  end if;
  v_start := case p_period
    when 'day' then date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'
    when 'week' then date_trunc('week', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'
    when 'month' then date_trunc('month', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'
    else '-infinity'::timestamptz end;

  if p_period='all' then
    select correct_count, elapsed_ms into v_mine
    from public.aqw_speed_rush_scores where user_id=v_user_id;
    if not found then return null; end if;
    select count(*) into v_count from public.aqw_speed_rush_scores s
    where s.correct_count > v_mine.correct_count
       or (s.correct_count=v_mine.correct_count and s.elapsed_ms < v_mine.elapsed_ms);
  else
    with best as (
      select distinct on (a.user_id) a.user_id,a.correct_count,a.elapsed_ms
      from private.aqw_speed_rush_attempts a
      where a.created_at >= v_start
      order by a.user_id,a.correct_count desc,a.elapsed_ms asc,a.created_at asc
    )
    select correct_count,elapsed_ms into v_mine from best where user_id=v_user_id;
    if not found then return null; end if;
    with best as (
      select distinct on (a.user_id) a.user_id,a.correct_count,a.elapsed_ms
      from private.aqw_speed_rush_attempts a
      where a.created_at >= v_start
      order by a.user_id,a.correct_count desc,a.elapsed_ms asc,a.created_at asc
    )
    select count(*) into v_count from best b
    where b.correct_count > v_mine.correct_count
       or (b.correct_count=v_mine.correct_count and b.elapsed_ms < v_mine.elapsed_ms);
  end if;
  return coalesce(v_count,0)+1;
end;
$function$;

create or replace function public.get_aqw_speed_rush_leaderboard(p_period text)
returns table(user_id uuid, correct_count smallint, elapsed_ms integer, username text, display_name text)
language sql
set search_path to ''
as $function$ select * from private.get_aqw_speed_rush_leaderboard(p_period); $function$;

create or replace function public.get_aqw_speed_rush_my_rank(p_period text)
returns bigint
language sql
set search_path to ''
as $function$ select private.get_aqw_speed_rush_my_rank(p_period); $function$;

revoke all on function private.get_aqw_speed_rush_leaderboard(text) from public;
grant execute on function private.get_aqw_speed_rush_leaderboard(text) to anon, authenticated;
revoke all on function private.get_aqw_speed_rush_my_rank(text) from public, anon;
grant execute on function private.get_aqw_speed_rush_my_rank(text) to authenticated;
revoke all on function public.get_aqw_speed_rush_leaderboard(text) from public, anon, authenticated;
grant execute on function public.get_aqw_speed_rush_leaderboard(text) to anon, authenticated;
revoke all on function public.get_aqw_speed_rush_my_rank(text) from public, anon, authenticated;
grant execute on function public.get_aqw_speed_rush_my_rank(text) to authenticated;

create or replace function private.get_aqw_player_leaderboard(p_period text, p_metric text)
returns table(user_id uuid,total_xp bigint,total_runs bigint,total_correct bigint,total_questions bigint,username text,display_name text)
language plpgsql
security definer
set search_path to ''
as $function$
declare v_start timestamptz;
begin
  if p_period not in ('day','week','month','all') or p_metric not in ('xp','runs','accuracy') then
    raise exception '集計条件が不正です。' using errcode = '22023';
  end if;
  v_start := case p_period
    when 'day' then date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'
    when 'week' then date_trunc('week', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'
    when 'month' then date_trunc('month', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'
    else '-infinity'::timestamptz end;

  return query
    with stats as (
      select s.user_id,s.total_xp,s.total_runs,s.total_correct,s.total_questions
      from public.aqw_player_stats s where p_period='all'
      union all
      select r.user_id,sum(r.xp_earned)::bigint,count(*)::bigint,
             sum(r.correct_count)::bigint,sum(r.question_count)::bigint
      from private.aqw_player_stat_runs r
      where p_period<>'all' and r.created_at>=v_start
      group by r.user_id
    )
    select s.user_id,s.total_xp,s.total_runs,s.total_correct,s.total_questions,p.username,p.display_name
    from stats s join public.profiles p on p.id=s.user_id
    where p_metric<>'accuracy' or s.total_questions>=10
    order by
      case p_metric when 'xp' then s.total_xp::numeric when 'runs' then s.total_runs::numeric
        else s.total_correct::numeric/nullif(s.total_questions,0) end desc,
      s.total_xp desc,s.total_runs desc
    limit 20;
end;
$function$;

create or replace function private.get_aqw_player_my_rank(p_period text, p_metric text)
returns bigint
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_start timestamptz;
  v_mine record;
  v_count bigint;
begin
  if v_user_id is null then return null; end if;
  if p_period not in ('day','week','month','all') or p_metric not in ('xp','runs','accuracy') then
    raise exception '集計条件が不正です。' using errcode = '22023';
  end if;
  v_start := case p_period
    when 'day' then date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'
    when 'week' then date_trunc('week', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'
    when 'month' then date_trunc('month', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'
    else '-infinity'::timestamptz end;

  with stats as (
    select s.user_id,s.total_xp,s.total_runs,s.total_correct,s.total_questions
    from public.aqw_player_stats s where p_period='all'
    union all
    select r.user_id,sum(r.xp_earned)::bigint,count(*)::bigint,
           sum(r.correct_count)::bigint,sum(r.question_count)::bigint
    from private.aqw_player_stat_runs r
    where p_period<>'all' and r.created_at>=v_start
    group by r.user_id
  )
  select * into v_mine from stats where user_id=v_user_id;
  if not found or (p_metric='accuracy' and v_mine.total_questions<10) then return null; end if;

  with stats as (
    select s.user_id,s.total_xp,s.total_runs,s.total_correct,s.total_questions
    from public.aqw_player_stats s where p_period='all'
    union all
    select r.user_id,sum(r.xp_earned)::bigint,count(*)::bigint,
           sum(r.correct_count)::bigint,sum(r.question_count)::bigint
    from private.aqw_player_stat_runs r
    where p_period<>'all' and r.created_at>=v_start
    group by r.user_id
  )
  select count(*) into v_count from stats s
  where (p_metric='xp' and s.total_xp>v_mine.total_xp)
     or (p_metric='runs' and s.total_runs>v_mine.total_runs)
     or (p_metric='accuracy' and s.total_questions>=10
         and s.total_correct::numeric/nullif(s.total_questions,0)
             > v_mine.total_correct::numeric/nullif(v_mine.total_questions,0));
  return coalesce(v_count,0)+1;
end;
$function$;

create or replace function public.get_aqw_player_leaderboard(p_period text,p_metric text)
returns table(user_id uuid,total_xp bigint,total_runs bigint,total_correct bigint,total_questions bigint,username text,display_name text)
language sql
set search_path to ''
as $function$ select * from private.get_aqw_player_leaderboard(p_period,p_metric); $function$;

create or replace function public.get_aqw_player_my_rank(p_period text,p_metric text)
returns bigint
language sql
set search_path to ''
as $function$ select private.get_aqw_player_my_rank(p_period,p_metric); $function$;

revoke all on function private.get_aqw_player_leaderboard(text,text) from public;
grant execute on function private.get_aqw_player_leaderboard(text,text) to anon,authenticated;
revoke all on function private.get_aqw_player_my_rank(text,text) from public,anon;
grant execute on function private.get_aqw_player_my_rank(text,text) to authenticated;
revoke all on function public.get_aqw_player_leaderboard(text,text) from public,anon,authenticated;
grant execute on function public.get_aqw_player_leaderboard(text,text) to anon,authenticated;
revoke all on function public.get_aqw_player_my_rank(text,text) from public,anon,authenticated;
grant execute on function public.get_aqw_player_my_rank(text,text) to authenticated;
