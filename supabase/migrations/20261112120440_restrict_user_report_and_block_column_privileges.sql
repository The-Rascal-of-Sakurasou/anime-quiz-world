-- Prevent users from setting moderation-owned report fields.
revoke insert on table public.user_blocks from public, anon, authenticated;
grant insert (blocker_id, blocked_id)
  on table public.user_blocks to authenticated;

revoke insert, update on table public.user_reports from public, anon, authenticated;
grant insert (reporter_id, reported_user_id, message_id, post_id, reason, details)
  on table public.user_reports to authenticated;
grant update (status, reviewed_at, reviewed_by)
  on table public.user_reports to authenticated;
