import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';

const API = 'https://graphql.anilist.co';
const OUTPUT = 'data/anime-catalog.json';
const OUTPUT_GZIP = 'data/anime-catalog.json.gz';
const FORMATS = ['TV', 'TV_SHORT', 'MOVIE', 'OVA', 'ONA', 'SPECIAL'];
const BASE_SORTS = ['POPULARITY_DESC', 'ID', 'ID_DESC'];
const OVERFLOW_SORTS = ['SCORE_DESC', 'FAVOURITES_DESC', 'TRENDING_DESC', 'START_DATE_DESC'];
const FIELDS = 'id countryOfOrigin source(version:2) relations { edges { relationType node { id type countryOfOrigin format } } } format popularity title { romaji english native } description(asHtml:false) synonyms coverImage { large medium extraLarge } episodes seasonYear averageScore genres studios(isMain:true) { nodes { name } } startDate { year month day } characters(sort:ROLE,perPage:5) { nodes { id name { full native } image { large } } } externalLinks { url site type isDisabled language }';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalize = (value) => {
  if (typeof value === 'string') return value.normalize('NFC');
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  return value;
};

function hasJapaneseTitle(anime) {
  const names = [anime?.title?.native, anime?.title?.english, anime?.title?.romaji,
    ...(Array.isArray(anime?.synonyms) ? anime.synonyms : [])];
  return names.some((name) => typeof name === 'string' && /[ぁ-んァ-ヶ]/.test(name));
}

