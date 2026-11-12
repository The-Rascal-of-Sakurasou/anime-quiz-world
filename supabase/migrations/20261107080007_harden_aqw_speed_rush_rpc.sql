
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.submit_aqw_speed_rush(
  p_correct_count integer,
  p_elapsed_ms integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_score public.aqw_speed_rush_scores%rowtype;
  v_updated boolean := false;
begin
  if v_user_id is null then
    raise exception 'ログインが必要です。' using errcode = '28000';
  end if;
  if p_correct_count is null or p_correct_count < 0 or p_correct_count > 10 then
    raise exception '正解数が不正です。' using errcode = '22023';
  end if;
  if p_elapsed_ms is null or p_elapsed_ms < 1000 or p_elapsed_ms > 120000 then
    raise exception 'プレイ時間が不正です。' using errcode = '22023';
  end if;

  insert into public.aqw_speed_rush_scores (user_id, correct_count, elapsed_ms)
  values (v_user_id, p_correct_count, p_elapsed_ms)
  on conflict (user_id) do update
    set correct_count = excluded.correct_count,
        elapsed_ms = excluded.elapsed_ms,
        updated_at = now()
    where excluded.correct_count > public.aqw_speed_rush_scores.correct_count
       or (
         excluded.correct_count = public.aqw_speed_rush_scores.correct_count
         and excluded.elapsed_ms < public.aqw_speed_rush_scores.elapsed_ms
       )
  returning * into v_score;

  if found then
    v_updated := true;
  else
    select * into v_score
    from public.aqw_speed_rush_scores
    where user_id = v_user_id;
  end if;

  return jsonb_build_object(
    'updated', v_updated,
    'correct_count', v_score.correct_count,
    'elapsed_ms', v_score.elapsed_ms,
    'updated_at', v_score.updated_at
  );
end;
$$;

revoke all on function private.submit_aqw_speed_rush(integer, integer) from public, anon;
grant execute on function private.submit_aqw_speed_rush(integer, integer) to authenticated;

create or replace function public.submit_aqw_speed_rush(
  p_correct_count integer,
  p_elapsed_ms integer
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.submit_aqw_speed_rush(p_correct_count, p_elapsed_ms);
$$;

revoke all on function public.submit_aqw_speed_rush(integer, integer) from public, anon;
grant execute on function public.submit_aqw_speed_rush(integer, integer) to authenticated;
