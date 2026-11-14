-- Reconstruct the already-applied Q&A table migration so fresh databases can replay it.
-- The following rate-limit migration removes the public INSERT policy before enabling submissions via Edge Function.
create table if not exists public.qa_questions (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default '',
  title text not null,
  body text not null,
  status text not null default 'new',
  admin_reply text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  answered_at timestamptz,
  constraint qa_questions_display_name_check check (char_length(display_name) <= 40),
  constraint qa_questions_title_check check (char_length(btrim(title)) >= 1 and char_length(btrim(title)) <= 100),
  constraint qa_questions_body_check check (char_length(btrim(body)) >= 5 and char_length(btrim(body)) <= 3000),
  constraint qa_questions_admin_reply_check check (char_length(admin_reply) <= 3000),
  constraint qa_questions_status_check check (status = any (array['new'::text, 'reviewing'::text, 'answered'::text, 'closed'::text]))
);

alter table public.qa_questions enable row level security;

grant select, update on table public.qa_questions to authenticated;
grant all on table public.qa_questions to service_role;

drop policy if exists "Anyone can submit a question" on public.qa_questions;
create policy "Anyone can submit a question"
  on public.qa_questions for insert
  to anon, authenticated
  with check (
    display_name is not null
    and char_length(display_name) <= 40
    and char_length(btrim(title)) between 1 and 100
    and char_length(btrim(body)) between 5 and 3000
  );

drop policy if exists "Site owner can read questions with MFA" on public.qa_questions;
create policy "Site owner can read questions with MFA"
  on public.qa_questions for select
  to authenticated
  using (public.is_site_owner() and (select auth.jwt() ->> 'aal') = 'aal2');

drop policy if exists "Site owner can update questions with MFA" on public.qa_questions;
create policy "Site owner can update questions with MFA"
  on public.qa_questions for update
  to authenticated
  using (public.is_site_owner() and (select auth.jwt() ->> 'aal') = 'aal2')
  with check (public.is_site_owner() and (select auth.jwt() ->> 'aal') = 'aal2');
