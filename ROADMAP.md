# AQW Feature Roadmap

Tracking issue: https://github.com/The-Rascal-of-Sakurasou/anime-quiz-world/issues/1

## Existing features — reuse, do not duplicate
- Account registration and sign-in
- User profiles
- Posts, replies, likes, and follows
- Mutual-follow relationships used as friends
- Notifications and direct messages between mutual follows
- Speed Rush online leaderboard
- Quiz modes: normal, daily, timed, and continuous play
- Achievements, XP, streaks, missions, and play history (some progress is browser-local)
- Anime search and recommendation quiz/result sharing
- Multilingual interface
- Guide/news page and administrator tools

## P0 — One-versus-one online multiplayer
- [x] Restrict new room creation, room joining, and random matchmaking to exactly 2 players
- [x] 1v1 lobby, readiness state, room codes, and invitation links
- [x] 1v1 random matchmaking with recent-opponent avoidance
- [x] Host starts only when both players are ready
- [x] Server-generated shared question set from AniList (expanded to up to 250 popular Japanese-origin candidates)
- [x] Deliver the same questions and options to both players in the same order
- [x] Synchronized 20-second timer and reload-based reconnect/resume
- [x] Server-side answer validation; answer keys stay private until question resolution
- [x] Consistent simultaneous-answer and timeout handling
- [x] Persist per-match scores and completion state in room/player records; calculate winner server-side
- [x] Handle question timeout and opponent departure
- [x] Explicit surrender with server-assigned opponent victory
- [x] Consent-based same-opponent rematch (10-minute request expiry; both players must accept)
- [x] Aggregate win/loss statistics and recent match-history screen (up to 20 recent matches)
- [ ] Separate 1v1 leaderboard
- [ ] Full match test with two or more real accounts

## P1 — Social integration
- [ ] Invite existing friends (reuse mutual follows)
- [ ] Match invitation and reconnect notifications
- [ ] Show match records and history on profiles

## P2 — Expand multiplayer
- [ ] Add 3–4 player rooms only after 1v1 gameplay is stable and tested

## P3 — Cross-device progress
- [ ] Sync achievements, XP, streaks, missions, and play history to the signed-in account
- [ ] Restore progress on another device
- [ ] Merge existing local progress without duplicates

## Security and quality requirements
- Reuse existing profiles, follows, messages, notifications, and leaderboard infrastructure.
- Keep solo and multiplayer rankings separate.
- Never trust client-reported correctness or scores; keep answer keys and scoring on the server.
- Restrict room data and operations to participants.
- Never expose passwords, email addresses, or administrator data to other users.
- Test desktop and mobile layouts, normal and failure paths, RLS, grants, and multi-account matches.

## Next implementation order
1. Full 1v1 match testing with two or more real accounts
2. Separate 1v1 leaderboard
4. Friend invitations and profile integration
5. Expand to 3–4 players only after 1v1 validation
6. Cross-device progress synchronization
