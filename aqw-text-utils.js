(function installAQWTextUtils(root) {
  "use strict";
  function normalizeAnswer(value) {
    return String(value || "").normalize("NFKC").toLocaleLowerCase()
      .replace(/[\s　・･:：!！?？.,，。'"“”「」『』()（）‐‑–—―−_-]/g, "").trim();
  }
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[character]));
  }
  function truncateSynopsis(value, maxLength = 260) {
    const text = String(value || "");
    if (text.length <= maxLength) return text;
    return text.slice(0, Math.max(0, maxLength - 3)).trimEnd() + "…";
  }
  root.AQWTextUtils = Object.freeze({ normalizeAnswer, escapeHTML, truncateSynopsis });
})(globalThis);
