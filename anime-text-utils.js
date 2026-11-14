(function installAQWAnimeText(root) {
  "use strict";

  function truncateSynopsisText(value, limit = 260) {
    const text = String(value || "");
    const max = Number.isInteger(limit) && limit >= 4 ? limit : 260;
    return text.length > max ? text.slice(0, max - 3).trimEnd() + "…" : text;
  }

  root.AQWAnimeText = Object.freeze({ truncateSynopsisText });
})(globalThis);
