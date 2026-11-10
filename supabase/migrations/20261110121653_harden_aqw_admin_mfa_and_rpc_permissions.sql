-- Require an AAL2 session for every database policy that grants site-owner access.
create or replace function private.is_site_owner_mfa()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select coalesce(auth.jwt() ->> 'aal' = 'aal2', false)
     and private.is_site_owner();
$function$;

grant usage on schema private to anon, authenticated;
revoke all on function private.is_site_owner_mfa() from public, anon, authenticated;
grant execute on function private.is_site_owner_mfa() to authenticated;

drop policy if exists "Site owner can manage player stats" on public.aqw_player_stats;
create policy "Site owner can manage player stats" on public.aqw_player_stats for all to authenticated
using ((select private.is_site_owner_mfa())) with check ((select private.is_site_owner_mfa()));

drop policy if exists "Site owner can manage speed rush scores" on public.aqw_speed_rush_scores;
create policy "Site owner can manage speed rush scores" on public.aqw_speed_rush_scores for all to authenticated
using ((select private.is_site_owner_mfa())) with check ((select private.is_site_owner_mfa()));

drop policy if exists "Site owner can manage follows" on public.follows;
create policy "Site owner can manage follows" on public.follows for all to authenticated
using ((select private.is_site_owner_mfa())) with check ((select private.is_site_owner_mfa()));

drop policy if exists "Site owner can manage friend messages" on public.friend_messages;
create policy "Site owner can manage friend messages" on public.friend_messages for all to authenticated
using ((select private.is_site_owner_mfa())) with check ((select private.is_site_owner_mfa()));

drop policy if exists "Site owner can manage notifications" on public.notifications;
create policy "Site owner can manage notifications" on public.notifications for all to authenticated
using ((select private.is_site_owner_mfa())) with check ((select private.is_site_owner_mfa()));

drop policy if exists "Site owner can manage post likes" on public.post_likes;
create policy "Site owner can manage post likes" on public.post_likes for all to authenticated
using ((select private.is_site_owner_mfa())) with check ((select private.is_site_owner_mfa()));

drop policy if exists "Site owner can manage posts" on public.posts;
create policy "Site owner can manage posts" on public.posts for all to authenticated
using ((select private.is_site_owner_mfa())) with check ((select private.is_site_owner_mfa()));

drop policy if exists "Site owner can moderate profiles" on public.profiles;
create policy "Site owner can moderate profiles" on public.profiles for update to authenticated
using ((select private.is_site_owner_mfa())) with check ((select private.is_site_owner_mfa()));

drop policy if exists "Site owner can manage AQW social images" on storage.objects;
create policy "Site owner can manage AQW social images" on storage.objects for all to authenticated
using (bucket_id = 'aqw-social' and (select private.is_site_owner_mfa()))
with check (bucket_id = 'aqw-social' and (select private.is_site_owner_mfa()));

revoke all on function private.get_aqw_player_leaderboard(text,text) from public, anon, authenticated;
revoke all on function private.get_aqw_player_my_rank(text,text) from public, anon, authenticated;
revoke all on function private.get_aqw_speed_rush_leaderboard(text) from public, anon, authenticated;
revoke all on function private.get_aqw_speed_rush_my_rank(text) from public, anon, authenticated;
revoke all on function private.is_site_owner() from public, anon, authenticated;
revoke all on function private.reset_aqw_player_records() from public, anon, authenticated;
revoke all on function private.set_aqw_leaderboard_enabled(boolean) from public, anon, authenticated;
revoke all on function private.submit_aqw_player_run(uuid,integer,integer,integer) from public, anon, authenticated;
revoke all on function private.submit_aqw_speed_rush(integer,integer,uuid) from public, anon, authenticated;

grant execute on function private.get_aqw_player_leaderboard(text,text) to anon, authenticated;
grant execute on function private.get_aqw_speed_rush_leaderboard(text) to anon, authenticated;
grant execute on function private.get_aqw_player_my_rank(text,text) to authenticated;
grant execute on function private.get_aqw_speed_rush_my_rank(text) to authenticated;
grant execute on function private.is_site_owner() to authenticated;
grant execute on function private.reset_aqw_player_records() to authenticated;
grant execute on function private.set_aqw_leaderboard_enabled(boolean) to authenticated;
grant execute on function private.submit_aqw_player_run(uuid,integer,integer,integer) to authenticated;
grant execute on function private.submit_aqw_speed_rush(integer,integer,uuid) to authenticated;

alter function public.get_aqw_player_leaderboard(text,text) security invoker;
alter function public.get_aqw_player_my_rank(text,text) security invoker;
alter function public.get_aqw_speed_rush_leaderboard(text) security invoker;
alter function public.get_aqw_speed_rush_my_rank(text) security invoker;
alter function public.is_site_owner() security invoker;
alter function public.reset_aqw_player_records() security invoker;
alter function public.set_aqw_leaderboard_enabled(boolean) security invoker;
alter function public.submit_aqw_player_run(uuid,integer,integer,integer) security invoker;
alter function public.submit_aqw_speed_rush(integer,integer,uuid) security invoker;

revoke all on function public.get_aqw_player_leaderboard(text,text) from public, anon, authenticated;
revoke all on function public.get_aqw_player_my_rank(text,text) from public, anon, authenticated;
revoke all on function public.get_aqw_speed_rush_leaderboard(text) from public, anon, authenticated;
revoke all on function public.get_aqw_speed_rush_my_rank(text) from public, anon, authenticated;
revoke all on function public.is_site_owner() from public, anon, authenticated;
revoke all on function public.reset_aqw_player_records() from public, anon, authenticated;
revoke all on function public.set_aqw_leaderboard_enabled(boolean) from public, anon, authenticated;
revoke all on function public.submit_aqw_player_run(uuid,integer,integer,integer) from public, anon, authenticated;
revoke all on function public.submit_aqw_speed_rush(integer,integer,uuid) from public, anon, authenticated;

grant execute on function public.get_aqw_player_leaderboard(text,text) to anon, authenticated;
grant execute on function public.get_aqw_speed_rush_leaderboard(text) to anon, authenticated;
grant execute on function public.get_aqw_player_my_rank(text,text) to authenticated;
grant execute on function public.get_aqw_speed_rush_my_rank(text) to authenticated;
grant execute on function public.is_site_owner() to authenticated;
grant execute on function public.reset_aqw_player_records() to authenticated;
grant execute on function public.set_aqw_leaderboard_enabled(boolean) to authenticated;
grant execute on function public.submit_aqw_player_run(uuid,integer,integer,integer) to authenticated;
grant execute on function public.submit_aqw_speed_rush(integer,integer,uuid) to authenticated;
