-- LOCAL TEST ONLY. Never run this against a hosted or production database.
-- Creates a disposable owner identity so aqw_security_smoke.sql can exercise
-- the AAL1/AAL2 owner checks without copying any production account data.

begin;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-8111-111111111111',
  'authenticated',
  'authenticated',
  'aqw-local-admin@example.invalid',
  crypt('local-only-test-password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"username":"aqw_local_admin","display_name":"AQW Local Admin"}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

insert into private.site_admins (user_id)
values ('11111111-1111-4111-8111-111111111111')
on conflict (user_id) do nothing;

commit;
