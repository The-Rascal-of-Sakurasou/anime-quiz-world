create or replace function private.aqw_match_one_vs_one_leaderboard_impl(p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_rows jsonb;
begin
  if v_uid is null then raise exception 'ログインが必要です。' using errcode='28000'; end if;
  with match_results as (
    select
      mine.user_id,
      case
        when r.winner_id is not null and r.winner_id=mine.user_id then 'win'
        when r.winner_id is not null and r.winner_id<>mine.user_id then 'loss'
        when mine.score>opponent.score then 'win'
        when mine.score<opponent.score then 'loss'
        else 'draw'
      end as outcome
    from public.aqw_match_rooms r
    join public.aqw_match_players mine on mine.room_id=r.id
    join public.aqw_match_players opponent on opponent.room_id=r.id and opponent.user_id<>mine.user_id
    where r.status='completed' and r.max_players=2
      and (select count(*) from public.aqw_match_players p where p.room_id=r.id)=2
  ),
  totals as (
    select user_id,count(*)::integer as matches,
      count(*) filter(where outcome='win')::integer as wins,
      count(*) filter(where outcome='loss')::integer as losses,
      count(*) filter(where outcome='draw')::integer as draws
    from match_results group by user_id
  ),
  ranked as (
    select row_number() over(order by t.wins desc,
      (t.wins::numeric/nullif(t.matches,0)) desc,t.matches desc,p.username asc)::integer as rank,
      p.username,p.display_name,t.matches,t.wins,t.losses,t.draws,
      round(100.0*t.wins/nullif(t.matches,0),1) as win_rate
    from totals t
    join public.profiles p on p.id=t.user_id
    where p.leaderboard_enabled is true
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'rank',rank,'username',username,'display_name',display_name,
    'matches',matches,'wins',wins,'losses',losses,'draws',draws,'win_rate',win_rate
  ) order by rank),'[]'::jsonb)
  into v_rows
  from (select * from ranked order by rank limit greatest(1,least(coalesce(p_limit,50),100))) top_rows;
  return jsonb_build_object('entries',v_rows);
end;
$$;

create or replace function public.aqw_match_one_vs_one_leaderboard(p_limit integer default 50)
returns jsonb language sql security invoker set search_path=''
as $$ select private.aqw_match_one_vs_one_leaderboard_impl(p_limit); $$;
revoke all on function public.aqw_match_one_vs_one_leaderboard(integer) from public,anon;
grant execute on function public.aqw_match_one_vs_one_leaderboard(integer) to authenticated;
revoke all on function private.aqw_match_one_vs_one_leaderboard_impl(integer) from public,anon,authenticated;
grant execute on function private.aqw_match_one_vs_one_leaderboard_impl(integer) to authenticated;

create index if not exists aqw_match_rooms_completed_recent_idx
  on public.aqw_match_rooms(finished_at desc) where status='completed';