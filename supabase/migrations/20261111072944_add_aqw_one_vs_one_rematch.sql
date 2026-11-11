create table private.aqw_match_rematch_requests (
  id uuid primary key default gen_random_uuid(),
  original_room_id uuid not null references public.aqw_match_rooms(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','expired','cancelled')),
  new_room_id uuid references public.aqw_match_rooms(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  responded_at timestamptz,
  check (requester_id <> recipient_id)
);
alter table private.aqw_match_rematch_requests enable row level security;
create policy aqw_match_rematch_requests_deny_all
  on private.aqw_match_rematch_requests for all to anon, authenticated
  using (false) with check (false);
revoke all on private.aqw_match_rematch_requests from public, anon, authenticated;
create unique index aqw_match_one_pending_rematch_per_room
  on private.aqw_match_rematch_requests(original_room_id) where status='pending';
create index aqw_match_rematch_user_pending_idx
  on private.aqw_match_rematch_requests(recipient_id, created_at desc) where status='pending';

create or replace function private.aqw_match_rematch_request_impl(p_room_code text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.aqw_match_rooms%rowtype;
  v_opponent uuid;
  v_request private.aqw_match_rematch_requests%rowtype;
begin
  if v_uid is null then raise exception 'ログインが必要です。' using errcode='28000'; end if;
  select * into v_room from public.aqw_match_rooms
    where room_code=upper(trim(coalesce(p_room_code,''))) for update;
  if not found or v_room.status <> 'completed' then
    raise exception '終了した対戦のみ再戦を申し込めます。';
  end if;
  if not exists(select 1 from public.aqw_match_players
    where room_id=v_room.id and user_id=v_uid and left_at is null) then
    raise exception 'この対戦の参加者ではありません。' using errcode='42501';
  end if;
  select user_id into v_opponent from public.aqw_match_players
    where room_id=v_room.id and user_id<>v_uid and left_at is null;
  if v_opponent is null or (select count(*) from public.aqw_match_players
    where room_id=v_room.id and left_at is null) <> 2 then
    raise exception '1対1の参加者情報を確認できません。';
  end if;
  update private.aqw_match_rematch_requests set status='expired'
    where original_room_id=v_room.id and status='pending' and expires_at<=now();
  select * into v_request from private.aqw_match_rematch_requests
    where original_room_id=v_room.id and status='pending' for update;
  if found then
    if v_request.requester_id<>v_uid then raise exception '相手からの再戦申請に回答してください。'; end if;
    return jsonb_build_object('request_id',v_request.id,'status',v_request.status,'expires_at',v_request.expires_at);
  end if;
  insert into private.aqw_match_rematch_requests(original_room_id,requester_id,recipient_id)
    values(v_room.id,v_uid,v_opponent) returning * into v_request;
  return jsonb_build_object('request_id',v_request.id,'status',v_request.status,'expires_at',v_request.expires_at);
end;
$$;

create or replace function private.aqw_match_rematch_respond_impl(p_request_id uuid,p_accept boolean)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid := auth.uid();
  v_req private.aqw_match_rematch_requests%rowtype;
  v_original public.aqw_match_rooms%rowtype;
  v_code text;
  v_room_id uuid;
  v_attempt integer := 0;
begin
  if v_uid is null then raise exception 'ログインが必要です。' using errcode='28000'; end if;
  select * into v_req from private.aqw_match_rematch_requests where id=p_request_id for update;
  if not found or v_req.recipient_id<>v_uid then
    raise exception 'この再戦申請に回答する権限がありません。' using errcode='42501';
  end if;
  if v_req.status<>'pending' then raise exception 'この再戦申請は既に処理されています。'; end if;
  if v_req.expires_at<=now() then
    update private.aqw_match_rematch_requests set status='expired',responded_at=now() where id=v_req.id;
    return jsonb_build_object('status','expired');
  end if;
  if not p_accept then
    update private.aqw_match_rematch_requests set status='declined',responded_at=now() where id=v_req.id;
    return jsonb_build_object('status','declined');
  end if;
  select * into v_original from public.aqw_match_rooms where id=v_req.original_room_id;
  if not found or v_original.status<>'completed' then raise exception '元の対戦情報を確認できません。'; end if;
  if exists(select 1 from public.aqw_match_players p join public.aqw_match_rooms r on r.id=p.room_id
    where p.user_id in (v_req.requester_id,v_req.recipient_id) and p.left_at is null
      and r.status in ('waiting','playing')) then
    raise exception 'どちらかのプレイヤーが別の対戦ルームに参加中です。';
  end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    begin
      insert into public.aqw_match_rooms(room_code,host_id,max_players,question_count)
        values(v_code,v_req.requester_id,2,v_original.question_count) returning id into v_room_id;
      exit;
    exception when unique_violation then
      v_attempt:=v_attempt+1;
      if v_attempt>=5 then raise; end if;
    end;
  end loop;
  insert into public.aqw_match_players(room_id,user_id,seat,is_ready)
    values(v_room_id,v_req.requester_id,1,false),(v_room_id,v_req.recipient_id,2,false);
  update private.aqw_match_rematch_requests
    set status='accepted',new_room_id=v_room_id,responded_at=now() where id=v_req.id;
  return jsonb_build_object('status','accepted','room_code',v_code,'request_id',v_req.id);
end;
$$;

create or replace function private.aqw_match_rematch_state_impl()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid(); v_requests jsonb;
begin
  if v_uid is null then raise exception 'ログインが必要です。' using errcode='28000'; end if;
  update private.aqw_match_rematch_requests set status='expired'
    where status='pending' and expires_at<=now() and (requester_id=v_uid or recipient_id=v_uid);
  select coalesce(jsonb_agg(jsonb_build_object(
    'request_id',r.id,'status',r.status,'requester_id',r.requester_id,
    'recipient_id',r.recipient_id,'requester_name',coalesce(p.display_name,p.username,'AQW User'),
    'original_room_code',o.room_code,'new_room_code',n.room_code,
    'expires_at',r.expires_at,'created_at',r.created_at
  ) order by r.created_at desc),'[]'::jsonb)
  into v_requests
  from private.aqw_match_rematch_requests r
  join public.aqw_match_rooms o on o.id=r.original_room_id
  left join public.aqw_match_rooms n on n.id=r.new_room_id
  left join public.profiles p on p.id=r.requester_id
  where (r.requester_id=v_uid or r.recipient_id=v_uid)
    and (r.status='pending' or (r.status='accepted' and r.created_at>now()-interval '10 minutes'));
  return jsonb_build_object('requests',v_requests);
end;
$$;

create or replace function public.aqw_match_rematch_request(p_room_code text)
returns jsonb language sql security invoker set search_path=''
as $$ select private.aqw_match_rematch_request_impl(p_room_code); $$;
create or replace function public.aqw_match_rematch_respond(p_request_id uuid,p_accept boolean)
returns jsonb language sql security invoker set search_path=''
as $$ select private.aqw_match_rematch_respond_impl(p_request_id,p_accept); $$;
create or replace function public.aqw_match_rematch_state()
returns jsonb language sql security invoker set search_path=''
as $$ select private.aqw_match_rematch_state_impl(); $$;

revoke all on function public.aqw_match_rematch_request(text) from public,anon;
revoke all on function public.aqw_match_rematch_respond(uuid,boolean) from public,anon;
revoke all on function public.aqw_match_rematch_state() from public,anon;
grant execute on function public.aqw_match_rematch_request(text) to authenticated;
grant execute on function public.aqw_match_rematch_respond(uuid,boolean) to authenticated;
grant execute on function public.aqw_match_rematch_state() to authenticated;
revoke all on function private.aqw_match_rematch_request_impl(text) from public,anon,authenticated;
revoke all on function private.aqw_match_rematch_respond_impl(uuid,boolean) from public,anon,authenticated;
revoke all on function private.aqw_match_rematch_state_impl() from public,anon,authenticated;
grant execute on function private.aqw_match_rematch_request_impl(text) to authenticated;
grant execute on function private.aqw_match_rematch_respond_impl(uuid,boolean) to authenticated;
grant execute on function private.aqw_match_rematch_state_impl() to authenticated;
