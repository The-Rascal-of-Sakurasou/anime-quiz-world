import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, migration] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20261112170000_add_server_timed_aqw_speed_rush.sql', import.meta.url), 'utf8'),
]);

assert.match(html, /activeRushServerRunId=null/, 'The quiz state must hold the server-issued session ID.');
assert.match(
  html,
  /if\(playMode==='rush'&&typeof window\.aqwStartSpeedRushSession==='function'\)\{try\{activeRushServerRunId=await window\.aqwStartSpeedRushSession\(\)/,
  'Speed Rush must request a server session before starting its client timer.',
);
assert.match(
  html,
  /detail:\{runId:activeRushServerRunId,serverTimed:!!activeRushServerRunId/,
  'The finish event must carry the server-issued run ID and timing marker.',
);
assert.match(
  html,
  /sb\.rpc\('start_aqw_speed_rush'\)/,
  'The client must call the server-side start RPC.',
);
assert.match(
  html,
  /result\.serverTimed!==true/,
  'The score submitter must reject results without a server-timed session.',
);
assert.match(
  html,
  /sb\.rpc\('submit_aqw_speed_rush',\{p_correct_count:result\.correctCount,p_elapsed_ms:result\.elapsedMs,p_run_id:result\.runId\}\)/,
  'The client must submit the server-issued session ID.',
);

assert.match(migration, /create table if not exists private\.aqw_speed_rush_sessions/i);
assert.match(migration, /create or replace function private\.start_aqw_speed_rush\(\)/i);
assert.match(migration, /v_user_id uuid := auth\.uid\(\)/i);
assert.match(migration, /expires_at >= v_now/i);
assert.match(migration, /clock_timestamp\(\)/i);
assert.match(migration, /floor\(extract\(epoch from \(v_now - v_started_at\)\) \* 1000\)::integer/i);
assert.match(migration, /revoke all on table private\.aqw_speed_rush_sessions from public, anon, authenticated, service_role/i);

const submitStart = migration.indexOf('create or replace function private.submit_aqw_speed_rush(');
const submitEnd = migration.indexOf('create or replace function public.submit_aqw_speed_rush(', submitStart);
assert.ok(submitStart >= 0 && submitEnd > submitStart, 'Could not locate the private score submit function.');
const submitBody = migration.slice(submitStart, submitEnd);
assert.equal(
  (submitBody.match(/p_elapsed_ms/g) || []).length,
  2,
  'Client elapsed time may appear only in the parameter and explicit ignore comment.',
);
assert.match(submitBody, /v_elapsed_ms := floor\(extract\(epoch from \(v_now - v_started_at\)\) \* 1000\)::integer/i);
assert.match(submitBody, /values \(v_user_id, p_run_id, p_correct_count, v_elapsed_ms\)/i);

console.log('Speed Rush server-timing contract OK.');
