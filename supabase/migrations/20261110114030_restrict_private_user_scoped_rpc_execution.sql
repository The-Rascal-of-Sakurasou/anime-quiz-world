-- Restrict internal SECURITY DEFINER user-scoped RPCs to authenticated callers.
-- Public API wrappers remain responsible for normal client access.

revoke all on function private.reset_aqw_player_records() from public, anon;
grant execute on function private.reset_aqw_player_records() to authenticated;

revoke all on function private.set_aqw_leaderboard_enabled(boolean) from public, anon;
grant execute on function private.set_aqw_leaderboard_enabled(boolean) to authenticated;
