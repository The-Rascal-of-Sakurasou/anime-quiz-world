alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind = any (array['follow'::text,'like'::text,'reply'::text,'message'::text]));
create or replace function public.notify_friend_message() returns trigger language plpgsql security definer set search_path = '' as $function$
begin
  if new.sender_id is distinct from new.recipient_id then
    insert into public.notifications(recipient_id, actor_id, kind, post_id)
    values (new.recipient_id, new.sender_id, 'message', null);
  end if;
  return new;
end;
$function$;
drop trigger if exists friend_message_notification on public.friend_messages;
create trigger friend_message_notification after insert on public.friend_messages for each row execute function public.notify_friend_message();
alter publication supabase_realtime add table public.notifications;