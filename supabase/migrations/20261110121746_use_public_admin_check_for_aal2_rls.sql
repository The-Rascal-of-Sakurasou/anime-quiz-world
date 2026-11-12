
ALTER POLICY "Site owner can manage player stats" ON public.aqw_player_stats
  USING ((SELECT public.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'))
  WITH CHECK ((SELECT public.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'));
ALTER POLICY "Site owner can manage speed rush scores" ON public.aqw_speed_rush_scores
  USING ((SELECT public.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'))
  WITH CHECK ((SELECT public.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'));
ALTER POLICY "Site owner can manage follows" ON public.follows
  USING ((SELECT public.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'))
  WITH CHECK ((SELECT public.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'));
ALTER POLICY "Site owner can manage friend messages" ON public.friend_messages
  USING ((SELECT public.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'))
  WITH CHECK ((SELECT public.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'));
ALTER POLICY "Site owner can manage notifications" ON public.notifications
  USING ((SELECT public.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'))
  WITH CHECK ((SELECT public.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'));
ALTER POLICY "Site owner can manage post likes" ON public.post_likes
  USING ((SELECT public.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'))
  WITH CHECK ((SELECT public.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'));
ALTER POLICY "Site owner can manage posts" ON public.posts
  USING ((SELECT public.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'))
  WITH CHECK ((SELECT public.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'));
ALTER POLICY "Site owner can moderate profiles" ON public.profiles
  USING ((SELECT public.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'))
  WITH CHECK ((SELECT public.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'));
