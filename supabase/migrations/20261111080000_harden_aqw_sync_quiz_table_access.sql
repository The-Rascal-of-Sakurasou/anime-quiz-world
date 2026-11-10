-- Explicitly deny direct client access to match state tables.
-- All supported reads/writes go through the participant-checked RPC functions.
drop policy if exists aqw_match_rooms_deny_direct_client_access on public.aqw_match_rooms;
create policy aqw_match_rooms_deny_direct_client_access
  on public.aqw_match_rooms for all to anon, authenticated
  using (false) with check (false);

drop policy if exists aqw_match_players_deny_direct_client_access on public.aqw_match_players;
create policy aqw_match_players_deny_direct_client_access
  on public.aqw_match_players for all to anon, authenticated
  using (false) with check (false);

-- Cover the user foreign key for delete/update maintenance and avoid FK scans.
create index if not exists aqw_match_answers_user_id_idx
  on private.aqw_match_answers(user_id);