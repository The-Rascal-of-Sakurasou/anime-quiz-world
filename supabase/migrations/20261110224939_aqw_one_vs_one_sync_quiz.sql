
alter table public.aqw_match_rooms
  add column if not exists current_question smallint not null default 0,
  add column if not exists question_started_at timestamptz,
  add column if not exists question_deadline_at timestamptz,
  add column if not exists question_resolved_at timestamptz;
alter table public.aqw_match_players
  add column if not exists score integer not null default 0 check(score>=0);

create table if not exists private.aqw_match_questions(
 room_id uuid not null references public.aqw_match_rooms(id) on delete cascade,
 question_no smallint not null check(question_no between 1 and 20),
 prompt text not null,image_url text not null,
 options jsonb not null check(jsonb_typeof(options)='array' and jsonb_array_length(options)=4),
 correct_option_index smallint not null check(correct_option_index between 0 and 3),
 primary key(room_id,question_no)
);
alter table private.aqw_match_questions enable row level security;
drop policy if exists aqw_match_questions_deny_all on private.aqw_match_questions;
create policy aqw_match_questions_deny_all on private.aqw_match_questions for all to anon,authenticated using(false) with check(false);
revoke all on private.aqw_match_questions from public,anon,authenticated;

create table if not exists private.aqw_match_answers(
 room_id uuid not null,question_no smallint not null,
 user_id uuid not null references public.profiles(id) on delete cascade,
 selected_option_index smallint not null check(selected_option_index between 0 and 3),
 is_correct boolean not null,answered_at timestamptz not null default now(),
 primary key(room_id,question_no,user_id),
 foreign key(room_id,question_no) references private.aqw_match_questions(room_id,question_no) on delete cascade
);
alter table private.aqw_match_answers enable row level security;
drop policy if exists aqw_match_answers_deny_all on private.aqw_match_answers;
create policy aqw_match_answers_deny_all on private.aqw_match_answers for all to anon,authenticated using(false) with check(false);
revoke all on private.aqw_match_answers from public,anon,authenticated;

