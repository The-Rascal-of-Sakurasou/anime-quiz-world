(function installAQWAnimePolicy(root) {
  "use strict";

  const SOURCE_RULES = Object.freeze({
    MANGA: { type: "MANGA", formats: ["MANGA", "ONE_SHOT"] },
    LIGHT_NOVEL: { type: "MANGA", formats: ["NOVEL"] },
    NOVEL: { type: "MANGA", formats: ["NOVEL"] },
    DOUJINSHI: { type: "MANGA", formats: ["MANGA", "ONE_SHOT", "NOVEL"] },
    ANIME: { type: "ANIME", formats: ["TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL"] },
  });

  function hasJapaneseTitle(anime) {
    const names = [
      anime?.title?.native,
      anime?.title?.english,
      anime?.title?.romaji,
      ...(Array.isArray(anime?.synonyms) ? anime.synonyms : []),
    ];
    return names.some((name) => typeof name === "string" && /[ぁ-んァ-ヶ]/.test(name));
  }

  function isJapaneseOriginAnime(anime) {
    if (!anime || typeof anime.countryOfOrigin !== "string" || !anime.countryOfOrigin) return false;

    if (anime.countryOfOrigin !== "JP") {
      return Number(anime.popularity) >= 10000 && hasJapaneseTitle(anime);
    }

    const isJapaneseLanguage = (value) =>
      ["ja", "ja-jp", "japanese", "日本語"].includes(String(value || "").trim().toLowerCase());
    const languageValues = [
      anime.originLanguage,
      anime.originalLanguage,
      anime.sourceLanguage,
      anime.language,
    ].filter((value) => typeof value === "string" && value.trim());

    if (languageValues.some((value) => !isJapaneseLanguage(value))) return false;
    if (anime.originVerified === true) return true;
    if (anime.source === "ORIGINAL") return true;

    const rule = SOURCE_RULES[anime.source];
    const relationVerified = !!rule &&
      Array.isArray(anime.relations?.edges) &&
      anime.relations.edges.some((edge) => {
        const node = edge?.node;
        if (!["SOURCE", "ADAPTATION"].includes(edge?.relationType) ||
            !node ||
            node.type !== rule.type ||
            node.countryOfOrigin !== "JP" ||
            !rule.formats.includes(node.format)) return false;

        const sourceLanguage = [
          node.originLanguage,
          node.originalLanguage,
          node.sourceLanguage,
          node.language,
        ].filter((value) => typeof value === "string" && value.trim());
        return !sourceLanguage.some((value) => !isJapaneseLanguage(value));
      });

    if (relationVerified) return true;
    return !!rule && Number(anime.popularity) >= 10000 && hasJapaneseTitle(anime);
  }

  function metadataKey(value) {
    return String(value || "").normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, "");
  }

  root.AQWAnimePolicy = Object.freeze({
    hasJapaneseTitle,
    isJapaneseOriginAnime,
    metadataKey,
  });
})(globalThis);
