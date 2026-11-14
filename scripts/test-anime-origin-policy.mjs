import assert from "node:assert/strict";
import "../anime-origin-policy.js";

const { hasJapaneseTitle, isJapaneseOriginAnime, metadataKey } = globalThis.AQWAnimePolicy;

assert.equal(hasJapaneseTitle({ title: { native: "日本語タイトル" } }), true);
assert.equal(hasJapaneseTitle({ title: { native: "English title" } }), false);

assert.equal(isJapaneseOriginAnime({
  countryOfOrigin: "JP",
  originVerified: true,
  title: { native: "検証済み作品" },
}), true, "Verified Japanese-origin catalogue records should pass.");

assert.equal(isJapaneseOriginAnime({
  countryOfOrigin: "JP",
  source: "ORIGINAL",
  title: { native: "オリジナル作品" },
}), true, "Japanese original anime should pass.");

assert.equal(isJapaneseOriginAnime({
  countryOfOrigin: "JP",
  source: "MANGA",
  popularity: 100,
  relations: {
    edges: [{
      relationType: "SOURCE",
      node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA" },
    }],
  },
}), true, "A verified Japanese manga source should pass.");

assert.equal(isJapaneseOriginAnime({
  countryOfOrigin: "JP",
  source: "OTHER",
  popularity: 100,
  relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA" } }] },
}), false, "Unsupported source types must fail closed even when a relation is present.");

assert.equal(isJapaneseOriginAnime({
  countryOfOrigin: "JP",
  source: "VIDEO_GAME",
  popularity: 100,
  relations: { edges: [{ relationType: "SOURCE", node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA" } }] },
}), false, "Unsupported VIDEO_GAME source types must fail closed.");

assert.equal(isJapaneseOriginAnime({
  countryOfOrigin: "JP",
  source: "VISUAL_NOVEL",
  popularity: 100,
  relations: { edges: [{ relationType: "SOURCE", node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA" } }] },
}), false, "Unsupported VISUAL_NOVEL source types must fail closed.");

assert.equal(isJapaneseOriginAnime({
  countryOfOrigin: "JP",
  source: "WEB_NOVEL",
  popularity: 100,
  relations: { edges: [{ relationType: "SOURCE", node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA" } }] },
}), false, "Unsupported WEB_NOVEL source types must fail closed.");

assert.equal(isJapaneseOriginAnime({
  countryOfOrigin: "JP",
  source: "MANGA",
  popularity: 100,
  relations: {
    edges: [{
      relationType: "OTHER",
      node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA" },
    }],
  },
}), false, "Unrelated media relations must not establish Japanese origin.");

assert.equal(isJapaneseOriginAnime({
  countryOfOrigin: "JP",
  source: "MANGA",
  popularity: 100,
  relations: {
    edges: [{
      relationType: "SOURCE",
      node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA", language: "en" },
    }],
  },
}), false, "A source explicitly marked as non-Japanese must be rejected.");

assert.equal(isJapaneseOriginAnime({
  countryOfOrigin: "JP",
  originVerified: true,
  originalLanguage: "en",
}), false, "Explicit non-Japanese language metadata must be rejected.");

assert.equal(isJapaneseOriginAnime({
  countryOfOrigin: "JP",
  originVerified: false,
}), false, "Unverified Japanese-origin records must not pass.");

assert.equal(isJapaneseOriginAnime({
  countryOfOrigin: "US",
  popularity: 100000,
  title: { native: "日本語タイトル" },
}), false, "Foreign anime must be excluded regardless of popularity or Japanese title.");

assert.equal(isJapaneseOriginAnime({
  countryOfOrigin: "CN",
  popularity: 100000,
  title: { native: "日本語タイトル" },
}), false, "All non-Japanese origins must be excluded.");

assert.equal(isJapaneseOriginAnime({
  countryOfOrigin: "",
  popularity: 100000,
  title: { native: "日本語タイトル" },
}), false, "Unknown origin must fail closed.");

assert.equal(isJapaneseOriginAnime({
  popularity: 100000,
  title: { native: "日本語タイトル" },
}), false, "Missing origin metadata must fail closed.");

assert.equal(isJapaneseOriginAnime({ popularity: 50000, title: { native: "日本語" } }), false);
assert.equal(metadataKey(" Ｔｅｓｔ　 Name "), "testname");

console.log("Shared anime-origin policy tests passed.");
