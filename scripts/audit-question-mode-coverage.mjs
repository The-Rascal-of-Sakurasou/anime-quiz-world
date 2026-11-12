import { mkdir, readFile, writeFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const CATALOG = "data/anime-catalog.json";
const REPORT = "artifacts/question-mode-coverage/report.json";
const CURATED = [
  [[],"進撃2期"],
  [[],"進撃3期"],
  [[],"進撃3期後半"],
  [[],"僕街"],
  [[],"モブサイコ1期"],
  [[],"モブサイコ3期"],
  [[],"ヒロアカ6期"],
  [[],"鬼滅刀鍛冶編"],
  [[],"鬼滅柱稽古編"],
  [[],"オバロ2期"],
  [[],"無職転生2期"],
  [[],"ハイキュー4期"],
  [[],"七つの大罪2期"],
  [[],"ギアスR2"],
  [[],"このすば2期"],
  [[],"レールガンS"],
  [[],"禁書2期"],
  [[],"SAOアリシゼーション"],
  [[],"ジョジョ5部"],
  [[],"かぐや様3期"],
  [["青春ブタ野郎はバニーガール先輩の夢を見ない","Seishun Buta Yarou wa Bunny Girl Senpai no Yume wo Minai","Rascal Does Not Dream of Bunny Girl Senpai"],"青ブタ"],
  [["Re:ゼロから始める異世界生活","Re:Zero kara Hajimeru Isekai Seikatsu","Re:ZERO -Starting Life in Another World-"],"リゼロ"],
  [["STEINS;GATE","シュタインズ・ゲート"],"シュタゲ"],
  [["ノーゲーム・ノーライフ","No Game No Life"],"ノゲノラ"],
  [["ソードアート・オンライン","Sword Art Online"],"SAO"],
  [["この素晴らしい世界に祝福を！","この素晴らしい世界に祝福を!","Kono Subarashii Sekai ni Shukufuku wo!","KonoSuba"],"このすば"],
  [["あの日見た花の名前を僕達はまだ知らない。","あの日見た花の名前を僕達はまだ知らない","Ano Hi Mita Hana no Namae wo Bokutachi wa Mada Shiranai"],"あの花"],
  [["無職転生 ～異世界行ったら本気だす～","Mushoku Tensei: Isekai Ittara Honki Dasu"],"無職転生"],
  [["進撃の巨人","Shingeki no Kyojin","Attack on Titan"],"進撃"],
  [["鬼滅の刃","Kimetsu no Yaiba","Demon Slayer: Kimetsu no Yaiba"],"鬼滅"],
  [["呪術廻戦","Jujutsu Kaisen"],"呪術"],
  [["僕のヒーローアカデミア","Boku no Hero Academia","My Hero Academia"],"ヒロアカ"],
  [["転生したらスライムだった件","Tensei shitara Slime Datta Ken","That Time I Got Reincarnated as a Slime"],"転スラ"],
  [["とある科学の超電磁砲","Toaru Kagaku no Railgun"],"レールガン"],
  [["とある魔術の禁書目録","Toaru Majutsu no Index"],"禁書目録"],
  [["魔法少女まどか☆マギカ","魔法少女まどか★マギカ","Puella Magi Madoka Magica"],"まどマギ"],
  [["Angel Beats!"],"AB"],
  [["Charlotte","シャーロット"],"シャーロット"],
  [["サマータイムレンダ","Summer Time Rendering"],"サマレン"],
  [["葬送のフリーレン","Sousou no Frieren","Frieren: Beyond Journey’s End"],"フリーレン"],
  [["SPY×FAMILY","SPY x FAMILY"],"スパイファミリー"],
  [["東京喰種トーキョーグール","東京喰種","Tokyo Ghoul"],"東京喰種"],
  [["五等分の花嫁","Go-Toubun no Hanayome"],"五等分"],
  [["かぐや様は告らせたい","Kaguya-sama wa Kokurasetai"],"かぐや様"],
  [["ぼっち・ざ・ろっく！","ぼっち・ざ・ろっく!","Bocchi the Rock!"],"ぼざろ"],
  [["ブラッククローバー","Black Clover"],"ブラクロ"],
  [["ヴィンランド・サガ","Vinland Saga"],"ヴィンサガ"],
  [["炎炎ノ消防隊","Enen no Shouboutai","Fire Force"],"炎炎"],
  [["カウボーイビバップ","Cowboy Bebop"],"ビバップ"],
  [["デス・パレード","Death Parade"],"デスパレ"],
  [["青の祓魔師","Ao no Exorcist","Blue Exorcist"],"青エク"],
  [["暗殺教室","Ansatsu Kyoushitsu","Assassination Classroom"],"暗教"],
  [["賭ケグルイ","Kakegurui"],"賭ケグル"],
  [["文豪ストレイドッグス","Bungou Stray Dogs"],"文スト"],
  [["キルラキル","Kill la Kill"],"キルラ"],
  [["オーバーロード","Overlord"],"オバロ"],
  [["ようこそ実力至上主義の教室へ","Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e","Classroom of the Elite"],"よう実"],
  [["その着せ替え人形は恋をする","Sono Bisque Doll wa Koi wo Suru","My Dress-Up Darling"],"着せ恋"],
  [["ダーリン・イン・ザ・フランキス","Darling in the FranXX"],"ダリフラ"],
  [["モブサイコ100 II","Mob Psycho 100 II"],"モブサイコ2期"],
  [["ハイキュー!! セカンドシーズン","Haikyuu!! Second Season"],"ハイキュー2期"],
  [["SPY×FAMILY","SPY x FAMILY"],"スパファミ"],
  [["暗殺教室 第2期","Assassination Classroom Second Season","Ansatsu Kyoushitsu 2nd Season"],"暗教2期"],
  [["SPY×FAMILY Season 2","SPY×FAMILY 第2期","SPY x FAMILY Season 2"],"スパファミ2期"],
  [["ヴィンランド・サガ SEASON 2","Vinland Saga Season 2"],"ヴィンサガ2期"],
  [["炎炎ノ消防隊 弐ノ章","Fire Force Season 2","Enen no Shouboutai: Ni no Shou"],"炎炎2期"],
  [["青の祓魔師 京都不浄王篇","Blue Exorcist: Kyoto Saga","Ao no Exorcist: Kyoto Fujouou-hen"],"青エク2期"],
  [["賭ケグルイ××","Kakegurui XX"],"賭ケグルイ2期"],
  [["文豪ストレイドッグス 第2期","Bungou Stray Dogs 2nd Season","Bungo Stray Dogs Season 2"],"文スト2期"],
];
const norm = (v) => String(v || "").normalize("NFKC").toLocaleLowerCase().replace(/[\s　・･:：!！?？.,，。'"“”「」『』()（）‐‑–—―−_-]/g, "").trim();
const title = (a) => String(a?.title?.native || a?.title?.english || a?.title?.romaji || "").trim();
const year = (a) => Number.isInteger(a?.seasonYear) ? a.seasonYear : Number.isInteger(a?.startDate?.year) ? a.startDate.year : null;
const indexHtml = await readFile("index.html", "utf8");
const overrideMatch = indexHtml.match(/const JAPANESE_SYNOPSIS_OVERRIDES=new Map\(Object\.entries\((\{[\s\S]*?\})\)\.map/);
if (!overrideMatch) throw new Error("Could not extract Japanese synopsis overrides from index.html.");
const overrideObject = runInNewContext("(" + overrideMatch[1] + ")");
const synopsisOverrides = new Map(Object.entries(overrideObject).map(([key, value]) => [norm(key), String(value)]));
const desc = (a) => {
  const titles = [a?.title?.native, a?.title?.english, a?.title?.romaji, ...(Array.isArray(a?.synonyms) ? a.synonyms : []), ...titleVariants(a)];
  for (const candidate of titles) {
    const override = synopsisOverrides.get(norm(candidate));
    if (override) return override;
  }
  return String(a?.description || "").replace(/<[^>]*>/g, " ").replace(/\[[^\]]*\]\([^)]*\)/g, " ").replace(/\\[nrt]/gi, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
};
const usableSynopsis = (a) => {
  const s = desc(a);
  if (s.length < 45 || /^(no synopsis|no description|not available|tba|unknown|未定|あらすじなし|情報なし)\.?$/i.test(s)) return false;
  const kana = (s.match(/[ぁ-んァ-ヶ]/g) || []).length;
  const latin = (s.match(/[A-Za-z]/g) || []).length;
  // Match the actual Japanese quiz eligibility rule, not a broader kanji-only heuristic.
  return kana >= 10 && kana / s.length >= .08 && latin / s.length < .25;
};
const titleVariants = (a) => {
  const values = [a?.title?.native, a?.title?.english, a?.title?.romaji, title(a), ...(a?.synonyms || [])].filter(Boolean);
  const out = new Set(values.map(norm).filter(Boolean));
  for (const value of [a?.title?.english, a?.title?.romaji, ...(a?.synonyms || [])].filter(Boolean)) {
    const words = String(value).normalize("NFKC").match(/[A-Za-z0-9]+/g) || [];
    if (words.length >= 2) { const initials = words.map(x => x[0]).join(""); if (initials.length >= 2 && initials.length <= 8) out.add(norm(initials)); }
  }
  const seasonPatterns = [/\s*[-:：–—|｜]?\s*(?:第\s*\d+\s*(?:期|シーズン|season)|season\s*\d+|\d+(?:st|nd|rd|th)?\s*season|s\s*\d+)\s*$/i, /\s*[-:：–—|｜]?\s*(?:final\s+season|the\s+final\s+season|second\s+season|third\s+season|fourth\s+season|fifth\s+season|first\s+season|ファースト\s*シーズン|セカンド\s*シーズン|サード\s*シーズン|フォース\s*シーズン|フィフス\s*シーズン|part\s*\d+|第\s*\d+\s*部)\s*$/i, /\s*[-:：–—|｜]?\s*(?:第\s*\d+\s*クール|\d+\s*クール)\s*$/i];
  const moviePatterns = [/^\s*(?:劇場版|the\s+movie|movie\s+version|anime\s+film|film\s+version)\s*[:：\-–—]?\s*/i, /\s*[-:：–—|｜]?\s*(?:劇場版|the\s+movie|movie\s+version|anime\s+film|film\s+version|movie|film)\s*$/i];
  for (const value of values) {
    let base = String(value).normalize("NFKC").trim();
    for (let pass = 0; pass < 3; pass++) {
      const before = base;
      for (const pattern of [...seasonPatterns, ...moviePatterns]) base = base.replace(pattern, "").trim();
      if (base === before) break;
    }
    if (base && norm(base) !== norm(value)) out.add(norm(base));
  }
  return out;
};
const curatedMap = new Map();
for (const [names, alias] of CURATED) for (const name of names) curatedMap.set(norm(name), alias);
function aliases(a) {
  const primaryTitles = [a?.title?.romaji, a?.title?.english, a?.title?.native].filter(Boolean), values = [], keys = new Set(primaryTitles.map(norm));
  for (const candidate of [a?.title?.romaji, a?.title?.english, a?.title?.native].filter(Boolean)) {
    const curated = curatedMap.get(norm(candidate)); if (curated) values.push(curated);
  }
  for (const candidate of [a?.title?.romaji, a?.title?.english].filter(Boolean)) {
    const words = String(candidate).normalize("NFKC").match(/[A-Za-z0-9]+/g) || [];
    if (words.length >= 2) { const initials = words.map(x => x[0]).join("").toUpperCase(); if (initials.length >= 2 && initials.length <= 8 && !keys.has(norm(initials))) values.push(initials); }
  }
  for (const raw of a?.synonyms || []) {
    if (typeof raw !== "string") continue;
    const value = raw.trim(), key = norm(value);
    if ([...value].length >= 2 && key && !keys.has(key) && (/[ぁ-んァ-ヶ一-龯]/.test(value) || /^[A-Za-z0-9]{2,8}$/.test(value))) values.push(value);
  }
  return [...new Set(values.filter(Boolean))];
}
function synopsisText(a) { const s = desc(a); return s.length > 260 ? s.slice(0,257).trimEnd()+"…" : s; }

const payload = JSON.parse(await readFile(CATALOG, "utf8"));
const declaredCount = payload.count ?? payload.itemCount;
if (payload.schemaVersion !== 2 || !Array.isArray(payload.items) || payload.items.length !== declaredCount) throw new Error("Catalogue schema/count validation failed.");
const hasJapaneseTitle = (a) => [a?.title?.native,a?.title?.english,a?.title?.romaji,...(Array.isArray(a?.synonyms)?a.synonyms:[])].some(value => typeof value === "string" && /[ぁ-んァ-ヶ]/.test(value));
const eligibleOrigin = (a) => a?.countryOfOrigin === "JP" || (typeof a?.countryOfOrigin === "string" && a.countryOfOrigin.length > 0 && Number(a?.popularity) >= 10000 && hasJapaneseTitle(a));
const items = payload.items.filter(a => a && a.id && a.isAdult !== true && eligibleOrigin(a) && !((a.genres || []).includes("Hentai")) && ["TV","TV_SHORT","MOVIE","OVA","ONA","SPECIAL"].includes(a.format) && title(a));
const yearSet = new Set(items.map(year).filter(y => Number.isInteger(y) && y > 1900));
const studioSet = new Set(items.flatMap(a => (a.studios?.nodes || []).map(n => norm(n?.name)).filter(Boolean)));
const aliasOwners = new Map();
for (const a of items) for (const key of new Set([...titleVariants(a), ...aliases(a).map(norm)])) {
  if (!aliasOwners.has(key)) aliasOwners.set(key, new Set());
  aliasOwners.get(key).add(Number(a.id));
}
const synopsisByKey = new Map();
for (const a of items) if (usableSynopsis(a)) {
  const key = norm(synopsisText(a));
  if (key && !synopsisByKey.has(key)) synopsisByKey.set(key, a);
}
const synopsisCandidateCount = synopsisByKey.size;
const eligible = {
  synopsis: items.filter(a => usableSynopsis(a) && title(a) && synopsisCandidateCount >= 4),
  titleYear: items.filter(a => Number.isInteger(year(a)) && year(a) > 1900 && yearSet.size >= 4),
  synonym: items.filter(a => aliases(a).some(x => {
    const owners = aliasOwners.get(norm(x)); return owners?.size === 1 && owners.has(Number(a.id));
  })),
  titleStudio: items.filter(a => (a.studios?.nodes || []).some(n => String(n?.name || "").trim()) && studioSet.size >= 4),
};
const total = items.length;
const japaneseOriginCount = items.filter(a => a.countryOfOrigin === "JP").length;
const famousForeignCount = total - japaneseOriginCount;
const characterStats = (() => {
  const ids = new Set();
  const namesByAnime = new Map();
  let totalRecords = 0;
  let animeWithAny = 0;
  let animeWithAtLeast4 = 0;
  let animeWithAtLeast5 = 0;
  for (const anime of items) {
    const nodes = Array.isArray(anime?.characters?.nodes) ? anime.characters.nodes : [];
    if (nodes.length) animeWithAny++;
    if (nodes.length >= 4) animeWithAtLeast4++;
    if (nodes.length >= 5) animeWithAtLeast5++;
    for (const character of nodes) {
      totalRecords++;
      const id = Number(character?.id);
      if (Number.isSafeInteger(id) && id > 0) ids.add(id);
      const key = norm(character?.name?.native || character?.name?.full || "");
      if (!key) continue;
      if (!namesByAnime.has(key)) namesByAnime.set(key, new Set());
      namesByAnime.get(key).add(Number(anime.id));
    }
  }
  return {
    totalRecords,
    uniqueCharacterIds: ids.size,
    uniqueCharacterNames: namesByAnime.size,
    namesUniqueToOneAnime: [...namesByAnime.values()].filter(ownerIds => ownerIds.size === 1).length,
    animeWithAnyCharacter: animeWithAny,
    animeWithAtLeast4Characters: animeWithAtLeast4,
    animeWithAtLeast5Characters: animeWithAtLeast5,
    maxCharactersRequestedPerAnime: 5,
  };
})();
const catalogueBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
const catalogueGzipBytes = await readFile(CATALOG + ".gz").then(buffer => buffer.byteLength).catch(() => null);
const fieldBytes = {};
for (const anime of payload.items) {
  for (const [key, value] of Object.entries(anime || {})) {
    fieldBytes[key] = (fieldBytes[key] || 0) + Buffer.byteLength(JSON.stringify(value ?? null), "utf8");
  }
}
const largestFields = Object.entries(fieldBytes).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([field,bytes])=>({field,bytes,percent:catalogueBytes?Number((bytes/catalogueBytes*100).toFixed(1)):0}));
const summarize = (key, label, ready) => ({
  mode: key, label, total, eligible: ready.length, missing: total-ready.length,
  coveragePercent: total ? Number((ready.length/total*100).toFixed(2)) : 0,
  examplesMissing: items.filter(a => !ready.some(x => Number(x.id) === Number(a.id))).slice(0,8).map(title),
});
const report = {
  generatedAt: new Date().toISOString(),
  catalogueGeneratedAt: payload.generatedAt,
  catalogueCount: payload.count ?? payload.itemCount,
  japaneseOriginCount,
  famousForeignCount,
  catalogueBytes,
  catalogueGzipBytes,
  averageBytesPerRecord: total ? Math.round(catalogueBytes / total) : 0,
  largestFields,
  auditedUsableCount: total,
  uniqueBroadcastYears: yearSet.size,
  uniqueProductionStudios: studioSet.size,
  uniqueSynopsisTexts: synopsisCandidateCount,
  characterStats,
  modes: [
    summarize("synopsis","あらすじ → 作品名",eligible.synopsis),
    summarize("titleYear","作品名 → 放送年",eligible.titleYear),
    summarize("synonym","略称 → 作品名",eligible.synonym),
    summarize("titleStudio","作品名 → 制作スタジオ",eligible.titleStudio),
  ],
  caveats: [
    "Japanese locale coverage is audited.",
    "Synopsis counts include the Japanese overrides extracted from index.html and apply the client's Japanese-language text threshold; randomized similarity-based distractor selection is not run for every target.",
    "Alias coverage reproduces curated aliases, initialisms and catalogue synonyms; browser normalization and title-variant collision checks may differ at edge cases.",
    "The client may also merge additional AniList API records into the shared catalogue at runtime.",
  ],
};
await mkdir("artifacts/question-mode-coverage", { recursive: true });
await writeFile(REPORT, JSON.stringify(report,null,2)+"\n");
console.log("Question-mode coverage audit");
console.log("Catalogue: "+total+" records (generated "+payload.generatedAt+")");
console.log("Japanese-origin: "+japaneseOriginCount+"; famous foreign with Japanese titles: "+famousForeignCount);
console.log("JSON size: "+catalogueBytes+" bytes; average "+report.averageBytesPerRecord+" bytes per record");
console.log("Largest fields: "+largestFields.map(row=>row.field+" "+row.bytes+" bytes ("+row.percent+"%)").join("; "));
for (const row of report.modes) console.log(row.label+": "+row.eligible+"/"+row.total+" ("+row.coveragePercent+"%); missing "+row.missing);
console.log("Unique years: "+yearSet.size+"; studios: "+studioSet.size+"; synopsis texts: "+synopsisCandidateCount);
console.log("Characters: "+JSON.stringify(characterStats));
console.log("Detailed report: "+REPORT);
