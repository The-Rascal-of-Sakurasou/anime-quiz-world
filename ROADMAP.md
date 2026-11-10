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

### P0 — One-versus-one online multiplayer (complete this before expanding player count)
- [x] Restrict new room creation, room joining, and random matchmaking to exactly 2 players
- [x] 1v1 lobby, readiness state, room codes, and invitations by link
- [x] 1v1 random matchmaking with recent-opponent avoidance
- [ ] Host starts only when both players are ready
- [ ] Select and freeze one shared question set per match
- [ ] Deliver the same question and answer options to both players in the same order
- [ ] Synchronized question timer and reconnect/resume handling
- [ ] Server-side answer validation; never trust client-reported correctness or score
- [ ] Resolve simultaneous answers and timeout rules consistently
- [ ] Persist match result, wins/losses, and match history
- [ ] Handle disconnect, timeout, surrender, and opponent departure
- [ ] 1v1 match history and rematch
- [ ] Separate 1v1 leaderboard (do not mix with solo rankings)

### P1 — Social integration
- [ ] Invite existing friends (reuse mutual follows)
- [ ] Show match records, achievements, and match history on profiles
- [ ] Match invitations and reconnect notifications
- [ ] Per-user multiplayer statistics page

### P2 — Expand multiplayer
- [ ] Add 3–4 player rooms only after 1v1 gameplay is stable and tested

### P3 — Cross-device progress
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
- Keep the answer key and authoritative scoring on the server; never send answer keys to clients before the relevant question closes.
- Test desktop and mobile layouts, normal and failure paths, RLS, grants, and Realtime authorization.

## Implementation order

1. Enforce 1v1 room and matchmaking rules
2. Shared question-set generation and secure question delivery
3. Synchronized question flow, timer, and answer submission
4. Server-side scoring, result persistence, and disconnect handling
5. 1v1 match history, rematch, and separate ranking
6. Friend invitations and profile integration
7. Expand to 3–4 players only after 1v1 validation
8. Cross-device progress synchronization
