import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateCatalog } from "./validate-anime-catalog.mjs";
import { isUsableCoverImage } from "./catalog-image-url.mjs";
import "../anime-origin-policy.js";
const { isJapaneseOriginAnime } = globalThis.AQWAnimePolicy;

assert.equal(isJapaneseOriginAnime({ countryOfOrigin: "JP", popularity: 0 }), true);
assert.equal(isJapaneseOriginAnime({ countryOfOrigin: "US", popularity: 999999, title: { native: "日本語タイトル" } }), false);
assert.equal(isJapaneseOriginAnime({ countryOfOrigin: null, originVerified: true }), false);

assert.equal(isUsableCoverImage("https://cdn.example.com/cover.jpg"), true, "Valid HTTPS cover URL should pass");
assert.equal(isUsableCoverImage("http://cdn.example.com/cover.jpg"), true, "Valid HTTP cover URL should pass");
for (const invalid of [
  "https://cdn.example.com/no-image.png",
  "https://cdn.example.com/placeholder.jpg",
  "https://cdn.example.com/default.jpg",
  "https://user:pass@cdn.example.com/cover.jpg",
  "https://",
  "javascript:alert(1)"
]) assert.equal(isUsableCoverImage(invalid), false, "Invalid cover URL should be rejected: " + invalid);

const fixture = JSON.parse(await readFile("scripts/fixtures/anime-catalog-sample.json", "utf8"));
assert.equal(validateCatalog(fixture).count, 2, "Known-good catalogue fixture should pass");

const foreignFixture = structuredClone(fixture);
const foreignAnime = structuredClone(fixture.items[0]);
foreignAnime.id = 3;
foreignAnime.countryOfOrigin = "US";
foreignAnime.popularity = 10000;
foreignAnime.title.native = "海外作品の日本語タイトル";
foreignAnime.originVerified = true;
foreignFixture.items.push(foreignAnime);
foreignFixture.count = foreignFixture.items.length;
assert.throws(() => validateCatalog(foreignFixture), undefined, "Foreign-origin anime must be rejected regardless of popularity, Japanese title, or verification markers");

const rejects = (label, mutate) => {
  const sample = structuredClone(fixture);
  mutate(sample);
  assert.throws(() => validateCatalog(sample), undefined, label + " should be rejected");
};

rejects("count mismatch", (sample) => { sample.count += 1; });
rejects("duplicate AniList IDs", (sample) => { sample.items[1].id = sample.items[0].id; });
rejects("foreign anime despite Japanese title and popularity", (sample) => {
  sample.items[0].countryOfOrigin = "US";
  sample.items[0].popularity = 50000;
  sample.items[0].title.native = "海外作品の日本語タイトル";
  sample.items[0].originVerified = true;
});
rejects("unsupported format", (sample) => { sample.items[0].format = "MUSIC"; });
rejects("placeholder cover image", (sample) => { sample.items[0].coverImage.large = "https://example.com/no-image.png"; });
rejects("adult content", (sample) => { sample.items[0].isAdult = true; });
rejects("Hentai genre", (sample) => { sample.items[0].genres.push("Hentai"); });
rejects("missing title", (sample) => { sample.items[0].title = {}; });
rejects("duplicate normalized synonyms", (sample) => { sample.items[0].synonyms = ["Test Alias", "test alias"]; });
rejects("embedded character data is excluded from the shared catalogue", (sample) => { sample.items[0].characters = { nodes: [] }; });

console.log("Anime catalogue validator tests passed: 1 valid compact-schema fixture and 10 rejected invalid cases.");
