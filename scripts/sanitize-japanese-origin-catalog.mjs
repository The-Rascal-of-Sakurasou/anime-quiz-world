import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { validateCatalog } from './validate-anime-catalog.mjs';

const JSON_PATH = 'data/anime-catalog.json';
const GZIP_PATH = 'data/anime-catalog.json.gz';

const original = JSON.parse(await readFile(JSON_PATH, 'utf8'));
if (!original || original.schemaVersion !== 2 || !Array.isArray(original.items)) {
  throw new Error('Unsupported or invalid anime catalogue.');
}

const before = original.items.length;
const items = original.items
  .filter((anime) => anime && anime.countryOfOrigin === 'JP')
  .map((anime) => ({ ...anime, originVerified: true }));

if (items.length === 0) {
  throw new Error('No Japanese-origin records remain; refusing to overwrite the catalogue.');
}
if (items.length > before) {
  throw new Error('Filtered catalogue count unexpectedly increased.');
}

const output = {
  ...original,
  generatedAt: new Date().toISOString(),
  source: original.source || 'AniList GraphQL API',
  originRule: 'AniList countryOfOrigin === JP only',
  count: items.length,
  items,
};

const serialized = JSON.stringify(output) + '\n';
const compressed = gzipSync(Buffer.from(serialized, 'utf8'), { level: 9, mtime: 0 });

await writeFile(JSON_PATH, serialized);
await writeFile(GZIP_PATH, compressed);

const validation = validateCatalog(output);
console.log('Japanese-origin catalogue sanitation passed.');
console.log('Before: ' + before);
console.log('After: ' + validation.count);
console.log('Removed non-Japanese-origin records: ' + (before - validation.count));
console.log('JSON bytes: ' + Buffer.byteLength(serialized));
console.log('GZIP bytes: ' + compressed.byteLength);
