alter table public.aqw_match_rooms
  add column if not exists winner_id uuid,
  add column if not exists end_reason text;
alter table public.aqw_match_rooms
  drop constraint if exists aqw_match_rooms_end_reason_check;
alter table public.aqw_match_rooms
  add constraint aqw_match_rooms_end_reason_check
  check (end_reason is null or end_reason in ('surrender'));

create or replace function private.aqw_match_surrender_impl(p_room_code text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_user_id uuid:=auth.uid();
  v_room public.aqw_match_rooms%rowtype;
  v_opponent_id uuid;
  v_count integer;
begin
  if v_user_id is null then raise exception 'ログインが必要です。' using errcode='28000'; end if;
  select * into v_room from public.aqw_match_rooms
  where room_code=upper(trim(coalesce(p_room_code,''))) for update;
  if not found or v_room.status<>'playing' then raise exception '降参できる対戦がありません。'; end if;
  if not exists(select 1 from public.aqw_match_players where room_id=v_room.id and user_id=v_user_id and left_at is null) then
    raise exception 'このルームを操作する権限がありません。' using errcode='42501';
  end if;
  select count(*) into v_count from public.aqw_match_players where room_id=v_room.id and left_at is null;
  if v_count<>2 then raise exception '1対1の参加者情報を確認できません。'; end if;
  select user_id into v_opponent_id from public.aqw_match_players
  where room_id=v_room.id and user_id<>v_user_id and left_at is null;
  if v_opponent_id is null then raise exception '対戦相手が見つかりません。'; end if;
  update public.aqw_match_rooms
  set status='completed',finished_at=now(),winner_id=v_opponent_id,end_reason='surrender'
  where id=v_room.id and status='playing';
  return jsonb_build_object('success',true,'winner_id',v_opponent_id,'end_reason','surrender');
end;
$$;

create or replace function public.aqw_match_surrender(p_room_code text)
returns jsonb language sql security invoker set search_path=''
as $$ select private.aqw_match_surrender_impl(p_room_code); $$;
revoke all on function public.aqw_match_surrender(text) from public,anon;
grant execute on function public.aqw_match_surrender(text) to authenticated;
revoke all on function private.aqw_match_surrender_impl(text) from public,anon,authenticated;
grant execute on function private.aqw_match_surrender_impl(text) to authenticated;

-- Preserve the normal score-derived winner while allowing a surrender winner to override it.
create or replace function private.aqw_match_game_state_impl(p_room_code text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_user_id uuid:=auth.uid();
  v_room public.aqw_match_rooms%rowtype;
  v_question jsonb;
  v_players jsonb;
  v_my_answer jsonb;
  v_score_winner uuid;
begin
  if v_user_id is null then raise exception 'ログインが必要です。' using errcode='28000'; end if;
  select * into v_room from public.aqw_match_rooms where room_code=upper(trim(coalesce(p_room_code,'')));
  if not found then raise exception 'ルームが見つかりません。'; end if;
  if not exists(select 1 from public.aqw_match_players where room_id=v_room.id and user_id=v_user_id and left_at is null) then
    raise exception 'このルームを閲覧する権限がありません。' using errcode='42501';
  end if;
  perform private.aqw_match_advance_impl(v_room.id);
  select * into v_room from public.aqw_match_rooms where id=v_room.id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id',p.user_id,'username',pr.username,'display_name',pr.display_name,
    'seat',p.seat,'score',p.score,'is_host',p.user_id=v_room.host_id
  ) order by p.seat),'[]'::jsonb)
  into v_players from public.aqw_match_players p
  join public.profiles pr on pr.id=p.user_id
  where p.room_id=v_room.id and p.left_at is null;
  select jsonb_build_object(
    'question_no',q.question_no,'prompt',q.prompt,'image_url',q.image_url,
    'options',q.options,'started_at',v_room.question_started_at,
    'deadline_at',v_room.question_deadline_at,'resolved_at',v_room.question_resolved_at,
    'correct_option_index',case when v_room.question_resolved_at is not null then q.correct_option_index else null end
  ) into v_question from private.aqw_match_questions q
  where q.room_id=v_room.id and q.question_no=v_room.current_question;
  select jsonb_build_object('selected_option_index',a.selected_option_index,'is_correct',a.is_correct)
  into v_my_answer from private.aqw_match_answers a
  where a.room_id=v_room.id and a.question_no=v_room.current_question and a.user_id=v_user_id;
  select case when count(*) filter(where score=(select max(score) from public.aqw_match_players where room_id=v_room.id and left_at is null))>1
    then null else max(user_id::text)::uuid end
  into v_score_winner from public.aqw_match_players where room_id=v_room.id and left_at is null;
  return jsonb_build_object(
    'status',v_room.status,'question_count',v_room.question_count,'current_question',v_room.current_question,
    'question',v_question,'players',v_players,'my_answer',v_my_answer,
    'winner_id',case when v_room.status='completed' then coalesce(v_room.winner_id,v_score_winner) else null end,
    'end_reason',v_room.end_reason,'finished_at',v_room.finished_at
  );
