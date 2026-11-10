create unique index aqw_match_players_one_active_room_per_user
  on public.aqw_match_players (user_id)
  where left_at is null;

create or replace function public.aqw_match_get_room(p_room_code text)
returns jsonb
language plpgsql
volatile
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
    where p.room_id = v_room.id
      and p.user_id = v_user_id
      and p.left_at is null
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

revoke all on function public.aqw_match_get_room(text) from public, anon;
grant execute on function public.aqw_match_get_room(text) to authenticated;
