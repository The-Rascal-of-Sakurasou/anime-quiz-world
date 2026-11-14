import assert from "node:assert/strict";
import "../anime-origin-policy.js";

const { isJapaneseOriginAnime, metadataKey } = globalThis.AQWAnimePolicy;

assert.equal(isJapaneseOriginAnime({ countryOfOrigin: "JP" }), true,
  "AniList countryOfOrigin=JP must be accepted.");
assert.equal(isJapaneseOriginAnime({ countryOfOrigin: "JP", originVerified: false }), true,
  "The country field alone determines eligibility; no popularity or title heuristic is needed.");
for (const countryOfOrigin of ["US", "CN", "KR", "TW", "GB", ""]) {
  assert.equal(isJapaneseOriginAnime({
    countryOfOrigin,
    popularity: 1000000,
    title: { native: "日本語タイトル" },
  }), false, "Non-Japanese origins must be rejected: " + countryOfOrigin);
}
assert.equal(isJapaneseOriginAnime({
  popularity: 1000000,
  title: { native: "日本語タイトル" },
}), false, "Missing origin metadata must fail closed.");
assert.equal(isJapaneseOriginAnime(null), false);
assert.equal(isJapaneseOriginAnime(undefined), false);
assert.equal(metadataKey(" Ｔｅｓｔ　 Name "), "testname");

console.log("Shared anime-origin policy tests passed.");
