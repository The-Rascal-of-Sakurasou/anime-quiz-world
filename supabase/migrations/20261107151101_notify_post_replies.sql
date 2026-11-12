create or replace function public.notify_post_reply() returns trigger language plpgsql security definer set search_path = '' as $function$
declare owner_id uuid;
begin
  if new.parent_post_id is null then return new; end if;
  select user_id into owner_id from public.posts where id = new.parent_post_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications(recipient_id, actor_id, kind, post_id)
    values (owner_id, new.user_id, 'reply', new.parent_post_id);
  end if;
  return new;
end;
$function$;
drop trigger if exists posts_reply_notification on public.posts;
create trigger posts_reply_notification after insert on public.posts for each row when (new.parent_post_id is not null) execute function public.notify_post_reply();