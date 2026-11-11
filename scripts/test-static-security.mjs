import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const frontendFiles = [
  "index.html",
  "admin.html",
  "multiplayer.html",
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

const quizIndex = source.get("index.html");
const resultStart = quizIndex.indexOf('<div id="result" class="hidden">');
const resultEnd = quizIndex.indexOf('<button id="start"', resultStart);
const resultMarkup = resultStart >= 0 && resultEnd > resultStart ? quizIndex.slice(resultStart, resultEnd) : "";
assert.ok(resultMarkup, "Quiz result screen markup missing");
for (const id of ["restart", "reviewMissed", "shareResult", "downloadResult", "historySummary"]) {
  assert.ok(resultMarkup.includes('id="' + id + '"'), `Quiz result control #${id} must exist`);
}
assert.ok(resultMarkup.includes('id="shareResult" class="primary">結果を共有</button>'), "The result-sharing button must be labelled 結果を共有");
const finishStart = quizIndex.indexOf("function finishQuiz()");
const finishEnd = quizIndex.indexOf("function makeStatsRunId", finishStart);
assert.ok(finishStart >= 0 && finishEnd > finishStart, "Quiz completion handler missing");
const finishQuizSource = quizIndex.slice(finishStart, finishEnd);
for (const required of [
  "$('#quizHeader').classList.add('hidden')",
  "$('#quizStatus').classList.add('hidden')",
  "$('#animePoolProgress').classList.add('hidden')",
  "$('#quizArea').classList.add('hidden')",
  "$('#setupControls').classList.add('hidden')",
  "$('#restart').classList.remove('hidden')",
  "document.querySelector('.share-actions').classList.remove('hidden')",
  "$('#historySummary').classList.remove('hidden')",
  "$('#reviewMissed').classList.toggle('hidden',missedQuestions.length===0)"
]) {
  assert.ok(finishQuizSource.includes(required), `Quiz completion screen regression: missing ${required}`);
}

for (const file of ["index.html", "admin.html", "multiplayer.html"]) {
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

const multiplayer = source.get("multiplayer.html");
assert.match(multiplayer, /let matchmakingTimer=null,matchmakingBusy=false,matchmakingPrefs=null,matchmakingPollPromise=null;/, "Random matchmaking must track an in-flight poll");
const stopMatchmakingSource = multiplayer.match(/function stopMatchmakingPolling\(\)\{[^}]*\}/)?.[0];
assert.ok(stopMatchmakingSource, "Matchmaking timer cleanup helper missing");
assert.doesNotMatch(stopMatchmakingSource, /matchmakingBusy=false/, "Stopping the timer must not mark an in-flight poll as finished");
const pollMatchmakingSource = multiplayer.match(/async function pollMatchmaking\(\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(pollMatchmakingSource, "Matchmaking polling function missing");
assert.match(pollMatchmakingSource, /matchmakingPollPromise=task/, "An active matchmaking poll must be tracked");
assert.match(pollMatchmakingSource, /await task/, "Polling completion must be awaitable before cancellation");
const cancelMatchmakingSource = multiplayer.match(/async function cancelRandomMatch\(\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(cancelMatchmakingSource, "Matchmaking cancellation function missing");
assert.match(cancelMatchmakingSource, /if\(matchmakingPollPromise\)await matchmakingPollPromise/, "Cancellation must wait for an in-flight poll");
assert.ok(cancelMatchmakingSource.indexOf("await matchmakingPollPromise") < cancelMatchmakingSource.indexOf("aqw_matchmaking_cancel"), "Queue cancellation must run after any in-flight poll");
assert.match(cancelMatchmakingSource, /if\(room\)/, "Cancellation must preserve a room created by a poll that completed concurrently");

assert.ok(multiplayer.includes('<option value="2" selected>2人（1対1）</option>'), "The room UI must clearly show one-on-one matchmaking");
assert.doesNotMatch(multiplayer, /<option value="3">3人|<option value="4">4人/, "The room UI must not offer unsupported group sizes");
const matchMigration = fs.readFileSync("supabase/migrations/20261111090000_restrict_aqw_matches_to_one_on_one.sql", "utf8");
assert.match(matchMigration, /p_max_players <> 2/, "The database must reject match sizes other than two players");
assert.match(matchMigration, /現在のオンライン対戦は1対1のみ対応しています/, "The database must explain the one-on-one restriction");
assert.match(multiplayer, /id="startMatch"/, "Host start-match control missing");
assert.match(multiplayer, /async function startMatch\(\)/, "Host start-match handler missing");
assert.match(multiplayer, /functions\/v1\/aqw-match-prepare/, "Starting a match must use the protected server-side match preparation function");
assert.match(multiplayer, /['"]Authorization['"]:'Bearer '\+session\.access_token/, "Starting a match must send the authenticated user's access token");
assert.match(multiplayer, /players\.length!==2\|\|!players\.every\(p=>p\.is_ready\)/, "Client must require both players ready before starting");
assert.match(multiplayer, /room\.host_id===user\.id/, "Only the room host may start a match in the UI");
const privacy = source.get("privacy.html");
assert.doesNotMatch(privacy, /コレクション/, "Privacy policy must not describe the removed anime collection feature");

const recommend = source.get("recommend.html");
assert.ok(recommend.includes("media(search:$search,type:ANIME,countryOfOrigin:JP"), "Favorite-work search must be restricted to Japanese-origin anime");
assert.ok(recommend.includes("media(type:ANIME,countryOfOrigin:JP"), "Recommendation catalog query must be restricted to Japanese-origin anime");
assert.match(recommend, /countryOfOrigin!==.JP./, "Recommendation data must reject non-Japanese production countries on the client");

const recommendOriginHelper = recommend.match(/function isJapaneseOriginAnime\(media\)\{[^\n]*\}/)?.[0];
assert.ok(recommendOriginHelper, "Recommendation Japanese-origin verification helper missing");
const isRecommendedOriginJapanese = vm.runInNewContext(`(${recommendOriginHelper})`);
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "JP", source: "ORIGINAL" }), true, "Japanese original anime must remain eligible");
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "JP", source: "MANGA", relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA" } }] } }), true, "Japanese manga adaptations must remain eligible");
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "JP", source: "MANGA", relations: { edges: [{ relationType: "SOURCE", node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA" } }] } }), true, "AniList v2 SOURCE relations must recognize Japanese manga originals");
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "JP", source: "LIGHT_NOVEL", relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "JP", format: "NOVEL" } }] } }), true, "Japanese light-novel adaptations must remain eligible");
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "JP", source: "NOVEL", relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "JP", format: "NOVEL" } }] } }), true, "Japanese novel adaptations must remain eligible");
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "JP", source: "DOUJINSHI", relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA" } }] } }), true, "Japanese doujinshi adaptations must remain eligible");

assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "JP", source: "ANIME", relations: { edges: [{ relationType: "SOURCE", node: { type: "ANIME", countryOfOrigin: "JP", format: "TV" } }] } }), true, "Japanese anime-source spin-offs must be eligible when their source anime is verified");
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "JP", source: "ANIME", relations: { edges: [{ relationType: "SOURCE", node: { type: "ANIME", countryOfOrigin: "US", format: "TV" } }] } }), false, "Foreign anime-source spin-offs must be excluded");
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "JP", source: "ANIME", relations: { edges: [{ relationType: "SOURCE", node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA" } }] } }), false, "Anime source metadata must match an anime relation node");
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "JP", source: "VISUAL_NOVEL", relations: { edges: [] } }), false, "Visual novel source origin must not be guessed without explicit evidence");
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "JP", source: "VIDEO_GAME", relations: { edges: [] } }), false, "Game source origin must not be guessed without source-country evidence");
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "JP", source: "OTHER", relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA" } }] } }), false, "Unknown source types must fail closed");
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "JP", source: "MANGA", relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "JP", format: "NOVEL" } }] } }), false, "Manga source must match manga format");
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "JP", source: "MANGA", relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "US", format: "MANGA" } }] } }), false, "Non-Japanese source adaptations must be excluded");
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "US", source: "ORIGINAL" }), false, "Non-Japanese animation must be excluded");

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

