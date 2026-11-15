import fs from "node:fs";
import assert from "node:assert/strict";

const page = fs.readFileSync("qa.html", "utf8");
const fn = fs.readFileSync("supabase/functions/aqw-submit-question/index.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261115115625_add_qa_submission_rate_limit.sql", "utf8");
const privacy = fs.readFileSync("privacy.html", "utf8");

assert.match(page, /functions\/v1\/aqw-submit-question/);
assert.match(page, /website:\s*document\.getElementById\(['"]website['"]\)\.value/);
assert.doesNotMatch(page, /\.from\(['"]qa_questions['"]\)\.insert/);
assert.match(fn, /AQW_QA_RATE_LIMIT_HMAC_SECRET/);
assert.match(fn, /hmacSecret\.length < 32/);
assert.match(fn, /fingerprintIp\(ip, hmacSecret\)/);
assert.doesNotMatch(fn, /fingerprintIp\(ip, serviceRoleKey\)/);
assert.match(fn, /const website = typeof body\.website === "string"/);
assert.match(fn, /if \(website\) return json\(\{ success: true \}\)/);
assert.match(fn, /consume_qa_submission_rate_limit/);
assert.match(fn, /p_fingerprint: fingerprint/);
assert.match(fn, /cf-connecting-ip/);
assert.match(fn, /Retry-After/);
assert.match(migration, /private\.consume_qa_submission_rate_limit/);
assert.match(migration, /count_10m <= 5 and v_count_24h <= 15/);
assert.match(migration, /interval '30 days'/i);
assert.match(migration, /grant execute on function private\.consume_qa_submission_rate_limit\(text\) to service_role/i);
assert.match(privacy, /秘密鍵付きハッシュ値（HMAC）/);
assert.match(privacy, /最終更新から30日を超えたもの/);
console.log("Q&A production-path security checks passed.");