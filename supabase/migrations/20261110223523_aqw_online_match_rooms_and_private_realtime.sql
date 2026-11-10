create table public.aqw_match_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique check (room_code ~ '^[0-9A-F]{10}$'),
  host_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'waiting'
    check (status in ('waiting','playing','completed','cancelled')),
  max_players smallint not null default 2 check (max_players between 2 and 4),
  question_count smallint not null default 10 check (question_count in (5,10,15,20)),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

create table public.aqw_match_players (
  room_id uuid not null references public.aqw_match_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  seat smallint not null check (seat between 1 and 4),
  is_ready boolean not null default false,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (room_id, user_id),
  unique (room_id, seat)
);

create index aqw_match_rooms_waiting_idx
  on public.aqw_match_rooms (created_at desc)
  where status = 'waiting';
create index aqw_match_players_active_user_idx
  on public.aqw_match_players (user_id, joined_at desc)
  where left_at is null;

alter table public.aqw_match_rooms enable row level security;
alter table public.aqw_match_players enable row level security;
revoke all on public.aqw_match_rooms from public, anon, authenticated;
revoke all on public.aqw_match_players from public, anon, authenticated;

create or replace function public.is_aqw_match_channel_member(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_room_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or p_topic is null
     or p_topic !~ '^aqw-match:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  v_room_id := substring(p_topic from 11)::uuid;
  return exists (
    select 1
    from public.aqw_match_players p
    where p.room_id = v_room_id
      and p.user_id = v_user_id
      and p.left_at is null
  );
end;
$$;

create or replace function public.aqw_match_get_room(p_room_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_room public.aqw_match_rooms%rowtype;
  v_players jsonb;
begin
  if v_user_id is null then
    raise exception 'ログインが必要です。' using errcode = '28000';
  end if;
  select * into v_room
  from public.aqw_match_rooms
  where room_code = upper(trim(coalesce(p_room_code,'')));
  if not found then
    raise exception 'ルームが見つかりません。';
  end if;
  if not exists (
    select 1 from public.aqw_match_players p
    where p.room_id = v_room.id and p.user_id = v_user_id
  ) then
    raise exception 'このルームを閲覧する権限がありません。' using errcode = '42501';
  end if;
  if v_room.status = 'waiting' and v_room.expires_at <= now() then
    update public.aqw_match_rooms set status = 'cancelled' where id = v_room.id;
    v_room.status := 'cancelled';
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', p.user_id,
      'username', pr.username,
      'display_name', pr.display_name,
      'avatar_path', pr.avatar_path,
      'seat', p.seat,
      'is_ready', p.is_ready,
      'is_host', p.user_id = v_room.host_id,
      'joined_at', p.joined_at
    ) order by p.seat
  ), '[]'::jsonb)
  into v_players
  from public.aqw_match_players p
  join public.profiles pr on pr.id = p.user_id
  where p.room_id = v_room.id and p.left_at is null;

  return jsonb_build_object(
    'id', v_room.id,
    'room_code', v_room.room_code,
    'host_id', v_room.host_id,
    'status', v_room.status,
    'max_players', v_room.max_players,
    'question_count', v_room.question_count,
    'created_at', v_room.created_at,
    'started_at', v_room.started_at,
    'expires_at', v_room.expires_at,
    'players', v_players
  );
end;
$$;