const syncScript = fs.readFileSync("scripts/sync-anime-catalog.mjs", "utf8");
const syncWorkflow = fs.readFileSync(".github/workflows/sync-anime-catalog.yml", "utf8");
assert.match(syncScript, /function isJapaneseOriginAnime\(anime\)/, "Shared catalogue sync must verify Japanese source origin");
const syncOriginHelper = syncScript.match(/function isJapaneseOriginAnime\(anime\)\s*\{[\s\S]*?\n\}/)?.[0];
assert.ok(syncOriginHelper, "Shared catalogue Japanese-origin helper must be extractable for regression tests");
const isSyncOriginJapanese = vm.runInNewContext(`(${syncOriginHelper})`);
assert.equal(isSyncOriginJapanese({ countryOfOrigin: "JP", source: "ORIGINAL" }), true, "Japanese original anime must enter the shared catalogue");
assert.equal(isSyncOriginJapanese({ countryOfOrigin: "JP", originVerified: true }), true, "The compact shared catalogue may use its build-time verified-origin marker");
assert.equal(isSyncOriginJapanese({ countryOfOrigin: "JP", source: "ANIME", relations: { edges: [{ relationType: "SOURCE", node: { type: "ANIME", countryOfOrigin: "JP", format: "TV" } }] } }), true, "Verified Japanese anime-source spin-offs must enter the shared catalogue");
assert.equal(isSyncOriginJapanese({ countryOfOrigin: "JP", source: "ANIME", relations: { edges: [{ relationType: "SOURCE", node: { type: "ANIME", countryOfOrigin: "US", format: "TV" } }] } }), false, "Foreign anime-source works must not enter the shared catalogue");
assert.equal(isSyncOriginJapanese({ countryOfOrigin: "JP", source: "VIDEO_GAME", relations: [] }), false, "Unverified game-source origin must fail closed in the shared catalogue");
assert.match(syncScript, /startDate_greater/, "The shared catalogue must split oversized format scopes by release decade");

assert.match(syncScript, /countryOfOrigin !== 'JP'/, "Shared catalogue sync must reject non-Japanese animation");
assert.match(syncScript, /isAdult:false/, "Shared catalogue sync must exclude adult catalogue entries");
assert.match(syncScript, /const OVERFLOW_SORTS = \['SCORE_DESC', 'FAVOURITES_DESC', 'TRENDING_DESC', 'START_DATE_DESC'\]/, "Shared catalogue sync must cover AniList pagination overflow");
assert.match(syncWorkflow, /cron: '30 19 \* \* \*'/, "Shared catalogue sync must be scheduled daily");
assert.match(syncWorkflow, /workflow_dispatch:/, "Shared catalogue sync must support manual runs");
assert.match(syncWorkflow, /contents: write/, "Shared catalogue sync must be able to publish the generated dataset");

const index = source.get("index.html");
assert.doesNotMatch(index, /id="collection(?:Heading)?"/, "The anime collection display must be removed");
assert.doesNotMatch(index, /rememberAnime|safeStorage\.(?:getItem|setItem)\([\'"]aqw-collection[\'"]/, "Quiz answers must not create or load a per-user anime collection");
assert.match(index, /safeStorage\.removeItem\('aqw-collection'\)/, "Legacy per-user anime collection data must be removed on page load");
assert.match(index, /\[t\.fifty,runs>=50\]/, "The 50-play achievement must not depend on a stored anime collection");
assert.match(index, /type:ANIME,countryOfOrigin:JP/, "Quiz search query must be restricted to Japanese-origin anime");
assert.ok(index.includes("media(type:ANIME,countryOfOrigin:JP"), "Quiz catalog query must be restricted to Japanese-origin anime");
assert.match(index, /countryOfOrigin!==.JP./, "Quiz data must reject non-Japanese production countries on the client");

assert.ok(index.includes("media(type:ANIME,countryOfOrigin:JP"), "Quiz catalog query must be restricted to Japanese-origin anime");
const indexOriginHelper = index.match(/function isJapaneseOriginAnime\(a\)\{[^\n]*\}/)?.[0];
assert.ok(indexOriginHelper, "Quiz Japanese-origin verification helper missing");
const isQuizOriginJapanese = vm.runInNewContext(`(${indexOriginHelper})`);
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "ORIGINAL" }), true, "Japanese original anime must remain eligible in the quiz");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", originVerified: true }), true, "Compact shared-catalogue entries must pass the verified-origin marker");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "US", originVerified: true }), false, "The verified-origin marker must never override a non-Japanese country");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "MANGA", relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA" } }] } }), true, "Japanese manga adaptations must remain eligible in the quiz");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "MANGA", relations: { edges: [{ relationType: "SOURCE", node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA" } }] } }), true, "AniList v2 SOURCE relations must recognize Japanese manga originals in the quiz");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "LIGHT_NOVEL", relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "JP", format: "NOVEL" } }] } }), true, "Japanese light-novel adaptations must remain eligible in the quiz");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "NOVEL", relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "JP", format: "NOVEL" } }] } }), true, "Japanese novel adaptations must remain eligible in the quiz");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "DOUJINSHI", relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA" } }] } }), true, "Japanese doujinshi adaptations must remain eligible in the quiz");

assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "ANIME", relations: { edges: [{ relationType: "SOURCE", node: { type: "ANIME", countryOfOrigin: "JP", format: "TV" } }] } }), true, "Japanese anime-source spin-offs must be eligible in the quiz when their source anime is verified");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "ANIME", relations: { edges: [{ relationType: "SOURCE", node: { type: "ANIME", countryOfOrigin: "KR", format: "TV" } }] } }), false, "Foreign anime-source spin-offs must be excluded from the quiz");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "ANIME", relations: { edges: [{ relationType: "SOURCE", node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA" } }] } }), false, "Anime source metadata must match an anime relation node in the quiz");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "VISUAL_NOVEL", relations: { edges: [] } }), false, "Visual novel source origin must not be guessed in the quiz without explicit evidence");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "VIDEO_GAME", relations: { edges: [] } }), false, "Game source origin must not be guessed without source-country evidence");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "OTHER", relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA" } }] } }), false, "Unknown source types must fail closed in the quiz");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "MANGA", relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "JP", format: "NOVEL" } }] } }), false, "Manga source must match manga format in the quiz");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "MANGA", relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "KR", format: "MANGA" } }] } }), false, "Non-Japanese source adaptations must be excluded from the quiz");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "US", source: "ORIGINAL" }), false, "Non-Japanese animation must be excluded from the quiz");
assert.match(index, /async function fetchSharedAnimeCatalog\(\)/, "The quiz must load the shared catalogue");

