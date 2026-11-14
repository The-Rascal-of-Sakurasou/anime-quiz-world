-- Restrict internal SECURITY DEFINER user-scoped RPCs to authenticated callers.
-- Public API wrappers remain responsible for normal client access.
--
-- These two helpers may exist in hosted environments without being present in
-- the repository's tracked migration history. Guard the grants so a clean local
-- migration replay does not fail when an optional helper is absent.

do $$
begin
  if to_regprocedure('private.reset_aqw_player_records()') is not null then
    execute 'revoke all on function private.reset_aqw_player_records() from public, anon';
    execute 'grant execute on function private.reset_aqw_player_records() to authenticated';
  end if;

  if to_regprocedure('private.set_aqw_leaderboard_enabled(boolean)') is not null then
    execute 'revoke all on function private.set_aqw_leaderboard_enabled(boolean) from public, anon';
    execute 'grant execute on function private.set_aqw_leaderboard_enabled(boolean) to authenticated';
  end if;
end
$$;
