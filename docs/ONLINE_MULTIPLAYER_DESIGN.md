# Anime Quiz World — Online Multiplayer Design

## Status

Implementation status (2026-11-10):

- An authenticated Edge Function gateway draft now exists at `supabase/functions/match/index.ts`.
- `supabase/config.toml` enables platform JWT verification for that function.
- The gateway verifies the caller with `auth.getUser(token)`, derives the actor ID from that verified user, restricts actions and payload fields, and HMAC-hashes room codes with an Edge Function secret.
- The gateway calls `public.aqw_match_dispatch`, which has **not** been implemented yet. The function is therefore a source draft, not deployable or usable.
- The SQL draft now includes a private question bank with record validation, a service-role-only dispatcher, server-side answer scoring, question deadlines, result ranking, room lifecycle operations, and a per-account room-code attempt throttle. The SQL has passed an automated PostgreSQL 16 integration run using disposable Auth/Realtime compatibility stubs, and the Edge Function has passed Deno type checking. It has not been applied to the hosted database.
- The question bank is empty: a trusted admin/import workflow and reviewed question data are still required before a match can start.
- No production database schema, RLS policy, Realtime setting, secret, or Edge Function has been changed.

The next required work is to validate the SQL on an isolated database, populate a reviewed question bank through a trusted process, deploy the Edge Function only after tests, and then build the lobby client.

The current Supabase project has Auth and social/profile tables, but no multiplayer tables and no deployed Edge Functions. The first implementation must therefore add a separate, auditable multiplayer layer.

## MVP user experience

1. A signed-in player opens **オンライン対戦**.
2. They choose **ルームを作成** or **コードで参加**.
3. The host chooses a short match preset (initial MVP: 10 questions, fixed difficulty).
4. The lobby lists members and ready status. The host starts once at least two players are ready.
5. Every participant receives the same question and answer options.
6. Answers are submitted to the server. The server records correctness and response time.
7. The result screen shows rank, correct answers, and points.
8. A disconnected player can reconnect to the same room during a limited grace period.

Random matchmaking can follow after private rooms are stable.

## Proposed architecture

- **Static client:** GitHub Pages; displays the lobby, question, timer, and results.
- **Supabase Auth:** require a verified authenticated user for ranked matches.
- **Supabase Edge Functions:** authoritative operations. The client never chooses the correct answer, final score, or another player's result.
- **Postgres:** persistent room membership and match results. Correct answers and answer keys stay in a non-exposed `private` schema.
- **Realtime Broadcast + Presence:** low-latency room events and online/ready indicators. Use private channels and membership-based RLS.

### Proposed data model

| Object | Schema | Purpose |
|---|---|---|
| `aqw_match_rooms` | private | Room code hash, host, status, capacity, expiry |
| `aqw_match_players` | private | Match membership, ready state, connection state |
| `aqw_question_bank` | private | Curated question payload and server-only correct option |
| `aqw_match_questions` | private | Ordered question payload and answer key |
| `aqw_match_answers` | private | One submitted answer per player per question |
| `aqw_match_results` | private | Server-calculated final result |

Do not store raw room access codes. Store a keyed hash and compare inside a server-side function. Apply room expiry and player-count limits.

## Server operations

Implement as authenticated Edge Function actions:

- `create_room`: create room, generate one-time join code, add host membership.
- `join_room`: validate code, capacity, status, and expiry; add membership.
- `set_ready`: update only the caller's ready state.
- `start_match`: host-only; generate and persist the shared question set; transition lobby to in-progress.
- `submit_answer`: accept only the caller's answer for the active question; enforce one answer per question and server-side deadline.
- Question advancement and match completion are currently internal SQL operations: advance when all players answer or the 20-second server deadline passes, then calculate results from private answer rows.
- `reconnect`: restore the caller's membership during the reconnect window.
- `leave_room`: leave safely; transfer host only under defined conditions.

The function must derive the player ID from the verified JWT, never from a client-supplied `user_id`. Validate every input, enforce rate limits, and use transactions for state transitions.

## Realtime authorization

- Use topics scoped to a UUID, such as `aqw-match:<match-uuid>`.
- Require `private: true` in the Realtime channel configuration.
- Authorize Broadcast and Presence only when `auth.uid()` has a membership row for the match ID extracted from the topic.
- Do not allow arbitrary clients to broadcast authoritative state such as scores, answer keys, timers, or match completion.
- Treat Broadcast as notification/transport, not the source of truth. Clients refresh state from authorized server responses.

The project's Realtime setting **Allow public access** must be disabled before private channels are relied on in production. This setting has not been changed.

## Security requirements

- Keep service-role/secret keys exclusively in Edge Function secrets.
- Never expose answer keys or server-calculated scores in public tables or Realtime payloads.
- Enable RLS on every exposed table and grant only the required Data API privileges.
- Public table exposure must be explicitly configured; do not assume newly created public tables are automatically exposed.
- Restrict updates to each player's own ready state and membership.
- Prevent replayed answers with a unique constraint on (match_id, question_no, user_id).
- Use server timestamps and server-side deadlines; do not trust the client clock.
- Expire abandoned rooms and delete old private answer data according to a retention policy.
- Do not add custom objects to the `realtime` schema. Current Supabase versions lock that schema; RLS policies on `realtime.messages` remain the supported authorization mechanism.

## Delivery sequence

1. Build and review the SQL migration and RLS policies.
2. Apply to a development database/branch, not production.
3. Implement Edge Functions and test invalid JWTs, non-members, full/expired rooms, duplicate answers, late answers, host disconnects, and reconnects.
4. Build the lobby UI and connect private Realtime channels.
5. Run two-browser end-to-end tests, including mobile layout and network interruption.
6. Run Supabase security advisors and only then prepare production migration/deployment.

## Current SQL draft behavior

- The public RPC dispatcher accepts only the actions currently allowlisted by the Edge Function: `create_room`, `join_room`, `set_ready`, `start_match`, `submit_answer`, `get_match_state`, `reconnect`, and `leave_room`.
- The dispatcher is intended to be executable only by `service_role`; the Edge Function must continue deriving the actor ID from a verified user JWT.
- Each question is open for 20 seconds. A correct answer earns up to 1,500 points, with the speed component calculated by the server. Incorrect answers earn zero.
- The server sends the question payload and deadline, but not the stored correct option ID.
- Question-bank writes are checked for a non-empty prompt, 2–6 unique option IDs with non-empty labels, and a correct option ID that exists in the options.
- The draft currently selects from a private question bank. It contains no seed questions, so starting a match correctly fails until enough active questions have been curated and loaded.
- A player who leaves during an active match is marked disconnected rather than removed, so the match can still finish consistently. Host migration is not implemented in this draft.

## Current blockers

- The draft has not been applied, so no multiplayer tables exist in the hosted database.
- No Edge Functions are deployed.
- The question bank has no imported questions and no admin import workflow yet.
- Realtime private-channel authorization and the project-wide public-access setting have not been configured for matches.
- The current database has a Supabase Auth warning: leaked-password protection is disabled. This is unrelated to multiplayer, but should be reviewed in Auth settings.
