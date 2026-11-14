import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import "../aqw-text-utils.js";

const html = await readFile("index.html", "utf8");
const start = html.indexOf("function deduplicateSearchResults(");
const end = html.indexOf("\nfunction mergeAnimeRecords", start);
assert.notEqual(start, -1, "Search-result deduplication function must exist");
assert.notEqual(end, -1, "Search-result deduplication function must have a stable boundary");
const source = html.slice(start, end).trim();
const normalizeAnswer = globalThis.AQWTextUtils.normalizeAnswer;
const titleOf = (anime) => anime?.title?.native || anime?.title?.english || anime?.title?.romaji || "Unknown";
assert.equal(normalizeAnswer("検証 アニメ！"), normalizeAnswer("検証アニメ"), "Production normalization must ignore spaces and punctuation");
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
  { id: 6, title: { native: "検証 アニメ！" }, seasonYear: 2020, format: "TV", popularity: 70 },
  { id: 7, title: { native: "検証アニメ" }, seasonYear: 2020, format: "TV_SHORT", popularity: 65 },
  { id: 8, title: { native: "検証アニメ", english: "Test Anime Season 3" }, seasonYear: 2020, format: "TV", popularity: 60 },
  { id: 9, title: { native: "検証アニメ", english: "Test Anime Season 2" }, seasonYear: 2020, format: "TV", popularity: 55 },
];
const result = deduplicateSearchResults(records);
assert.deepEqual(result.map((anime) => anime.id), [1, 3, 4, 5, 7, 8],
  "Remove repeated IDs and same-title/year/format duplicates, but retain sequels, films, and different years");
console.log("Anime search deduplication tests passed: repeated IDs and duplicate identities removed; sequels, films, and distinct years retained.");
