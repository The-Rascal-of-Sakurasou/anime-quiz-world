(function installAQWTextUtils(root) {
  "use strict";
  function normalizeAnswer(value) {
    return String(value || "").normalize("NFKC").toLocaleLowerCase()
      .replace(/[\\s　・･:：!！?？.,，。'"“”「」『』()（）‐‑–—―−_-]/g, "").trim();
  }
  function truncateSynopsis(value, maxLength = 260) {
    const text = String(value || "");
    if (text.length <= maxLength) return text;
    return text.slice(0, Math.max(0, maxLength - 3)).trimEnd() + "…";
  }
  root.AQWTextUtils = Object.freeze({ normalizeAnswer, truncateSynopsis });
})(globalThis);
