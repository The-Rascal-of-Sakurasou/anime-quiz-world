create or replace function private.aqw_match_leave_room_impl(p_room_code text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_user_id uuid:=auth.uid();v_room public.aqw_match_rooms%rowtype;v_status text;
begin
 if v_user_id is null then raise exception 'ログインが必要です。' using errcode='28000'; end if;
 select * into v_room from public.aqw_match_rooms
 where room_code=upper(trim(coalesce(p_room_code,''))) for update;
 if not found then raise exception 'ルームが見つかりません。'; end if;
 update public.aqw_match_players set left_at=now(),is_ready=false
 where room_id=v_room.id and user_id=v_user_id and left_at is null;
 if not found then raise exception '参加者ではありません。' using errcode='42501'; end if;
 if (v_room.host_id=v_user_id and v_room.status='waiting') or v_room.status='playing' then
  update public.aqw_match_rooms set status='cancelled',finished_at=now() where id=v_room.id;
  v_status:='cancelled';
 else
  v_status:=v_room.status;
 end if;
 return jsonb_build_object('success',true,'room_status',v_status);
end;
$$;
