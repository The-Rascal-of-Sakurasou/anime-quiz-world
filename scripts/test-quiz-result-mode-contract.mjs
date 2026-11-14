import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, migration] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20261112153000_align_aqw_quiz_result_modes.sql', import.meta.url), 'utf8'),
]);

// Collect question modes that the browser can actually assign to currentQuestionMode.
const emitted = new Set();
for (const match of html.matchAll(/if\s*\(\s*actualMode\s*===\s*['"]([A-Za-z]+)['"]\s*\)/g)) {
  emitted.add(match[1]);
}
for (const match of html.matchAll(/actualMode\s*=\s*['"]([A-Za-z]+)['"]/g)) {
  emitted.add(match[1]);
}
assert.ok(emitted.size > 0, 'No question modes were found in index.html');

// Extract the SQL allowlist from the validation expression.
const allowlistMatch = migration.match(/v_attempt->>'questionMode'\s+NOT IN\s*\(([\s\S]*?)\)/);
assert.ok(allowlistMatch, 'Could not find the questionMode allowlist in the migration.');
const accepted = new Set(
  [...allowlistMatch[1].matchAll(/'([A-Za-z]+)'/g)].map((match) => match[1]),
);

const missing = [...emitted].filter((mode) => !accepted.has(mode));
assert.deepEqual(
  missing,
  [],
  `The database result-mode allowlist is missing browser modes: ${missing.join(', ')}`,
);

console.log(`Quiz result mode contract OK (${emitted.size} browser modes).`);
