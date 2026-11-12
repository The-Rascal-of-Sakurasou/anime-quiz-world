
ALTER POLICY "Site owner can manage player stats" ON public.aqw_player_stats
  USING ((SELECT private.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'))
  WITH CHECK ((SELECT private.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'));
ALTER POLICY "Site owner can manage speed rush scores" ON public.aqw_speed_rush_scores
  USING ((SELECT private.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'))
  WITH CHECK ((SELECT private.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'));
ALTER POLICY "Site owner can manage follows" ON public.follows
  USING ((SELECT private.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'))
  WITH CHECK ((SELECT private.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'));
ALTER POLICY "Site owner can manage friend messages" ON public.friend_messages
  USING ((SELECT private.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'))
  WITH CHECK ((SELECT private.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'));
ALTER POLICY "Site owner can manage notifications" ON public.notifications
  USING ((SELECT private.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'))
  WITH CHECK ((SELECT private.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'));
ALTER POLICY "Site owner can manage post likes" ON public.post_likes
  USING ((SELECT private.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'))
  WITH CHECK ((SELECT private.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'));
ALTER POLICY "Site owner can manage posts" ON public.posts
  USING ((SELECT private.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'))
  WITH CHECK ((SELECT private.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'));
ALTER POLICY "Site owner can moderate profiles" ON public.profiles
  USING ((SELECT private.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'))
  WITH CHECK ((SELECT private.is_site_owner()) AND ((SELECT auth.jwt())->>'aal' = 'aal2'));
