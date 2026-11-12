-- A caller may inspect block state only for a pair that includes their own user ID.
-- Server-side calls without an auth.uid() retain the full trusted lookup behavior.
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
  select case
    when (select auth.uid()) is not null
      and p_user_a is distinct from (select auth.uid())
      and p_user_b is distinct from (select auth.uid())
    then false
    else exists (
      select 1
      from public.user_blocks b
      where (b.blocker_id = p_user_a and b.blocked_id = p_user_b)
         or (b.blocker_id = p_user_b and b.blocked_id = p_user_a)
    )
  end;
$function$;
