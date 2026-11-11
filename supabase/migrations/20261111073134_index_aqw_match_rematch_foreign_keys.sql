create index aqw_match_rematch_requester_created_idx
  on private.aqw_match_rematch_requests(requester_id, created_at desc);
create index aqw_match_rematch_new_room_idx
  on private.aqw_match_rematch_requests(new_room_id)
  where new_room_id is not null;