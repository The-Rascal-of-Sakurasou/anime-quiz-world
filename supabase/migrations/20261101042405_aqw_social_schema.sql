
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 24 and username ~ '^[A-Za-z0-9_]+$'),
  display_name text not null default 'AQW User' check (char_length(display_name) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 280),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 2000),
  image_path text,
  parent_post_id uuid references public.posts(id) on delete cascade,
  quiz_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(body) > 0 or image_path is not null or quiz_result is not null)
);
create index posts_created_at_idx on public.posts(created_at desc);
create index posts_user_created_idx on public.posts(user_id, created_at desc);
create index posts_parent_created_idx on public.posts(parent_post_id, created_at asc);
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on public.follows(following_id);
create table public.post_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index post_likes_post_idx on public.post_likes(post_id);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('follow','like','reply')),
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_recipient_created_idx on public.notifications(recipient_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  base_name text;
  chosen_name text;
begin
  base_name := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'aqw_user'), '[^a-zA-Z0-9_]', '', 'g'));
  if char_length(base_name) < 3 then base_name := 'aqw_user'; end if;
  base_name := left(base_name, 18);
  chosen_name := base_name;
  while exists (select 1 from public.profiles p where p.username = chosen_name) loop
    chosen_name := left(base_name, 18) || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 5);
  end loop;
  insert into public.profiles(id, username, display_name)
  values (new.id, chosen_name, coalesce(nullif(left(new.raw_user_meta_data ->> 'display_name', 40), ''), chosen_name));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.notify_follow()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications(recipient_id, actor_id, kind)
  values (new.following_id, new.follower_id, 'follow');
  return new;
end;
$$;
create trigger follows_notification after insert on public.follows
for each row execute procedure public.notify_follow();

create or replace function public.notify_like()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.posts where id = new.post_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications(recipient_id, actor_id, kind, post_id)
    values (owner_id, new.user_id, 'like', new.post_id);
  end if;
  return new;
end;
$$;
create trigger likes_notification after insert on public.post_likes
for each row execute procedure public.notify_like();

create or replace function public.notify_reply()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_id uuid;
begin
  if new.parent_post_id is not null then
    select user_id into owner_id from public.posts where id = new.parent_post_id;
    if owner_id is not null and owner_id <> new.user_id then
      insert into public.notifications(recipient_id, actor_id, kind, post_id)
      values (owner_id, new.user_id, 'reply', new.id);
    end if;
  end if;
  return new;
end;
$$;
create trigger replies_notification after insert on public.posts
for each row execute procedure public.notify_reply();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.follows enable row level security;
alter table public.post_likes enable row level security;
alter table public.notifications enable row level security;

create policy "Profiles are publicly readable" on public.profiles for select to anon, authenticated using (true);
create policy "Users can create own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Posts are publicly readable" on public.posts for select to anon, authenticated using (true);
create policy "Authenticated users can create posts as themselves" on public.posts for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own posts" on public.posts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own posts" on public.posts for delete to authenticated using (auth.uid() = user_id);

create policy "Follows are publicly readable" on public.follows for select to anon, authenticated using (true);
create policy "Users can follow as themselves" on public.follows for insert to authenticated with check (auth.uid() = follower_id);
create policy "Users can unfollow as themselves" on public.follows for delete to authenticated using (auth.uid() = follower_id);

create policy "Likes are publicly readable" on public.post_likes for select to anon, authenticated using (true);
create policy "Users can like as themselves" on public.post_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can unlike as themselves" on public.post_likes for delete to authenticated using (auth.uid() = user_id);

create policy "Users can read own notifications" on public.notifications for select to authenticated using (auth.uid() = recipient_id);
create policy "Users can mark own notifications read" on public.notifications for update to authenticated using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('aqw-social', 'aqw-social', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;
create policy "AQW social images are public" on storage.objects for select to anon, authenticated using (bucket_id = 'aqw-social');
create policy "Users upload images to their own folder" on storage.objects for insert to authenticated with check (bucket_id = 'aqw-social' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users update images in their own folder" on storage.objects for update to authenticated using (bucket_id = 'aqw-social' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'aqw-social' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete images in their own folder" on storage.objects for delete to authenticated using (bucket_id = 'aqw-social' and (storage.foldername(name))[1] = auth.uid()::text);
