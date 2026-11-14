import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const OUTPUT = 'data/wikidata-anime-discovery.json';
const OUTPUT_GZIP = OUTPUT + '.gz';
const USER_AGENT = 'AnimeQuizWorld-WikidataDiscovery/1.0 (https://github.com/The-Rascal-of-Sakurasou/anime-quiz-world)';
const QUERY = `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?item ?itemLabel ?itemDescription ?image ?inception ?officialWebsite
       (GROUP_CONCAT(DISTINCT ?genreLabel; separator=" | ") AS ?genres)
WHERE {
  ?item wdt:P495 wd:Q17;
        wdt:P31/wdt:P279* wd:Q1107.
  OPTIONAL { ?item wdt:P18 ?image. }
  OPTIONAL { ?item wdt:P571 ?inception. }
  OPTIONAL { ?item wdt:P856 ?officialWebsite. }
  OPTIONAL {
    ?item wdt:P136 ?genre.
    ?genre rdfs:label ?genreLabel.
    FILTER(LANG(?genreLabel) = "ja" || LANG(?genreLabel) = "en")
  }
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "ja,en".
  }
}
GROUP BY ?item ?itemLabel ?itemDescription ?image ?inception ?officialWebsite
ORDER BY DESC(?item)
LIMIT 3000
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const value = (binding, key) => binding?.[key]?.value || '';
const normalizeDate = (raw) => {
  if (!raw) return null;
  const match = String(raw).match(/^(\\d{4})/);
  return match ? Number(match[1]) : null;
};

export function normalizeBindings(bindings) {
  const byId = new Map();
  for (const row of Array.isArray(bindings) ? bindings : []) {
    const uri = value(row, 'item');
    const match = uri.match(/entity\/(Q\\d+)$/);
    if (!match) continue;
    const qid = match[1];
    const label = value(row, 'itemLabel').trim();
    if (!label || label === qid) continue;
    const genres = value(row, 'genres').split(' | ').map((x) => x.trim()).filter(Boolean);
    const record = {
      qid,
      title: label.normalize('NFC'),
      description: value(row, 'itemDescription').normalize('NFC'),
      image: value(row, 'image') || null,
      year: normalizeDate(value(row, 'inception')),
      genres: [...new Set(genres)].sort(),
      officialWebsite: value(row, 'officialWebsite') || null,
      countryOfOrigin: 'JP',
      source: 'Wikidata',
      sourceEntity: uri,
      license: 'CC0',
    };
    byId.set(qid, record);
  }
  return [...byId.values()].sort((a, b) => a.qid.localeCompare(b.qid, 'en', { numeric: true }));
}

async function fetchCandidates() {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Accept: 'application/sparql-results+json',
          'User-Agent': USER_AGENT,
          'Accept-Encoding': 'gzip, deflate',
        },
        body: new URLSearchParams({ query: QUERY, format: 'json' }),
        signal: AbortSignal.timeout(55000),
      });
      if (response.status === 429 || response.status === 503) {
        const retryAfter = Number(response.headers.get('Retry-After'));
        const waitSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 30 * (attempt + 1);
        console.warn('Wikidata Query Service is busy; waiting ' + waitSeconds + ' seconds.');
        await sleep(Math.min(waitSeconds, 180) * 1000);
        continue;
      }
      if (!response.ok) throw new Error('Wikidata HTTP ' + response.status);
      const json = await response.json();
      const bindings = json?.results?.bindings;
      if (!Array.isArray(bindings)) throw new Error('Wikidata response has no results.bindings array.');
      return normalizeBindings(bindings);
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(5000 * (attempt + 1));
    }
  }
  throw lastError || new Error('Wikidata discovery request failed.');
}

async function main() {
  if (process.argv.includes('--self-test')) {
    const sample = normalizeBindings([
      { item: { value: 'http://www.wikidata.org/entity/Q123' }, itemLabel: { value: 'テスト作品' }, itemDescription: { value: '説明' }, inception: { value: '2024-01-01T00:00:00Z' }, genres: { value: 'SF | SF | Drama' } },
      { item: { value: 'http://www.wikidata.org/entity/Q123' }, itemLabel: { value: 'テスト作品' }, genres: { value: 'SF' } },
      { item: { value: 'http://www.wikidata.org/entity/Q999' }, itemLabel: { value: 'Q999' } },
    ]);
    if (sample.length !== 1 || sample[0].qid !== 'Q123' || sample[0].year !== 2024 || sample[0].genres.length !== 2 || sample[0].countryOfOrigin !== 'JP') {
      throw new Error('Wikidata discovery self-test failed.');
    }
    console.log('Wikidata discovery self-test passed.');
    return;
  }

  let previous = null;
  try { previous = JSON.parse(await readFile(OUTPUT, 'utf8')); } catch {}
  const items = await fetchCandidates();
  if (!items.length) throw new Error('Wikidata returned zero candidates; preserving the previous snapshot.');
  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: 'Wikidata Query Service',
    sourceUrl: ENDPOINT,
    license: 'CC0 for Wikidata structured data',
    countryRule: 'country of origin (P495) is Japan (Q17)',
    discoveryRule: 'instance of or subclass of anime (Q1107)',
    count: items.length,
    previousCount: Number(previous?.count) || 0,
    items,
    limitations: [
      'Discovery candidates only; this file is not yet part of the live recommendation catalogue.',
      'Wikidata coverage is incomplete and records require format, eligibility, image, and metadata review before promotion.',
      'The QID is the stable source identifier; do not treat it as an AniList ID.',
    ],
  };
  const serialized = JSON.stringify(output);
  await mkdir('data', { recursive: true });
  await writeFile(OUTPUT, serialized + '\\n');
  await writeFile(OUTPUT_GZIP, gzipSync(Buffer.from(serialized + '\\n', 'utf8'), { level: 9, mtime: 0 }));
  console.log('Wikidata discovery candidates: ' + items.length + ' (previous snapshot: ' + (Number(previous?.count) || 0) + ').');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
