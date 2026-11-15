-- Restore the intended anonymous and authenticated Q&A submission path.
-- Row-level security remains enabled and the existing INSERT policy continues
-- to validate display name, title, and body lengths.
GRANT INSERT ON TABLE public.qa_questions TO anon, authenticated;
