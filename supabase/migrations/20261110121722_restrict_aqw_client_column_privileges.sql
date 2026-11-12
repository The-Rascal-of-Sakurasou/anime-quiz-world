
-- Restrict writes to only the columns used by the application.
REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (username, display_name, bio, avatar_path, updated_at, leaderboard_enabled)
  ON public.profiles TO authenticated;
-- Profile rows are created by the trusted auth trigger, not by browser clients.

REVOKE INSERT, UPDATE ON public.posts FROM authenticated;
GRANT INSERT (user_id, body, image_path, parent_post_id)
  ON public.posts TO authenticated;
GRANT UPDATE (body, image_path, updated_at)
  ON public.posts TO authenticated;

REVOKE INSERT ON public.follows FROM authenticated;
GRANT INSERT (follower_id, following_id) ON public.follows TO authenticated;

REVOKE INSERT ON public.post_likes FROM authenticated;
GRANT INSERT (user_id, post_id) ON public.post_likes TO authenticated;

REVOKE INSERT ON public.friend_messages FROM authenticated;
GRANT INSERT (sender_id, recipient_id, body) ON public.friend_messages TO authenticated;

REVOKE UPDATE ON public.notifications FROM authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;
