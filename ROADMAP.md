# AQW Feature Roadmap

Tracking issue: https://github.com/The-Rascal-of-Sakurasou/anime-quiz-world/issues/1

## Existing features — reuse, do not duplicate

- Account registration and sign-in
- User profiles
- Posts, replies, likes, and follows
- Mutual-follow relationships used as friends
- Notifications
- Direct messages between mutual follows
- Speed Rush online leaderboard
- Quiz modes: normal, daily, timed, and continuous play
- Achievements, XP, streaks, missions, and play history (some progress is currently browser-local)
- Anime search and recommendation quiz/result sharing
- Multilingual interface
- Guide/news page and administrator tools

## Planned additions

### P0 — Online multiplayer
- [ ] Create a match room
- [ ] Join by room code or invitation link
- [ ] Invite existing friends (reuse mutual follows)
- [ ] Public matchmaking
- [ ] 2–4 player lobby and online presence
- [ ] Ready state, host start, leave, reconnect
- [ ] Synchronized questions, timer, and answer submission
- [ ] Server-side answer/score validation and result persistence
- [ ] Match results, wins/losses, and match history
- [ ] Rematch with the same players
- [ ] Separate multiplayer leaderboard (do not mix with solo rankings)

### P1 — Social integration
- [ ] Show match records, achievements, and match history on profiles
- [ ] Match invitations and reconnect notifications
- [ ] Per-user multiplayer statistics page

### P2 — Cross-device progress
- [ ] Sync achievements, XP, streaks, missions, and play history to the signed-in account
- [ ] Restore progress on another device
- [ ] Merge existing local progress without duplicate records

## Security and quality requirements

- Reuse existing profiles, follows, messages, notifications, and leaderboard infrastructure.
- Inspect existing tables, RPCs, and UI before adding a feature.
- Keep solo and multiplayer rankings separate.
- Never label client-reported scores as verified.
- Enable RLS and restrict room data and operations to participants.
- Use private Realtime channels with participant-based authorization.
- Never expose passwords, email addresses, or administrator data to other users.
- Test desktop and mobile layouts, normal and failure paths, RLS, grants, and Realtime authorization.

## Implementation order

1. Multiplayer database and authorization design
2. Room creation, joining, and lobby
3. Synchronized quiz, server validation, and result storage
4. Matchmaking, friend invitations, and rematches
5. Match history, multiplayer ranking, and profile integration
6. Cross-device progress synchronization
