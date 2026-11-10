-- Keep private implementation routines in the non-exposed private schema.
-- Only explicitly granted routines are callable by the API roles.
GRANT USAGE ON SCHEMA private TO anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.get_aqw_player_leaderboard(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_aqw_speed_rush_leaderboard(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_aqw_player_my_rank(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_aqw_speed_rush_my_rank(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_site_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_site_owner_mfa() TO authenticated;
GRANT EXECUTE ON FUNCTION private.reset_aqw_player_records() TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_aqw_leaderboard_enabled(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION private.submit_aqw_player_run(uuid,integer,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION private.submit_aqw_speed_rush(integer,integer,uuid) TO authenticated;

-- Public RPCs are SECURITY INVOKER wrappers; authorization and writes are handled
-- by the narrowly granted private routines with auth.uid()-scoped checks.
ALTER FUNCTION public.get_aqw_player_leaderboard(text,text) SECURITY INVOKER;
ALTER FUNCTION public.get_aqw_player_leaderboard(text,text) SET search_path = '';
ALTER FUNCTION public.get_aqw_speed_rush_leaderboard(text) SECURITY INVOKER;
ALTER FUNCTION public.get_aqw_speed_rush_leaderboard(text) SET search_path = '';
ALTER FUNCTION public.get_aqw_player_my_rank(text,text) SECURITY INVOKER;
ALTER FUNCTION public.get_aqw_player_my_rank(text,text) SET search_path = '';
ALTER FUNCTION public.get_aqw_speed_rush_my_rank(text) SECURITY INVOKER;
ALTER FUNCTION public.get_aqw_speed_rush_my_rank(text) SET search_path = '';
ALTER FUNCTION public.reset_aqw_player_records() SECURITY INVOKER;
ALTER FUNCTION public.reset_aqw_player_records() SET search_path = '';
ALTER FUNCTION public.set_aqw_leaderboard_enabled(boolean) SECURITY INVOKER;
ALTER FUNCTION public.set_aqw_leaderboard_enabled(boolean) SET search_path = '';
ALTER FUNCTION public.submit_aqw_player_run(uuid,integer,integer,integer) SECURITY INVOKER;
ALTER FUNCTION public.submit_aqw_player_run(uuid,integer,integer,integer) SET search_path = '';
ALTER FUNCTION public.submit_aqw_speed_rush(integer,integer,uuid) SECURITY INVOKER;
ALTER FUNCTION public.submit_aqw_speed_rush(integer,integer,uuid) SET search_path = '';
ALTER FUNCTION public.is_site_owner() SECURITY INVOKER;
ALTER FUNCTION public.is_site_owner() SET search_path = '';

REVOKE ALL ON FUNCTION public.get_aqw_player_leaderboard(text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_aqw_speed_rush_leaderboard(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_aqw_player_my_rank(text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_aqw_speed_rush_my_rank(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_aqw_player_records() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_aqw_leaderboard_enabled(boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_aqw_player_run(uuid,integer,integer,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_aqw_speed_rush(integer,integer,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_site_owner() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_aqw_player_leaderboard(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_aqw_speed_rush_leaderboard(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_aqw_player_my_rank(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_aqw_speed_rush_my_rank(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_aqw_player_records() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_aqw_leaderboard_enabled(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_aqw_player_run(uuid,integer,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_aqw_speed_rush(integer,integer,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_site_owner() TO authenticated;

-- Every administrator action requires owner membership and an AAL2 session.
DROP POLICY IF EXISTS "Site owner can manage player stats" ON public.aqw_player_stats;
CREATE POLICY "Site owner can manage player stats" ON public.aqw_player_stats FOR ALL TO authenticated
  USING ((SELECT private.is_site_owner_mfa())) WITH CHECK ((SELECT private.is_site_owner_mfa()));
DROP POLICY IF EXISTS "Site owner can manage speed rush scores" ON public.aqw_speed_rush_scores;
CREATE POLICY "Site owner can manage speed rush scores" ON public.aqw_speed_rush_scores FOR ALL TO authenticated
  USING ((SELECT private.is_site_owner_mfa())) WITH CHECK ((SELECT private.is_site_owner_mfa()));
DROP POLICY IF EXISTS "Site owner can manage follows" ON public.follows;
CREATE POLICY "Site owner can manage follows" ON public.follows FOR ALL TO authenticated
  USING ((SELECT private.is_site_owner_mfa())) WITH CHECK ((SELECT private.is_site_owner_mfa()));
DROP POLICY IF EXISTS "Site owner can manage friend messages" ON public.friend_messages;
CREATE POLICY "Site owner can manage friend messages" ON public.friend_messages FOR ALL TO authenticated
  USING ((SELECT private.is_site_owner_mfa())) WITH CHECK ((SELECT private.is_site_owner_mfa()));
DROP POLICY IF EXISTS "Site owner can manage notifications" ON public.notifications;
CREATE POLICY "Site owner can manage notifications" ON public.notifications FOR ALL TO authenticated
  USING ((SELECT private.is_site_owner_mfa())) WITH CHECK ((SELECT private.is_site_owner_mfa()));
DROP POLICY IF EXISTS "Site owner can manage post likes" ON public.post_likes;
CREATE POLICY "Site owner can manage post likes" ON public.post_likes FOR ALL TO authenticated
  USING ((SELECT private.is_site_owner_mfa())) WITH CHECK ((SELECT private.is_site_owner_mfa()));
DROP POLICY IF EXISTS "Site owner can manage posts" ON public.posts;
CREATE POLICY "Site owner can manage posts" ON public.posts FOR ALL TO authenticated
  USING ((SELECT private.is_site_owner_mfa())) WITH CHECK ((SELECT private.is_site_owner_mfa()));
DROP POLICY IF EXISTS "Site owner can moderate profiles" ON public.profiles;
CREATE POLICY "Site owner can moderate profiles" ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT private.is_site_owner_mfa())) WITH CHECK ((SELECT private.is_site_owner_mfa()));
DROP POLICY IF EXISTS "Site owner can manage AQW social images" ON storage.objects;
CREATE POLICY "Site owner can manage AQW social images" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'aqw-social' AND (SELECT private.is_site_owner_mfa()))
  WITH CHECK (bucket_id = 'aqw-social' AND (SELECT private.is_site_owner_mfa()));
