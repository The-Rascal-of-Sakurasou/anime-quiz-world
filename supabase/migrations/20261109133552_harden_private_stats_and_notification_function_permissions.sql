
REVOKE EXECUTE ON FUNCTION public.notify_friend_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_post_reply() FROM PUBLIC, anon, authenticated;
ALTER TABLE private.aqw_player_stat_runs ENABLE ROW LEVEL SECURITY;