create or replace function public.aqw_match_create_room(
  p_max_players smallint default 2,
  p_question_count smallint default 10
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_room_id uuid;
  v_code text;
  v_attempt integer := 0;
begin
  if v_user_id is null then
    raise exception 'ログインが必要です。' using errcode = '28000';
  end if;
  if p_max_players not between 2 and 4 then
    raise exception '参加人数は2〜4人にしてください。';
  end if;
  if p_question_count not in (5,10,15,20) then
    raise exception '問題数の指定が正しくありません。';
  end if;
  if exists (
    select 1 from public.aqw_match_players
    where user_id = v_user_id and left_at is null
  ) then
    raise exception '既に別の対戦ルームに参加しています。';
  end if;

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    begin
      insert into public.aqw_match_rooms(room_code, host_id, max_players, question_count)
      values (v_code, v_user_id, p_max_players, p_question_count)
      returning id into v_room_id;
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt >= 5 then raise; end if;
    end;
  end loop;

  insert into public.aqw_match_players(room_id, user_id, seat)
  values (v_room_id, v_user_id, 1);
  return public.aqw_match_get_room(v_code);
end;
$$;

create or replace function public.aqw_match_join_room(p_room_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_room public.aqw_match_rooms%rowtype;
  v_seat integer;
begin
  if v_user_id is null then
    raise exception 'ログインが必要です。' using errcode = '28000';
  end if;
  select * into v_room
  from public.aqw_match_rooms
  where room_code = upper(trim(coalesce(p_room_code,'')))
  for update;
  if not found then raise exception 'ルームが見つかりません。'; end if;
  if exists (
    select 1 from public.aqw_match_players
    where room_id = v_room.id and user_id = v_user_id and left_at is null
  ) then
    return public.aqw_match_get_room(v_room.room_code);
  end if;
  if v_room.status <> 'waiting' or v_room.expires_at <= now() then
    if v_room.status = 'waiting' then
      update public.aqw_match_rooms set status = 'cancelled' where id = v_room.id;
    end if;
    raise exception 'このルームは参加を受け付けていません。';
  end if;
  if exists (
    select 1 from public.aqw_match_players
    where user_id = v_user_id and left_at is null
  ) then
    raise exception '既に別の対戦ルームに参加しています。';
  end if;
  select coalesce(max(seat),0) + 1 into v_seat
  from public.aqw_match_players
  where room_id = v_room.id and left_at is null;
  if v_seat > v_room.max_players then
    raise exception 'このルームは満員です。';
  end if;
  insert into public.aqw_match_players(room_id, user_id, seat)
  values (v_room.id, v_user_id, v_seat);
  return public.aqw_match_get_room(v_room.room_code);
end;
$$;

create or replace function public.aqw_match_set_ready(
  p_room_code text,
  p_is_ready boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_room public.aqw_match_rooms%rowtype;
begin
  if v_user_id is null then raise exception 'ログインが必要です。' using errcode = '28000'; end if;
  select * into v_room from public.aqw_match_rooms
  where room_code = upper(trim(coalesce(p_room_code,''))) for update;
  if not found then raise exception 'ルームが見つかりません。'; end if;
  if v_room.status <> 'waiting' or v_room.expires_at <= now() then
    raise exception 'このルームでは準備状態を変更できません。';
  end if;
  update public.aqw_match_players
  set is_ready = p_is_ready
  where room_id = v_room.id and user_id = v_user_id and left_at is null;
  if not found then raise exception '参加者ではありません。' using errcode = '42501'; end if;
  return public.aqw_match_get_room(v_room.room_code);
end;
$$;

create or replace function public.aqw_match_start_room(p_room_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_room public.aqw_match_rooms%rowtype;
  v_count integer;
  v_ready integer;
begin
  if v_user_id is null then raise exception 'ログインが必要です。' using errcode = '28000'; end if;
  select * into v_room from public.aqw_match_rooms
  where room_code = upper(trim(coalesce(p_room_code,''))) for update;
  if not found then raise exception 'ルームが見つかりません。'; end if;
  if v_room.host_id <> v_user_id then
    raise exception '対戦を開始できるのはホストだけです。' using errcode = '42501';
  end if;
  if v_room.status <> 'waiting' or v_room.expires_at <= now() then
    raise exception 'このルームは開始できません。';
  end if;
  select count(*), count(*) filter (where is_ready)
  into v_count, v_ready
  from public.aqw_match_players
  where room_id = v_room.id and left_at is null;
  if v_count < 2 or v_count > v_room.max_players or v_ready <> v_count then
    raise exception '参加者全員の準備完了が必要です。';
  end if;
  update public.aqw_match_rooms
  set status = 'playing', started_at = now()
  where id = v_room.id;
  return public.aqw_match_get_room(v_room.room_code);
end;
$$;

create or replace function public.aqw_match_leave_room(p_room_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_room public.aqw_match_rooms%rowtype;
begin
  if v_user_id is null then raise exception 'ログインが必要です。' using errcode = '28000'; end if;
  select * into v_room from public.aqw_match_rooms
  where room_code = upper(trim(coalesce(p_room_code,''))) for update;
  if not found then raise exception 'ルームが見つかりません。'; end if;
  update public.aqw_match_players
  set left_at = now(), is_ready = false
  where room_id = v_room.id and user_id = v_user_id and left_at is null;
  if not found then raise exception '参加者ではありません。' using errcode = '42501'; end if;
  if v_room.host_id = v_user_id and v_room.status = 'waiting' then
    update public.aqw_match_rooms set status = 'cancelled' where id = v_room.id;
  end if;
  return jsonb_build_object('success', true, 'room_status',
    case when v_room.host_id = v_user_id and v_room.status = 'waiting' then 'cancelled' else v_room.status end);
end;
$$;

revoke all on function public.is_aqw_match_channel_member(text) from public, anon;
revoke all on function public.aqw_match_get_room(text) from public, anon;
revoke all on function public.aqw_match_create_room(smallint,smallint) from public, anon;
revoke all on function public.aqw_match_join_room(text) from public, anon;
revoke all on function public.aqw_match_set_ready(text,boolean) from public, anon;
revoke all on function public.aqw_match_start_room(text) from public, anon;
revoke all on function public.aqw_match_leave_room(text) from public, anon;
grant execute on function public.is_aqw_match_channel_member(text) to authenticated;
grant execute on function public.aqw_match_get_room(text) to authenticated;
grant execute on function public.aqw_match_create_room(smallint,smallint) to authenticated;
grant execute on function public.aqw_match_join_room(text) to authenticated;
grant execute on function public.aqw_match_set_ready(text,boolean) to authenticated;
grant execute on function public.aqw_match_start_room(text) to authenticated;
grant execute on function public.aqw_match_leave_room(text) to authenticated;

drop policy if exists aqw_match_members_can_receive on realtime.messages;
create policy aqw_match_members_can_receive
on realtime.messages for select to authenticated
using (
  extension in ('broadcast','presence')
  and public.is_aqw_match_channel_member((select realtime.topic()))
);

drop policy if exists aqw_match_members_can_send on realtime.messages;
create policy aqw_match_members_can_send
on realtime.messages for insert to authenticated
with check (
  extension in ('broadcast','presence')
  and public.is_aqw_match_channel_member((select realtime.topic()))
);
