(function installAQWAnimePolicy(root) {
  "use strict";

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
    isJapaneseOriginAnime,
    metadataKey,
  });
})(globalThis);
