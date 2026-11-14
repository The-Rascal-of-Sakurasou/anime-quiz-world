import fs from "node:fs";
import assert from "node:assert/strict";

const page = fs.readFileSync("qa.html", "utf8");
const fn = fs.readFileSync("supabase/functions/aqw-qa-submit/index.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261114220000_secure_qa_submission_rate_limit.sql", "utf8");
const privacy = fs.readFileSync("privacy.html", "utf8");
const config = fs.readFileSync("supabase/config.toml", "utf8");

assert.match(page, /functions\.invoke\(['"]aqw-qa-submit['"]/);
assert.doesNotMatch(page, /\.from\(['"]qa_questions['"]\)\.insert/);
assert.match(fn, /cf-connecting-ip/);
assert.match(fn, /name:\s*"HMAC",\s*hash:\s*"SHA-256"/);
assert.match(fn, /consume_qa_submission_rate_limit/);
assert.match(fn, /admin\.from\("qa_questions"\)\.insert/);
assert.match(fn, /429/);
assert.match(fn, /allowed !== true/);
assert.match(migration, /drop policy if exists "Anyone can submit a question"/i);
assert.match(migration, /revoke insert on table public\.qa_questions from anon, authenticated/i);
assert.match(migration, /interval '10 minutes'/i);
assert.match(migration, /return v_count <= 5/i);
assert.match(migration, /interval '30 days'/i);
assert.match(migration, /revoke all on function private\.consume_qa_submission_rate_limit\(text\) from public, anon, authenticated/i);
assert.match(migration, /grant execute on function private\.consume_qa_submission_rate_limit\(text\) to service_role/i);
assert.match(privacy, /HMAC-SHA-256/);
assert.match(privacy, /最大30日/);
assert.match(config, /\[functions\.aqw-qa-submit\]\s*verify_jwt = false/);
console.log("Q&A server-side rate-limit checks passed.");
