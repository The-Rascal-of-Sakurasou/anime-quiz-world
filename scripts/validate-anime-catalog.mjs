import { readFile } from "node:fs/promises";

const FILE = process.argv[2] || "data/anime-catalog.json";
const FORMATS = new Set(["TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL"]);

function isJapaneseOriginAnime(anime) {
  if (!anime || anime.countryOfOrigin !== "JP") return false;
  if (anime.source === "ORIGINAL") return true;

  const sourceRules = {
    MANGA: { type: "MANGA", formats: ["MANGA", "ONE_SHOT"] },
    LIGHT_NOVEL: { type: "MANGA", formats: ["NOVEL"] },
    NOVEL: { type: "MANGA", formats: ["NOVEL"] },
    DOUJINSHI: { type: "MANGA", formats: ["MANGA", "ONE_SHOT", "NOVEL"] },
    ANIME: { type: "ANIME", formats: ["TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL"] },
  };

  const rule = sourceRules[anime.source];
  if (!rule || !Array.isArray(anime.relations?.edges)) return false;

  return anime.relations.edges.some((edge) =>
    (edge?.relationType === "SOURCE" || edge?.relationType === "ADAPTATION") &&
    edge.node?.type === rule.type &&
    edge.node?.countryOfOrigin === "JP" &&
    rule.formats.includes(edge.node?.format)
  );
}

function validateCatalog(catalog) {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    throw new Error("Catalogue root must be a JSON object.");
  }
  if (catalog.schemaVersion !== 1) {
    throw new Error("Unsupported catalogue schemaVersion: " + String(catalog.schemaVersion));
  }
  if (!Array.isArray(catalog.items) || catalog.items.length === 0) {
    throw new Error("Catalogue items must be a non-empty array.");
  }
  if (!Number.isInteger(catalog.count) || catalog.count !== catalog.items.length) {
    throw new Error("Catalogue count does not match items.length.");
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

    if (!isJapaneseOriginAnime(anime)) failures.push(label + ": Japanese origin could not be verified");
    if (!FORMATS.has(anime?.format)) failures.push(label + ": unsupported anime format");
    if (anime?.isAdult === true) failures.push(label + ": adult content is not allowed");
    if ((anime?.genres || []).includes("Hentai")) failures.push(label + ": Hentai genre is not allowed");

    const title = anime?.title;
    if (![title?.native, title?.english, title?.romaji].some((value) => typeof value === "string" && value.trim())) {
      failures.push(label + ": no usable title");
    }

    const image = anime?.coverImage?.large || anime?.coverImage?.medium || anime?.coverImage?.extraLarge || "";
    try {
      const url = new URL(image);
      if (!["https:", "http:"].includes(url.protocol) || !url.hostname || url.username || url.password ||
          /(?:no[-_ ]?image|placeholder|default[-_ ]?image)/i.test(image)) {
        failures.push(label + ": unusable cover image URL");
      }
    } catch {
      failures.push(label + ": missing or invalid cover image URL");
    }
  }

  if (failures.length) {
    const preview = failures.slice(0, 30).join("\n");
    throw new Error("Catalogue validation failed (" + failures.length + " issue(s)):\n" + preview);
  }

  return { count: catalog.items.length, generatedAt: catalog.generatedAt };
}

const raw = await readFile(FILE, "utf8");
let catalog;
try {
  catalog = JSON.parse(raw);
} catch (error) {
  throw new Error("Catalogue JSON is invalid: " + error.message);
}

const result = validateCatalog(catalog);
console.log("Catalogue validation passed: " + result.count + " unique Japanese-origin anime.");
console.log("Generated at: " + result.generatedAt);