// The exact shared character-choice builder is asserted below.
assert.match(index, /if\(mode===\'characterImage\'\|\|mode===\'characterNameImage\'\)return characterRecordsWithFourChoicesForAnime\(a,summary,mode===\'characterNameImage\'\)\.length>0/, "Character-image question eligibility must validate the actual name or image distractor pool");
assert.match(index, /shuffle\(characterRecordsWithFourChoicesForAnime\(a,questionChoiceSummary\(\),true\)\)/, "Character-name-to-image questions must choose from records with four distinct portraits");
assert.match(index, /if\(\[\'image\',\'character\',\'characterImage\',\'titleCharacter\'\]\.includes\(currentQuestionMode\)\)skipBrokenImageQuestion\(brokenUrl\)/, "A failed character portrait must skip title-to-character questions instead of leaving an unanswerable prompt");

assert.match(index, /function availableQuestionModes\(a,format=/, "Mixed mode must derive the available question types for each anime");
assert.match(index, /titleImageExcludedIds\.has\(Number\(a\?\.id\)\)\?\[\]:\['image'\]/, "Title-bearing cover images must be excluded from image questions without excluding other question types");
assert.match(index, /mode===\'mixed\'\?availableQuestionModes\(anime,format\)\.length>0/, "Initial mixed-mode selection must accept any anime with at least one valid question type");
assert.match(index, /mode===\'mixed\'\?items\.filter\(a=>isUsableAnime\(a\)&&titleUsable\(a\)&&availableQuestionModes\(a,format\)\.length>0\)/, "Background loading in mixed mode must use the same per-anime question-type eligibility");
assert.ok(index.includes("let modesForFormat=availableQuestionModes(a,$('#answerFormatSelect').value)"), "Question rendering must use the same available-mode calculation");

assert.match(index, /function studioChoiceRecordsForAnime\(a\)/, "Studio question eligibility and generation must share the same studio candidate builder");
assert.match(index, /function hasFourDistinctStudioChoices\(a\)\{return studioChoiceRecordsForAnime\(a\)\.length>=4\}/, "Studio question eligibility must validate the exact generated options");
assert.match(index, /function makeStudioOptions\(a\)/, "Studio question generation must use the shared studio candidate builder");
assert.match(index, /function yearChoiceRecordsForAnime\(a\)/, "Year question eligibility and generation must share the same year candidate builder");
assert.match(index, /if\(mode===\'titleYear\'\)return yearChoiceRecordsForAnime\(a\)\.length>=4/, "Year question eligibility must validate the exact generated year options");
assert.match(index, /function makeYearOptions\(a\)\{const records=yearChoiceRecordsForAnime\(a\),correct=String\(animeYear\(a\)\);return records\.some\(record=>record\.value===correct\)\?\[\{label:correct,value:correct\},\.\.\.shuffle\(records\.filter\(record=>record\.value!==correct\)\)\.slice\(0,3\)\]:\[\]\}/, "Year question generation must always include the correct year alongside three distinct distractors");
assert.match(index, /if\(actualMode===\'titleStudio\'\)\{prompt=titleOf\(a\)\+qText\(\'titleStudio\'\);opts=makeStudioOptions\(a\)/, "Title-to-studio generation must use the shared validated studio options");
assert.match(index, /function titleChoiceRecordsForAnime\(a\)/, "Title-based question eligibility and generation must share the same alias-safe option builder");
assert.match(index, /function hasFourDistinctTitleChoices\(anime,summary=questionChoiceSummary\(\)\)\{return titleChoiceRecordsForAnime\(anime\)\.length>=4\}/, "Title-based question eligibility must count the exact generated title options");
assert.match(index, /function makeTitleOptions\(a\)\{return shuffle\(titleChoiceRecordsForAnime\(a\)\.slice\(0,4\)\)\}/, "Title-based question generation must use the validated alias-safe title options");
assert.match(index, /function characterChoiceRecordsForAnime\(anime,correctRecord,imageAnswers=false\)/, "Character image question eligibility and generation must share the exact four-choice builder");
assert.match(index, /function characterRecordsWithFourChoicesForAnime\(anime,summary=questionChoiceSummary\(\),imageAnswers=false\)\{return uniqueCharacterRecordsForAnime\(anime,summary\)\.filter\(record=>characterChoiceRecordsForAnime\(anime,record,imageAnswers\)\.length===4\)\}/, "Character image questions must only use records that produce exactly four unique name or image choices");
assert.match(index, /seenImages=new Set\(imageAnswers\?\[String\(correctRecord\?\.image\|\|''\)\]:\[\]\)/, 'Character image answers must reject duplicate image URLs');
assert.match(index, /characterRecordsWithFourChoicesForAnime\(a,questionChoiceSummary\(\),true\)/, 'Character-name-to-image generation must use image-distinct eligibility');
assert.match(index, /function titleCharacterChoiceRecordsForAnime\(anime,correctRecord\)/, "Title-to-character question eligibility and generation must share the exact choice builder");
assert.match(index, /function characterRecordsWithFourTitleChoicesForAnime\(anime,summary=questionChoiceSummary\(\)\)\{return uniqueCharacterRecordsForAnime\(anime,summary\)\.filter\(record=>titleCharacterChoiceRecordsForAnime\(anime,record\)\.length===4\)\}/, "Title-to-character questions must only use characters with four valid unique choices");
assert.match(index, /opts=titleCharacterChoiceRecordsForAnime\(a,characterRecord\)/, "Title-to-character generation must use the validated shared choice set");
assert.match(index, /const brokenUrls=\[img\.currentSrc,img\.src\]\.filter\(Boolean\);brokenUrls\.forEach\(url=>failedImageUrls\.add\(url\)\)/, "Broken character images must blacklist both the resolved URL and original source URL");
assert.match(index, /\[quizCover\.currentSrc,quizCover\.src\]\.filter\(Boolean\)\.forEach\(url=>failedImageUrls\.add\(url\)\)/, "Broken cover and character images must blacklist both resolved and original URLs");
assert.match(index, /function synopsisChoiceRecords\(a,answerIsTitle=false\)/, "Synopsis question eligibility and generation must share one candidate builder");
assert.match(index, /function hasFourDistinctSynopsisChoices\(a,answerIsTitle=false\)\{return synopsisChoiceRecords\(a,answerIsTitle\)\.length>=4\}/, "Synopsis eligibility must validate the exact generated option set");
assert.match(index, /function makeSynopsisOptions\(a,answerIsTitle=false\)\{return shuffle\(synopsisChoiceRecords\(a,answerIsTitle\)\)\}/, "Synopsis generation must shuffle only the validated option set");
assert.match(index, /function uniqueCharacterRecordsForAnime\(anime,summary=questionChoiceSummary\(\)\)\{return characterRecords\(\[anime\]\)\.filter\(record=>summary\.uniqueCharacterNameKeys\.has\(normalizeAnswer\(record\.name\)\)\)\}/, "Character-name questions must only use globally unique character names");
assert.match(index, /function isSingleAnimeCharacter\(record,summary=questionChoiceSummary\(\)\)/, "Character-to-anime questions must validate single-work appearances");
assert.match(index, /if\(mode===['"]character['"]\)return characterRecords\(\[a\]\)\.some\(record=>isSingleAnimeCharacter\(record,summary\)\)/, "Character-to-anime eligibility must exclude characters appearing in multiple works");
assert.match(index, /characterRecords\(\[a\]\)\.filter\(record=>isSingleAnimeCharacter\(record,summary\)\)/, "Character-to-anime generation must use the same unambiguous character filter");
const singleAnimeCharacterStart = index.indexOf("function isSingleAnimeCharacter(");
const singleAnimeCharacterEnd = index.indexOf("function characterRecords(", singleAnimeCharacterStart);
assert.ok(singleAnimeCharacterStart >= 0 && singleAnimeCharacterEnd > singleAnimeCharacterStart, "Single-anime character helper must exist");
const isSingleAnimeCharacter = vm.runInNewContext(`(${index.slice(singleAnimeCharacterStart, singleAnimeCharacterEnd).trim()})`, {
  normalizeAnswer: value => String(value || "").normalize("NFKC").toLocaleLowerCase().replace(/[\s　・･:：!！?？.,，。'"“”「」『』()（）‐‑–—_-]/g, "").trim()
});
assert.equal(isSingleAnimeCharacter({ name: "Only Character" }, { uniqueCharacterNameKeys: new Set(["onlycharacter"]), characterNameAnimeCounts: new Map([["onlycharacter", 1]]) }), true, "A character appearing in one anime must remain eligible");
assert.equal(isSingleAnimeCharacter({ name: "Shared Character" }, { uniqueCharacterNameKeys: new Set(["sharedcharacter"]), characterNameAnimeCounts: new Map([["sharedcharacter", 2]]) }), false, "A character appearing in multiple anime must be excluded");

assert.match(index, /function characterRecordsWithFourTitleChoicesForAnime\(anime,summary=questionChoiceSummary\(\)\)/, "Title-to-character mode must validate the real distractor pool");
assert.match(index, /if\(mode===\'titleCharacter\'\)return characterRecordsWithFourTitleChoicesForAnime\(a,summary\)\.length>0/, "Title-to-character eligibility must validate three unique distractors");
assert.match(index, /shuffle\(characterRecordsWithFourTitleChoicesForAnime\(a\)\)/, "Title-to-character generation must use only eligible correct characters");
// The shared builder's eligible distractor source is asserted above.
assert.match(index, /if\(actualMode===\'titleCharacter\'\)\{const characterRecord=shuffle\(characterRecordsWithFourTitleChoicesForAnime\(a\)\)/, "Character-name question generation must choose a character with three unique distractors");
// The shared builder's eligible distractor source is asserted above.
assert.ok(index.slice(index.indexOf("async function fetchSharedAnimeCatalog"),index.indexOf("async function fetchAnime")).includes("cache:'default'"), "The shared catalogue should use the browser HTTP cache to avoid repeatedly downloading the large JSON file");
assert.ok(!index.slice(index.indexOf("async function fetchSharedAnimeCatalog"),index.indexOf("async function fetchAnime")).includes("cache:'no-cache'"), "Shared catalogue requests must not force revalidation on every visit");
assert.match(index, /payload\?\.schemaVersion!==2/, "The quiz must require the compact shared-catalogue schema");
assert.match(syncScript, /const \{ source, relations, \.\.\.compact \} = anime/, "The published catalogue must omit bulky source-relation details after verification");
assert.match(syncScript, /originVerified: true/, "The published catalogue must retain the build-time Japanese-origin verification marker");
assert.match(index, /new URL\('data\/anime-catalog\.json',document\.baseURI\)/, "The shared catalogue must resolve correctly from GitHub Pages subpaths");
assert.match(index, /sharedCatalogItems=await fetchSharedAnimeCatalog\(\)/, "Shared catalogue entries must be merged with local cached records");
assert.match(index, /if\(sharedCatalogActive\)\{[\s\S]*?return initial;/, "A shared catalogue must prevent every visitor from repeating the full AniList backfill");
assert.match(index, /sharedCatalogActive\?\(/, "The loading screen must distinguish the shared catalogue from local background backfill");
assert.match(index, /const cacheKey='aqw-anime-pool-v21-compact-shared-catalog'/, "Verified original-source eligibility must rebuild the browser catalogue");
assert.ok(index.includes("source(version:2) relations { edges { relationType node { id type countryOfOrigin format } } }"), "Quiz queries must request detailed source metadata and adaptation-origin evidence");
assert.ok(recommend.includes("source(version:2) relations { edges { relationType node { id type countryOfOrigin format } } }"), "Recommendation queries must request detailed source metadata and adaptation-origin evidence");

assert.match(index, /const sorts=\['POPULARITY_DESC','ID','ID_DESC'\]/, "Format-specific catalogue backfill must use complementary sort orders");
assert.ok(index.includes("const overflowSorts=['SCORE_DESC','FAVOURITES_DESC','TRENDING_DESC','START_DATE_DESC']"), "Formats exceeding AniList page limits must be backfilled using additional sort orders");
assert.ok(index.includes("if(existingOverflowScopes.has(overflowScope))continue"), "Overflow sort scopes must not be scheduled more than once");
assert.match(index, /pageInfo \{ hasNextPage \} media\(id_in:\$id_in/, "Base AniList query must expose source pagination metadata");
assert.match(index, /items\.hasNextPage=pageData\?\.pageInfo\?\.hasNextPage===true/, "Filtered results must retain the upstream hasNextPage flag");
assert.match(index, /hasNextPage:items\.hasNextPage===true/, "Fallback pagination must not infer page completion from filtered result count");

assert.match(index, /function isUsableAnime\(a\)\{[^\n]*isJapaneseOriginAnime\(a\)/, "Every cached and live quiz record must pass strict Japanese-source eligibility");
assert.match(index, /function isUsableAnime\(a\)\{[^\n]*a\.isAdult!==true/, "Adult-flagged records must be excluded from live and cached quiz data");

assert.match(index, /source\(version:2\) relations \{ edges \{ relationType node \{ id type countryOfOrigin format \} \} \}/, "Featured seasonal queries must include source and related-origin metadata");
assert.ok(index.includes("season seasonYear startDate { year month day }"), "Featured seasonal queries must include season and start-date metadata");
assert.ok(index.includes("if(!isJapaneseOriginAnime(anime)||!Number.isFinite(Number(anime.id)))continue"), "New seasonal anime must pass verified Japanese-source filtering");
assert.match(index, /if\(isJapaneseOriginAnime\(anime\)&&Number\.isFinite\(Number\(anime\.id\)\)\)byId\.set/, "Ongoing seasonal anime must pass verified Japanese-source filtering");

assert.match(index, /function isJapaneseOriginAnime\(a\)\{[^\n]*a\.countryOfOrigin!==.JP./, "Japanese-origin eligibility must reject non-Japanese animation records before source verification");
assert.match(index, /const cleanedItems=value\.items\.filter\(isUsableAnime\)/, "Existing IndexedDB catalogues must be purged of non-Japanese-origin anime when loaded");
assert.match(index, /const cleanedItems=legacy\.items\.filter\(isUsableAnime\)/, "Existing localStorage catalogues must be purged of non-Japanese-origin anime when loaded");
assert.match(index, /if\(!isJapaneseOriginAnime\(anime\)\|\|!Number\.isFinite\(Number\(anime\.id\)\)\)continue/, "Featured anime rail must apply strict Japanese-source verification before rendering");
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

// Regression coverage: character image choices require unique portrait URLs.

// Ensure this suite tracks the final image-aware validation implementation.
