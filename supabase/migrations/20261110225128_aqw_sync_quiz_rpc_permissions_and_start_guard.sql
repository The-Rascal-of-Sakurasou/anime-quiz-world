
grant execute on function private.aqw_match_prepare_questions_impl(text,uuid,jsonb) to service_role;
grant execute on function private.aqw_match_game_state_impl(text) to authenticated;
grant execute on function private.aqw_match_submit_answer_impl(text,smallint) to authenticated;

create or replace function private.aqw_match_start_room_impl(p_room_code text)
returns jsonb language plpgsql security definer set search_path=''
as $$
begin
 raise exception '対戦開始は、サーバー側の問題準備を通じて実行してください。';
end;
$$;
