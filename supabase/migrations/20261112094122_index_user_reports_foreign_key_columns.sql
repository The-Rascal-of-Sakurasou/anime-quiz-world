CREATE INDEX IF NOT EXISTS user_reports_message_id_fkey_idx
  ON public.user_reports (message_id);

CREATE INDEX IF NOT EXISTS user_reports_post_id_fkey_idx
  ON public.user_reports (post_id);

CREATE INDEX IF NOT EXISTS user_reports_reported_user_id_fkey_idx
  ON public.user_reports (reported_user_id);

CREATE INDEX IF NOT EXISTS user_reports_reviewed_by_fkey_idx
  ON public.user_reports (reviewed_by);
