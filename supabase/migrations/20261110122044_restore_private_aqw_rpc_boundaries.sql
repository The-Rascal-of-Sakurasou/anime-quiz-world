-- Keep the private schema inaccessible to API roles. Public wrappers use a tightly-scoped
-- SECURITY DEFINER boundary; their grants remain limited to public leaderboard reads
-- or authenticated, auth.uid()-scoped actions.
revoke usage on schema private from anon, authenticated;

revoke all on function private.get_aqw_player_leaderboard(text,text) from public, anon, authenticated;
revoke all on function private.get_aqw_player_my_rank(text,text) from public, anon, authenticated;
revoke all on function private.get_aqw_speed_rush_leaderboard(text) from public, anon, authenticated;
revoke all on function private.get_aqw_speed_rush_my_rank(text) from public, anon, authenticated;
revoke all on function private.is_site_owner() from public, anon, authenticated;
revoke all on function private.reset_aqw_player_records() from public, anon, authenticated;
revoke all on function private.set_aqw_leaderboard_enabled(boolean) from public, anon, authenticated;
revoke all on function private.submit_aqw_player_run(uuid,integer,integer,integer) from public, anon, authenticated;
revoke all on function private.submit_aqw_speed_rush(integer,integer,uuid) from public, anon, authenticated;
grant execute on function private.is_site_owner_mfa() to authenticated;

alter function public.get_aqw_player_leaderboard(text,text) security definer;
alter function public.get_aqw_player_my_rank(text,text) security definer;
alter function public.get_aqw_speed_rush_leaderboard(text) security definer;
alter function public.get_aqw_speed_rush_my_rank(text) security definer;
alter function public.is_site_owner() security definer;
alter function public.reset_aqw_player_records() security definer;
alter function public.set_aqw_leaderboard_enabled(boolean) security definer;
alter function public.submit_aqw_player_run(uuid,integer,integer,integer) security definer;
alter function public.submit_aqw_speed_rush(integer,integer,uuid) security definer;

revoke all on function public.get_aqw_player_leaderboard(text,text) from public, anon, authenticated;
revoke all on function public.get_aqw_player_my_rank(text,text) from public, anon, authenticated;
revoke all on function public.get_aqw_speed_rush_leaderboard(text) from public, anon, authenticated;
revoke all on function public.get_aqw_speed_rush_my_rank(text) from public, anon, authenticated;
revoke all on function public.is_site_owner() from public, anon, authenticated;
revoke all on function public.reset_aqw_player_records() from public, anon, authenticated;
revoke all on function public.set_aqw_leaderboard_enabled(boolean) from public, anon, authenticated;
revoke all on function public.submit_aqw_player_run(uuid,integer,integer,integer) from public, anon, authenticated;
revoke all on function public.submit_aqw_speed_rush(integer,integer,uuid) from public, anon, authenticated;

grant execute on function public.get_aqw_player_leaderboard(text,text) to anon, authenticated;
grant execute on function public.get_aqw_speed_rush_leaderboard(text) to anon, authenticated;
grant execute on function public.get_aqw_player_my_rank(text,text) to authenticated;
grant execute on function public.get_aqw_speed_rush_my_rank(text) to authenticated;
grant execute on function public.is_site_owner() to authenticated;
grant execute on function public.reset_aqw_player_records() to authenticated;
grant execute on function public.set_aqw_leaderboard_enabled(boolean) to authenticated;
grant execute on function public.submit_aqw_player_run(uuid,integer,integer,integer) to authenticated;
grant execute on function public.submit_aqw_speed_rush(integer,integer,uuid) to authenticated;
