import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';

const CATALOG = resolve('data/anime-catalog.json');
const REPORT = resolve(process.env.AQW_IMAGE_AUDIT_REPORT || 'artifacts/image-url-audit/report.json');
const WORKERS = 8;
const TIMEOUT_MS = 15000;
const USER_AGENT = 'AnimeQuizWorld-image-audit/1.0';

export function isPlaceholderImageUrl(value) {
  return /(?:no[-_ ]?image|placeholder|default[-_ ]?image|(?:^|\\/)default(?:\\.[a-z0-9]+)?(?:[?#]|$))/i.test(String(value || ''));
}

export function isHttpImageUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) && !!url.hostname;
  } catch {
    return false;
  }
}

function responseProblem(response) {
  if (!response.ok) return 'HTTP ' + response.status;
  const type = String(response.headers.get('content-type') || '').toLowerCase();
  if (!type.startsWith('image/')) return 'Unexpected content-type: ' + (type || 'missing');
  return null;
}

async function requestImage(url, method) {
  return fetch(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      ...(method === 'GET' ? { Range: 'bytes=0-0' } : {}),
    },
  });
}

async function inspectUrl(url) {
  if (!isHttpImageUrl(url)) return { ok: false, reason: 'Invalid or non-HTTP(S) URL' };
  let lastReason = 'Unknown error';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let response = await requestImage(url, 'HEAD');
      let problem = responseProblem(response);
      if (problem) {
        if (response.status === 429 || response.status >= 500) {
          lastReason = problem;
          if (attempt === 0) { await new Promise(resolve => setTimeout(resolve, 700)); continue; }
          return { ok: false, reason: problem, status: response.status };
        }
        response = await requestImage(url, 'GET');
        problem = responseProblem(response);
      }
      const result = {
        ok: !problem,
        reason: problem || null,
        status: response.status,
        contentType: response.headers.get('content-type') || null,
        finalUrl: response.url || url,
      };
      if (response.body) await response.body.cancel().catch(() => {});
      if (problem && (response.status === 429 || response.status >= 500) && attempt === 0) {
        lastReason = problem;
        await new Promise(resolve => setTimeout(resolve, 700));
        continue;
      }
      return result;
    } catch (error) {
      lastReason = error?.name === 'TimeoutError' || error?.name === 'AbortError'
        ? 'Request timed out' : String(error?.message || error).slice(0, 180);
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 700));
    }
  }
  return { ok: false, reason: lastReason };
}

async function mapLimit(items, limit, worker) {
  const output = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      output[index] = await worker(items[index]);
    }
  }));
  return output;
}

async function selfTest() {
  assert.equal(isPlaceholderImageUrl('NO IMAGE'), true);
  assert.equal(isPlaceholderImageUrl('https://example.test/no-image.jpg'), true);
  assert.equal(isPlaceholderImageUrl('https://example.test/placeholder.png'), true);
  assert.equal(isPlaceholderImageUrl('https://example.test/default-image.png'), true);
  assert.equal(isPlaceholderImageUrl('https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg'), true);
  assert.equal(isPlaceholderImageUrl('https://example.test/cover.jpg'), false);
  assert.equal(isHttpImageUrl('https://s4.anilist.co/file/anime/1.jpg'), true);
  assert.equal(isHttpImageUrl('javascript:alert(1)'), false);
  assert.equal(isHttpImageUrl('not a url'), false);
  assert.equal(responseProblem({ ok: true, headers: new Headers({ 'content-type': 'image/jpeg' }) }), null);
  assert.match(responseProblem({ ok: true, headers: new Headers({ 'content-type': 'text/html' }) }), /content-type/);
  assert.equal(responseProblem({ ok: false, status: 404, headers: new Headers() }), 'HTTP 404');
  console.log('Image URL audit self-tests passed.');
}

async function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const catalog = JSON.parse(await readFile(CATALOG, 'utf8'));
  if (!Array.isArray(catalog.items)) throw new Error('Catalogue items array is missing.');
  const byUrl = new Map();
  const missing = [];
  const placeholders = [];
  for (const anime of catalog.items) {
    const image = anime?.coverImage || {};
    const url = String(image.large || image.medium || image.extraLarge || '').trim();
    if (!url) {
      missing.push({ id: anime?.id ?? null, title: anime?.title?.native || anime?.title?.romaji || '', reason: 'Missing cover URL' });
      continue;
    }
    if (isPlaceholderImageUrl(url)) {
      placeholders.push({ id: anime?.id ?? null, title: anime?.title?.native || anime?.title?.romaji || '', url, reason: 'NO IMAGE / placeholder URL' });
      continue;
    }
    if (!byUrl.has(url)) byUrl.set(url, []);
    byUrl.get(url).push({ id: anime.id, title: anime?.title?.native || anime?.title?.romaji || '' });
  }
  const urls = [...byUrl.keys()];
  console.log('Auditing ' + urls.length + ' unique image URLs across ' + catalog.items.length + ' anime records.');
  const results = await mapLimit(urls, WORKERS, async url => ({ url, ...(await inspectUrl(url)), anime: byUrl.get(url) }));
  const broken = results.filter(item => !item.ok);
  const sharedImageGroups = [...byUrl.entries()]
    .filter(([, anime]) => anime.length > 1)
    .map(([url, anime]) => ({ url, referenceCount: anime.length, anime: anime.slice(0, 20) }))
    .sort((a, b) => b.referenceCount - a.referenceCount);
  const duplicateImageReferenceCount = catalog.items.length - missing.length - placeholders.length - urls.length;
  const report = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    catalogGeneratedAt: catalog.generatedAt || null,
    catalogCount: catalog.items.length,
    uniqueImageUrlCount: urls.length,
    checkedUrlCount: results.length,
    duplicateImageReferenceCount,
    sharedImageUrlCount: sharedImageGroups.length,
    largestSharedImageGroups: sharedImageGroups.slice(0, 100),
    missingCoverCount: missing.length,
    placeholderCoverCount: placeholders.length,
    brokenUrlCount: broken.length,
    healthyUrlCount: results.length - broken.length,
    missingCovers: missing.slice(0, 500),
    placeholderCovers: placeholders.slice(0, 1000),
    brokenUrls: broken.slice(0, 1000),
  };
  await mkdir(dirname(REPORT), { recursive: true });
  await writeFile(REPORT, JSON.stringify(report, null, 2) + '\n');
  const summary = [
    '## AQW image URL audit',
    '',
    '- Anime records: **' + report.catalogCount + '**',
    '- Unique image URLs checked: **' + report.checkedUrlCount + '**',
    '- Duplicate image references: **' + report.duplicateImageReferenceCount + '** across **' + report.sharedImageUrlCount + '** shared URLs',
    '- Working URLs: **' + report.healthyUrlCount + '**',
    '- Failed URLs: **' + report.brokenUrlCount + '**',
    '- Missing cover URLs: **' + report.missingCoverCount + '**',
    '- NO IMAGE / placeholder URLs excluded: **' + report.placeholderCoverCount + '**',
    '',
    'NO IMAGE / placeholder URLs are excluded from the usable-image pool. Network failures are reported separately because transient CDN/network errors can occur.',
  ].join('\n');
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
  console.log(summary);
  console.log('Full report: ' + REPORT);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
