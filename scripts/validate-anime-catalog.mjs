import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const FILE = process.argv[2] || "data/anime-catalog.json";
const FORMATS = new Set(["TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL"]);

function isJapaneseOriginAnime(anime) {
  if (!anime || anime.countryOfOrigin !== "JP") return false;
  if (anime.originVerified === true) return true;
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

function metadataKey(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, '');
}
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

    if (anime?.originVerified !== true) failures.push(label + ": build-time Japanese-origin verification marker is missing");
    if (!isJapaneseOriginAnime(anime)) failures.push(label + ": Japanese origin could not be verified");
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

    const characterIds = new Set();
    const characterFallbackKeys = new Set();
    for (const character of Array.isArray(anime?.characters?.nodes) ? anime.characters.nodes : []) {
      const characterId = Number(character?.id);
      const characterName = character?.name?.full || character?.name?.native || '';
      if (Number.isSafeInteger(characterId) && characterId > 0) {
        if (characterIds.has(characterId)) failures.push(label + ': duplicate character ID ' + characterId);
        characterIds.add(characterId);
      } else {
        const key = metadataKey(characterName) + '|' + String(character?.image?.large || '');
        if (!metadataKey(characterName)) failures.push(label + ': character without a usable name or ID');
        else if (characterFallbackKeys.has(key)) failures.push(label + ': duplicate character record ' + characterName);
        characterFallbackKeys.add(key);
      }
    }

    const title = anime?.title;
    if (![title?.native, title?.english, title?.romaji].some((value) => typeof value === "string" && value.trim())) {
      failures.push(label + ": no usable title");
    }

    if (typeof anime?.description === 'string' && anime.description.length > 260) {
      failures.push(label + ': synopsis description exceeds the 260-character display limit');
    }

    for (const link of Array.isArray(anime?.externalLinks) ? anime.externalLinks : []) {
      const site = String(link?.site || '').toLowerCase();
      const type = String(link?.type || '').toUpperCase();
      const validOfficialLink = !!link && !link.isDisabled &&
        typeof link.url === 'string' && /^https?:\/\//i.test(link.url) &&
        /official|公式/i.test(site) &&
        !/(twitter|x\.com|facebook|instagram|youtube|tiktok|discord|reddit)/i.test(site) &&
        (!type || type === 'INFO');
      if (!validOfficialLink) failures.push(label + ': non-official or unusable external link is stored in the shared catalogue');
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

async function main() {
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
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
