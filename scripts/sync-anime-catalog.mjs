import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const API = 'https://graphql.anilist.co';
const OUTPUT = 'data/anime-catalog.json';
const FORMATS = ['TV', 'TV_SHORT', 'MOVIE', 'OVA', 'ONA', 'SPECIAL'];
const BASE_SORTS = ['POPULARITY_DESC', 'ID', 'ID_DESC'];
const OVERFLOW_SORTS = ['SCORE_DESC', 'FAVOURITES_DESC', 'TRENDING_DESC', 'START_DATE_DESC'];
const FIELDS = 'id countryOfOrigin source(version:2) relations { edges { relationType node { id type countryOfOrigin format } } } format popularity title { romaji english native } description(asHtml:false) synonyms coverImage { large medium extraLarge } episodes seasonYear averageScore genres studios(isMain:true) { nodes { name } } startDate { year month day } characters(sort:ROLE,perPage:5) { nodes { id name { full native } image { large } } } externalLinks { url site type isDisabled }';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalize = (value) => {
  if (typeof value === 'string') return value.normalize('NFC');
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  return value;
};

function isJapaneseOriginAnime(anime) {
  if (!anime || anime.countryOfOrigin !== 'JP') return false;
  if (anime.source === 'ORIGINAL') return true;
  const sourceRules = {
    MANGA: { type: 'MANGA', formats: ['MANGA', 'ONE_SHOT'] },
    LIGHT_NOVEL: { type: 'MANGA', formats: ['NOVEL'] },
    NOVEL: { type: 'MANGA', formats: ['NOVEL'] },
    DOUJINSHI: { type: 'MANGA', formats: ['MANGA', 'ONE_SHOT', 'NOVEL'] },
    ANIME: { type: 'ANIME', formats: ['TV', 'TV_SHORT', 'MOVIE', 'OVA', 'ONA', 'SPECIAL'] },
  };
  const rule = sourceRules[anime.source];
  if (!rule || !Array.isArray(anime.relations?.edges)) return false;
  return anime.relations.edges.some((edge) =>
    (edge?.relationType === 'SOURCE' || edge?.relationType === 'ADAPTATION') &&
    edge.node?.type === rule.type &&
    edge.node?.countryOfOrigin === 'JP' &&
    rule.formats.includes(edge.node?.format)
  );
}

function isUsableAnime(anime) {
  const image = anime?.coverImage?.large || anime?.coverImage?.medium || anime?.coverImage?.extraLarge || '';
  return Boolean(
    anime &&
    Number.isInteger(Number(anime.id)) &&
    anime.isAdult !== true &&
    isJapaneseOriginAnime(anime) &&
    /^https?:\/\//i.test(String(image)) &&
    !/(?:no[-_ ]?image|placeholder|default[-_ ]?image)/i.test(String(image)) &&
    (anime.title?.native || anime.title?.english || anime.title?.romaji) &&
    FORMATS.includes(anime.format) &&
    !(anime.genres || []).includes('Hentai')
  );
}

async function fetchBatch(pages, sort, format, yearStart, yearEnd) {
  const dateFilter = Number.isInteger(yearStart) && Number.isInteger(yearEnd)
    ? ',startDate_greater:' + (yearStart * 10000) + ',startDate_lesser:' + ((yearEnd + 1) * 10000)
    : '';
  const aliases = pages.map((page, index) =>
    'p' + index + ': Page(page:' + page + ',perPage:50) { pageInfo { hasNextPage } media(type:ANIME,countryOfOrigin:JP,sort:' +
    sort + ',isAdult:false,format_in:[' + format + ']' + dateFilter + ') { ' + FIELDS + ' } }'
  ).join(' ');
  const query = 'query { ' + aliases + ' }';
  let lastError;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(30000),
      });
      if (response.status === 429) {
        const retry = Number(response.headers.get('Retry-After')) || Math.min(90, 10 * (attempt + 1));
        console.warn('AniList rate limit; waiting ' + retry + ' seconds.');
        await sleep(retry * 1000);
        continue;
      }
      if (!response.ok) throw new Error('AniList HTTP ' + response.status);
      const json = await response.json();
      if (json.errors?.length) throw new Error(json.errors.map((item) => item.message).join('; '));
      return pages.map((_, index) => {
        const page = json.data?.['p' + index];
        return {
          items: normalize(page?.media || []).filter(isJapaneseOriginAnime),
          hasNextPage: page?.pageInfo?.hasNextPage === true,
        };
      });
    } catch (error) {
      lastError = error;
      if (attempt < 5) await sleep(Math.min(30000, 1500 * (2 ** attempt)));
    }
  }
  throw lastError || new Error('AniList request failed.');
}