end;
$$;
revoke all on function private.aqw_match_game_state_impl(text) from public,anon,authenticated;
grant execute on function private.aqw_match_game_state_impl(text) to authenticated;

create or replace function private.aqw_match_history_impl(p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path='' stable
as $$
declare v_user_id uuid:=auth.uid(); v_stats jsonb; v_matches jsonb;
begin
  if v_user_id is null then raise exception 'ログインが必要です。' using errcode='28000'; end if;
  with completed as (
    select r.id,r.finished_at,r.question_count,r.end_reason,
      mine.score as my_score,opponent.score as opponent_score,
      coalesce(op.display_name,op.username,'AQW User') as opponent_name,
      op.username as opponent_username,
      case when r.winner_id is not null and r.winner_id=v_user_id then 'win'
           when r.winner_id is not null and r.winner_id<>v_user_id then 'loss'
           when mine.score>opponent.score then 'win'
           when mine.score<opponent.score then 'loss' else 'draw' end as outcome
    from public.aqw_match_rooms r
    join public.aqw_match_players mine on mine.room_id=r.id and mine.user_id=v_user_id
    join public.aqw_match_players opponent on opponent.room_id=r.id and opponent.user_id<>v_user_id
    left join public.profiles op on op.id=opponent.user_id
    where r.status='completed' and mine.left_at is null and opponent.left_at is null and r.finished_at is not null
  )
  select jsonb_build_object('matches',count(*),'wins',count(*) filter(where outcome='win'),
    'losses',count(*) filter(where outcome='loss'),'draws',count(*) filter(where outcome='draw'))
  into v_stats from completed;
  with completed as (
    select r.id,r.finished_at,r.question_count,r.end_reason,
      mine.score as my_score,opponent.score as opponent_score,
      coalesce(op.display_name,op.username,'AQW User') as opponent_name,
      op.username as opponent_username,
      case when r.winner_id is not null and r.winner_id=v_user_id then 'win'
           when r.winner_id is not null and r.winner_id<>v_user_id then 'loss'
           when mine.score>opponent.score then 'win'
           when mine.score<opponent.score then 'loss' else 'draw' end as outcome
    from public.aqw_match_rooms r
    join public.aqw_match_players mine on mine.room_id=r.id and mine.user_id=v_user_id
    join public.aqw_match_players opponent on opponent.room_id=r.id and opponent.user_id<>v_user_id
    left join public.profiles op on op.id=opponent.user_id
    where r.status='completed' and mine.left_at is null and opponent.left_at is null and r.finished_at is not null
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'match_id',id,'finished_at',finished_at,'question_count',question_count,
    'my_score',my_score,'opponent_score',opponent_score,'opponent_name',opponent_name,
    'opponent_username',opponent_username,'result',outcome,'end_reason',end_reason
  ) order by finished_at desc),'[]'::jsonb)
  into v_matches
  from (select * from completed order by finished_at desc limit greatest(1,least(coalesce(p_limit,20),50))) recent;
  return jsonb_build_object('stats',coalesce(v_stats,'{}'::jsonb),'matches',coalesce(v_matches,'[]'::jsonb));
end;
$$;
revoke all on function private.aqw_match_history_impl(integer) from public,anon,authenticated;
grant execute on function private.aqw_match_history_impl(integer) to authenticated;