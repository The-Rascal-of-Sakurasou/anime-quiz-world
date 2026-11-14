import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
import { isUsableCoverImage } from "./catalog-image-url.mjs";
import "../anime-origin-policy.js";

const { isJapaneseOriginAnime, metadataKey } = globalThis.AQWAnimePolicy;

const FILE = process.argv[2] || "data/anime-catalog.json";
const FORMATS = new Set(["TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL"]);
const MAX_JSON_BYTES = 20 * 1024 * 1024;
const MAX_GZIP_BYTES = 5 * 1024 * 1024;





export function validateCatalog(catalog) {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    throw new Error("Catalogue root must be a JSON object.");
  }
  if (catalog.schemaVersion !== 2) {
    throw new Error("Unsupported catalogue schemaVersion: " + String(catalog.schemaVersion));
  }
  if (!Array.isArray(catalog.items) || catalog.items.length === 0) {
    throw new Error("Catalogue items must be a non-empty array.");
  }
  const declaredCount = Number.isInteger(catalog.count) ? catalog.count : catalog.itemCount;
  if (!Number.isInteger(declaredCount) || declaredCount !== catalog.items.length ||
      (catalog.count !== undefined && catalog.count !== catalog.items.length) ||
      (catalog.itemCount !== undefined && catalog.itemCount !== catalog.items.length)) {
    throw new Error("Catalogue count/itemCount does not match items.length.");
  }
  if (typeof catalog.generatedAt !== "string" || !Number.isFinite(Date.parse(catalog.generatedAt))) {
    throw new Error("Catalogue generatedAt must be a valid date.");
  }

  const ids = new Set();
  const failures = [];

  for (let index = 0; index < catalog.items.length; index++) {
    const anime = catalog.items[index];
    const label = "items[" + index + "]";
    const id = Number(anime?.id);

    if (!Number.isSafeInteger(id) || id <= 0) failures.push(label + ": invalid AniList ID");
    else if (ids.has(id)) failures.push(label + ": duplicate AniList ID " + id);
    else ids.add(id);

    if (anime?.countryOfOrigin === "JP" && anime?.originVerified !== true) failures.push(label + ": build-time Japanese-origin verification marker is missing");
    if (anime?.catalogueEligible === false) failures.push(label + ": catalogue eligibility is explicitly disabled");
    if (!isJapaneseOriginAnime(anime)) failures.push(label + ": countryOfOrigin must be exactly JP; non-Japanese and unknown origins are excluded");
    if (!FORMATS.has(anime?.format)) failures.push(label + ": unsupported anime format");
    if (anime?.isAdult === true) failures.push(label + ": adult content is not allowed");
    if ((anime?.genres || []).includes("Hentai")) failures.push(label + ": Hentai genre is not allowed");

    const synonymKeys = new Set();
    for (const synonym of Array.isArray(anime?.synonyms) ? anime.synonyms : []) {
      const key = metadataKey(synonym);
      if (!key) failures.push(label + ': empty synonym');
      else if (synonymKeys.has(key)) failures.push(label + ': duplicate normalized synonym ' + synonym);
      else synonymKeys.add(key);
    }

    if (Object.prototype.hasOwnProperty.call(anime, "characters")) {
      failures.push(label + ': unused character data must not be embedded in the shared catalogue');
    }

    const title = anime?.title;
    if (![title?.native, title?.english, title?.romaji].some((value) => typeof value === "string" && value.trim())) {
      failures.push(label + ": no usable title");
    }

    if (typeof anime?.description === 'string' && anime.description.length > 260) {
      failures.push(label + ': synopsis description exceeds the 260-character display limit');
    }

    for (const link of Array.isArray(anime?.externalLinks) ? anime.externalLinks : []) {
      const site = String(link?.site || '').normalize('NFKC').toLowerCase();
      const type = String(link?.type || '').toUpperCase();
      let host = '';
      try { host = new URL(link?.url).hostname; } catch {}
      const socialHost = /(^|\.)(twitter\.com|x\.com|facebook\.com|instagram\.com|youtube\.com|youtu\.be|tiktok\.com|discord\.gg|discord\.com|reddit\.com)$/i;
      const officialLabel = /(official|公式|オフィシャル)/i.test(site);
      const homepageLabel = /(website|web site|homepage|home page|ホームページ|公式ページ)/i.test(site);
      const validOfficialLink = !!link && !link.isDisabled &&
        typeof link.url === 'string' && /^https?:\/\//i.test(link.url) &&
        (officialLabel || homepageLabel) && type !== 'STREAMING' && !socialHost.test(host);
      if (!validOfficialLink) failures.push(label + ': non-official or unusable external link is stored in the shared catalogue');
    }

    const image = anime?.coverImage?.large || anime?.coverImage?.medium || anime?.coverImage?.extraLarge || "";
    if (!isUsableCoverImage(image)) {
      failures.push(label + ": missing, invalid, placeholder, or credential-bearing cover image URL");
    }
  }

  if (failures.length) {
    const preview = failures.slice(0, 30).join("\n");
    throw new Error("Catalogue validation failed (" + failures.length + " issue(s)):\n" + preview);
  }

  return { count: catalog.items.length, generatedAt: catalog.generatedAt };
}

async function main() {
  const raw = await readFile(FILE, "utf8");
  if (FILE === "data/anime-catalog.json") {
    const rawBytes = Buffer.byteLength(raw, "utf8");
    if (rawBytes > MAX_JSON_BYTES) {
      throw new Error("Catalogue JSON exceeds the 20 MiB performance budget: " + rawBytes + " bytes.");
    }
    const compressed = await readFile(FILE + ".gz");
    if (compressed.byteLength > MAX_GZIP_BYTES) {
      throw new Error("Compressed catalogue exceeds the 5 MiB performance budget: " + compressed.byteLength + " bytes.");
    }
    const decompressed = gunzipSync(compressed).toString("utf8");
    if (decompressed !== raw) {
      throw new Error("Compressed catalogue does not match the JSON source file.");
    }
  }
  let catalog;
  try {
    catalog = JSON.parse(raw);
  } catch (error) {
    throw new Error("Catalogue JSON is invalid: " + error.message);
  }

  const result = validateCatalog(catalog);
  console.log("Catalogue validation passed: " + result.count + " unique eligible Japanese-origin anime.");
  console.log("Generated at: " + result.generatedAt);
  console.log("Compressed catalogue matches the JSON source.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
