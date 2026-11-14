import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateCatalog } from "./validate-anime-catalog.mjs";
import { isUsableCoverImage } from "./catalog-image-url.mjs";

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
foreignAnime.popularity = 100000;
foreignAnime.title.native = "海外作品の日本語タイトル";
delete foreignAnime.originVerified;
foreignFixture.items.push(foreignAnime);
foreignFixture.count = foreignFixture.items.length;
assert.throws(
  () => validateCatalog(foreignFixture),
  /countryOfOrigin must be exactly JP/,
  "Foreign anime must be rejected even when popular and titled in Japanese"
);

const rejects = (label, mutate) => {
  const sample = structuredClone(fixture);
  mutate(sample);
  assert.throws(() => validateCatalog(sample), undefined, label + " should be rejected");
};

rejects("count mismatch", (sample) => { sample.count += 1; });
rejects("duplicate AniList IDs", (sample) => { sample.items[1].id = sample.items[0].id; });
rejects("foreign anime without a Japanese title", (sample) => {
  sample.items[0].countryOfOrigin = "US";
  sample.items[0].popularity = 50000;
  sample.items[0].title.native = "English Only";
  delete sample.items[0].originVerified;
});
rejects("foreign anime with Japanese title and low popularity", (sample) => {
  sample.items[0].countryOfOrigin = "US";
  sample.items[0].popularity = 0;
  sample.items[0].title.native = "海外作品の日本語タイトル";
  delete sample.items[0].originVerified;
});
const markerlessJapaneseFixture = structuredClone(fixture);
delete markerlessJapaneseFixture.items[0].originVerified;
assert.equal(validateCatalog(markerlessJapaneseFixture).count, 2, "A JP country field is sufficient; the derived originVerified marker is not an independent requirement.");
rejects("unsupported format", (sample) => { sample.items[0].format = "MUSIC"; });
rejects("placeholder cover image", (sample) => { sample.items[0].coverImage.large = "https://example.com/no-image.png"; });
rejects("adult content", (sample) => { sample.items[0].isAdult = true; });
rejects("Hentai genre", (sample) => { sample.items[0].genres.push("Hentai"); });
rejects("missing title", (sample) => { sample.items[0].title = {}; });
rejects("duplicate normalized synonyms", (sample) => { sample.items[0].synonyms = ["Test Alias", "test alias"]; });
rejects("embedded character data is excluded from the shared catalogue", (sample) => { sample.items[0].characters = { nodes: [] }; });

console.log("Anime catalogue validator tests passed: 1 valid compact-schema fixture and 12 rejected invalid cases.");