function isJapaneseOriginAnime(anime) {
  if (!anime || typeof anime.countryOfOrigin !== 'string' || !anime.countryOfOrigin) return false;
  if (anime.countryOfOrigin !== 'JP') return Number(anime.popularity) >= 10000 && hasJapaneseTitle(anime);
  if (anime.originVerified === true) return true;
  if (anime.source === 'ORIGINAL') return true;
  const sourceRules = {
    MANGA: { type: 'MANGA', formats: ['MANGA', 'ONE_SHOT'] },
    LIGHT_NOVEL: { type: 'MANGA', formats: ['NOVEL'] },
    NOVEL: { type: 'MANGA', formats: ['NOVEL'] },
    WEB_NOVEL: { type: 'MANGA', formats: ['NOVEL'] },
    DOUJINSHI: { type: 'MANGA', formats: ['MANGA', 'ONE_SHOT', 'NOVEL'] },
    VISUAL_NOVEL: { type: 'MANGA', formats: ['MANGA', 'ONE_SHOT', 'NOVEL'] },
    VIDEO_GAME: { type: 'MANGA', formats: ['MANGA', 'ONE_SHOT', 'NOVEL'] },
    OTHER: { type: 'MANGA', formats: ['MANGA', 'ONE_SHOT', 'NOVEL'] },
    ANIME: { type: 'ANIME', formats: ['TV', 'TV_SHORT', 'MOVIE', 'OVA', 'ONA', 'SPECIAL'] },
  };
  const rule = sourceRules[anime.source];
  const relationVerified = !!rule && Array.isArray(anime.relations?.edges) && anime.relations.edges.some((edge) =>
    (edge?.relationType === 'SOURCE' || edge?.relationType === 'ADAPTATION') &&
    edge.node?.type === rule.type &&
    edge.node?.countryOfOrigin === 'JP' &&
    rule.formats.includes(edge.node?.format)
  );
  if (relationVerified) return true;
  return !!rule && Number(anime.popularity) >= 10000 && hasJapaneseTitle(anime);
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

async function fetchBatch(pages, sort, format, yearStart, yearEnd, includeForeign = false) {
  const dateFilter = Number.isInteger(yearStart) && Number.isInteger(yearEnd)
    ? ',startDate_greater:' + (yearStart * 10000) + ',startDate_lesser:' + ((yearEnd + 1) * 10000)
    : '';
  const countryFilter = includeForeign ? '' : 'countryOfOrigin:JP,';
  const aliases = pages.map((page, index) =>
    'p' + index + ': Page(page:' + page + ',perPage:50) { pageInfo { hasNextPage } media(type:ANIME,' + countryFilter + 'sort:' +
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

let previousOutput = null;
try { previousOutput = JSON.parse(await readFile(OUTPUT, 'utf8')); } catch {}
const incremental = process.env.AQW_FULL_CATALOG !== 'true' && previousOutput?.schemaVersion === 2 && Array.isArray(previousOutput.items);
const records = new Map(incremental ? previousOutput.items.filter((item) => Number.isInteger(Number(item?.id))).map((item) => [Number(item.id), item]) : []);
const initialRecordCount = records.size;
let requests = 0;
let accepted = 0;
let filtered = 0;

async function scanScope(format, sort, yearStart, yearEnd, appendOnly = false, includeForeign = false, pageLimit = 100) {
  for (let page = 1; page <= pageLimit; page += 3) {
    const pages = [page, page + 1, page + 2].filter((value) => value <= pageLimit);
    await sleep(1200);
    const results = await fetchBatch(pages, sort, format, yearStart, yearEnd, includeForeign);
    requests++;
    let addedThisBatch = 0;
    for (const result of results) {
      for (const anime of result.items) {
        if (!isUsableAnime(anime)) {
          filtered++;
          continue;
        }
        const id = Number(anime.id);
        const previous = records.get(id);
        if (!previous) {
          records.set(id, anime);
          accepted++;
          addedThisBatch++;
        } else if (!appendOnly) {
          records.set(id, mergeRecord(previous, anime));
          accepted++;
        }
      }
    }
    const hasMore = results.at(-1)?.hasNextPage === true;
    // ID_DESC places newly indexed AniList records first. Once a complete batch
    // contains no unseen IDs, older pages cannot add newer catalogue entries.
    if (appendOnly && addedThisBatch === 0) return false;
    if (!hasMore) return false;
    if (pages.at(-1) === pageLimit) return true;
    if (requests % 10 === 0) {
      console.log('Requests: ' + requests + ', unique catalogue: ' + records.size + ', accepted records: ' + accepted);
    }
  }
  return false;
}

function metadataKey(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, '');
}

export function dedupeAnimeMetadata(anime) {
  const synonyms = [];
  const synonymKeys = new Set();
  for (const raw of Array.isArray(anime?.synonyms) ? anime.synonyms : []) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const key = metadataKey(raw);
    if (!key || synonymKeys.has(key)) continue;
    synonymKeys.add(key);
    synonyms.push(raw.normalize('NFC').trim());
  }
  const characters = [];
  const characterKeys = new Set();
  for (const character of Array.isArray(anime?.characters?.nodes) ? anime.characters.nodes : []) {
    if (!character || typeof character !== 'object') continue;
    const id = Number(character.id);
    const name = character.name?.full || character.name?.native || '';
    const key = Number.isSafeInteger(id) && id > 0
      ? 'id:' + id
      : 'name:' + metadataKey(name) + '|image:' + String(character.image?.large || '');
    if (key === 'name:|image:' || characterKeys.has(key)) continue;
    characterKeys.add(key);
    characters.push(character);
  }
  return {
    ...anime,
    ...(Array.isArray(anime?.synonyms) ? { synonyms } : {}),
    ...(anime?.characters ? { characters: { ...anime.characters, nodes: characters } } : {}),
  };
}
function compactDescription(value) {
  const cleaned = String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\\[nrt]/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  // The quiz renderer already displays at most 260 characters per synopsis.
  return cleaned.length > 260 ? cleaned.slice(0, 257).trimEnd() + '…' : cleaned;
}

function compactOfficialExternalLinks(links) {
  const socialHost = /(^|\\.)(twitter\\.com|x\\.com|facebook\\.com|instagram\\.com|youtube\\.com|youtu\\.be|tiktok\\.com|discord\\.gg|discord\\.com|reddit\\.com)$/i;
  return (Array.isArray(links) ? links : []).filter((link) => {
    if (!link || link.isDisabled || typeof link.url !== 'string' || !/^https?:\\/\\//i.test(link.url)) return false;
    let host = '';
    try { host = new URL(link.url).hostname; } catch { return false; }
    if (socialHost.test(host)) return false;
    const site = String(link.site || '').normalize('NFKC').toLowerCase();
    const type = String(link.type || '').toUpperCase();
    if (type === 'STREAMING') return false;
    const explicitOfficial = /(official|公式|オフィシャル)/i.test(site);
    const homepageLabel = /(website|web site|homepage|home page|ホームページ|公式ページ)/i.test(site);
    return explicitOfficial || homepageLabel;
  }).map((link) => ({
    url: link.url,
    site: link.site,
    type: link.type,
    language: link.language,
    isDisabled: false,
  }));
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
  if (incremental) {
    await scanScope(format, 'ID_DESC', undefined, undefined, true);
    // Add a bounded supplement of famous foreign works with Japanese titles.
    await scanScope(format, 'POPULARITY_DESC', undefined, undefined, false, true, 20);
    continue;
  }
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
  // The foreign supplement is deliberately popularity-bounded to avoid a catalogue-size explosion.
  await scanScope(format, 'POPULARITY_DESC', undefined, undefined, false, true, 20);
}

const items = [...records.values()].map((anime) => {
  const { source, relations, ...compact } = dedupeAnimeMetadata(anime);
  compact.description = compactDescription(compact.description);
  compact.externalLinks = compactOfficialExternalLinks(compact.externalLinks);
  return {
    ...compact,
    catalogueEligible: true,
    originVerified: compact.countryOfOrigin === 'JP',
  };
}).sort((a, b) =>
  (Number(b.popularity) || 0) - (Number(a.popularity) || 0) || Number(a.id) - Number(b.id)
);
const unchanged = previousOutput?.schemaVersion === 2 && JSON.stringify(previousOutput.items) === JSON.stringify(items);
const output = {
  schemaVersion: 2,
  generatedAt: unchanged ? previousOutput.generatedAt : new Date().toISOString(),
  source: 'AniList GraphQL API',
  originRule: 'Verified Japanese-origin works plus foreign works with a Japanese-language title and popularity >= 10000',
  count: items.length,
  items,
};
await mkdir(dirname(OUTPUT), { recursive: true });
const serialized = JSON.stringify(output);
await writeFile(OUTPUT, serialized + '\n');
const compressed = gzipSync(Buffer.from(serialized + '\n', 'utf8'), { level: 9, mtime: 0 });
await writeFile(OUTPUT_GZIP, compressed);
console.log('Catalogue mode: ' + (incremental ? 'append-only incremental' : 'full initial/rebuild') + '.');
console.log('New unique records: ' + Math.max(0, items.length - initialRecordCount) + '.');
console.log('Catalogue complete: ' + items.length + ' unique usable anime.');
console.log('AniList requests: ' + requests + '; accepted/refreshed records: ' + accepted + '; filtered records: ' + filtered + '.');
console.log('Output bytes: ' + Buffer.byteLength(serialized));
console.log('Gzip output bytes: ' + compressed.byteLength + ' (' + (100 * compressed.byteLength / Buffer.byteLength(serialized)).toFixed(1) + '% of JSON).');
