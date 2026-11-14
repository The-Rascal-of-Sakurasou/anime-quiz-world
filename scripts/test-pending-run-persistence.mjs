import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync("assets/js/index-app-20261114.js", "utf8");
for (const key of ["aqw-pending-player-runs", "aqw-pending-rush-results"]) {
  assert.ok(source.includes(key), "Pending leaderboard queue must be persisted: " + key);
}
assert.match(source, /function loadPendingRunQueue\(key,validator\)/);
assert.match(source, /\.slice\(-25\)/);
assert.match(source, /ownerUserId:result\.ownerUserId\?\?currentUser\?\.id\?\?null/);
assert.match(source, /pendingRun\.ownerUserId&&pendingRun\.ownerUserId!==currentUser\.id/);
assert.match(source, /result\.ownerUserId&&result\.ownerUserId!==currentUser\.id/);
assert.match(source, /function persistPendingRunQueue\(queue\)/);
assert.match(source, /function clearPendingRunsForUser\(userId\)/);
assert.match(source, /if\(!run\.ownerUserId\|\|run\.ownerUserId===currentUser\.id\)await submitPlayerRun\(run\)/);
assert.match(source, /if\(!run\.ownerUserId\|\|run\.ownerUserId===currentUser\.id\)await submitRushResult\(run\)/);
assert.match(source, /clearPendingRunsForUser\(currentUser\.id\)/);
const start = source.indexOf("function queuePendingRun(");
const end = source.indexOf("function applyRushLeaderboardLanguage", start);
assert.ok(start >= 0 && end > start, "Queue persistence helpers must be grouped");
const queueCode = source.slice(start, end);
assert.match(queueCode, /persistPendingRunQueue\(queue\)/);
assert.match(queueCode, /queue\.length>25/);
console.log("AQW pending leaderboard queue persistence checks passed.");
