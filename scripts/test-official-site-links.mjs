import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile("index.html", "utf8");
const catalog = JSON.parse(await readFile("data/anime-catalog.json", "utf8"));
assert.ok(Array.isArray(catalog.items) && catalog.items.length >= 100, "Shared anime catalogue must contain at least 100 works");
const mapMatch = html.match(/const OFFICIAL_SITE_OVERRIDES=new Map\(\[([\s\S]*?)\]\);/);
assert.ok(mapMatch, "Official-site override map must exist");
const overrides = new Map(
  [...mapMatch[1].matchAll(/\[(\d+),'([^']+)'\]/g)]
    .map((match) => [Number(match[1]), match[2]])
);
assert.equal(overrides.size, [...overrides.keys()].length, "Official-site override IDs must be unique");

function extractFunction(name, endMarker) {
  const start = html.indexOf("function " + name + "(");
  assert.notEqual(start, -1, name + " must exist");
  const end = html.indexOf(endMarker, start);
  assert.notEqual(end, -1, name + " must have a stable end marker");
  return html.slice(start, end).trim();
}

const titleOf = (anime) => anime?.title?.native || anime?.title?.english || anime?.title?.romaji || "Unknown title";
const searchResolverSource = extractFunction("getSearchAnimeOfficialUrl", "\n$('#searchForm')");
const getSearchAnimeOfficialUrl = new Function(
  "OFFICIAL_SITE_OVERRIDES",
  "titleOf",
  "URL",
  searchResolverSource + "; return getSearchAnimeOfficialUrl;"
)(overrides, titleOf, URL);

const featuredResolverSource = extractFunction("officialAnimeLink", "\nfunction renderFeaturedRail");
const officialAnimeLink = new Function(
  "getSearchAnimeOfficialUrl",
  featuredResolverSource + "; return officialAnimeLink;"
)(getSearchAnimeOfficialUrl);

assert.equal(
  getSearchAnimeOfficialUrl({ id: 21366, title: { native: "３月のライオン" } }),
  "https://www.aniplex.co.jp/lineup/3lion/",
  "3-gatsu no Lion must link to Aniplex's official anime page"
);

assert.equal(
  getSearchAnimeOfficialUrl({ id: 199, title: { native: "千と千尋の神隠し" } }),
  "https://www.ghibli.jp/works/chihiro/",
  "Curated overrides must be used before external links"
);

assert.equal(
  getSearchAnimeOfficialUrl({
    id: 999001,
    title: { native: "検証作品" },
    externalLinks: [{ site: "Official Site", type: "INFO", url: "https://example.jp/anime/", isDisabled: false }]
  }),
  "https://example.jp/anime/",
  "English official-site labels must resolve"
);

assert.equal(
  getSearchAnimeOfficialUrl({
    id: 999002,
    title: { native: "検証作品" },
    externalLinks: [{ site: "オフィシャルサイト", type: "SOCIAL", language: "ja", url: "https://example.jp/home/", isDisabled: false }]
  }),
  "https://example.jp/home/",
  "Japanese official-site labels must resolve even when marked SOCIAL"
);

const fallback = "https://www.google.com/search?";
assert.ok(
  getSearchAnimeOfficialUrl({
    id: 999003,
    title: { native: "検証作品" },
    externalLinks: [{ site: "Official Site", type: "INFO", url: "https://twitter.com/example", isDisabled: false }]
  }).startsWith(fallback),
  "Social-network URLs must not be treated as official sites"
);
assert.ok(
  getSearchAnimeOfficialUrl({
    id: 999004,
    title: { native: "検証作品" },
    externalLinks: [{ site: "Official Site", type: "INFO", url: "https://example.jp/disabled", isDisabled: true }]
  }).startsWith(fallback),
  "Disabled links must be ignored"
);
assert.ok(
  getSearchAnimeOfficialUrl({
    id: 999005,
    title: { native: "検証作品" },
    externalLinks: [{ site: "Official Site", type: "STREAMING", url: "https://example.jp/watch", isDisabled: false }]
  }).startsWith(fallback),
  "Streaming links must not be treated as official homepages"
);

assert.deepEqual(
  officialAnimeLink({ id: 199, title: { native: "千と千尋の神隠し" } }),
  { url: "https://www.ghibli.jp/works/chihiro/", kind: "official" },
  "Featured rail must use the same curated official-site resolver"
);
assert.equal(
  officialAnimeLink({ id: 999006, title: { native: "未登録作品" } }).kind,
  "search",
  "Unverified titles must use an explicitly labelled search fallback"
);
assert.ok(
  html.includes("const url=getSearchAnimeOfficialUrl(anime);"),
  "Featured rail must delegate to the shared official-site resolver"
);

assert.ok(html.includes("imageLink.target='_self';"), "Search-result cover links must navigate in the current page on mobile browsers");
assert.ok(html.includes("titleLink.target='_self';"), "Search-result title links must navigate in the current page on mobile browsers");
assert.ok(html.includes("card.href=link.url;card.target='_self';"), "Featured anime links must navigate in the current page on mobile browsers");

const catalogIds = new Set(catalog.items.map((anime) => Number(anime.id)));
for (const id of overrides.keys()) {
  assert.ok(catalogIds.has(id), "Official-site override must reference an existing catalogue record: " + id);
}
const normalizeTitle = (value) => String(value || "").normalize("NFKC").toLowerCase().replace(/[^\\p{L}\\p{N}]/gu, "");
const catalogTitleKeys = catalog.items.flatMap((anime) => [
  anime.title?.native, anime.title?.english, anime.title?.romaji, ...(anime.synonyms || [])
].filter(Boolean).map(normalizeTitle));
const requiredPopularTitleGroups = [
  ["葬送のフリーレン", "Frieren Beyond Journeys End"],
  ["薬屋のひとりごと", "The Apothecary Diaries"],
  ["SPY×FAMILY", "Spy x Family"],
  ["進撃の巨人", "Attack on Titan", "Shingeki no Kyojin"],
  ["鬼滅の刃", "Demon Slayer", "Kimetsu no Yaiba"],
  ["呪術廻戦", "Jujutsu Kaisen"],
  ["僕のヒーローアカデミア", "My Hero Academia"],
  ["ハイキュー", "Haikyu"],
  ["ぼっちざろっく", "Bocchi the Rock"],
  ["STEINS;GATE", "シュタインズゲート"],
  ["Re:ゼロから始める異世界生活", "Re Zero"],
  ["無職転生", "Mushoku Tensei"],
  ["この素晴らしい世界に祝福を", "KonoSuba"],
  ["ノーゲームノーライフ", "No Game No Life"],
  ["Angel Beats"],
  ["Charlotte"],
  ["青春ブタ野郎", "Rascal Does Not Dream"],
  ["聲の形", "A Silent Voice"],
  ["君の名は", "Your Name"],
  ["ONE PIECE"],
  ["NARUTO", "ナルト"],
  ["ドラゴンボール", "Dragon Ball"],
  ["名探偵コナン", "Detective Conan"],
  ["新世紀エヴァンゲリオン", "Neon Genesis Evangelion"],
  ["コードギアス", "Code Geass"],
  ["あの日見た花の名前を僕達はまだ知らない", "Anohana"],
  ["さくら荘のペットな彼女", "The Pet Girl of Sakurasou"],
  ["魔法少女まどかマギカ", "Puella Magi Madoka Magica"],
  ["ソードアートオンライン", "Sword Art Online"],
];
const missingPopularTitles = requiredPopularTitleGroups.filter((aliases) =>
  !aliases.some((alias) => {
    const key = normalizeTitle(alias);
    return catalogTitleKeys.some((candidate) => candidate.includes(key) || key.includes(candidate));
  })
);
assert.equal(missingPopularTitles.length, 0, "Famous anime must be present in the shared catalogue: " + JSON.stringify(missingPopularTitles));

const hasOfficial = (anime) => !getSearchAnimeOfficialUrl(anime).startsWith(fallback);
const top100Missing = catalog.items.slice(0, 100).filter((anime) => !hasOfficial(anime));
assert.equal(top100Missing.length, 0, "All top 100 popular works must have a verified official link or curated override");
const top250Unresolved = catalog.items.slice(0, 250).filter((anime) => !hasOfficial(anime));
const top500Unresolved = catalog.items.slice(0, 500).filter((anime) => !hasOfficial(anime));
const display = (anime) => ({
  id: Number(anime.id),
  title: titleOf(anime),
  english: anime.title?.english || null,
  popularity: Number(anime.popularity) || 0,
});

console.log("Official anime-site link tests passed: overrides, Japanese and English labels, social filtering, disabled/streaming links, featured rail, and catalogue coverage.");
console.log("Official-link coverage: top 100 = 100%; top 250 unresolved = " + top250Unresolved.length + "; top 500 unresolved = " + top500Unresolved.length + ".");
if (top250Unresolved.length) console.log("Top-250 unresolved titles: " + JSON.stringify(top250Unresolved.map(display)));
if (top500Unresolved.length) console.log("Top-500 unresolved titles: " + JSON.stringify(top500Unresolved.map(display)));