const records = new Map();
let requests = 0;
let accepted = 0;
let filtered = 0;

async function scanScope(format, sort, yearStart, yearEnd) {
  for (let page = 1; page <= 100; page += 3) {
    const pages = [page, page + 1, page + 2].filter((value) => value <= 100);
    await sleep(1200);
    const results = await fetchBatch(pages, sort, format, yearStart, yearEnd);
    requests++;
    for (const result of results) {
      for (const anime of result.items) {
        if (!isUsableAnime(anime)) {
          filtered++;
          continue;
        }
        const id = Number(anime.id);
        const previous = records.get(id);
        records.set(id, previous ? mergeRecord(previous, anime) : anime);
        accepted++;
      }
    }
    const hasMore = results.at(-1)?.hasNextPage === true;
    if (!hasMore) return false;
    if (pages.at(-1) === 100) return true;
    if (requests % 10 === 0) {
      console.log('Requests: ' + requests + ', unique catalogue: ' + records.size + ', accepted records: ' + accepted);
    }
  }
  return false;
}

function mergeRecord(existing, incoming) {
  if (!existing) return incoming;
  const merge = (oldValue, newValue) => {
    if (newValue === null || newValue === undefined || newValue === '') return oldValue;
    if (Array.isArray(newValue)) return newValue.length ? newValue : oldValue;
    if (newValue && typeof newValue === 'object') {
      const result = { ...(oldValue && typeof oldValue === 'object' && !Array.isArray(oldValue) ? oldValue : {}) };
      for (const [key, value] of Object.entries(newValue)) result[key] = merge(result[key], value);
      return result;
    }
    return newValue;
  };
  return merge(existing, incoming);
}

async function scanDateRanges(format, sort) {
  for (let startYear = 1900; startYear <= 2030; startYear += 10) {
    await scanScope(format, sort, startYear, startYear + 9);
  }
}

for (const format of FORMATS) {
  let overflow = false;
  for (const sort of BASE_SORTS) {
    const reachedLimit = await scanScope(format, sort);
    overflow ||= reachedLimit;
    if (reachedLimit) await scanDateRanges(format, sort);
  }
  if (overflow) {
    console.log('Format ' + format + ' reached AniList pagination limits; scanning complementary sort orders.');
    for (const sort of OVERFLOW_SORTS) {
      const reachedLimit = await scanScope(format, sort);
      if (reachedLimit) await scanDateRanges(format, sort);
    }
  }
}

const items = [...records.values()].map((anime) => {
  const { source, relations, ...compact } = anime;
  return { ...compact, originVerified: true };
}).sort((a, b) =>
  (Number(b.popularity) || 0) - (Number(a.popularity) || 0) || Number(a.id) - Number(b.id)
);
let previousOutput = null;
try { previousOutput = JSON.parse(await readFile(OUTPUT, 'utf8')); } catch {}
const unchanged = previousOutput?.schemaVersion === 2 && JSON.stringify(previousOutput.items) === JSON.stringify(items);
const output = {
  schemaVersion: 2,
  generatedAt: unchanged ? previousOutput.generatedAt : new Date().toISOString(),
  source: 'AniList GraphQL API',
  originRule: 'Japanese-origin verification matching the AQW client filter',
  count: items.length,
  items,
};
await mkdir(dirname(OUTPUT), { recursive: true });
const serialized = JSON.stringify(output);
await writeFile(OUTPUT, serialized + '\n');
console.log('Catalogue complete: ' + items.length + ' unique usable anime.');
console.log('AniList requests: ' + requests + '; accepted records: ' + accepted + '; filtered records: ' + filtered + '.');
console.log('Output bytes: ' + Buffer.byteLength(serialized));
