-- Reconstructed from the live AQW database catalog on 2026-11-15.
-- The table, constraints, RLS policies, grants, and absence of triggers/indexes
-- (apart from the primary key) were checked against the deployed database.

create table public.qa_questions (
  id uuid not null default gen_random_uuid(),
  display_name text not null default ''::text,
  title text not null,
  body text not null,
  status text not null default 'new'::text,
  admin_reply text not null default ''::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  answered_at timestamp with time zone,
  constraint qa_questions_pkey primary key (id),
  constraint qa_questions_admin_reply_check check (char_length(admin_reply) <= 3000),
  constraint qa_questions_body_check check (char_length(btrim(body)) >= 5 and char_length(btrim(body)) <= 3000),
  constraint qa_questions_display_name_check check (char_length(display_name) <= 40),
  constraint qa_questions_status_check check (status = any (array['new'::text, 'reviewing'::text, 'answered'::text, 'closed'::text])),
  constraint qa_questions_title_check check (char_length(btrim(title)) >= 1 and char_length(btrim(title)) <= 100)
);

comment on table public.qa_questions is
  'Private questions submitted through the public AQW Q&A form. Only the MFA-verified site owner can read or manage submissions.';

alter table public.qa_questions enable row level security;

create policy "Anyone can submit a question"
on public.qa_questions for insert to anon, authenticated
with check (
  display_name is not null
  and char_length(display_name) <= 40
  and char_length(btrim(title)) >= 1
  and char_length(btrim(title)) <= 100
  and char_length(btrim(body)) >= 5
  and char_length(btrim(body)) <= 3000
);

create policy "Site owner can read questions with MFA"
on public.qa_questions for select to authenticated
using ((select is_site_owner()) and (select auth.jwt() ->> 'aal') = 'aal2');

create policy "Site owner can update questions with MFA"
on public.qa_questions for update to authenticated
using ((select is_site_owner()) and (select auth.jwt() ->> 'aal') = 'aal2')
with check ((select is_site_owner()) and (select auth.jwt() ->> 'aal') = 'aal2');

grant select, update on table public.qa_questions to authenticated;
grant all on table public.qa_questions to service_role;
