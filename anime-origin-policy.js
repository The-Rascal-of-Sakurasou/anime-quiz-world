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
    // AniList's countryOfOrigin is the sole inclusion criterion.
    // Japanese titles, popularity, source relations, and language metadata
    // must never make a non-Japanese or unknown-origin work eligible.
    return anime?.countryOfOrigin === "JP";
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
