# Anime Quiz World — Online Multiplayer Test Plan

Status: **The expanded PostgreSQL 16 integration flow and Deno type check passed in GitHub Actions on 2026-11-10.**

The SQL schema and Edge Function are still drafts. CI applies the SQL to a disposable PostgreSQL 16 instance with minimal Supabase Auth/Realtime compatibility stubs. This verifies PostgreSQL syntax and the tested database flows, but it is not a full Supabase environment. Additional tests must still be run against a disposable Supabase project or local Supabase stack. Never use the production project for negative or destructive tests.

## Test fixture requirements

- Two or more disposable authenticated test accounts.
- A private question bank containing at least 10 reviewed questions.
- Each question has a non-empty `prompt`, 2–6 options, unique option IDs, non-empty option text, and one valid `correct_option_id`.
- A valid Edge Function environment with the project URL, publishable/anon key, service-role key, and a high-entropy `AQW_ROOM_CODE_SECRET`.
- Realtime public access disabled before testing private channels.
- Browser clients must call the Edge Function; they must not call the service-role RPCs directly.

## Question-bank validation

| Case | Expected result |
|---|---|
| Valid question with 2 options | Insert succeeds |
| Valid question with 6 options | Insert succeeds |
| Missing or empty prompt | Rejected |
| Options missing or not an array | Rejected |
| Fewer than 2 or more than 6 options | Rejected |
| Option missing string ID or text | Rejected |
| Empty option ID or text | Rejected |
| Duplicate option IDs | Rejected |
| Correct option ID absent from options | Rejected |
| Top-level `correct_option_id` inside public payload | Rejected |

## Authentication and authorization

| Case | Expected result |
|---|---|
| Missing bearer token | HTTP 401 |
| Invalid or expired JWT | HTTP 401 |
| Valid JWT | Actor ID is taken from verified user |
| Client sends another user's ID in payload | Ignored; never used as actor |
| Browser calls dispatcher RPC directly | Permission denied |
| Browser calls rate-limit RPC directly | Permission denied |
| Non-member requests match state | Rejected |
| Non-host attempts to start | Rejected |

## Lobby and room lifecycle

| Case | Expected result |
|---|---|
| Host creates a room with defaults | Waiting room and one host player created |
| Invalid player count or question count | Rejected |
| Valid room code joins | Player is added |
| Incorrect room code | Generic unavailable response |
| Join after room expiry | Rejected |
| Join after match starts | Rejected |
| Join when room is full | Rejected |
| Duplicate join by same user | Existing membership reused |
| 11th join-code attempt within 10 minutes | HTTP 429 |
| Join throttle after 10-minute window | Counter resets |
| Non-host leaves waiting room | Only that member is removed |
| Host leaves waiting room | Room is cancelled |

## Match execution

| Case | Expected result |
|---|---|
| Start with fewer than 2 players | Rejected |
| Start while any player is not ready | Rejected |
| Start with too few active questions | Rejected |
| Host starts with all players ready | Match starts and first question is created |
| Correct answer | Server marks correct and calculates points |
| Incorrect answer | Server awards zero points |
| Option ID not present in question | Rejected |
| Second answer from same player/question | Rejected by unique constraint |
| Answer after server deadline | Rejected |
| All players answer | Next question is created |
| No one answers before deadline | Next question becomes available on the next state refresh |
| Final question completes | Results and ranks are persisted |
| Client requests match state | Correct option ID is never returned |
| Player disconnects and reconnects within 5 minutes | Membership is restored |
| Reconnect after grace period | Rejected |

## Concurrency and resilience

- Submit answers simultaneously from two accounts and verify each is recorded once.
- Send two simultaneous start requests and verify only one match start occurs.
- Poll match state from multiple clients around the question deadline.
- Simulate a browser refresh and a temporary network interruption.
- Verify a client cannot alter points, correctness, deadline, player ID, or another player's ready state.
- Verify a failed/aborted request does not leave a partially transitioned match.

## Automated checks currently covered

The GitHub Actions workflow runs:

- Applying the full SQL draft to disposable PostgreSQL 16.
- Question-bank trigger validation.
- Room creation, joining, capacity enforcement, ready state, and host-only start.
- Answer option validation, duplicate-answer rejection, automatic advancement, and final result persistence.
- Correct-answer-key omission from match-state output.
- Rejection of direct dispatcher/rate-limit calls by the `authenticated` role.
- Rejection of non-host starts, full-room joins, unknown answer options, and answer attempts while disconnected.
- Successful reconnect before the grace period expires.
- The 10-attempt room-code throttle.
- Realtime membership policy allows member Presence and blocks client-originated Broadcast messages.
- Question-bank generator validation tests, including duplicate detection and answer-key leakage prevention.
- Applying the generated seed twice and confirming that source-key upserts do not create duplicates.
- Deno type checking of the Edge Function.

Workflow: `.github/workflows/multiplayer-sql-tests.yml`.

## Release gates

Do not deploy the Edge Function or apply the SQL to production until:

1. The full SQL applies cleanly to an isolated database.
2. Every test above has a recorded pass/fail result.
3. Supabase security advisors show no unresolved critical findings.
4. Edge Function type-checking and local invocation pass.
5. Realtime private-channel membership checks pass.
6. Two-browser end-to-end testing passes on desktop and mobile.
7. Room-code rate limiting has been reviewed for both account-level and infrastructure-level abuse.
8. A trusted question import process and a reviewed question set exist.

## Known limitations in the current draft

- The question bank is empty. An offline JSON-to-SQL seed generator exists, but there is no admin import interface or reviewed anime question dataset.
- The room-code throttle is per authenticated account, not per IP or device.
- A player who leaves during an active match is marked disconnected; automatic host migration is not implemented.
- Question timeout advancement currently happens when a client requests match state after the deadline. A scheduled server-side advance mechanism is not yet implemented.
- SQL and TypeScript checks pass in GitHub Actions, but the harness is not a full Supabase stack and the Edge Function has not been deployed or invoked against a real Supabase project.
