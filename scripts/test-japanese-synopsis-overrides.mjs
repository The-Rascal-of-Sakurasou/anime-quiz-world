import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile("index.html", "utf8");
const start = html.indexOf("const JAPANESE_SYNOPSIS_OVERRIDES=new Map(Object.entries({");
const end = html.indexOf("}).map(([title,summary])", start);
assert.notEqual(start, -1, "Japanese synopsis override map must exist");
assert.notEqual(end, -1, "Japanese synopsis override map must have a stable end");
const opening = html.indexOf("{", start);
const source = html.slice(opening + 1, end);
const entryPattern = /^\s*('(?:\\.|[^'\\])*')\s*:\s*('(?:\\.|[^'\\])*')\s*,?\s*$/gm;
const entries = [];
for (const match of source.matchAll(entryPattern)) {
  const decode = (literal) => new Function("return " + literal)();
  entries.push({ title: decode(match[1]), summary: decode(match[2]) });
}
assert.ok(entries.length > 0, "At least one Japanese synopsis must be registered");
const normalizedTitles = new Set();
for (const { title, summary } of entries) {
  const normalized = String(title).normalize("NFKC").toLocaleLowerCase()
    .replace(/[\s　・･:：!！?？.,，。'"“”「」『』()（）‐‑–—―−_-]/g, "");
  assert.ok(normalized, "Synopsis title must not be empty");
  assert.ok(!normalizedTitles.has(normalized), "Duplicate normalized synopsis key: " + title);
  normalizedTitles.add(normalized);
  const text = String(summary || "").replace(/\s+/g, " ").trim();
  assert.ok(text.length >= 45, "Synopsis is too short for " + title + ": " + text.length);
  assert.ok(text.length <= 260, "Synopsis exceeds the display limit for " + title + ": " + text.length);
  const kana = (text.match(/[ぁ-んァ-ヶ]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  assert.ok(kana >= 10 && kana / text.length >= 0.08 && latin / text.length < 0.25,
    "Synopsis does not look like usable Japanese for " + title);
}
console.log("Japanese synopsis override tests passed: " + entries.length + " entries, no duplicate keys, all summaries valid.");
