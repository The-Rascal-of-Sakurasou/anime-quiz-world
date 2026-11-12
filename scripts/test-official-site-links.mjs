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

const catalogIds = new Set(catalog.items.map((anime) => Number(anime.id)));
for (const id of overrides.keys()) {
  assert.ok(catalogIds.has(id), "Official-site override must reference an existing catalogue record: " + id);
}
const hasOfficial = (anime) => !getSearchAnimeOfficialUrl(anime).startsWith(fallback);
const top100Missing = catalog.items.slice(0, 100).filter((anime) => !hasOfficial(anime));
assert.equal(top100Missing.length, 0, "All top 100 popular works must have a verified official link or curated override");
const top250Missing = catalog.items.slice(0, 250).filter((anime) => !hasOfficial(anime)).length;
const top500Missing = catalog.items.slice(0, 500).filter((anime) => !hasOfficial(anime)).length;

console.log("Official anime-site link tests passed: overrides, Japanese and English labels, social filtering, disabled/streaming links, featured rail, and catalogue coverage.");
console.log("Official-link coverage: top 100 = 100%; top 250 unresolved = " + top250Missing + "; top 500 unresolved = " + top500Missing + ".");
