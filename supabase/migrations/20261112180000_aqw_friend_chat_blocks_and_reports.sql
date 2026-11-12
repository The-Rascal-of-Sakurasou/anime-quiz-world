-- User safety controls for the mutual-follow chat.
-- Blocks prevent follows and direct messages in either direction.
-- Reports are visible only to the reporter and an MFA-verified site owner.

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_blocks_pkey primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self_block check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_id_idx
  on public.user_blocks (blocked_id, blocker_id);

alter table public.user_blocks enable row level security;

revoke all on table public.user_blocks from public, anon, authenticated;
grant select, insert, delete on table public.user_blocks to authenticated;

drop policy if exists "Users can read own blocks" on public.user_blocks;
create policy "Users can read own blocks"
  on public.user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

drop policy if exists "Users can block other users" on public.user_blocks;
create policy "Users can block other users"
  on public.user_blocks for insert to authenticated
  with check (
    blocker_id = (select auth.uid())
    and blocked_id <> (select auth.uid())
  );

drop policy if exists "Users can unblock own blocks" on public.user_blocks;
create policy "Users can unblock own blocks"
  on public.user_blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

create or replace function private.is_user_blocked_between(
  p_user_a uuid,
  p_user_b uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.user_blocks b
    where (b.blocker_id = p_user_a and b.blocked_id = p_user_b)
       or (b.blocker_id = p_user_b and b.blocked_id = p_user_a)
  );
$function$;

revoke all on function private.is_user_blocked_between(uuid, uuid) from public, anon, authenticated;
grant execute on function private.is_user_blocked_between(uuid, uuid) to authenticated;

-- A block prevents new follows in either direction.
drop policy if exists "Users can follow as themselves" on public.follows;
create policy "Users can follow as themselves"
  on public.follows for insert to authenticated
  with check (
    (
      follower_id = (select auth.uid())
      and not (select private.is_user_blocked_between(follower_id, following_id))
    )
    or (select private.is_site_owner_mfa())
  );

-- A block immediately prevents reading or sending messages in that conversation.
drop policy if exists "Friends can read messages" on public.friend_messages;
create policy "Friends can read messages"
  on public.friend_messages for select to authenticated
  using (
    (select private.is_site_owner_mfa())
    or (
      (
        sender_id = (select auth.uid())
        or recipient_id = (select auth.uid())
      )
      and not (select private.is_user_blocked_between(sender_id, recipient_id))
      and exists (
        select 1
        from public.follows f1
        join public.follows f2
          on f1.follower_id = f2.following_id
         and f1.following_id = f2.follower_id
        where f1.follower_id = friend_messages.sender_id
          and f1.following_id = friend_messages.recipient_id
      )
    )
  );

drop policy if exists "Friends can send messages" on public.friend_messages;
create policy "Friends can send messages"
  on public.friend_messages for insert to authenticated
  with check (
    (select private.is_site_owner_mfa())
    or (
      sender_id = (select auth.uid())
      and recipient_id <> (select auth.uid())
      and not (select private.is_user_blocked_between(sender_id, recipient_id))
      and exists (
        select 1
        from public.follows f1
        join public.follows f2
          on f1.follower_id = f2.following_id
         and f1.following_id = f2.follower_id
        where f1.follower_id = friend_messages.sender_id
          and f1.following_id = friend_messages.recipient_id
      )
    )
  );

-- Defense in depth: blocked users must not generate chat/follow notifications.
create or replace function public.notify_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not private.is_user_blocked_between(new.follower_id, new.following_id) then
    insert into public.notifications(recipient_id, actor_id, kind)
    values (new.following_id, new.follower_id, 'follow');
  end if;
  return new;
end;
$function$;

create or replace function public.notify_friend_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.sender_id is distinct from new.recipient_id
     and not private.is_user_blocked_between(new.sender_id, new.recipient_id) then
    insert into public.notifications(recipient_id, actor_id, kind, post_id)
    values (new.recipient_id, new.sender_id, 'message', null);
  end if;
  return new;
end;
$function$;

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  message_id uuid references public.friend_messages(id) on delete set null,
  post_id uuid references public.posts(id) on delete set null,
  reason text not null check (reason in ('harassment', 'spam', 'inappropriate', 'other')),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  constraint user_reports_not_self check (reporter_id <> reported_user_id),
  constraint user_reports_one_context check (num_nonnulls(message_id, post_id) <= 1)
);

create index if not exists user_reports_status_created_idx
  on public.user_reports (status, created_at desc);
create index if not exists user_reports_reporter_created_idx
  on public.user_reports (reporter_id, created_at desc);

create unique index if not exists user_reports_pending_message_idx
  on public.user_reports (reporter_id, message_id)
  where message_id is not null and status = 'pending';
create unique index if not exists user_reports_pending_post_idx
  on public.user_reports (reporter_id, post_id)
  where post_id is not null and status = 'pending';
create unique index if not exists user_reports_pending_profile_idx
  on public.user_reports (reporter_id, reported_user_id)
  where message_id is null and post_id is null and status = 'pending';

alter table public.user_reports enable row level security;

revoke all on table public.user_reports from public, anon, authenticated;
grant select, insert, update on table public.user_reports to authenticated;

drop policy if exists "Users can read own reports or MFA owner" on public.user_reports;
create policy "Users can read own reports or MFA owner"
  on public.user_reports for select to authenticated
  using (
    reporter_id = (select auth.uid())
    or (select private.is_site_owner_mfa())
  );

drop policy if exists "Users can submit reports" on public.user_reports;
create policy "Users can submit reports"
  on public.user_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and reported_user_id <> (select auth.uid())
    and (
      (message_id is null and post_id is null)
      or (
        message_id is not null
        and exists (
          select 1
          from public.friend_messages m
          where m.id = user_reports.message_id
            and (
              (m.sender_id = user_reports.reported_user_id and m.recipient_id = (select auth.uid()))
              or
              (m.recipient_id = user_reports.reported_user_id and m.sender_id = (select auth.uid()))
            )
        )
      )
      or (
        post_id is not null
        and exists (
          select 1
          from public.posts p
          where p.id = user_reports.post_id
            and p.user_id = user_reports.reported_user_id
        )
      )
    )
  );

drop policy if exists "MFA owner can review reports" on public.user_reports;
create policy "MFA owner can review reports"
  on public.user_reports for update to authenticated
  using ((select private.is_site_owner_mfa()))
  with check (
    (select private.is_site_owner_mfa())
    and (reviewed_by is null or reviewed_by = (select auth.uid()))
  );

comment on table public.user_blocks is
  'User-created blocks. A block prevents mutual-follow chat and new follows in either direction.';
comment on table public.user_reports is
  'Private moderation reports. Visible to the reporter and MFA-verified site owner only.';
