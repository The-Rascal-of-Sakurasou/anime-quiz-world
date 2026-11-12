import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20261112230000_aqw_speed_rush_server_timing.sql', import.meta.url), 'utf8');

assert.match(html, /rpc\(['"]start_aqw_speed_rush['"]/);
assert.match(html, /serverRunId/);
assert.match(html, /p_elapsed_ms:\s*0/);
assert.match(migration, /auth\.uid\(\)/);
assert.match(migration, /clock_timestamp\(\) - v_run\.started_at/);
assert.match(migration, /p_elapsed_ms is intentionally ignored/i);
assert.match(migration, /finished_at is null/);
assert.match(migration, /grant execute on function public\.start_aqw_speed_rush\(\) to authenticated/i);
console.log('Speed Rush server timing contract checks passed.');
