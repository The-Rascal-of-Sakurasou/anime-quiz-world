import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20261112230000_aqw_speed_rush_server_timing.sql', import.meta.url), 'utf8');

function requireMatch(source, pattern, message) {
  assert.match(source, pattern, message);
}

function extractFunction(source, qualifiedName) {
  const escaped = qualifiedName.replaceAll('.', '\\.');
  const match = source.match(new RegExp(
    `create or replace function ${escaped}\\([\\s\\S]*?\\$function\\$;?`,
    'i'
  ));
  assert.ok(match, `Missing function definition: ${qualifiedName}`);
  return match[0];
}

// Frontend contract: authenticated Speed Rush obtains a server-issued run,
// and the submitted elapsed time is never trusted as the score authority.
requireMatch(html, /rpc\\(['"]start_aqw_speed_rush['"]/i, 'Frontend must request a server run.');
requireMatch(html, /serverRunId/, 'Frontend must retain and submit the server run ID.');
requireMatch(html, /p_elapsed_ms:\\s*0/, 'Frontend must not submit a client-measured elapsed time.');
requireMatch(html, /if\\(!result\\?\\.serverRunId\\)/, 'Runs without a server token must not reach the leaderboard.');
requireMatch(html, /if\\(error\\)throw error/, 'A failed server start must not create a leaderboard-eligible run.');

// Start RPC: authenticated identity is mandatory, the run is created by the
// database, and the validity window is bounded.
const start = extractFunction(migration, 'private.start_aqw_speed_rush');
requireMatch(start, /security definer/i, 'Private start function must use its privileged owner context.');
requireMatch(start, /set search_path to ''/i, 'Start function must pin an empty search_path.');
requireMatch(start, /auth\\.uid\\(\\)/, 'Start function must derive identity from auth.uid().');
requireMatch(start, /if v_user_id is null then[\\s\\S]*?raise exception/i, 'Start function must reject unauthenticated calls.');
requireMatch(start, /clock_timestamp\\(\\) \\+ interval '3 minutes'/i, 'Server runs must expire after the configured window.');
requireMatch(migration, /grant execute on function public\\.start_aqw_speed_rush\\(\\) to authenticated/i, 'Only authenticated users should receive start RPC execute permission.');
requireMatch(migration, /revoke all on function public\\.start_aqw_speed_rush\\(\\) from public, anon/i, 'Start RPC must revoke public and anon execution.');

// Submit RPC: ownership, single-use, expiry, and server-clock checks must all
// be present before a leaderboard write can occur.
const submit = extractFunction(migration, 'private.submit_aqw_speed_rush');
requireMatch(submit, /auth\\.uid\\(\\)/, 'Submit function must derive identity from auth.uid().');
requireMatch(submit, /where run_id = p_run_id[\\s\\S]*?and user_id = v_user_id/i, 'Submit function must enforce run ownership.');
requireMatch(submit, /finished_at is null/i, 'Submit function must reject consumed runs.');
requireMatch(submit, /expires_at >= clock_timestamp\\(\\)/i, 'Submit function must reject expired runs.');
requireMatch(submit, /for update/i, 'Submit function must lock the run against concurrent replay.');
requireMatch(submit, /clock_timestamp\\(\\) - v_run\\.started_at/i, 'Elapsed time must be calculated from the database clock.');
requireMatch(submit, /v_elapsed_ms < 1000 or v_elapsed_ms > 120000/i, 'Elapsed time must be range-checked.');
requireMatch(submit, /set finished_at = clock_timestamp\\(\\)/i, 'A run must be consumed before the attempt is stored.');
requireMatch(submit, /insert into private\\.aqw_speed_rush_attempts/i, 'Accepted runs must create an attempt record.');
requireMatch(submit, /on conflict \\(user_id, run_id\\) do nothing/i, 'Attempt insertion must be idempotent for a run.');
requireMatch(submit, /excluded\\.correct_count > public\\.aqw_speed_rush_scores\\.correct_count/i, 'Best-score ordering must remain correct-count first.');
requireMatch(submit, /excluded\\.elapsed_ms < public\\.aqw_speed_rush_scores\\.elapsed_ms/i, 'Best-score ordering must use elapsed time as the tie-breaker.');
requireMatch(migration, /p_elapsed_ms is intentionally ignored/i, 'Client elapsed time must be explicitly documented as untrusted.');
requireMatch(migration, /correct count remains client-reported/i, 'Do not claim the answer count is server-authoritative.');
requireMatch(migration, /grant execute on function public\\.submit_aqw_speed_rush\\(integer, integer, uuid\\) to authenticated/i, 'Only authenticated users should receive submit RPC execute permission.');
requireMatch(migration, /revoke all on function public\\.submit_aqw_speed_rush\\(integer, integer, uuid\\) from public, anon/i, 'Submit RPC must revoke public and anon execution.');

console.log('Speed Rush server timing contract checks passed.');
