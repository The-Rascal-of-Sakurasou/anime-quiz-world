-- Restrict Anime Quiz World site-management permissions to explicitly registered owner accounts.
-- The owner UUID is intentionally seeded separately in the production project so personal
-- account identifiers are not committed to this public repository.

create table if not exists private.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table private.site_admins enable row level security;
revoke all on table private.site_admins from anon, authenticated;

create or replace function private.is_site_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from private.site_admins a
    where a.user_id = (select auth.uid())
  );
$function$;

revoke all on function private.is_site_owner() from public, anon;
grant execute on function private.is_site_owner() to authenticated;

create or replace function public.is_site_owner()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.is_site_owner();
$function$;

revoke all on function public.is_site_owner() from public, anon;
grant execute on function public.is_site_owner() to authenticated;

drop policy if exists "Site owner can moderate profiles" on public.profiles;
create policy "Site owner can moderate profiles"
on public.profiles
for update
to authenticated
using ((select private.is_site_owner()))
with check ((select private.is_site_owner()));

drop policy if exists "Site owner can manage posts" on public.posts;
create policy "Site owner can manage posts"
on public.posts
for all
to authenticated
using ((select private.is_site_owner()))
with check ((select private.is_site_owner()));

drop policy if exists "Site owner can manage follows" on public.follows;
create policy "Site owner can manage follows"
on public.follows
for all
to authenticated
using ((select private.is_site_owner()))
with check ((select private.is_site_owner()));

drop policy if exists "Site owner can manage friend messages" on public.friend_messages;
create policy "Site owner can manage friend messages"
on public.friend_messages
for all
to authenticated
using ((select private.is_site_owner()))
with check ((select private.is_site_owner()));

drop policy if exists "Site owner can manage notifications" on public.notifications;
create policy "Site owner can manage notifications"
on public.notifications
for all
to authenticated
using ((select private.is_site_owner()))
with check ((select private.is_site_owner()));

drop policy if exists "Site owner can manage post likes" on public.post_likes;
create policy "Site owner can manage post likes"
on public.post_likes
for all
to authenticated
using ((select private.is_site_owner()))
with check ((select private.is_site_owner()));

drop policy if exists "Site owner can manage player stats" on public.aqw_player_stats;
create policy "Site owner can manage player stats"
on public.aqw_player_stats
for all
to authenticated
using ((select private.is_site_owner()))
with check ((select private.is_site_owner()));

drop policy if exists "Site owner can manage speed rush scores" on public.aqw_speed_rush_scores;
create policy "Site owner can manage speed rush scores"
on public.aqw_speed_rush_scores
for all
to authenticated
using ((select private.is_site_owner()))
with check ((select private.is_site_owner()));

drop policy if exists "Site owner can manage AQW social images" on storage.objects;
create policy "Site owner can manage AQW social images"
on storage.objects
for all
to authenticated
using (bucket_id = 'aqw-social' and (select private.is_site_owner()))
with check (bucket_id = 'aqw-social' and (select private.is_site_owner()));

-- Environment-specific owner registration (run once per project, not committed):
-- insert into private.site_admins (user_id) values ('<verified-auth-user-uuid>');
