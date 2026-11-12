import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile("index.html", "utf8");
const catalog = JSON.parse(await readFile("data/anime-catalog.json", "utf8"));
assert.ok(Array.isArray(catalog.items) && catalog.items.length >= 100, "Shared anime catalogue must contain at least 100 works");
const normalizeTitle = (value) => String(value || "")
  .normalize("NFKC")
  .toLocaleLowerCase()
  .replace(/[\\s　・:：!！?？.,，。'"“”「」『』()（）‐‑–—―−_-]/g, "");
const requiredPopularTitles = [
  "進撃の巨人", "シュタインズ・ゲート", "青春ブタ野郎", "無職転生", "Re:ゼロ",
  "この素晴らしい世界に祝福を", "ノーゲーム・ノーライフ", "Angel Beats!", "Charlotte",
  "葬送のフリーレン", "薬屋のひとりごと", "SPY×FAMILY", "ONE PIECE", "NARUTO",
  "ドラゴンボール", "名探偵コナン", "鬼滅の刃", "呪術廻戦", "僕のヒーローアカデミア",
  "ハイキュー!!", "ぼっち・ざ・ろっく！", "新世紀エヴァンゲリオン", "コードギアス",
  "カウボーイビバップ", "あの日見た花の名前を僕達はまだ知らない。",
  "さくら荘のペットな彼女", "とある魔術の禁書目録", "とある科学の超電磁砲",
  "夏目友人帳", "銀魂", "HUNTER×HUNTER", "鋼の錬金術師", "東京喰種",
  "モブサイコ100", "ワンパンマン", "ヴァイオレット・エヴァーガーデン",
  "四月は君の嘘", "けいおん！", "氷菓", "とらドラ！", "魔法少女まどか☆マギカ"
];
const missingPopularTitles = requiredPopularTitles.filter((required) => {
  const query = normalizeTitle(required);
  return !catalog.items.some((anime) =>
    [anime.title?.native, anime.title?.english, anime.title?.romaji, ...(anime.synonyms || [])]
      .some((title) => normalizeTitle(title).includes(query))
  );
});
assert.deepEqual(
  missingPopularTitles,
  [],
  "The shared catalogue is missing expected major anime titles"
);

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
const verifiedOfficialOverrides = [
  [578, "火垂るの墓", "https://www.ghibli.jp/works/hotarunohaka/"],
  [777, "HELLSING OVA", "https://www.satelight.co.jp/works/hellsing-%EF%BC%88ova%E2%85%B0%EF%BD%9E%E2%85%B3%EF%BC%89/"],
  [14467, "K", "https://goraproject.com/works/%EF%BD%8b%E3%80%80%E3%82%A2%E3%83%8B%E3%83%A1%E3%82%B7%E3%83%AA%E3%83%BC%E3%82%BA/"],
  [270, "HELLSING", "https://www.gonzo.co.jp/works/hellsing/index.html"],
  [1195, "ゼロの使い魔", "https://zero-tsukaima.com/"],
  [6, "TRIGUN", "https://madhouse.co.jp/english/works/"],
  [392, "幽☆遊☆白書", "https://pierrot.jp/archive/1990/"],
];
for (const [id, title, expected] of verifiedOfficialOverrides) {
  assert.equal(
    getSearchAnimeOfficialUrl({ id, title: { native: title } }),
    expected,
    title + " must use its verified official or studio archive page"
  );
}


assert.equal(
  getSearchAnimeOfficialUrl({ id: 6880, title: { native: "デッドマン・ワンダーランド" } }),
  "https://web.archive.org/web/*/http://dwl.jp/",
  "Deadman Wonderland must use its archived historical official site, not the current unrelated domain"
);
assert.equal(
  getSearchAnimeOfficialUrl({ id: 790, title: { native: "Ergo Proxy" } }),
  "https://web.archive.org/web/20150815194937/http://www.ergoproxy.com/",
  "Ergo Proxy must use its archived official website"
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
const unresolvedPopularWorks = catalog.items
  .slice(0, 500)
  .filter((anime) => getSearchAnimeOfficialUrl(anime).startsWith(fallback))
  .map((anime) => ({ id: anime.id, title: titleOf(anime) }));
assert.deepEqual(
  unresolvedPopularWorks,
  [],
  "The 500 most popular catalogue works must resolve to an official page or an archived official site"
);

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
const normalizeTitle = (value) => String(value || "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
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
  ["ヴァイオレットエヴァーガーデン", "Violet Evergarden"],
  ["CLANNAD", "クラナド"],
  ["四月は君の嘘", "Your Lie in April"],
  ["宇宙よりも遠い場所", "A Place Further Than the Universe"],
  ["映像研には手を出すな", "Keep Your Hands Off Eizouken"],
  ["夏目友人帳", "Natsume Yuujinchou"],
  ["リコリスリコイル", "Lycoris Recoil"],
  ["涼宮ハルヒの憂鬱", "The Melancholy of Haruhi Suzumiya"],
  ["とある科学の超電磁砲", "A Certain Scientific Railgun"],
  ["魔法科高校の劣等生", "The Irregular at Magic High School"],
  ["がっこうぐらし", "School Live"],
  ["王様ランキング", "Ranking of Kings"],
  ["ダンジョンに出会いを求めるのは間違っているだろうか", "Is It Wrong to Try to Pick Up Girls in a Dungeon"],
  ["乙女ゲームの破滅フラグしかない悪役令嬢に転生してしまった", "My Next Life as a Villainess"],
  ["はたらく魔王さま", "The Devil Is a Part Timer"],
  ["小市民シリーズ", "Shoshimin"],
  ["BANANA FISH"],
  ["輪るピングドラム", "Mawaru Penguindrum"],
  ["化物語", "Bakemonogatari"],
  ["デュラララ", "Durarara"],
  ["ひぐらしのなく頃に", "When They Cry"],
  ["ダンガンロンパ", "Danganronpa"],
  ["ゆるキャン", "Laid Back Camp"],
  ["パリピ孔明", "Ya Boy Kongming"],
  ["はたらく細胞", "Cells at Work"],
  ["おそ松さん", "Osomatsu san"],
  ["日常", "Nichijou"],
  ["たまこまーけっと", "Tamako Market"],
  ["けいおん", "K On"],
  ["WORKING", "Wagnaria"],
  ["サーバントサービス", "Servant x Service"],
  ["ブルーロック", "Blue Lock"],
  ["弱虫ペダル", "Yowamushi Pedal"],
  ["響けユーフォニアム", "Sound Euphonium"],
  ["Free", "Iwatobi Swim Club"],
  ["ユーリ on ICE", "Yuri on Ice"],
  ["ツルネ", "Tsurune"],
  ["とらドラ", "Toradora"],
  ["かぐや様は告らせたい", "Kaguya sama"],
  ["俺の妹がこんなに可愛いわけがない", "Oreimo"],
  ["彼女お借りします", "Rent a Girlfriend"],
  ["中二病でも恋がしたい", "Love Chunibyo"],
  ["からかい上手の高木さん", "Teasing Master Takagi san"],
  ["月がきれい", "Tsuki ga Kirei"],
  ["一週間フレンズ", "One Week Friends"],
  ["凪のあすから", "Nagi no Asukara"],
  ["ガールズパンツァー", "Girls und Panzer"],
  ["PSYCHO PASS", "Psycho Pass"],
  ["交響詩篇エウレカセブン", "Eureka Seven"],
  ["天元突破グレンラガン", "Gurren Lagann"],
  ["推しの子", "Oshi no Ko"],
  ["ゾンビランドサガ", "Zombie Land Saga"],
  ["ラブライブ", "Love Live"],
  ["アイドルマスター", "The Idolmaster"],
  ["ウマ娘", "Uma Musume"],
  ["東京リベンジャーズ", "Tokyo Revengers"],
  ["Dr.STONE", "Dr Stone"],
  ["ワンパンマン", "One Punch Man"],
  ["鋼の錬金術師", "Fullmetal Alchemist"],
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
