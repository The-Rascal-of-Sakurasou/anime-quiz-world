import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile("index.html", "utf8");
const start = html.indexOf("function deduplicateSearchResults(");
const end = html.indexOf("\nfunction mergeAnimeRecords", start);
assert.notEqual(start, -1, "Search-result deduplication function must exist");
assert.notEqual(end, -1, "Search-result deduplication function must have a stable boundary");
const source = html.slice(start, end).trim();
const normalizeAnswer = (value) => String(value || "").normalize("NFKC").toLocaleLowerCase()
  .replace(/[\\s　・･:：!！?？.,，。'"“”「」『』()（）‐‑–—―−_-]/g, "").trim();
const titleOf = (anime) => anime?.title?.native || anime?.title?.english || anime?.title?.romaji || "Unknown";
const deduplicateSearchResults = new Function(
  "isUsableAnime", "normalizeAnswer", "titleOf",
  source + "; return deduplicateSearchResults;"
)(() => true, normalizeAnswer, titleOf);

const records = [
  { id: 1, title: { native: "検証アニメ" }, seasonYear: 2020, format: "TV", popularity: 100 },
  { id: 1, title: { native: "検証アニメ" }, seasonYear: 2020, format: "TV", popularity: 95 },
  { id: 2, title: { native: "検証アニメ" }, seasonYear: 2020, format: "TV", popularity: 90 },
  { id: 3, title: { native: "検証アニメ", english: "Test Anime Season 2" }, seasonYear: 2020, format: "TV", popularity: 85 },
  { id: 4, title: { native: "検証アニメ" }, seasonYear: 2020, format: "MOVIE", popularity: 80 },
  { id: 5, title: { native: "検証アニメ" }, seasonYear: 2021, format: "TV", popularity: 75 },
];
const result = deduplicateSearchResults(records);
assert.deepEqual(result.map((anime) => anime.id), [1, 3, 4, 5],
  "Remove repeated IDs and same-title/year/format duplicates, but retain sequels, films, and different years");
console.log("Anime search deduplication tests passed: repeated IDs and duplicate identities removed; sequels, films, and distinct years retained.");
