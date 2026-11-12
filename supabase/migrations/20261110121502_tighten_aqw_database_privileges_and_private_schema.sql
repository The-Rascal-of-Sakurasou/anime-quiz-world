
-- Close direct access to implementation-only routines.
REVOKE USAGE ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO service_role;

-- Public API wrappers execute as their trusted owner and retain an empty search_path.
ALTER FUNCTION public.get_aqw_player_leaderboard(text,text) SECURITY DEFINER;
ALTER FUNCTION public.get_aqw_player_leaderboard(text,text) SET search_path = '';
ALTER FUNCTION public.get_aqw_speed_rush_leaderboard(text) SECURITY DEFINER;
ALTER FUNCTION public.get_aqw_speed_rush_leaderboard(text) SET search_path = '';
ALTER FUNCTION public.get_aqw_player_my_rank(text,text) SECURITY DEFINER;
ALTER FUNCTION public.get_aqw_player_my_rank(text,text) SET search_path = '';
ALTER FUNCTION public.get_aqw_speed_rush_my_rank(text) SECURITY DEFINER;
ALTER FUNCTION public.get_aqw_speed_rush_my_rank(text) SET search_path = '';
ALTER FUNCTION public.reset_aqw_player_records() SECURITY DEFINER;
ALTER FUNCTION public.reset_aqw_player_records() SET search_path = '';
ALTER FUNCTION public.set_aqw_leaderboard_enabled(boolean) SECURITY DEFINER;
ALTER FUNCTION public.set_aqw_leaderboard_enabled(boolean) SET search_path = '';
ALTER FUNCTION public.submit_aqw_player_run(uuid,integer,integer,integer) SECURITY DEFINER;
ALTER FUNCTION public.submit_aqw_player_run(uuid,integer,integer,integer) SET search_path = '';
ALTER FUNCTION public.submit_aqw_speed_rush(integer,integer,uuid) SECURITY DEFINER;
ALTER FUNCTION public.submit_aqw_speed_rush(integer,integer,uuid) SET search_path = '';
ALTER FUNCTION public.is_site_owner() SECURITY DEFINER;
ALTER FUNCTION public.is_site_owner() SET search_path = '';

-- Remove broad table privileges (including TRUNCATE and TRIGGER) and re-grant only needed operations.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.profiles, public.posts, public.follows, public.post_likes,
  public.aqw_player_stats, public.aqw_speed_rush_scores TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT INSERT, DELETE ON public.follows, public.post_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.friend_messages TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT DELETE ON public.aqw_player_stats, public.aqw_speed_rush_scores TO authenticated;

-- Explicit function grants: public leaderboard reads only; private actions require login.
REVOKE ALL ON FUNCTION public.get_aqw_player_leaderboard(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_aqw_player_leaderboard(text,text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_aqw_speed_rush_leaderboard(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_aqw_speed_rush_leaderboard(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_aqw_player_my_rank(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_aqw_player_my_rank(text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.get_aqw_speed_rush_my_rank(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_aqw_speed_rush_my_rank(text) TO authenticated;
REVOKE ALL ON FUNCTION public.reset_aqw_player_records() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_aqw_player_records() TO authenticated;
REVOKE ALL ON FUNCTION public.set_aqw_leaderboard_enabled(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_aqw_leaderboard_enabled(boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_aqw_player_run(uuid,integer,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_aqw_player_run(uuid,integer,integer,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_aqw_speed_rush(integer,integer,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_aqw_speed_rush(integer,integer,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.is_site_owner() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_site_owner() TO authenticated;
