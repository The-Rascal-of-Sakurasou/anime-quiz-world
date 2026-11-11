create or replace function private.aqw_match_history_impl(p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path='' stable
as $$
declare
  v_user_id uuid := auth.uid();
  v_stats jsonb;
  v_matches jsonb;
begin
  if v_user_id is null then
    raise exception 'ログインが必要です。' using errcode='28000';
  end if;

  with completed as (
    select r.id, r.finished_at, r.question_count,
      mine.score as my_score, opponent.score as opponent_score,
      coalesce(op.display_name, op.username, 'AQW User') as opponent_name,
      op.username as opponent_username,
      case when mine.score > opponent.score then 'win'
           when mine.score < opponent.score then 'loss' else 'draw' end as outcome
    from public.aqw_match_rooms r
    join public.aqw_match_players mine on mine.room_id=r.id and mine.user_id=v_user_id
    join public.aqw_match_players opponent on opponent.room_id=r.id and opponent.user_id<>v_user_id
    left join public.profiles op on op.id=opponent.user_id
    where r.status='completed' and mine.left_at is null
      and opponent.left_at is null and r.finished_at is not null
  )
  select jsonb_build_object(
    'matches',count(*),
    'wins',count(*) filter(where outcome='win'),
    'losses',count(*) filter(where outcome='loss'),
    'draws',count(*) filter(where outcome='draw')
  ) into v_stats from completed;

  with completed as (
    select r.id,r.finished_at,r.question_count,
      mine.score as my_score,opponent.score as opponent_score,
      coalesce(op.display_name,op.username,'AQW User') as opponent_name,
      op.username as opponent_username,
      case when mine.score>opponent.score then 'win'
           when mine.score<opponent.score then 'loss' else 'draw' end as outcome
    from public.aqw_match_rooms r
    join public.aqw_match_players mine on mine.room_id=r.id and mine.user_id=v_user_id
    join public.aqw_match_players opponent on opponent.room_id=r.id and opponent.user_id<>v_user_id
    left join public.profiles op on op.id=opponent.user_id
    where r.status='completed' and mine.left_at is null
      and opponent.left_at is null and r.finished_at is not null
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'match_id',id,'finished_at',finished_at,'question_count',question_count,
    'my_score',my_score,'opponent_score',opponent_score,
    'opponent_name',opponent_name,'opponent_username',opponent_username,'result',outcome
  ) order by finished_at desc),'[]'::jsonb)
  into v_matches
  from (select * from completed order by finished_at desc
        limit greatest(1,least(coalesce(p_limit,20),50))) recent;

  return jsonb_build_object('stats',coalesce(v_stats,'{}'::jsonb),'matches',coalesce(v_matches,'[]'::jsonb));
end;
$$;

create or replace function public.aqw_match_history(p_limit integer default 20)
returns jsonb language sql security invoker set search_path=''
as $$ select private.aqw_match_history_impl(p_limit); $$;

revoke all on function public.aqw_match_history(integer) from public,anon;
grant execute on function public.aqw_match_history(integer) to authenticated;
revoke all on function private.aqw_match_history_impl(integer) from public,anon,authenticated;
grant execute on function private.aqw_match_history_impl(integer) to authenticated;