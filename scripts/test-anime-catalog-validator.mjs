import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateCatalog } from "./validate-anime-catalog.mjs";

const fixture = JSON.parse(await readFile("scripts/fixtures/anime-catalog-sample.json", "utf8"));
assert.equal(validateCatalog(fixture).count, 2, "Known-good catalogue fixture should pass");

const rejects = (label, mutate) => {
  const sample = structuredClone(fixture);
  mutate(sample);
  assert.throws(() => validateCatalog(sample), undefined, label + " should be rejected");
};

rejects("count mismatch", (sample) => { sample.count += 1; });
rejects("duplicate AniList IDs", (sample) => { sample.items[1].id = sample.items[0].id; });
rejects("unverified foreign origin", (sample) => { sample.items[0].countryOfOrigin = "US"; });
rejects("unsupported format", (sample) => { sample.items[0].format = "MUSIC"; });
rejects("placeholder cover image", (sample) => { sample.items[0].coverImage.large = "https://example.com/no-image.png"; });
rejects("adult content", (sample) => { sample.items[0].isAdult = true; });
rejects("Hentai genre", (sample) => { sample.items[0].genres.push("Hentai"); });
rejects("missing title", (sample) => { sample.items[0].title = {}; });

console.log("Anime catalogue validator tests passed: 1 valid fixture and 8 rejected invalid cases.");
