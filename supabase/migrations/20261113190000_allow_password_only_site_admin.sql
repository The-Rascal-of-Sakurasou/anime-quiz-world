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
