-- Remove broad owner ALL policies and fold the MFA gate into the exact
-- operations that require owner access. This avoids duplicate permissive
-- policies while preserving the existing user-facing access model.

drop policy if exists "Site owner can manage player stats" on public.aqw_player_stats;
drop policy if exists "Enabled player rankings are publicly readable" on public.aqw_player_stats;
create policy "Enabled player rankings are publicly readable by guests"
on public.aqw_player_stats for select to anon
using (exists (select 1 from public.profiles p where p.id = aqw_player_stats.user_id and p.leaderboard_enabled));
create policy "Enabled player rankings or MFA owner access"
on public.aqw_player_stats for select to authenticated
using (
  exists (select 1 from public.profiles p where p.id = aqw_player_stats.user_id and p.leaderboard_enabled)
  or (select private.is_site_owner_mfa())
);
create policy "MFA owner can insert player stats"
on public.aqw_player_stats for insert to authenticated
with check ((select private.is_site_owner_mfa()));
create policy "MFA owner can update player stats"
on public.aqw_player_stats for update to authenticated
using ((select private.is_site_owner_mfa()))
with check ((select private.is_site_owner_mfa()));
create policy "MFA owner can delete player stats"
on public.aqw_player_stats for delete to authenticated
using ((select private.is_site_owner_mfa()));

drop policy if exists "Site owner can manage speed rush scores" on public.aqw_speed_rush_scores;
drop policy if exists "Enabled speed rush rankings are publicly readable" on public.aqw_speed_rush_scores;
create policy "Enabled speed rush rankings are publicly readable by guests"
on public.aqw_speed_rush_scores for select to anon
using (exists (select 1 from public.profiles p where p.id = aqw_speed_rush_scores.user_id and p.leaderboard_enabled));
create policy "Enabled speed rush rankings or MFA owner access"
on public.aqw_speed_rush_scores for select to authenticated
using (
  exists (select 1 from public.profiles p where p.id = aqw_speed_rush_scores.user_id and p.leaderboard_enabled)
  or (select private.is_site_owner_mfa())
);
create policy "MFA owner can insert speed rush scores"
on public.aqw_speed_rush_scores for insert to authenticated
with check ((select private.is_site_owner_mfa()));
create policy "MFA owner can update speed rush scores"
on public.aqw_speed_rush_scores for update to authenticated
using ((select private.is_site_owner_mfa()))
with check ((select private.is_site_owner_mfa()));
create policy "MFA owner can delete speed rush scores"
on public.aqw_speed_rush_scores for delete to authenticated
using ((select private.is_site_owner_mfa()));

drop policy if exists "Site owner can manage follows" on public.follows;
alter policy "Users can follow as themselves" on public.follows
with check (follower_id = (select auth.uid()) or (select private.is_site_owner_mfa()));
alter policy "Users can unfollow as themselves" on public.follows
using (follower_id = (select auth.uid()) or (select private.is_site_owner_mfa()));
create policy "MFA owner can update follows"
on public.follows for update to authenticated
using ((select private.is_site_owner_mfa()))
with check ((select private.is_site_owner_mfa()));

drop policy if exists "Site owner can manage friend messages" on public.friend_messages;
alter policy "Friends can read messages" on public.friend_messages
using (
  (select private.is_site_owner_mfa())
  or (
    (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()))
    and exists (
      select 1 from public.follows f1
      join public.follows f2
        on f1.follower_id = f2.following_id
       and f1.following_id = f2.follower_id
      where f1.follower_id = friend_messages.sender_id
        and f1.following_id = friend_messages.recipient_id
    )
  )
);
alter policy "Friends can send messages" on public.friend_messages
with check (
  (select private.is_site_owner_mfa())
  or (
    sender_id = (select auth.uid())
    and recipient_id <> (select auth.uid())
    and exists (
      select 1 from public.follows f1
      join public.follows f2
        on f1.follower_id = f2.following_id
       and f1.following_id = f2.follower_id
      where f1.follower_id = friend_messages.sender_id
        and f1.following_id = friend_messages.recipient_id
    )
  )
);
alter policy "Senders can delete own messages" on public.friend_messages
using (sender_id = (select auth.uid()) or (select private.is_site_owner_mfa()));
create policy "MFA owner can update friend messages"
on public.friend_messages for update to authenticated
using ((select private.is_site_owner_mfa()))
with check ((select private.is_site_owner_mfa()));

drop policy if exists "Site owner can manage notifications" on public.notifications;
alter policy "Users can read own notifications" on public.notifications
using (recipient_id = (select auth.uid()) or (select private.is_site_owner_mfa()));
alter policy "Users can mark own notifications read" on public.notifications
using (recipient_id = (select auth.uid()) or (select private.is_site_owner_mfa()))
with check (recipient_id = (select auth.uid()) or (select private.is_site_owner_mfa()));
create policy "MFA owner can insert notifications"
on public.notifications for insert to authenticated
with check ((select private.is_site_owner_mfa()));
create policy "MFA owner can delete notifications"
on public.notifications for delete to authenticated
using ((select private.is_site_owner_mfa()));

drop policy if exists "Site owner can manage post likes" on public.post_likes;
alter policy "Users can like as themselves" on public.post_likes
with check (user_id = (select auth.uid()) or (select private.is_site_owner_mfa()));
alter policy "Users can unlike as themselves" on public.post_likes
using (user_id = (select auth.uid()) or (select private.is_site_owner_mfa()));
create policy "MFA owner can update post likes"
on public.post_likes for update to authenticated
using ((select private.is_site_owner_mfa()))
with check ((select private.is_site_owner_mfa()));

drop policy if exists "Site owner can manage posts" on public.posts;
alter policy "Authenticated users can create posts as themselves" on public.posts
with check (user_id = (select auth.uid()) or (select private.is_site_owner_mfa()));
alter policy "Users can update own posts" on public.posts
using (user_id = (select auth.uid()) or (select private.is_site_owner_mfa()))
with check (user_id = (select auth.uid()) or (select private.is_site_owner_mfa()));
alter policy "Users can delete own posts" on public.posts
using (user_id = (select auth.uid()) or (select private.is_site_owner_mfa()));

drop policy if exists "Site owner can moderate profiles" on public.profiles;
alter policy "Users can update own profile" on public.profiles
using (id = (select auth.uid()) or (select private.is_site_owner_mfa()))
with check (id = (select auth.uid()) or (select private.is_site_owner_mfa()));
