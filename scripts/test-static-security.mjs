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

const matchPreparePath = "supabase/functions/aqw-match-prepare/index.ts";
assert.ok(fs.existsSync(matchPreparePath), "Active match-preparation Edge Function source is missing");
const matchPrepare = fs.readFileSync(matchPreparePath, "utf8");
assert.match(matchPrepare, /const ALLOWED_ORIGIN = "https:\/\/the-rascal-of-sakurasou\.github\.io"/, "Match preparation must restrict its browser origin");
assert.match(matchPrepare, /userClient\.auth\.getUser\(token\)/, "Match preparation must validate the bearer token with Supabase Auth");
assert.match(matchPrepare, /room\.host_id !== userData\.user\.id/, "Only the authenticated room host may prepare questions");
assert.match(matchPrepare, /room\.players\.length !== 2/, "Match preparation must require exactly two players");
assert.match(matchPrepare, /room\.players\.every\(\(p: any\) => p\.is_ready\)/, "Both players must be ready before question preparation");
assert.match(matchPrepare, /a\.countryOfOrigin === "JP" && a\.isAdult !== true/, "Match questions must be restricted to non-adult Japanese-origin anime");
assert.match(matchPrepare, /correct_option_index: options\.findIndex/, "The server must preserve the correct answer index after shuffling options");
assert.match(matchPrepare, /admin\.rpc\("aqw_match_prepare_questions"/, "Question keys must be stored through the privileged server-side RPC");
const supabaseConfig = fs.readFileSync("supabase/config.toml", "utf8");
assert.match(supabaseConfig, /\[functions\.aqw-match-prepare\][\s\S]*?verify_jwt = true/, "The active match-preparation Edge Function must require JWT verification");

const synopsisOverrideEntries = ["Fate/stay night", "GTO", "幽☆遊☆白書", "偽物語", "魔女の旅々", "見える子ちゃん", "オーバーロードⅣ", "BTOOOM!", "アクダマドライブ", "虚構推理", "ゼロの使い魔", "クズの本懐", "蜘蛛ですが、なにか？", "学戦都市アスタリスク", "四畳半神話大系", "ポケットモンスター", "K", "マギ The kingdom of magic", "ゲーマーズ！", "ヒナまつり", "あそびあそばせ", "涼宮ハルヒの消失", "さよならの朝に約束の花をかざろう", "ヴァイオレット・エヴァーガーデン 外伝~永遠と自動手記人形~", "猫物語（黒）"];
const synopsisSource = source.get("index.html");
for (const title of synopsisOverrideEntries) {
  const entryStart = synopsisSource.indexOf("'" + title + "':'");
  const entryEnd = synopsisSource.indexOf("',", entryStart);
  assert.ok(entryStart >= 0 && entryEnd - entryStart > 80, "A substantial Japanese synopsis override must exist for " + title);
}

const aqwHtml = source.get("index.html");
assert.match(aqwHtml, /id="aqwBlockFriend"/, "The chat must expose a block action");
assert.match(aqwHtml, /id="aqwReportFriend"/, "The chat must expose a user-report action");
assert.match(aqwHtml, /id="aqwBlockedUsers"/, "Users must be able to review and undo their own blocks");
assert.match(aqwHtml, /function blockUser\(/, "Blocking must be shared by chat and community-post controls");
assert.match(aqwHtml, /function submitUserReport\(/, "The client must submit moderation reports");
assert.match(aqwHtml, /post_id:reportTargetPostId/, "Post and reply reports must retain their target post id");
assert.match(aqwHtml, /blockedUserIds\.has\(reply\.user_id\)/, "Blocked users' replies must be hidden from the current user's feed");

const moderationMigrationPath = "supabase/migrations/20261112091214_aqw_friend_chat_blocks_and_reports.sql";
assert.ok(fs.existsSync(moderationMigrationPath), "Chat block/report migration is missing");
const moderationMigration = fs.readFileSync(moderationMigrationPath, "utf8");
assert.match(moderationMigration, /ALTER TABLE public\.user_blocks ENABLE ROW LEVEL SECURITY/i, "Block records must have RLS enabled");
assert.match(moderationMigration, /ALTER TABLE public\.user_reports ENABLE ROW LEVEL SECURITY/i, "Report records must have RLS enabled");
assert.match(moderationMigration, /REVOKE ALL ON TABLE public\.user_reports FROM public, anon, authenticated/i, "Report-table access must be explicitly restricted before grants");
assert.match(moderationMigration, /private\.is_user_blocked_between/, "Message and follow policies must enforce blocks in both directions");
assert.match(moderationMigration, /MFA owner can review reports/, "Only an MFA-verified site owner may review reports");

assert.match(source.get("privacy.html"), /通報記録/, "The privacy policy must disclose moderation report data");
assert.match(source.get("terms.html"), /虚偽通報/, "The terms must prohibit abusive or false reports");
assert.match(source.get("guide.html"), /ブロック・通報/, "The guide must explain the community safety controls");

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
const matchMigration = fs.readFileSync("supabase/migrations/20261110224531_restrict_aqw_matches_to_one_on_one.sql", "utf8");
assert.match(matchMigration, /p_max_players <> 2/, "The database must reject match sizes other than two players");
assert.match(matchMigration, /現在のオンライン対戦は1対1のみ対応しています/, "The database must explain the one-on-one restriction");
const historyMigration = fs.readFileSync("supabase/migrations/20261112073700_retain_completed_aqw_match_history_after_exit.sql", "utf8");
assert.match(historyMigration, /r\.status='completed'[\s\S]*?r\.max_players=2/, "Match history must include only completed one-on-one rooms");
assert.match(historyMigration, /count\(\*\) from public\.aqw_match_players p where p\.room_id=r\.id\)=2/, "Match history must require exactly two participants");
assert.doesNotMatch(historyMigration, /mine\.left_at\s+is\s+null|opponent\.left_at\s+is\s+null/, "Leaving a completed room must not erase match history");
assert.match(historyMigration, /r\.winner_id is not null/, "Match history must preserve surrender winners");
assert.match(multiplayer, /id="startMatch"/, "Host start-match control missing");
assert.match(multiplayer, /async function startMatch\(\)/, "Host start-match handler missing");
assert.match(multiplayer, /functions\/v1\/aqw-match-prepare/, "Starting a match must use the protected server-side match preparation function");
assert.match(multiplayer, /['"]Authorization['"]:'Bearer '\+session\.access_token/, "Starting a match must send the authenticated user's access token");
assert.match(multiplayer, /players\.length!==2\|\|!players\.every\(p=>p\.is_ready\)/, "Client must require both players ready before starting");
assert.match(multiplayer, /room\.host_id===user\.id/, "Only the room host may start a match in the UI");
const privacy = source.get("privacy.html");
assert.doesNotMatch(privacy, /コレクション/, "Privacy policy must not describe the removed anime collection feature");

const recommend = source.get("recommend.html");
assert.ok(recommend.includes("media(search:$search,type:ANIME,isAdult:false"), "Favorite-work search must retrieve candidates before applying verified origin eligibility");
assert.ok(recommend.includes("media(type:ANIME,sort:$sort,isAdult:false)"), "Recommendation catalog query must retrieve candidates before applying verified origin eligibility");
assert.match(recommend, /countryOfOrigin!==.JP./, "Recommendation data must reject non-Japanese animation unless it meets the documented famous-Japanese-title exception");
assert.match(recommend, /popularity\s*\)\s*>=\s*10000/, "Foreign anime must meet the documented popularity threshold");
assert.match(recommend, /hasFamousJapaneseTitle\(media\)/, "Foreign anime must have a Japanese-language title");

const recommendOriginHelper = recommend.match(/function isJapaneseOriginAnime\(media\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(recommendOriginHelper, "Recommendation Japanese-origin verification helper missing");
const famousTitleHelper = recommend.match(/function hasFamousJapaneseTitle\(media\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(famousTitleHelper, "Japanese-title verification helper missing");
const isRecommendedOriginJapanese = vm.runInNewContext(famousTitleHelper + "\n" + recommendOriginHelper + "\nisJapaneseOriginAnime");
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
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "US", source: "ORIGINAL", popularity: 99999, title: { native: "English Only" } }), false, "Foreign anime without a Japanese title must be excluded");
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "US", source: "ORIGINAL", popularity: 9999, title: { native: "日本語タイトル" } }), false, "Foreign anime below the popularity threshold must be excluded");
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "US", source: "ORIGINAL", popularity: 10000, title: { native: "日本語タイトル" } }), true, "Popular foreign anime with a Japanese title must be eligible");
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "US", source: "ORIGINAL", popularity: 10000, synonyms: ["日本語の別名"] }), true, "A Japanese-language synonym may qualify a popular foreign anime");
assert.equal(isRecommendedOriginJapanese({ countryOfOrigin: "US", source: "ORIGINAL", popularity: 10000, title: { native: "English Only" } }), false, "Foreign anime with only non-Japanese titles must be excluded");

