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
- [x] Separate 1v1 leaderboard (respects the existing profile visibility setting; wins, win rate, and match count)
- [ ] Full match test with two or more real accounts

## P0 — Solo and Speed Rush leaderboard integrity
- [ ] Replace client-trusted solo quiz scores with server-issued run sessions and server-verified answer submissions.
- [ ] Calculate XP and correctness on the server; do not trust client-supplied `correctCount`, `xpMultiplier`, or `questionResults`.
- [ ] Derive Speed Rush elapsed time from a server-side session instead of trusting client-supplied `elapsed_ms`.
- [ ] Reject incomplete or empty per-question result payloads for leaderboard submissions.
- [ ] Keep browser-local progress separate from verified online ranking records.
- Current limitation: the existing RPCs validate input ranges and some internal consistency, but a signed-in client can still fabricate the reported results. This is not a fully cheat-resistant leaderboard.

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

## P0 — AniList API usage compliance
- [ ] Confirm whether the current 10k-record stored catalogue is permitted under AniList's current API terms, or obtain written permission with guardian review.
- [ ] Replace bulk catalogue storage/sync with a compliant on-demand data strategy or a separately licensed source if permission is not available.
- [x] Pause automatic scheduled/push-triggered bulk sync; retain manual workflow only pending review.

### Supabase security audit (2026-11-12)
- [x] RLS enabled on all 19 public/private application tables.
- [x] Client writes limited through column-level privileges and ownership policies.
- [x] Administrative actions require owner authorization and MFA (AAL2).
- [x] User reports and block lists are private to the relevant user/admin roles.
- [ ] Enable Supabase Auth leaked-password protection in the project dashboard; the connected tools cannot change this Auth setting.
- [ ] Rework solo and Speed Rush leaderboard submissions to use server-verified sessions before treating scores as tamper-resistant.

## Security and quality requirements
- Reuse existing profiles, follows, messages, notifications, and leaderboard infrastructure.
- Keep solo and multiplayer rankings separate.
- Never trust client-reported correctness or scores; keep answer keys and scoring on the server.
- Restrict room data and operations to participants.
- Never expose passwords, email addresses, or administrator data to other users.
- Test desktop and mobile layouts, normal and failure paths, RLS, grants, and multi-account matches.

## Next implementation order
1. Full 1v1 match testing with two or more real accounts — use [the live test checklist](docs/ONE_VS_ONE_LIVE_TEST_CHECKLIST.md)
2. Friend invitations and profile integration
3. Expand to 3–4 players only after 1v1 validation
4. Cross-device progress synchronization
