(function installAQWAnimePolicy(root) {
  "use strict";

  function isJapaneseOriginAnime(anime) {
    // AniList countryOfOrigin is the sole inclusion criterion.
    return anime?.countryOfOrigin === "JP";
  }

  function metadataKey(value) {
    return String(value || "").normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, "");
  }

  root.AQWAnimePolicy = Object.freeze({ isJapaneseOriginAnime, metadataKey });
})(globalThis);
