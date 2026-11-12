import { readFile } from 'node:fs/promises';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repo || !token) throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required.');

const html = await readFile('index.html', 'utf8');
const mapStart = html.indexOf('const JAPANESE_SYNOPSIS_OVERRIDES=new Map(Object.entries({');
const mapEnd = html.indexOf('}).map(([title,summary])', mapStart);
if (mapStart < 0 || mapEnd < 0) throw new Error('Could not locate JAPANESE_SYNOPSIS_OVERRIDES.');
const mapSource = html.slice(mapStart, mapEnd);
const covered = new Set(
  [...mapSource.matchAll(/^\s*'([^']*)'\s*:/gm)].map(match => normalize(match[1]))
);

function normalize(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase()
    .replace(/[\s　・･:：!！?？.,，。'"“”「」『』()（）‐‑–—―−_-]/g, '').trim();
}

function titleVariants(item) {
  const values = [item?.title?.native, item?.title?.romaji, item?.title?.english, ...(item?.synonyms || [])].filter(Boolean);
  const variants = new Set(values.map(normalize).filter(Boolean));
  const seasonPatterns = [
    /\s*[-:：–—|｜]?\s*(?:第\s*\d+\s*(?:期|シーズン|season)|season\s*\d+|\d+(?:st|nd|rd|th)?\s*season|s\s*\d+)\s*$/i,
    /\s*[-:：–—|｜]?\s*(?:final\s+season|the\s+final\s+season|second\s+season|third\s+season|fourth\s+season|fifth\s+season|first\s+season|ファースト\s*シーズン|セカンド\s*シーズン|サード\s*シーズン|フォース\s*シーズン|フィフス\s*シーズン|part\s*\d+|第\s*\d+\s*部)\s*$/i,
    /\s*[-:：–—|｜]?\s*(?:第\s*\d+\s*クール|\d+\s*クール)\s*$/i
  ];
  const moviePatterns = [
    /^\s*(?:劇場版|the\s+movie|movie\s+version|anime\s+film|film\s+version)\s*[:：\-–—]?\s*/i,
    /\s*[-:：–—|｜]?\s*(?:劇場版|the\s+movie|movie\s+version|anime\s+film|film\s+version|movie|film)\s*$/i
  ];
  for (const value of values) {
    let base = String(value).normalize('NFKC').trim();
    for (let pass = 0; pass < 3; pass++) {
      const before = base;
      for (const pattern of [...seasonPatterns, ...moviePatterns]) base = base.replace(pattern, '').trim();
      if (base === before) break;
    }
    if (base && normalize(base) !== normalize(value)) variants.add(normalize(base));
  }
  return variants;
}

async function fetchAniListPage(page) {
  const query = `query {
    Page(page: ${page}, perPage: 25) {
      media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
        countryOfOrigin\n        title { native romaji english }
        synonyms
        popularity
        format
        seasonYear
      }
    }
  }`;
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ query })
  });
  if (!response.ok) throw new Error(`AniList page ${page} failed: HTTP ${response.status}`);
  const data = await response.json();
  if (data.errors?.length) throw new Error(`AniList GraphQL error: ${JSON.stringify(data.errors)}`);
  return data.data.Page.media;
}

const media = [];
for (let firstPage = 1; firstPage <= 20; firstPage += 4) {
  const batch = await Promise.all(
    [0, 1, 2, 3].map(offset => fetchAniListPage(firstPage + offset))
  );
  media.push(...batch.flat());
  if (firstPage < 20) await new Promise(resolve => setTimeout(resolve, 750));
}
const supportedFormats = new Set(['TV', 'TV_SHORT', 'MOVIE', 'OVA', 'ONA', 'SPECIAL']);
const missing = media.filter(item => {
  if (!supportedFormats.has(item.format)) return false;
  if (item.countryOfOrigin !== 'JP' && (!(Number(item.popularity) >= 10000) || ![item.title?.native, item.title?.english, item.title?.romaji, ...(item.synonyms || [])].some(value => typeof value === 'string' && /[ぁ-んァ-ヶ]/.test(value)))) return false;
  return ![...titleVariants(item)].some(alias => covered.has(alias));
}).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

const title = 'Japanese synopsis coverage audit';
const date = new Date().toISOString().slice(0, 10);
const body = missing.length
  ? [
      `## 未登録の人気作品候補（${date}）`,
      '',
      'AniListの人気上位500作品（日本制作作品と、日本語タイトルがあり人気条件を満たす海外作品）を確認し、日本語あらすじの登録キーと照合しました。',
      '以下は**追加候補の検出結果**です。登録前に公式サイト等の日本語一次情報を確認し、作品・シーズンの取り違えがないことを人手で確認してください。',
      '',
      '| 作品名（日本語原題） | 形式 | 年 | Popularity |',
      '|---|---|---:|---:|',
      ...missing.slice(0, 40).map(item => `| ${item.title?.native || item.title?.romaji || 'タイトル不明'} | ${item.format || '不明'} | ${item.seasonYear || '不明'} | ${item.popularity || 0} |`),
      '',
      `検出数: **${missing.length}**（表示は最大40件）`,
      '',
      'このIssueはGitHub Actionsが週1回更新します。自動生成・機械翻訳のあらすじを本番データへ直接追加することはありません。'
    ].join('\n')
  : `## 監査結果（${date}）\n\nAniListの人気上位100作品（日本制作作品と、日本語タイトルがあり人気条件を満たす海外作品）について、未登録候補は検出されませんでした。\n\n次回の週次監査までこのIssueを閉じます。`;

const headers = {
  authorization: `Bearer ${token}`,
  accept: 'application/vnd.github+json',
  'x-github-api-version': '2022-11-28',
  'content-type': 'application/json'
};
const base = `https://api.github.com/repos/${repo}`;
const listResponse = await fetch(`${base}/issues?state=all&per_page=100`, { headers });
if (!listResponse.ok) throw new Error(`GitHub issue lookup failed: HTTP ${listResponse.status}`);
const issues = await listResponse.json();
const existing = issues.find(issue => !issue.pull_request && issue.title === title);

if (missing.length) {
  if (existing) {
    const patch = {};
    if (existing.body !== body) patch.body = body;
    if (existing.state !== 'open') patch.state = 'open';
    if (Object.keys(patch).length) {
      const response = await fetch(`${base}/issues/${existing.number}`, {
        method: 'PATCH', headers, body: JSON.stringify(patch)
      });
      if (!response.ok) throw new Error(`GitHub issue update failed: HTTP ${response.status}`);
    }
    console.log(`Updated synopsis audit issue #${existing.number}; ${missing.length} candidates.`);
  } else {
    const response = await fetch(`${base}/issues`, {
      method: 'POST', headers, body: JSON.stringify({ title, body })
    });
    if (!response.ok) throw new Error(`GitHub issue creation failed: HTTP ${response.status}`);
    const issue = await response.json();
    console.log(`Created synopsis audit issue #${issue.number}; ${missing.length} candidates.`);
  }
} else if (existing) {
  if (existing.body !== body || existing.state !== 'closed') {
    const update = await fetch(`${base}/issues/${existing.number}`, {
      method: 'PATCH', headers, body: JSON.stringify({ body, state: 'closed' })
    });
    if (!update.ok) throw new Error(`GitHub issue close failed: HTTP ${update.status}`);
  }
  console.log(`Closed synopsis audit issue #${existing.number}; no missing candidates.`);
} else {
  console.log('Synopsis coverage audit passed; no missing candidates in the top 500.');
}
