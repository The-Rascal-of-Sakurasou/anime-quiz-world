
create table if not exists public.friend_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint friend_messages_not_self check (sender_id <> recipient_id)
);
create index if not exists friend_messages_pair_created_idx
  on public.friend_messages (sender_id, recipient_id, created_at);
create index if not exists friend_messages_recipient_created_idx
  on public.friend_messages (recipient_id, sender_id, created_at);
alter table public.friend_messages enable row level security;
drop policy if exists "Friends can read messages" on public.friend_messages;
create policy "Friends can read messages" on public.friend_messages
for select to authenticated
using (
  (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()))
  and exists (
    select 1 from public.follows f1
    join public.follows f2 on f1.follower_id = f2.following_id
                         and f1.following_id = f2.follower_id
    where f1.follower_id = sender_id and f1.following_id = recipient_id
  )
);
drop policy if exists "Friends can send messages" on public.friend_messages;
create policy "Friends can send messages" on public.friend_messages
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and recipient_id <> (select auth.uid())
  and exists (
    select 1 from public.follows f1
    join public.follows f2 on f1.follower_id = f2.following_id
                         and f1.following_id = f2.follower_id
    where f1.follower_id = sender_id and f1.following_id = recipient_id
  )
);
drop policy if exists "Senders can delete own messages" on public.friend_messages;
create policy "Senders can delete own messages" on public.friend_messages
for delete to authenticated
using (sender_id = (select auth.uid()));
grant select, insert, delete on public.friend_messages to authenticated;
