import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const frontendFiles = [
  "index.html",
  "admin.html",
  "recommend.html",
  "guide.html",
  "privacy.html",
  "terms.html",
];

const source = new Map();
for (const file of frontendFiles) {
  assert.ok(fs.existsSync(file), `Missing frontend file: ${file}`);
  source.set(file, fs.readFileSync(file, "utf8"));
}

let checkedScripts = 0;
for (const [file, html] of source) {
  const scripts = html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi);
  for (const match of scripts) {
    const attrs = match[1] || "";
    const body = match[2] || "";
    if (/\bsrc\s*=/.test(attrs) || !body.trim()) continue;
    const type = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (type && !["text/javascript", "application/javascript", "module"].includes(type)) continue;
    new vm.Script(body, { filename: file });
    checkedScripts++;
  }
}
assert.ok(checkedScripts > 0, "No inline JavaScript was checked");

for (const file of ["index.html", "admin.html"]) {
  const html = source.get(file);
  assert.match(html, /http-equiv\s*=\s*["']Content-Security-Policy["']/i, `${file}: CSP meta tag missing`);
  assert.match(html, /name\s*=\s*["']referrer["']/i, `${file}: Referrer-Policy meta tag missing`);
  assert.doesNotMatch(html, /SUPABASE_SERVICE_ROLE_KEY|service_role/i, `${file}: server secret marker found in client HTML`);

  // Detect embedded Supabase service-role JWTs, not just variables with obvious names.
  const jwtCandidates = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || [];
  for (const token of jwtCandidates) {
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
      assert.notEqual(payload.role, "service_role", `${file}: service-role JWT exposed in frontend`);
    } catch (error) {
      if (error?.code === "ERR_ASSERTION") throw error;
      // Ignore non-JWT strings that only happen to match the token shape.
    }
  }
}

const admin = source.get("admin.html");
assert.match(admin, /persistSession\s*:\s*false/, "Admin session persistence must stay disabled");
assert.match(admin, /autoRefreshToken\s*:\s*true/, "Admin token auto-refresh must stay enabled for active in-memory sessions");
assert.match(admin, /detectSessionInUrl\s*:\s*false/, "Admin URL session detection must stay disabled");
assert.match(admin, /aal2/, "Admin MFA assurance-level enforcement missing");
assert.match(admin, /mfa\.verify/, "Admin TOTP verification flow missing");
assert.match(admin, /aqw-admin-control/, "Protected admin Edge Function call missing");

const recommend = source.get("recommend.html");
assert.ok(recommend.includes("media(search:$search,type:ANIME,countryOfOrigin:JP"), "Favorite-work search must be restricted to Japanese-origin anime");
assert.ok(recommend.includes("media(type:ANIME,countryOfOrigin:JP"), "Recommendation catalog query must be restricted to Japanese-origin anime");
assert.match(recommend, /countryOfOrigin===.JP./, "Recommendation data must be filtered by Japanese origin on the client as a second guard");
const questionBlock = recommend.match(/const questions=\[([\s\S]*?)\n\];/)?.[1];
assert.ok(questionBlock, "Recommendation question block not found");
const questionTitles = [...questionBlock.matchAll(/title:'([^']+)'/g)].map(match => match[1].trim());
const questionDimensions = [...questionBlock.matchAll(/dimension:'([^']+)'/g)].map(match => match[1].trim());
assert.equal(questionTitles.length, 7, "Recommendation diagnosis must contain seven distinct questions");
assert.equal(new Set(questionTitles).size, questionTitles.length, "Recommendation question titles must be unique");
assert.equal(questionDimensions.length, 7, "Every recommendation question must declare a dimension");
assert.equal(new Set(questionDimensions).size, questionDimensions.length, "Recommendation question dimensions must be unique");
assert.deepEqual(questionDimensions, ["genre", "pacing", "emotional_intensity", "duration", "character_appeal", "narrative_complexity", "romance_amount"], "Recommendation questions must cover distinct preference dimensions");
assert.match(recommend, /new Set\(q\.options\.map\(o=>o\.label\.trim\(\)\)\)\.size!==q\.options\.length/, "Runtime duplicate-option guard missing");
assert.match(recommend, /new Set\(allQuestionTitles\)\.size!==questions\.length/, "Runtime duplicate-question-title guard missing");
assert.match(recommend, /new Set\(allQuestionDimensions\)\.size!==questions\.length/, "Runtime duplicate-dimension guard missing");
assert.match(recommend, /new Set\(allQuestionLabels\)\.size!==allQuestionLabels\.length/, "Runtime duplicate-option-label guard missing");
const recommendationLabels = [...questionBlock.matchAll(/label:'([^']+)'/g)].map(match => match[1]);
assert.equal(recommendationLabels.length, 28, "Each of the seven recommendation questions must have four options");
assert.equal(new Set(recommendationLabels).size, recommendationLabels.length, "Recommendation option labels must not be duplicated across questions");
assert.equal(questionDimensions.length, new Set(questionDimensions).size, "No preference dimension may be asked more than once");
assert.ok(recommendationLabels.every(label => [...label].length <= 30), "Recommendation choices must stay short and easy to scan");
assert.match(questionBlock, /help:'[^']+'/g, "Recommendation questions must include simple guidance");
const complexityQuestion = questionBlock.match(/\{dimension:\'narrative_complexity\'[\s\S]*?\n\]\}/)?.[0] || "";
assert.ok(complexityQuestion, "Narrative complexity question must exist");
assert.doesNotMatch(complexityQuestion, /genres:|avoidGenres:/, "Narrative complexity must not double-count the genre preference axis");
assert.match(recommend, /const state=\{v:3,a:answers,/, "New recommendation share links must use version 3");
const shareNormalizerSource = recommend.match(/function normalizeSharedAnswers\(state\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(shareNormalizerSource, "Share-link answer migration helper missing");
const normalizeSharedAnswers = vm.runInNewContext(`(${shareNormalizerSource})`, { questions: Array.from({ length: 7 }, () => ({ options: Array(4) })) });
assert.deepEqual([...normalizeSharedAnswers({ v: 3, a: [0, 1, 2, 3, 0, 1, 2] })], [0, 1, 2, 3, 0, 1, 2], "Current seven-answer share links must restore exactly");
assert.deepEqual([...normalizeSharedAnswers({ v: 2, a: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0] })], [0, 2, 3, 1, 2, 3, 2], "Legacy 13-question share links must map to current dimensions");
assert.deepEqual([...normalizeSharedAnswers({ v: 2, a: [0, 1, 2, 3, 0, 1] })], [0, 2, 3, 1, null, null, null], "Legacy six-question share links must preserve compatible answers");
assert.deepEqual([...normalizeSharedAnswers({ v: 2, a: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1] })], [0, 2, 3, 1, 2, 3, null], "Legacy ten-question share links must preserve compatible answers");
assert.equal(normalizeSharedAnswers({ v: 3, a: [0, 1, 2, 3, 0, 1] }), null, "Current share links with an incomplete answer count must be rejected");
assert.equal(normalizeSharedAnswers({ v: 3, a: [0, 1, 2, 3, 0, 1, 4] }), null, "Out-of-range shared answers must be rejected");
assert.doesNotMatch(questionBlock, /NDCG|IDF|重み付け|希少性/, "Technical recommendation terms must not appear in user-facing questions");
const seedSimilaritySource = recommend.match(/function calculateSeedSimilarity\(candidate,seeds,rarityWeight,genreRarity\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(seedSimilaritySource, "Favorite-anime similarity function not found");
const calculateSeedSimilarity = vm.runInNewContext(`(${seedSimilaritySource})`);
const rarityWeight = () => 1;
const genreRarity = () => 0.5;
const seed = { genres: ["Fantasy"], tags: [{ name: "World Building", rank: 90 }] };
const strongCandidate = { genres: ["Fantasy"], tags: [{ name: "World Building", rank: 90 }] };
const weakCandidate = { genres: ["Fantasy"], tags: [{ name: "World Building", rank: 45 }] };
const strongMatch = calculateSeedSimilarity(strongCandidate, [seed], rarityWeight, genreRarity);
const weakMatch = calculateSeedSimilarity(weakCandidate, [seed], rarityWeight, genreRarity);
assert.ok(strongMatch.score > weakMatch.score, "Candidate-side tag rank must affect favorite-anime similarity");
assert.deepEqual([...strongMatch.matchedGenres], ["Fantasy"], "Shared genres must be reported");
assert.deepEqual([...strongMatch.matchedTags], ["World Building"], "Strong shared tags must be reported");
assert.equal(calculateSeedSimilarity(strongCandidate, [], rarityWeight, genreRarity).score, 0, "No favorite seeds must produce zero similarity");
const spoilerOnly = { genres: [], tags: [{ name: "World Building", rank: 100, isMediaSpoiler: true }] };
assert.equal(calculateSeedSimilarity(spoilerOnly, [seed], rarityWeight, genreRarity).score, 0, "Spoiler tags must not affect similarity");
assert.match(recommend, /function buildRecommendationDataWarnings\(failedPages,totalPages\)/, "Partial recommendation data warning helper missing");
assert.match(recommend, /report\.dataWarnings\?\.length/, "Partial recommendation data warning must be shown to users");
assert.match(recommend, /buildRecommendationDataWarnings\(failedPages,sortModes\.length\*5\)/, "Recommendation fetch failures must be reflected in the result report");
const relationAllowlist = recommend.match(/const relatedTypes=new Set\(\[([^\]]+)\]\)/)?.[1] || "";
assert.match(relationAllowlist, /PREQUEL.*SEQUEL.*SUMMARY.*ALTERNATIVE.*COMPILATION/, "Recommendation deduplication must cover series and alternate/summary relations");
assert.doesNotMatch(relationAllowlist, /PARENT/, "A side story parent relation must not hide a distinct side story");
assert.match(recommend, /独立したサイドストーリーは親作品と別候補として残す/, "Side-story separation regression test missing");

const index = source.get("index.html");
assert.match(index, /type:ANIME,countryOfOrigin:JP/, "Quiz search query must be restricted to Japanese-origin anime");
assert.ok(index.includes("media(type:ANIME,countryOfOrigin:JP"), "Quiz catalog query must be restricted to Japanese-origin anime");
assert.match(index, /countryOfOrigin===.JP./, "Quiz data must be filtered by Japanese origin on the client as a second guard");
assert.match(index, /term\.normalize\('NFKC'\)/, "Community search input must be normalized before building PostgREST filters");
assert.match(index, /safeTerm\.length<2|\[\.\.\.safeTerm\]\.length<2/, "Community search must reject terms shorter than two searchable characters");
assert.match(index, /body\.textContent\s*=\s*post\.body/, "User-generated post text must be rendered with textContent");
assert.doesNotMatch(index, /innerHTML\s*=\s*[^;]*(?:post\.body|profile\.(?:username|display_name))/, "User-generated profile/post data must not be inserted with innerHTML");
const beginBlock = index.match(/async function begin\(\)\{([\s\S]*?)\n\}/)?.[1];
assert.ok(beginBlock, "Quiz begin function not found");
assert.match(beginBlock, /catch\(error\)\{[\s\S]*?clearInterval\(questionTimer\);clearInterval\(clockTimer\);clearTimeout\(autoNextTimer\)/, "Quiz start failure must stop timers");
assert.match(beginBlock, /\$\([\x27"]#pauseButton[\x27"]\)\.classList\.add\([\x27"]hidden[\x27"]\)/, "Quiz start failure must hide pause control");
assert.match(beginBlock, /\$\([\x27"]#quitQuizButton[\x27"]\)\.classList\.add\([\x27"]hidden[\x27"]\)/, "Quiz start failure must hide quit control");

console.log(`Static security checks passed. Checked ${checkedScripts} inline script(s) across ${frontendFiles.length} pages.`);
