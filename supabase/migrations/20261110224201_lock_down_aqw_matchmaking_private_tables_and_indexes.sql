create policy aqw_matchmaking_queue_no_client_access
on private.aqw_matchmaking_queue
for all to anon,authenticated
using (false)
with check (false);

create policy aqw_matchmaking_pair_history_no_client_access
on private.aqw_matchmaking_pair_history
for all to anon,authenticated
using (false)
with check (false);

create index aqw_matchmaking_pair_history_user_high_idx
  on private.aqw_matchmaking_pair_history (user_high);