create or replace function private.aqw_match_prepare_questions_impl(p_room_code text,p_user_id uuid,p_questions jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_room public.aqw_match_rooms%rowtype;v_count integer;v_item jsonb;v_i integer:=0;
begin
 if p_user_id is null or p_questions is null or jsonb_typeof(p_questions)<>'array' then raise exception '問題データが正しくありません。'; end if;
 select * into v_room from public.aqw_match_rooms where room_code=upper(trim(coalesce(p_room_code,''))) for update;
 if not found then raise exception 'ルームが見つかりません。'; end if;
 if v_room.host_id<>p_user_id then raise exception '問題を準備できるのはホストだけです。' using errcode='42501'; end if;
 if v_room.status<>'waiting' or v_room.expires_at<=now() then raise exception 'このルームは開始できません。'; end if;
 select count(*) into v_count from public.aqw_match_players where room_id=v_room.id and left_at is null and is_ready;
 if v_count<>2 then raise exception '参加者2人全員の準備完了が必要です。'; end if;
 if jsonb_array_length(p_questions)<>v_room.question_count then raise exception '問題数がルーム設定と一致しません。'; end if;
 if exists(select 1 from private.aqw_match_questions where room_id=v_room.id) then raise exception 'このルームの問題は既に準備されています。'; end if;
 for v_item in select value from jsonb_array_elements(p_questions) loop
  v_i:=v_i+1;
  if coalesce(v_item->>'prompt','')='' or
   coalesce(v_item->>'image_url','') !~ '^https://s[0-9]+\.anilist\.co/file/anilistcdn/media/anime/cover/' or
   jsonb_typeof(v_item->'options')<>'array' or jsonb_array_length(v_item->'options')<>4 or
   coalesce(v_item->>'correct_option_index','') !~ '^[0-3]$' or
   exists(select 1 from jsonb_array_elements(v_item->'options') o where jsonb_typeof(o)<>'string' or length(trim(o#>>'{}'))=0) then
   raise exception '第%問のデータ形式が正しくありません。',v_i;
  end if;
  if (select count(distinct lower(x#>>'{}')) from jsonb_array_elements(v_item->'options') x)<>4 then raise exception '選択肢が重複しています。'; end if;
  insert into private.aqw_match_questions(room_id,question_no,prompt,image_url,options,correct_option_index)
  values(v_room.id,v_i,v_item->>'prompt',v_item->>'image_url',v_item->'options',(v_item->>'correct_option_index')::smallint);
 end loop;
 update public.aqw_match_players set score=0 where room_id=v_room.id and left_at is null;
 update public.aqw_match_rooms set status='playing',started_at=now(),current_question=1,
  question_started_at=now(),question_deadline_at=now()+interval '20 seconds',question_resolved_at=null
 where id=v_room.id;
 return jsonb_build_object('success',true,'status','playing','question_count',v_room.question_count);
end;
$$;

create or replace function private.aqw_match_advance_impl(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare v_room public.aqw_match_rooms%rowtype;v_answer_count integer;
begin
 select * into v_room from public.aqw_match_rooms where id=p_room_id for update;
 if not found or v_room.status<>'playing' then return; end if;
 if v_room.question_resolved_at is null then
  select count(*) into v_answer_count from private.aqw_match_answers where room_id=v_room.id and question_no=v_room.current_question;
  if v_answer_count>=2 or v_room.question_deadline_at<=now() then
   update public.aqw_match_rooms set question_resolved_at=now() where id=v_room.id;
   v_room.question_resolved_at:=now();
  end if;
 end if;
 if v_room.question_resolved_at is not null and v_room.question_resolved_at<=now()-interval '2 seconds' then
  if v_room.current_question>=v_room.question_count then
   update public.aqw_match_rooms set status='completed',finished_at=now() where id=v_room.id;
  else
   update public.aqw_match_rooms set current_question=current_question+1,question_started_at=now(),
    question_deadline_at=now()+interval '20 seconds',question_resolved_at=null where id=v_room.id;
  end if;
 end if;
end;
$$;

create or replace function private.aqw_match_game_state_impl(p_room_code text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_user_id uuid:=auth.uid();v_room public.aqw_match_rooms%rowtype;v_question jsonb;v_players jsonb;v_my_answer jsonb;
begin
 if v_user_id is null then raise exception 'ログインが必要です。' using errcode='28000'; end if;
 select * into v_room from public.aqw_match_rooms where room_code=upper(trim(coalesce(p_room_code,'')));
 if not found then raise exception 'ルームが見つかりません。'; end if;
 if not exists(select 1 from public.aqw_match_players where room_id=v_room.id and user_id=v_user_id and left_at is null) then raise exception 'このルームを閲覧する権限がありません。' using errcode='42501'; end if;
 perform private.aqw_match_advance_impl(v_room.id);
 select * into v_room from public.aqw_match_rooms where id=v_room.id;
 select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,'username',pr.username,'display_name',pr.display_name,'seat',p.seat,'score',p.score,'is_host',p.user_id=v_room.host_id) order by p.seat),'[]'::jsonb)
 into v_players from public.aqw_match_players p join public.profiles pr on pr.id=p.user_id where p.room_id=v_room.id and p.left_at is null;
 select jsonb_build_object('question_no',q.question_no,'prompt',q.prompt,'image_url',q.image_url,'options',q.options,
  'started_at',v_room.question_started_at,'deadline_at',v_room.question_deadline_at,'resolved_at',v_room.question_resolved_at,
  'correct_option_index',case when v_room.question_resolved_at is not null then q.correct_option_index else null end)
 into v_question from private.aqw_match_questions q where q.room_id=v_room.id and q.question_no=v_room.current_question;
 select jsonb_build_object('selected_option_index',a.selected_option_index,'is_correct',a.is_correct)
 into v_my_answer from private.aqw_match_answers a where a.room_id=v_room.id and a.question_no=v_room.current_question and a.user_id=v_user_id;
 return jsonb_build_object('status',v_room.status,'question_count',v_room.question_count,'current_question',v_room.current_question,
  'question',v_question,'players',v_players,'my_answer',v_my_answer,
  'winner_id',case when v_room.status='completed' then (select case when count(*) filter(where score=(select max(score) from public.aqw_match_players where room_id=v_room.id and left_at is null))>1 then null else max(user_id::text)::uuid end from public.aqw_match_players where room_id=v_room.id and left_at is null) else null end,
  'finished_at',v_room.finished_at);
end;
$$;

create or replace function private.aqw_match_submit_answer_impl(p_room_code text,p_selected_option_index smallint)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_user_id uuid:=auth.uid();v_room public.aqw_match_rooms%rowtype;v_correct smallint;v_is_correct boolean;v_count integer;
begin
 if v_user_id is null then raise exception 'ログインが必要です。' using errcode='28000'; end if;
 if p_selected_option_index not between 0 and 3 then raise exception '回答が正しくありません。'; end if;
 select * into v_room from public.aqw_match_rooms where room_code=upper(trim(coalesce(p_room_code,''))) for update;
 if not found or v_room.status<>'playing' then raise exception '現在回答できる対戦ではありません。'; end if;
 if not exists(select 1 from public.aqw_match_players where room_id=v_room.id and user_id=v_user_id and left_at is null) then raise exception 'このルームを閲覧する権限がありません。' using errcode='42501'; end if;
 if v_room.question_resolved_at is not null or now()>v_room.question_deadline_at then raise exception 'この問題の回答時間は終了しました。'; end if;
 select correct_option_index into v_correct from private.aqw_match_questions where room_id=v_room.id and question_no=v_room.current_question;
 if v_correct is null then raise exception '問題データが見つかりません。'; end if;
 v_is_correct:=p_selected_option_index=v_correct;
 insert into private.aqw_match_answers(room_id,question_no,user_id,selected_option_index,is_correct)
 values(v_room.id,v_room.current_question,v_user_id,p_selected_option_index,v_is_correct)
 on conflict(room_id,question_no,user_id) do nothing;
 if not found then raise exception 'この問題には既に回答しています。'; end if;
 if v_is_correct then update public.aqw_match_players set score=score+1 where room_id=v_room.id and user_id=v_user_id and left_at is null; end if;
 select count(*) into v_count from private.aqw_match_answers where room_id=v_room.id and question_no=v_room.current_question;
 if v_count>=2 then update public.aqw_match_rooms set question_resolved_at=now() where id=v_room.id and question_resolved_at is null; end if;
 return jsonb_build_object('accepted',true);
end;
$$;

create or replace function public.aqw_match_prepare_questions(p_room_code text,p_user_id uuid,p_questions jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select private.aqw_match_prepare_questions_impl(p_room_code,p_user_id,p_questions); $$;
create or replace function public.aqw_match_game_state(p_room_code text)
returns jsonb language sql security invoker set search_path='' as $$ select private.aqw_match_game_state_impl(p_room_code); $$;
create or replace function public.aqw_match_submit_answer(p_room_code text,p_selected_option_index smallint)
returns jsonb language sql security invoker set search_path='' as $$ select private.aqw_match_submit_answer_impl(p_room_code,p_selected_option_index); $$;

revoke all on function public.aqw_match_prepare_questions(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.aqw_match_prepare_questions(text,uuid,jsonb) to service_role;
revoke all on function public.aqw_match_game_state(text) from public,anon;
grant execute on function public.aqw_match_game_state(text) to authenticated;
revoke all on function public.aqw_match_submit_answer(text,smallint) from public,anon;
grant execute on function public.aqw_match_submit_answer(text,smallint) to authenticated;

revoke all on function private.aqw_match_prepare_questions_impl(text,uuid,jsonb) from public,anon,authenticated;
revoke all on function private.aqw_match_advance_impl(uuid) from public,anon,authenticated;
revoke all on function private.aqw_match_game_state_impl(text) from public,anon,authenticated;
revoke all on function private.aqw_match_submit_answer_impl(text,smallint) from public,anon,authenticated;