const questionBlock = recommend.match(/const questions=\[([\s\S]*?)\n\];/)?.[1];
assert.ok(questionBlock, "Recommendation question block not found");
const parsedQuestions = vm.runInNewContext("[" + questionBlock + "]");
const questionTitles = [...questionBlock.matchAll(/title:'([^']+)'/g)].map(match => match[1].trim());
const questionDimensions = [...questionBlock.matchAll(/dimension:'([^']+)'/g)].map(match => match[1].trim());
const expectedDimensions = ["genre", "protagonist_challenge", "pacing", "emotional_intensity", "setting", "duration", "character_appeal", "narrative_complexity", "release_era", "relationships", "romance_amount", "tone_balance", "story_structure", "visual_style", "sound_music", "stakes", "ending_preference", "theme_focus"];
assert.equal(questionTitles.length, 18, "Recommendation diagnosis must contain exactly eighteen distinct questions");
assert.equal(new Set(questionTitles).size, questionTitles.length, "Recommendation question titles must be unique");
assert.equal(questionDimensions.length, 18, "Every recommendation question must declare a dimension");
assert.equal(new Set(questionDimensions).size, questionDimensions.length, "Recommendation question dimensions must be unique");
assert.deepEqual(questionDimensions, expectedDimensions, "Recommendation questions must preserve all eighteen distinct preference dimensions");
assert.equal(parsedQuestions.length, 18, "The parsed recommendation question set must contain eighteen questions");
assert.ok(parsedQuestions.every(question => question.options.length === 4), "Every recommendation question must have four choices");
const recommendationLabels = parsedQuestions.flatMap(question => question.options.map(option => option.label));
assert.equal(recommendationLabels.length, 72, "Each of the eighteen recommendation questions must have four options");
assert.equal(new Set(recommendationLabels).size, recommendationLabels.length, "Recommendation option labels must not be duplicated across questions");
assert.ok(recommendationLabels.every(label => Array.from(label).length <= 30), "Recommendation choices must stay short and easy to scan");
assert.match(questionBlock, /help:'[^']+'/g, "Recommendation questions must include simple guidance");
const questionByDimension = new Map(parsedQuestions.map(question => [question.dimension, question]));
const tagsFor = dimension => new Set(questionByDimension.get(dimension).options.flatMap(option => option.tags || []));
assert.ok(questionByDimension.get("setting").options.every(option => !option.genres?.length), "Setting preferences must not duplicate genre scoring");
assert.ok(questionByDimension.get("narrative_complexity").options.every(option => !option.genres?.length && !option.avoidGenres?.length), "Narrative complexity must not double-count the genre preference axis");
assert.ok(questionByDimension.get("relationships").options.every(option => !option.genres?.includes("Romance") && !option.tags?.includes("Love Triangle")), "Non-romantic relationship preferences must remain separate from romance amount");
assert.ok([...tagsFor("ending_preference")].every(tag => !tagsFor("emotional_intensity").has(tag)), "Viewing emotions and ending aftertaste must use distinct tag signals");
assert.ok(questionByDimension.get("pacing").options.every(option => !option.genres?.length), "Pacing must not be scored as a genre preference");
assert.ok(questionByDimension.get("story_structure").options.some(option => option.tagWeights?.Episodic > 0), "Story structure must use its own episodic signal");
assert.ok(questionByDimension.get("tone_balance").options.some(option => option.genreWeights?.Comedy > 0) && questionByDimension.get("tone_balance").options.some(option => option.genreWeights?.Drama > 0), "Comedy-serious balance must use dedicated weights");
assert.ok(questionByDimension.get("protagonist_challenge").options.every(option => !["Mystery", "Conspiracy", "World Building", "Ensemble Cast"].some(tag => option.tags?.includes(tag))), "Protagonist goals must not duplicate complexity and ensemble signals");
assert.match(recommend, /new Set\(q\.options\.map\(o=>o\.label\.trim\(\)\)\)\.size!==q\.options\.length/, "Runtime duplicate-option guard missing");
assert.match(recommend, /new Set\(allQuestionTitles\)\.size!==questions\.length/, "Runtime duplicate-question-title guard missing");
assert.match(recommend, /new Set\(allQuestionDimensions\)\.size!==questions\.length/, "Runtime duplicate-dimension guard missing");
assert.match(recommend, /new Set\(allQuestionLabels\)\.size!==allQuestionLabels\.length/, "Runtime duplicate-option-label guard missing");
assert.match(recommend, /const FIXED_QUESTION_COUNT=18;/, "The recommendation diagnosis must remain fixed at eighteen questions");
assert.match(recommend, /if\(questions\.length!==FIXED_QUESTION_COUNT\)/, "Runtime fixed-question-count guard missing");
assert.equal(parsedQuestions.length, 18, "Recommendation diagnosis must remain exactly eighteen questions");
const complexityQuestion = questionBlock.match(/\{dimension:\'narrative_complexity\'[\s\S]*?\n\]\}/)?.[0] || "";
assert.ok(complexityQuestion, "Narrative complexity question must exist");
assert.doesNotMatch(complexityQuestion, /genres:|avoidGenres:/, "Narrative complexity must not double-count the genre preference axis");
assert.match(recommend, /const state=\{v:8,a:answers,/, "New recommendation share links must use version 8");
assert.match(recommend, /const SAVE_KEY='aqw-recommendation-v8'/, "New local diagnosis saves must use version 8");
assert.match(recommend, /const PREVIOUS_SAVE_KEY='aqw-recommendation-v7'/, "Previous version 7 local saves must remain readable");
assert.match(recommend, /const LEGACY_SAVE_KEY='aqw-recommendation-v2'/, "Legacy version 2 local diagnosis data must remain readable");
assert.match(recommend, /safeStorage\.removeItem\(PREVIOUS_SAVE_KEY\)/, "Clearing diagnosis data must remove the previous save");
assert.match(recommend, /safeStorage\.removeItem\(LEGACY_SAVE_KEY\)/, "Clearing diagnosis data must remove the legacy save");
const legacyValidatorSource = recommend.match(/function areValidLegacyAnswers\(values\)\{[\s\S]*?\n\}/)?.[0];
const legacySevenMapperSource = recommend.match(/function mapLegacySevenAnswersToThirteen\(values\)\{[\s\S]*?\n\}/)?.[0];
const legacyThirteenMapperSource = recommend.match(/function mapLegacyThirteenAnswers\(values\)\{[\s\S]*?\n\}/)?.[0];
const versionFourMapperSource = recommend.match(/function mapVersionFourAnswersToThirteen\(values\)\{[\s\S]*?\n\}/)?.[0];
const shareNormalizerSource = recommend.match(/function normalizeSharedAnswers\(state\)\{[\s\S]*?\n\}/)?.[0];
const savedNormalizerSource = recommend.match(/function normalizeSavedAnswers\(data\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(legacyValidatorSource && legacySevenMapperSource && legacyThirteenMapperSource && versionFourMapperSource && shareNormalizerSource && savedNormalizerSource, "Versioned diagnosis migration helpers must exist");
const migrationSource = [legacyValidatorSource, legacySevenMapperSource, legacyThirteenMapperSource, versionFourMapperSource, shareNormalizerSource, savedNormalizerSource].join("\n");
const migrationHelpers = vm.runInNewContext(migrationSource + "\n({ normalizeSharedAnswers, normalizeSavedAnswers })", { questions: parsedQuestions });
const legacySevenAnswers = [0, 1, 2, 3, 0, 1, 2];
const migratedSevenAnswers = [0, null, 1, 2, null, 3, 1, 1, null, null, 2, null, null, null, null, null, null, null];
const currentAnswers = Array.from({ length: 18 }, (_, index) => index % 4);
assert.deepEqual([...migrationHelpers.normalizeSharedAnswers({ v: 8, a: currentAnswers })], currentAnswers, "Version 8 share links must restore all eighteen answers");
assert.deepEqual([...migrationHelpers.normalizeSavedAnswers({ v: 8, answers: currentAnswers })], currentAnswers, "Version 8 local saves must restore all eighteen answers");
const migratedV7 = Array(18).fill(0); [8, 15, 17].forEach(index => migratedV7[index] = null);
assert.deepEqual([...migrationHelpers.normalizeSharedAnswers({ v: 7, a: Array(18).fill(0) })], migratedV7, "Version 7 share links must re-ask newly introduced preference dimensions");
assert.deepEqual([...migrationHelpers.normalizeSavedAnswers({ v: 7, answers: Array(18).fill(0) })], migratedV7, "Version 7 local saves must re-ask newly introduced preference dimensions");
assert.deepEqual([...migrationHelpers.normalizeSharedAnswers({ v: 5, a: Array(13).fill(0) })], [...Array(13).fill(0), ...Array(5).fill(null)], "Version 5 share links must migrate thirteen answers into the eighteen-question structure");
assert.deepEqual([...migrationHelpers.normalizeSharedAnswers({ v: 3, a: legacySevenAnswers })], migratedSevenAnswers, "Version 3 seven-question share links must map into the eighteen-question structure");
assert.deepEqual([...migrationHelpers.normalizeSavedAnswers({ v: 2, answers: legacySevenAnswers })], migratedSevenAnswers, "Legacy seven-answer local saves must map into the eighteen-question structure");
const legacy13Answers = [0, 1, 2, 3, 0, 1, 2, 3, 0, 3, 2, 1, 0];
const migratedLegacy13 = [0, 1, 2, 3, 0, 1, 2, 3, 0, null, 2, 1, 0, null, null, null, null, null];
assert.deepEqual([...migrationHelpers.normalizeSharedAnswers({ v: 2, a: legacy13Answers })], migratedLegacy13, "Legacy version 2 romantic relationship answer must be re-asked instead of misread");
assert.deepEqual([...migrationHelpers.normalizeSavedAnswers({ v: 2, answers: legacy13Answers })], migratedLegacy13, "Legacy local romantic relationship answer must be re-asked instead of misread");
const previousV4Answers = Array(13).fill(0);
const migratedV4Answers = [0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, null, null, null, null, null];
assert.deepEqual([...migrationHelpers.normalizeSharedAnswers({ v: 4, a: previousV4Answers })], migratedV4Answers, "Version 4 share links must map to the eighteen-question structure");
assert.deepEqual([...migrationHelpers.normalizeSavedAnswers({ v: 4, answers: previousV4Answers })], migratedV4Answers, "Version 4 local saves must map to the eighteen-question structure");
assert.deepEqual([...migrationHelpers.normalizeSharedAnswers({ v: 2, a: [0, 1, 2, 3, 0, 1] })], [0, 1, 2, 3, 0, 1, ...Array(12).fill(null)], "Legacy six-answer share links must preserve their saved prefix");
assert.deepEqual([...migrationHelpers.normalizeSharedAnswers({ v: 2, a: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1] })], [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, ...Array(8).fill(null)], "Legacy ten-answer share links must preserve their saved prefix");
assert.deepEqual([...migrationHelpers.normalizeSavedAnswers({ v: 1, answers: [0, 1, 2, 3, 0, 1] })], [0, 1, 2, 3, 0, 1, ...Array(12).fill(null)], "Older partial local saves must preserve their saved prefix");
assert.equal(migrationHelpers.normalizeSharedAnswers({ v: 3, a: [0, 1, 2, 3, 0, 1] }), null, "Incomplete version 3 share links must be rejected");
assert.equal(migrationHelpers.normalizeSharedAnswers({ v: 5, a: [0, 1, 2, 3, 0, 1, 2] }), null, "Version 5 share links must contain thirteen answers");
assert.equal(migrationHelpers.normalizeSharedAnswers({ v: 5, a: [0, 1, 2, 3, 0, 1, 4, 0, 0, 0, 0, 0, 0] }), null, "Out-of-range shared answers must be rejected");
assert.equal(migrationHelpers.normalizeSavedAnswers({ v: 2, answers: [0, 1, 2, 3, 4, 1, 2] }), null, "Out-of-range legacy local answers must be rejected");
assert.doesNotMatch(questionBlock, /NDCG|IDF|重み付け|希少性/, "Technical recommendation terms must not appear in user-facing questions");
const tagNameMapBodies = [...recommend.matchAll(/const tagNames=\{([^}]*)\};/g)].map(match => match[1]);
assert.equal(tagNameMapBodies.length, 2, "Recommendation tag-name maps must exist in both scoring and profile rendering");
for (const body of tagNameMapBodies) {
  const tagKeys = [...body.matchAll(/(?:^|,)'([^']+)':/g)].map(match => match[1]);
  assert.equal(new Set(tagKeys).size, tagKeys.length, "Recommendation tag-name maps must not contain duplicate keys");
}
const clearDiagnosisSource = recommend.match(/function clearSavedDiagnosis\(\)\{[\s\S]*?\n\}/)?.[0] || "";
assert.equal((clearDiagnosisSource.match(/safeStorage\.removeItem\(LEGACY_SAVE_KEY\)/g) || []).length, 1, "Legacy local diagnosis data must be cleared exactly once");
assert.equal((clearDiagnosisSource.match(/safeStorage\.removeItem\(PREVIOUS_SAVE_KEY\)/g) || []).length, 1, "Previous local diagnosis data must be cleared exactly once");
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
assert.match(recommend, /function buildRecommendationDataWarnings\(failedPages,totalPages,cappedSorts\)/, "Partial recommendation data warning helper missing");
assert.match(recommend, /report\.dataWarnings\?\.length/, "Partial recommendation data warning must be shown to users");
assert.match(recommend, /buildRecommendationDataWarnings\(failedPages,totalPages,cappedSorts\)/, "Recommendation fetch failures and page caps must be reflected in the result report");
const relationAllowlist = recommend.match(/const relatedTypes=new Set\(\[([^\]]+)\]\)/)?.[1] || "";
assert.match(relationAllowlist, /PREQUEL.*SEQUEL.*SUMMARY.*ALTERNATIVE.*COMPILATION/, "Recommendation deduplication must cover series and alternate/summary relations");
assert.doesNotMatch(relationAllowlist, /PARENT/, "A side story parent relation must not hide a distinct side story");
assert.match(recommend, /独立したサイドストーリーは親作品と別候補として残す/, "Side-story separation regression test missing");

const syncScript = fs.readFileSync("scripts/sync-anime-catalog.mjs", "utf8");
const syncWorkflow = fs.readFileSync(".github/workflows/sync-anime-catalog.yml", "utf8");
assert.match(syncScript, /function isJapaneseOriginAnime\(anime\)/, "Shared catalogue sync must verify Japanese source origin");
const syncOriginHelper = syncScript.match(/function isJapaneseOriginAnime\(anime\)\s*\{[\s\S]*?\n\}/)?.[0];
const syncJapaneseTitleHelper = syncScript.match(/function hasJapaneseTitle\(anime\)\s*\{[\s\S]*?\n\}/)?.[0];
assert.ok(syncOriginHelper && syncJapaneseTitleHelper, "Shared catalogue origin helpers must be extractable for regression tests");
const originResults = vm.runInNewContext(`(()=>{${syncJapaneseTitleHelper};${syncOriginHelper};const check=isJapaneseOriginAnime;return [
  check({ countryOfOrigin: "JP", source: "ORIGINAL" }),
  check({ countryOfOrigin: "JP", originVerified: true }),
  check({ countryOfOrigin: "JP", source: "ANIME", relations: { edges: [{ relationType: "SOURCE", node: { type: "ANIME", countryOfOrigin: "JP", format: "TV" } }] } }),
  check({ countryOfOrigin: "JP", source: "ANIME", relations: { edges: [{ relationType: "SOURCE", node: { type: "ANIME", countryOfOrigin: "US", format: "TV" } }] } }),
  check({ countryOfOrigin: "JP", source: "VIDEO_GAME", relations: [] }),
  check({ countryOfOrigin: "US", popularity: 10000, title: { native: "日本語タイトル" } }),
  check({ countryOfOrigin: "US", popularity: 9999, title: { native: "日本語タイトル" } }),
  check({ countryOfOrigin: "US", popularity: 10000, title: { native: "English Only" } })
]})()`);
assert.equal(JSON.stringify(originResults), JSON.stringify([true, true, true, false, false, true, false, false]), "Shared catalogue origin eligibility must pass Japanese works and only popular foreign works with Japanese titles");
assert.match(syncScript, /startDate_greater/, "The shared catalogue must split oversized format scopes by release decade");

assert.match(syncScript, /if \(anime\.countryOfOrigin !== 'JP'\) return Number\(anime\.popularity\) >= 10000 && hasJapaneseTitle\(anime\)/, "Foreign catalogue entries must pass both the popularity and Japanese-title requirements");
assert.match(syncScript, /isAdult:false/, "Shared catalogue sync must exclude adult catalogue entries");
assert.match(syncScript, /const OVERFLOW_SORTS = \['SCORE_DESC', 'FAVOURITES_DESC', 'TRENDING_DESC', 'START_DATE_DESC'\]/, "Shared catalogue sync must cover AniList pagination overflow");
assert.ok(syncWorkflow.includes("cron: '0 */6 * * *'"), "Shared catalogue sync must run incremental discovery every six hours");
assert.ok(syncScript.includes("const incremental = process.env.AQW_FULL_CATALOG !== 'true'"), "Shared catalogue sync must preserve the existing catalogue during incremental runs");
assert.ok(syncScript.includes("if (appendOnly && addedThisBatch === 0) return false"), "Incremental discovery must stop after reaching existing catalogue records");
assert.match(syncWorkflow, /workflow_dispatch:/, "Shared catalogue sync must support manual runs");
assert.match(syncWorkflow, /contents: write/, "Shared catalogue sync must be able to publish the generated dataset");

const index = source.get("index.html");
assert.doesNotMatch(index, /id="collection(?:Heading)?"/, "The anime collection display must be removed");
assert.doesNotMatch(index, /rememberAnime|safeStorage\.(?:getItem|setItem)\([\'"]aqw-collection[\'"]/, "Quiz answers must not create or load a per-user anime collection");
assert.match(index, /safeStorage\.removeItem\('aqw-collection'\)/, "Legacy per-user anime collection data must be removed on page load");
assert.match(index, /\[t\.fifty,runs>=50\]/, "The 50-play achievement must not depend on a stored anime collection");
assert.ok(index.includes("media(type:ANIME,sort:"), "Quiz catalogue queries must retrieve candidates before applying source eligibility");
assert.ok(index.includes("countryOfOrigin source(version:2) relations"), "Quiz catalogue records must include source-country verification metadata");
assert.ok(index.includes("format popularity title { romaji english native }"), "Quiz catalogue records must include popularity and title evidence");
assert.ok(index.includes("synonyms coverImage"), "Quiz catalogue records must include alternate titles for Japanese-title verification");
assert.match(index, /countryOfOrigin!==.JP./, "Quiz data must apply the documented foreign-title exception only to non-Japanese production countries");
const indexOriginHelper = index.match(/function isJapaneseOriginAnime\(a\)\{[\s\S]*?\n\}/)?.[0];
const indexFamousTitleHelper = index.match(/function hasFamousJapaneseTitle\(a\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(indexOriginHelper && indexFamousTitleHelper, "Quiz Japanese-origin and Japanese-title verification helpers must exist");
const isQuizOriginJapanese = vm.runInNewContext(indexFamousTitleHelper + "\n" + indexOriginHelper + "\nisJapaneseOriginAnime");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "ORIGINAL" }), true, "Japanese original anime must remain eligible in the quiz");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", originVerified: true }), true, "Compact shared-catalogue entries must pass the verified-origin marker");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "US", originVerified: true }), false, "The verified-origin marker must never override a non-Japanese country");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "US", source: "ORIGINAL", popularity: 10000, title: { native: "日本語タイトル" } }), true, "Popular foreign anime with a Japanese-language title must be eligible in the quiz");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "US", source: "ORIGINAL", popularity: 9999, title: { native: "日本語タイトル" } }), false, "Foreign anime below the popularity threshold must be excluded from the quiz");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "US", source: "ORIGINAL", popularity: 10000, title: { native: "English Only" } }), false, "Foreign anime without a Japanese-language title must be excluded from the quiz");
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
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "OTHER", relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA" } }] } }), true, "OTHER source metadata must qualify only when a Japanese manga relation is explicitly verified");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "UNRECOGNIZED_SOURCE", relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "JP", format: "MANGA" } }] } }), false, "Unrecognized source types must fail closed in the quiz");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "MANGA", relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "JP", format: "NOVEL" } }] } }), false, "Manga source must match manga format in the quiz");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "JP", source: "MANGA", relations: { edges: [{ relationType: "ADAPTATION", node: { type: "MANGA", countryOfOrigin: "KR", format: "MANGA" } }] } }), false, "Non-Japanese source adaptations must be excluded from the quiz");
assert.equal(isQuizOriginJapanese({ countryOfOrigin: "US", source: "ORIGINAL" }), false, "Non-Japanese animation must be excluded from the quiz");
assert.match(index, /async function fetchSharedAnimeCatalog\(\)/, "The quiz must load the shared catalogue");

// The exact shared character-choice builder is asserted below.
assert.match(index, /if\(mode===\'characterImage\'\)return characterRecordsWithFourChoicesForAnime\(a,summary,false\)\.length>0/, "Character-image question eligibility must validate four distinct character portraits");
assert.match(index, /shuffle\(characterRecordsWithFourChoicesForAnime\(a,questionChoiceSummary\(\),true\)\)/, "Character-name-to-image questions must choose from records with four distinct portraits");
// The four requested question formats are text/data driven and must not depend on cover-image loading.

assert.match(index, /function availableQuestionModes\(a,format=/, "Mixed mode must derive the available question types for each anime");
const modeSelectMarkup = index.match(/<select id="modeSelect">([\s\S]*?)<\/select>/)?.[1] || "";
for (const mode of ["synopsis", "titleYear", "synonym", "titleStudio"]) {
  assert.ok(modeSelectMarkup.includes('value="' + mode + '"'), "The four requested question formats must remain selectable: " + mode);
}
assert.doesNotMatch(modeSelectMarkup, /value="(?:image|character|characterImage|characterNameImage|titleCharacter)"/, "Unrequested legacy question formats must not appear in the selector");
assert.match(index, /const modes=\[\];\s*if\(titleUsable\(a\)&&a\?\.studios\?\.nodes\?\.\[0\]\?\.name\)modes\.push\('titleStudio'\)/, "Mixed mode must use only the four requested question formats");
assert.match(index, /const hasQuestion=mode===\'mixed\'\s*\?availableQuestionModes\(anime,format\)\.length>0/, "Cached candidate building must accept mixed-mode anime with at least one valid question type");
assert.match(index, /mode===\'mixed\'\?items\.filter\(a=>isUsableAnime\(a\)&&titleUsable\(a\)&&availableQuestionModes\(a,format\)\.length>0\)/, "Background loading in mixed mode must use the same per-anime question-type eligibility");
assert.ok(index.includes("let modesForFormat=availableQuestionModes(a,$('#answerFormatSelect').value)"), "Question rendering must use the same available-mode calculation");

assert.match(index, /function studioChoiceRecordsForAnime\(a\)/, "Studio question eligibility and generation must share the same studio candidate builder");
assert.match(index, /function hasFourDistinctStudioChoices\(a\)\{return studioChoiceRecordsForAnime\(a\)\.length>=4\}/, "Studio question eligibility must validate the exact generated options");
assert.match(index, /function makeStudioOptions\(a\)/, "Studio question generation must use the shared studio candidate builder");
assert.match(index, /function yearChoiceRecordsForAnime\(a\)/, "Year question eligibility and generation must share the same year candidate builder");
assert.match(index, /if\(mode===\'titleYear\'\)return yearChoiceRecordsForAnime\(a\)\.length>=4/, "Year question eligibility must validate the exact generated year options");
assert.match(index, /function makeYearOptions\(a\)\{const records=yearChoiceRecordsForAnime\(a\),correct=String\(animeYear\(a\)\);return records\.some\(record=>record\.value===correct\)\?\[\{label:correct,value:correct\},\.\.\.shuffle\(records\.filter\(record=>record\.value!==correct\)\)\.slice\(0,3\)\]:\[\]\}/, "Year question generation must always include the correct year alongside three distinct distractors");
assert.match(index, /if\(actualMode===\'titleStudio\'\)\{prompt=titleOf\(a\)\+qText\(\'titleStudio\'\);correct=String\(a\.studios\?\.nodes\?\.\[0\]\?\.name\|\|\'\'\);opts=makeStudioOptions\(a\)/, "Title-to-studio generation must use the shared validated studio options");
assert.match(index, /function titleChoiceRecordsForAnime\(a\)/, "Title-based question eligibility and generation must share the same alias-safe option builder");
assert.match(index, /function hasFourDistinctTitleChoices\(anime,summary=questionChoiceSummary\(\)\)\{return titleChoiceRecordsForAnime\(anime\)\.length>=4\}/, "Title-based question eligibility must count the exact generated title options");
assert.match(index, /function makeTitleOptions\(a\)\{const records=titleChoiceRecordsForAnime\(a\);if\(!records\.length\)return \[\];const correctKey=normalizeAnswer\(titleOf\(a\)\);const correct=records\.find\(record=>normalizeAnswer\(record\.value\)===correctKey\);const distractors=shuffle\(records\.filter\(record=>normalizeAnswer\(record\.value\)!==correctKey\)\);return correct\?\[correct,\.\.\.distractors\.slice\(0,3\)\]:shuffle\(records\)\.slice\(0,4\)\}/, "Title-based question generation must retain the correct answer and randomize distractors");
const randomIntSource = index.match(/function randomInt\(maxExclusive\)\{[^\n]*\}/)?.[0];
const shuffleSource = index.match(/function shuffle\(a\)\{[^\n]*\}/)?.[0];
assert.ok(randomIntSource && shuffleSource, "Quiz randomization helpers must exist");
let randomSeed = 0x12345678;
const deterministicMath = Object.create(Math);
deterministicMath.random = () => {
  randomSeed = (1664525 * randomSeed + 1013904223) >>> 0;
  return randomSeed / 0x100000000;
};
const { shuffle: testedShuffle } = vm.runInNewContext(
  ` ${randomIntSource}; ${shuffleSource}; ({ shuffle }) `,
  { Math: deterministicMath }
);
const answerPositions = [0, 0, 0, 0];
const permutationCounts = new Map();
for (let sample = 0; sample < 20000; sample++) {
  const shuffled = testedShuffle(["correct", "A", "B", "C"]);
  assert.equal(new Set(shuffled).size, 4, "Randomized answer choices must not contain duplicates");
  assert.deepEqual([...shuffled].sort(), ["A", "B", "C", "correct"], "Randomized answer choices must preserve all options");
  answerPositions[shuffled.indexOf("correct")]++;
  const key = shuffled.join("|");
  permutationCounts.set(key, (permutationCounts.get(key) || 0) + 1);
}
assert.ok(answerPositions.every(count => count >= 4500 && count <= 5500), `Correct answer position distribution is unexpectedly biased: ${answerPositions.join(", ")}`);
assert.equal(permutationCounts.size, 24, "All 24 answer-choice permutations must be reachable");

assert.match(index, /function characterChoiceRecordsForAnime\(anime,correctRecord,imageAnswers=false\)/, "Character image question eligibility and generation must share the exact four-choice builder");
assert.match(index, /function characterRecordsWithFourChoicesForAnime\(anime,summary=questionChoiceSummary\(\),imageAnswers=false\)\{return uniqueCharacterRecordsForAnime\(anime,summary\)\.filter\(record=>characterChoiceRecordsForAnime\(anime,record,imageAnswers\)\.length===4\)\}/, "Character image questions must only use records that produce exactly four unique name or image choices");
assert.match(index, /seenImages=new Set\(imageAnswers&&excludeImage\?\[String\(excludeImage\)\]:\[\]\)/, 'Character image answers must reject duplicate image URLs including the correct answer image');
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
const sharedCatalogLoader=index.slice(index.indexOf("async function fetchSharedAnimeCatalog"),index.indexOf("async function fetchAnime"));
assert.ok(sharedCatalogLoader.includes("cache:'no-cache'"), "The shared catalogue should revalidate cached responses so new catalogue versions become visible after deployment");
assert.ok(!sharedCatalogLoader.includes("cache:'reload'")&&!sharedCatalogLoader.includes("cache:'no-store'"), "Shared catalogue requests should retain conditional HTTP caching rather than bypassing the cache");
assert.match(index, /payload\?\.schemaVersion!==2/, "The quiz must require the compact shared-catalogue schema");
assert.ok(syncScript.includes("const { source, relations, ...compact } = dedupeAnimeMetadata(anime)"), "The published catalogue must deduplicate metadata and omit bulky source-relation details after verification");
assert.ok(syncScript.includes("export function dedupeAnimeMetadata(anime)"), "Catalogue synchronization must deduplicate synonym and character metadata");
assert.match(syncScript, /catalogueEligible: true/, "The published catalogue must mark every accepted record as catalogue-eligible");
assert.match(syncScript, /originVerified: compact\.countryOfOrigin === 'JP'/, "Only Japanese-origin records may carry the Japanese-origin verification marker");
assert.match(syncScript, /POPULARITY_DESC.*true, 20/, "The catalogue must include a bounded popularity scan for famous foreign works with Japanese titles");
assert.match(syncScript, /const initialRecordCount = records\.size/, "Catalogue sync must retain the starting record count for accurate incremental summaries");
assert.match(syncScript, /New unique records: .*items\.length - initialRecordCount/, "Catalogue sync must distinguish new IDs from refreshed existing records");
assert.match(syncScript, /if \(anime\.countryOfOrigin !== 'JP'\)\s*return Number\(anime\.popularity\) >= 10000 && hasJapaneseTitle\(anime\)/, "Foreign catalogue entries must require both a Japanese-language title and the popularity threshold");
assert.match(index, /new URL\('data\/anime-catalog\.json',document\.baseURI\)/, "The shared catalogue must resolve correctly from GitHub Pages subpaths");
assert.match(index, /const sharedCatalogPromise=fetchSharedAnimeCatalog\(\)/, "Shared catalogue loading must start independently of the local cache");
assert.match(index, /sharedCatalogPromise\.then\(items=>\(\{timedOut:false,items\}\)\)/, "The quiz must merge shared catalogue entries when the asynchronous load completes");
assert.match(index, /if\(sharedCatalogActive\)\{[\s\S]*?pool=initial;[\s\S]*?Fetching additional records\./, "A shared catalogue must be used immediately while additional anime are fetched in the background");
assert.match(index, /if\(!backgroundLoadPromise&&!sharedCatalogActive\)\{\s*backgroundLoadPromise=\(async\(\)=>/, "The quiz must not repeat the expensive AniList backfill when the complete shared catalogue is already active");
assert.match(index, /sharedCatalogActive\?\(/, "The loading screen must distinguish the shared catalogue from local background backfill");
assert.match(index, /const cacheKey='aqw-anime-pool-v22-compact-shared-catalog'/, "Verified original-source eligibility must rebuild the browser catalogue");
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
assert.match(index, /function hasUsableImageUrl\(value\)\{[^\n]*no\[-_ \]\?image/i, "NO IMAGE placeholders must be excluded from all image displays");
assert.match(index, /function isUsableAnime\(a\)\{[^\n]*hasUsableImageUrl\(titleImage\)/, "Anime without a usable cover image must be excluded from image-backed displays and quiz data");
assert.match(index, /function titleImageIsSafe\(anime\)\{[^\n]*return hasUsableImageUrl\(image\)/, "Valid non-placeholder cover images must be eligible for title-identification image questions without an OCR audit");
assert.match(index, /const candidates=shuffle\(uniqueAnimeById\(source\)\.filter\(a=>isUsableAnime\(a\)\)\)\.slice\(0,8\)/, "Featured artwork must restore usable images, exclude placeholders and cap the animated rail at eight cards");
assert.match(index, /animation:featured-scroll 80s linear infinite/, "Featured anime images must scroll 25 percent faster than the previous 100-second cycle");
assert.match(index, /animation-duration:88s/, "Reverse featured anime image rail must preserve the same 25-percent speed increase");
const imageUrlHelperSource=index.match(/function hasUsableImageUrl\(value\)\{[^\n]*\}/)?.[0];
assert.ok(imageUrlHelperSource, "Usable-image URL validator must exist");
const hasUsableImageUrl=vm.runInNewContext('('+imageUrlHelperSource+')',{failedImageUrls:new Set()});
assert.equal(hasUsableImageUrl('NO IMAGE'),false,"Literal NO IMAGE placeholder must be rejected");
assert.equal(hasUsableImageUrl('https://example.test/no-image.jpg'),false,"NO IMAGE URL must be rejected");
assert.equal(hasUsableImageUrl('https://example.test/placeholder.png'),false,"Placeholder URL must be rejected");
assert.equal(hasUsableImageUrl('https://example.test/cover.jpg'),true,"Valid artwork URL must remain usable");
const titleImageSafetySource=index.match(/function titleImageIsSafe\(anime\)\{[^\n]*\}/)?.[0];
assert.ok(titleImageSafetySource, "Title-identification image safety validator must exist");
const titleImageIsSafe=vm.runInNewContext('('+titleImageSafetySource+')',{hasUsableImageUrl});
assert.equal(titleImageIsSafe({coverImage:{large:'https://example.test/cover.jpg'}}),true,"Valid artwork must be allowed without OCR approval");
assert.equal(titleImageIsSafe({coverImage:{large:'https://example.test/no-image.jpg'}}),false,"NO IMAGE placeholders must remain excluded from title-identification questions");


assert.match(index, /source\(version:2\) relations \{ edges \{ relationType node \{ id type countryOfOrigin format \} \} \}/, "Featured seasonal queries must include source and related-origin metadata");
assert.ok(index.includes("season seasonYear startDate { year month day }"), "Featured seasonal queries must include season and start-date metadata");
assert.ok(index.includes("if(!isJapaneseOriginAnime(anime)||!Number.isFinite(Number(anime.id)))continue"), "New seasonal anime must pass verified Japanese-source filtering");
assert.match(index, /for\(const anime of items\|\|\[\]\)\{\s*if\(!isJapaneseOriginAnime\(anime\)\|\|!Number\.isFinite\(Number\(anime\.id\)\)\)continue;/, "All seasonal anime results must pass verified Japanese-source filtering before rendering");

assert.match(index, /function isJapaneseOriginAnime\(a\)\{[\s\S]*?a\.countryOfOrigin!==.JP./, "Japanese-origin eligibility must apply the documented exception only to foreign productions");
assert.match(index, /const cleanedItems=value\.items\.filter\(isUsableAnime\)/, "Existing IndexedDB catalogues must be purged of non-Japanese-origin anime when loaded");
assert.match(index, /initial=legacy\.items\.filter\(isUsableAnime\)/, "Existing localStorage catalogues must be filtered through current source and image eligibility when loaded");
assert.match(index, /if\(!isJapaneseOriginAnime\(anime\)\|\|!Number\.isFinite\(Number\(anime\.id\)\)\)continue/, "Featured anime rail must apply strict Japanese-source verification before rendering");
assert.match(index, /term\.normalize\('NFKC'\)/, "Community search input must be normalized before building PostgREST filters");
assert.match(index, /safeTerm\.length<2|\[\.\.\.safeTerm\]\.length<2/, "Community search must reject terms shorter than two searchable characters");
assert.match(index, /body\.textContent\s*=\s*post\.body/, "User-generated post text must be rendered with textContent");
assert.doesNotMatch(index, /innerHTML\s*=\s*[^;]*(?:post\.body|profile\.(?:username|display_name))/, "User-generated profile/post data must not be inserted with innerHTML");
const beginBlock = index.match(/async function begin\(\)\{([\s\S]*?)\n\}/)?.[1];
assert.ok(beginBlock, "Quiz begin function not found");
assert.match(beginBlock, /catch\(error\)\{[\s\S]*?clearInterval\(questionTimer\);clearInterval\(clockTimer\);clearTimeout\(autoNextTimer\)/, "Quiz start failure must stop timers");
assert.doesNotMatch(index, /pauseButton|pauseNotice|pause-controls|pausedQuestionSeconds|isPaused|pausedAt|totalPausedMs|toggleQuizPause|pauseButtonLabel/, "Removed quiz pause controls and state must not return");
assert.match(beginBlock, /\$\([\x27"]#quitQuizButton[\x27"]\)\.classList\.add\([\x27"]hidden[\x27"]\)/, "Quiz start failure must hide quit control");
assert.doesNotMatch(beginBlock, /await window\.aqwEnsureSupabaseFeatures|await aqwMeasurePreparationStage\('個人別難易度データ読み込み'/, "Optional Supabase and profile requests must not block the first quiz question");
assert.match(beginBlock, /Promise\.resolve\(\)\.then\(\(\)=>window\.aqwEnsureSupabaseFeatures\(\)\)/, "Optional Supabase initialization must continue in the background");

assert.match(index, /aliasAnimeOwners=new Map\(\)/, "Alias ownership must be tracked across the complete eligible anime pool");
assert.match(index, /if\(primaryKey\)\{[\s\S]*?for\(const alias of aliasKeys\)\{[\s\S]*?aliasAnimeOwners\.get\(alias\)\.add\(Number\(item\.id\)\)/, "Every anime record must contribute alias ownership, even when another record has the same primary title");
assert.match(index, /function uniqueAliasCandidates\(a,summary=questionChoiceSummary\(\)\)/, "Synonym questions must use globally unique aliases");
assert.match(index, /if\(mode===.synonym.\)return !!titleKey&&hasFourDistinctTitleChoices\(a,summary\)&&uniqueAliasCandidates\(a,summary\)\.length>0/, "Synonym question eligibility must reject aliases shared by multiple works");
assert.match(index, /const syn=shuffle\(uniqueAliasCandidates\(a\)\)\[0\]/, "Synonym question generation must choose from the same globally unique alias candidates");
const aliasHelper = index.match(/function uniqueAliasCandidates\(a,summary=questionChoiceSummary\(\)\)\{([\s\S]*?)\}function validAlias/)?.[1];
assert.ok(aliasHelper, "Unique alias helper not found");
const uniqueAliasCandidates = new Function("a", "summary", "aliasCandidates", "normalizeAnswer", `return (function(a,summary){${aliasHelper}})(a,summary)`);
const aliasOwnerFixture = { aliasAnimeOwners: new Map([["sharedalias", new Set([1,2])], ["privatealias", new Set([1])]]) };
const fixtureAnime = { id: 1 };
const aliasResults = uniqueAliasCandidates(fixtureAnime, aliasOwnerFixture, () => ["Shared Alias", "Private Alias"], value => String(value || "").normalize("NFKC").toLowerCase().replaceAll(" ", ""));
assert.deepEqual(aliasResults, ["Private Alias"], "Only aliases owned by exactly one anime may be used");


const questionModes = ["titleStudio", "titleYear", "synonym", "synopsis"];
const availabilityStart = index.indexOf("function availableQuestionModes(a,format=");
const validationStart = index.indexOf("function questionModeHasFourChoices(a,mode)");
const rendererStart = index.indexOf("function showQuestionInternal(preserveMode=false)");
const rendererEnd = index.indexOf("function answerModeLabel", rendererStart);
assert.ok(availabilityStart >= 0, "Question-mode availability helper missing");
assert.ok(validationStart >= 0, "Four-choice question-mode validation helper missing");
assert.ok(rendererStart >= 0 && rendererEnd > rendererStart, "Question renderer missing");
const modeAvailability = index.slice(availabilityStart, index.indexOf("\n}", availabilityStart) + 2);
const modeValidation = index.slice(validationStart, index.indexOf("\n}", validationStart) + 2);
const questionRenderer = index.slice(rendererStart, rendererEnd);
for (const mode of questionModes) {
  const availabilityMode = mode;
  assert.ok(modeAvailability.includes("'" + availabilityMode + "'"), `Question mode ${mode} must be considered by availability filtering`);
  const validationMode = mode;
  assert.ok(modeValidation.includes("mode==='" + validationMode + "'"), `Question mode ${mode} must have four-choice eligibility validation`);
  assert.ok(questionRenderer.includes("actualMode==='" + mode + "'"), `Question mode ${mode} must have a renderer`);
}
assert.ok(index.includes("if(mode==='image'&&!titleImageIsSafe(a))return false"), "Image questions must require an OCR-audited, title-free cover");
assert.ok(questionRenderer.includes("if(!typingOnly&&opts.length<4)throw new Error('Four unique answer choices could not be prepared.')"), "Choice questions must fail safely instead of displaying fewer than four choices");
assert.ok(index.includes("function normalizeAnswer(value){return String(value||'').normalize('NFKC')"), "Answer de-duplication must normalize full-width and compatibility characters");

// Regression coverage: quiz candidate eligibility must be chunked and share in-flight prewarm work.
assert.match(index, /async function getEligibleCandidatePoolAsync\(mode,format,ignoreDifficulty=false\)/, "Candidate eligibility must be prepared asynchronously");
assert.match(index, /seen=new Set\(\),chunkSize=24/, "Candidate eligibility must be processed in smaller bounded batches");
assert.match(index, /await new Promise\(resolve=>setTimeout\(resolve,0\)\)/, "Candidate preparation must yield to the browser between batches");
assert.match(index, /pending\.pool===sourcePool&&pending\.length===sourceLength&&pending\.revision===sourceRevision/, "In-flight candidate work must not be reused after catalogue or difficulty changes");
assert.match(index, /function scheduleEligibleCandidatePrewarm\(\)/, "Idle-time candidate prewarming must be available");
assert.match(index, /requestIdleCallback\(run,\{timeout:\d+\}\)/, "Candidate prewarming must use browser idle time with a bounded timeout when available");
const candidatePrewarmTimeout = Number(index.match(/requestIdleCallback\(run,\{timeout:(\d+)\}\)/)?.[1]);
assert.ok(Number.isFinite(candidatePrewarmTimeout) && candidatePrewarmTimeout <= 2000, "Candidate prewarming must begin within two seconds when the browser is busy");
assert.match(index, /else setTimeout\(run,100\)/, "Browsers without requestIdleCallback must still prewarm candidates promptly");
assert.match(index, /function hasAnyQuestionMode\(a,format=/, "Mixed mode must short-circuit once an eligible question type is found");
assert.match(index, /const candidates=\[\.\.\.\(cached\|\|sourcePool\)\]/, "Quiz start must sample from the ready cache or source catalogue without waiting for a full filtered catalogue");
assert.match(index, /for\(let i=0;i<candidates\.length&&eligible\.length<target;i\+\+\)/, "Initial quiz selection must stop as soon as the requested question count is reached");
assert.match(index, /const hasQuestion=mode==='mixed'\?hasAnyQuestionMode\(anime,format\)/, "Mixed-mode candidate selection must use the short-circuit eligibility helper");
assert.match(index, /eligibleCandidatePrewarmToken\+\+/, "Starting a quiz must cancel idle candidate prewarming");
assert.match(index, /if\(document\.body\.classList\.contains\('quiz-active'\)\)return \[\]/, "Background candidate prewarming must yield to an active quiz");

const titleChoiceBuilder = index.match(/function titleChoiceRecordsForAnime\(a\)\{[^\n]*\}/)?.[0];
assert.ok(titleChoiceBuilder, "Bounded title-choice builder must exist");
assert.match(titleChoiceBuilder, /offset<pool\.length&&records\.size<4/, "Title distractor selection must stop after four distinct choices");
assert.doesNotMatch(titleChoiceBuilder, /difficultyDistractors\(/, "Title distractor selection must not allocate a full-catalogue filtered array for every candidate");
const studioChoiceBuilder = index.match(/function studioChoiceRecordsForAnime\(a\)\{[^\n]*\}/)?.[0];
assert.ok(studioChoiceBuilder, "Bounded studio-choice builder must exist");
assert.match(studioChoiceBuilder, /distractors\.length<3/, "Studio distractor selection must stop after three alternatives");
assert.doesNotMatch(studioChoiceBuilder, /shuffle\(difficultyDistractors\(/, "Studio distractor selection must not shuffle the entire catalogue per candidate");
assert.match(index, /function yearChoiceRecordsForAnime\(a\)\{[^\n]*records\.length>=4/, "Year distractor selection must stop after four choices");
const synopsisChoiceBuilder = index.match(/function synopsisChoiceRecords\(a,answerIsTitle=false\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(synopsisChoiceBuilder, "Synopsis choice builder must exist");
assert.match(synopsisChoiceBuilder, /offset<candidates\.length&&options\.size<4/, "Synopsis distractor selection must stop after four choices");
assert.match(index, /if\(mode==='image'\)return[^;]+;if\(mode==='titleStudio'\)return[^;]+;const summary=questionChoiceSummary\(\)/, "Image and studio questions must avoid constructing unrelated global choice indexes");
assert.match(index, /if\(!\['image','titleStudio'\]\.includes\(mode\)\)await ensureQuestionChoiceSummaryAsync\(\)/, "Image and studio candidate preparation must skip the full-catalogue choice-index build");
assert.match(index, /\$\('#answerFormatSelect'\)\.addEventListener\('change',refreshCandidatePrewarm\)/, "Changing answer format must refresh candidate prewarming");

console.log(`Static security checks passed. Checked ${checkedScripts} inline script(s) across ${frontendFiles.length} pages.`);

// Regression coverage: character image choices require unique portrait URLs.

// Ensure this suite tracks the final image-aware validation implementation.
