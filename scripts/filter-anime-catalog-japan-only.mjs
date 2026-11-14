import { readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

import "../anime-origin-policy.js";

const INPUT = "data/anime-catalog.json";
const OUTPUT_GZIP = INPUT + ".gz";
const { isJapaneseOriginAnime } = globalThis.AQWAnimePolicy;

const raw = await readFile(INPUT, "utf8");
const catalog = JSON.parse(raw);
if (!catalog || catalog.schemaVersion !== 2 || !Array.isArray(catalog.items)) {
  throw new Error("Unsupported anime catalogue schema.");
}

const before = catalog.items.length;
const removed = catalog.items.filter((anime) => !isJapaneseOriginAnime(anime));
const items = catalog.items.filter(isJapaneseOriginAnime);
const ids = new Set();
for (const anime of items) {
  const id = Number(anime?.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Invalid AniList ID in retained catalogue.");
  if (ids.has(id)) throw new Error("Duplicate AniList ID in retained catalogue: " + id);
  ids.add(id);
  if (anime.originVerified !== true) throw new Error("Retained Japanese-origin record lacks originVerified=true: " + id);
}
if (!items.length) throw new Error("Refusing to write an empty catalogue.");
if (items.length + removed.length !== before) throw new Error("Catalogue filtering count mismatch.");

const output = {
  ...catalog,
  generatedAt: new Date().toISOString(),
  originRule: "AniList countryOfOrigin must equal JP; non-Japanese and unknown-origin works are excluded",
  count: items.length,
  items,
};
const serialized = JSON.stringify(output) + "\n";
const compressed = gzipSync(Buffer.from(serialized, "utf8"), { level: 9, mtime: 0 });
await writeFile(INPUT, serialized);
await writeFile(OUTPUT_GZIP, compressed);

console.log(JSON.stringify({
  before,
  retained: items.length,
  removed: removed.length,
  removedByOrigin: removed.reduce((counts, anime) => {
    const origin = anime?.countryOfOrigin || "(missing)";
    counts[origin] = (counts[origin] || 0) + 1;
    return counts;
  }, {}),
  jsonBytes: Buffer.byteLength(serialized),
  gzipBytes: compressed.byteLength,
}, null, 2));
