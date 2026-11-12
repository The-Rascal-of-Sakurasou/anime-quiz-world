
grant usage on schema private to anon;
drop policy if exists aqw_speed_rush_attempts_deny_client_access on private.aqw_speed_rush_attempts;
create policy aqw_speed_rush_attempts_deny_client_access
on private.aqw_speed_rush_attempts
for all to anon, authenticated
using (false)
with check (false);
