-- Enforce the current one-versus-one product rule at the table boundary.
alter table public.aqw_match_rooms
  drop constraint aqw_match_rooms_max_players_check;
alter table public.aqw_match_rooms
  add constraint aqw_match_rooms_max_players_check check (max_players = 2);

alter table public.aqw_match_players
  drop constraint aqw_match_players_seat_check;
alter table public.aqw_match_players
  add constraint aqw_match_players_seat_check check (seat between 1 and 2);
