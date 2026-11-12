import { mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const API = 'https://graphql.anilist.co';
const PER_PAGE = 25;
const BATCH_SIZE = 3;
const MAX_PAGES = 200;
const FORMATS = ['TV', 'TV_SHORT', 'MOVIE', 'OVA', 'ONA', 'SPECIAL'];
const ALLOWED_FORMATS = new Set(FORMATS);
const SORTS = ['POPULARITY_DESC', 'SCORE_DESC', 'FAVOURITES_DESC', 'TRENDING_DESC', 'ID_DESC'];
const SOURCE_RULES = {
  MANGA: { type: 'MANGA', formats: ['MANGA', 'ONE_SHOT'] },
  LIGHT_NOVEL: { type: 'MANGA', formats: ['NOVEL'] },
  NOVEL: { type: 'MANGA', formats: ['NOVEL'] },
  WEB_NOVEL: { type: 'MANGA', formats: ['NOVEL'] },
  DOUJINSHI: { type: 'MANGA', formats: ['MANGA', 'ONE_SHOT', 'NOVEL'] },
  VISUAL_NOVEL: { type: 'MANGA', formats: ['MANGA', 'ONE_SHOT', 'NOVEL'] },
  VIDEO_GAME: { type: 'MANGA', formats: ['MANGA', 'ONE_SHOT', 'NOVEL'] },
  OTHER: { type: 'MANGA', formats: ['MANGA', 'ONE_SHOT', 'NOVEL'] },
  ANIME: { type: 'ANIME', formats: FORMATS }
};
const FIELDS = 'id countryOfOrigin source(version:2) format popularity title { romaji english native } ' +
  'description(asHtml:false) synonyms coverImage { large medium extraLarge } episodes seasonYear averageScore ' +
  'genres studios(isMain:true) { nodes { name } } startDate { year } ' +
  'characters(sort:ROLE,perPage:5) { nodes { id name { full native } image { large } } } ' +
  'externalLinks { url site type isDisabled language } ' +
  'relations { edges { relationType node { id type countryOfOrigin format } } }';

function hasJapaneseTitle(anime) {
  const names = [anime?.title?.native, anime?.title?.english, anime?.title?.romaji, ...(anime?.synonyms || [])];
  return names.some(value => typeof value === 'string' && /[ぁ-んァ-ヶ]/.test(value));
}
function isJapaneseOriginAnime(anime) {
  if (!anime) return false;
  if (anime.countryOfOrigin !== 'JP') return Number(anime.popularity) >= 10000 && hasJapaneseTitle(anime);
  if (anime.source === 'ORIGINAL') return true;
  const rule = SOURCE_RULES[anime.source];
  if (!rule || !Array.isArray(anime.relations?.edges)) return false;
  return anime.relations.edges.some(edge => {
    const node = edge?.node;
    return ['SOURCE', 'ADAPTATION'].includes(edge?.relationType) &&
      node?.type === rule.type && node?.countryOfOrigin === 'JP' && rule.formats.includes(node.format);
  });
}
function usable(anime) {
  const image = anime?.coverImage?.large || anime?.coverImage?.medium || anime?.coverImage?.extraLarge || '';
  return !!anime?.id && anime.isAdult !== true && isJapaneseOriginAnime(anime) &&
    ALLOWED_FORMATS.has(anime.format) && /^https?:\/\//i.test(image) &&
    !(anime.genres || []).includes('Hentai');
}
function mergeRecord(oldRecord, newRecord) {
  if (!oldRecord) return newRecord;
  const merge = (oldValue, newValue) => {
    if (newValue == null || newValue === '') return oldValue;
    if (Array.isArray(newValue)) return newValue.length ? newValue : oldValue;
    if (newValue && typeof newValue === 'object') {
      const out = { ...(oldValue && typeof oldValue === 'object' ? oldValue : {}) };
      for (const [key, value] of Object.entries(newValue)) out[key] = merge(out[key], value);
      return out;
    }
    return newValue;
  };
  return merge(oldRecord, newRecord);
}
const records = new Map();
let requestCount = 0;
async function fetchBatch(sort, pages, format = null) {
  const aliases = pages.map((page, index) =>
    'p' + index + ': Page(page:' + page + ',perPage:' + PER_PAGE + ') {' +
    ' pageInfo { hasNextPage } media(type:ANIME,sort:' + sort + ',isAdult:false' +
    (format ? ',format:' + format : '') + ') { ' + FIELDS + ' } }'
  ).join('\n');
  const query = 'query { ' + aliases + ' }';
  let lastError;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query })
      });
      if (response.status === 429 || response.status >= 500) {
        const retry = Number(response.headers.get('Retry-After')) || Math.min(60, 3 ** attempt);
        await new Promise(resolve => setTimeout(resolve, retry * 1000));
        lastError = new Error('AniList HTTP ' + response.status);
        continue;
      }
      if (!response.ok) throw new Error('AniList HTTP ' + response.status + ': ' + await response.text());
      const json = await response.json();
      if (json.errors?.length) throw new Error(json.errors.map(error => error.message).join(' / '));
      requestCount++;
      return pages.map((_, index) => {
        const page = json.data?.['p' + index];
        const items = (page?.media || []).filter(usable);
        for (const anime of items) {
          anime.originVerified = true;
          records.set(Number(anime.id), mergeRecord(records.get(Number(anime.id)), anime));
        }
        return { hasNextPage: page?.pageInfo?.hasNextPage === true, count: items.length };
      });
    } catch (error) {
      lastError = error;
      if (attempt < 5) await new Promise(resolve => setTimeout(resolve, Math.min(30000, 1500 * (2 ** attempt))));
    }
  }
  throw lastError || new Error('AniList request failed');
}
async function collectScope(sort, format, pageLimit) {
  for (let page = 1; page <= pageLimit; page += BATCH_SIZE) {
    const pages = Array.from({ length: Math.min(BATCH_SIZE, pageLimit - page + 1) }, (_, index) => page + index);
    const result = await fetchBatch(sort, pages, format);
    const last = result[result.length - 1];
    console.log(sort + (format ? '/' + format : '') + ': page ' + pages[0] + '-' + pages[pages.length - 1] +
      ', accepted ' + result.reduce((sum, item) => sum + item.count, 0) + ', unique ' + records.size);
    if (last && !last.hasNextPage) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
for (const sort of SORTS) await collectScope(sort, null, MAX_PAGES);
for (const format of FORMATS) await collectScope('POPULARITY_DESC', format, 20);

const items = [...records.values()].sort((a, b) =>
  (Number(b.popularity) || 0) - (Number(a.popularity) || 0) ||
  (Number(b.averageScore) || 0) - (Number(a.averageScore) || 0) ||
  Number(a.id) - Number(b.id)
);
const json = JSON.stringify({
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  source: 'AniList GraphQL API',
  itemCount: items.length,
  items
});
await mkdir('data', { recursive: true });
await writeFile('data/anime-catalog.json', json);
await writeFile('data/anime-catalog.json.gz', gzipSync(json, { level: 9 }));
console.log('Catalogue generated: ' + items.length + ' unique anime; ' + requestCount +
  ' GraphQL requests; ' + Buffer.byteLength(json) + ' bytes JSON.');
