-- Admin sign-in uses the existing email/password session and single-owner check.
-- Keep the legacy function name because existing RLS policies reference it.
-- The function no longer requires an AAL2/TOTP session.
create or replace function private.is_site_owner_mfa()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select private.is_site_owner();
$function$;

revoke all on function private.is_site_owner_mfa() from public, anon, authenticated;
grant execute on function private.is_site_owner_mfa() to authenticated;

-- Rename the historical policy to reflect the current password-only owner check.
drop policy if exists "MFA owner can review reports" on public.user_reports;
drop policy if exists "Site owner can review reports" on public.user_reports;
create policy "Site owner can review reports"
  on public.user_reports for update to authenticated
  using ((select private.is_site_owner_mfa()))
  with check (
    (select private.is_site_owner_mfa())
    and (reviewed_by is null or reviewed_by = (select auth.uid()))
  );

comment on table public.user_reports is
  'Private moderation reports. Visible to the reporter and registered site owner only.';
