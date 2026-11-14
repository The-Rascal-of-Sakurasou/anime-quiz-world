import assert from "node:assert/strict";
import "../aqw-text-utils.js";

const { normalizeAnswer, escapeHTML, truncateSynopsis } = globalThis.AQWTextUtils;

assert.equal(normalizeAnswer(" Ｔｅｓｔ　 Name! "), "testname");
assert.equal(normalizeAnswer("青ブタ・青春ブタ野郎！"), "青ブタ青春ブタ野郎");
assert.equal(truncateSynopsis("short synopsis"), "short synopsis");
assert.equal(escapeHTML("<script>alert(\"x\")&"), "&lt;script&gt;alert(&quot;x&quot;)&amp;");
const longSynopsis = "あ".repeat(300);
const truncated = truncateSynopsis(longSynopsis);
assert.equal(truncated.length, 258);
assert.equal(truncated, "あ".repeat(257) + "…");
assert.equal(truncateSynopsis("abcdef", 4), "a…");

console.log("Shared text utility tests passed.");
