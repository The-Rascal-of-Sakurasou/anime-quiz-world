import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateCatalog } from "./validate-anime-catalog.mjs";

const fixture = JSON.parse(await readFile("scripts/fixtures/anime-catalog-sample.json", "utf8"));
assert.equal(validateCatalog(fixture).count, 2, "Known-good catalogue fixture should pass");

const foreignFixture = structuredClone(fixture);
const foreignAnime = structuredClone(fixture.items[0]);
foreignAnime.id = 3;
foreignAnime.countryOfOrigin = "US";
foreignAnime.popularity = 10000;
foreignAnime.title.native = "海外作品の日本語タイトル";
delete foreignAnime.originVerified;
foreignFixture.items.push(foreignAnime);
foreignFixture.count = foreignFixture.items.length;
assert.equal(validateCatalog(foreignFixture).count, 3, "Famous foreign anime with a Japanese title should pass");

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
rejects("foreign anime below popularity threshold", (sample) => {
  sample.items[0].countryOfOrigin = "US";
  sample.items[0].popularity = 9999;
  sample.items[0].title.native = "海外作品の日本語タイトル";
  delete sample.items[0].originVerified;
});
rejects("missing build-time origin marker", (sample) => { sample.items[0].originVerified = false; });
rejects("unsupported format", (sample) => { sample.items[0].format = "MUSIC"; });
rejects("placeholder cover image", (sample) => { sample.items[0].coverImage.large = "https://example.com/no-image.png"; });
rejects("adult content", (sample) => { sample.items[0].isAdult = true; });
rejects("Hentai genre", (sample) => { sample.items[0].genres.push("Hentai"); });
rejects("missing title", (sample) => { sample.items[0].title = {}; });
rejects("duplicate normalized synonyms", (sample) => { sample.items[0].synonyms = ["Test Alias", "test alias"]; });
rejects("duplicate character IDs within one anime", (sample) => { sample.items[0].characters.nodes[1].id = sample.items[0].characters.nodes[0].id; });
rejects("duplicate character fallback records", (sample) => { sample.items[0].characters.nodes[1] = { name: { full: "Fallback Character" }, image: { large: "https://example.com/character.jpg" } }; sample.items[0].characters.nodes[0] = { name: { full: "Fallback Character" }, image: { large: "https://example.com/character.jpg" } }; });

console.log("Anime catalogue validator tests passed: 1 valid compact-schema fixture and 12 rejected invalid cases.");
