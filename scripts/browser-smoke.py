#!/usr/bin/env python3
"""Deterministic browser smoke tests for the deployed Anime Quiz World UI.

The tests use a small fixture catalogue and a mocked AniList GraphQL response so
they exercise the real deployed HTML/JavaScript without depending on API quotas
or downloading the full production catalogue.
"""
import json
import os
import re
from datetime import datetime, timedelta, timezone
from urllib.request import Request, urlopen
from playwright.sync_api import sync_playwright

JST = timezone(timedelta(hours=9))
NOW_JST = datetime.now(JST)
SEASON_START_MONTH = ((NOW_JST.month - 1) // 3) * 3 + 1
SEASON_NAMES = ["WINTER", "SPRING", "SUMMER", "FALL"]
CURRENT_SEASON = SEASON_NAMES[(NOW_JST.month - 1) // 3]

BASE_URL = os.environ.get(
    "AQW_BASE_URL",
    "https://the-rascal-of-sakurasou.github.io/anime-quiz-world",
).rstrip("/")

GENRES = [
    ["Fantasy", "Adventure"], ["Action", "Fantasy"], ["Drama", "Mystery"],
    ["Comedy", "Fantasy"], ["Sci-Fi", "Adventure"], ["Drama", "Romance"],
]
TAGS = [
    ["Adventure", "World Building", "Magic", "Fast-Paced"],
    ["Detective", "Mystery", "Psychological", "Conspiracy"],
    ["Character Development", "Coming of Age", "Friendship", "Found Family"],
    ["Surprise Ending", "Bittersweet Ending", "Drama", "Fantasy"],
    ["School", "Comedy", "Romance", "Ensemble Cast"],
    ["Space", "Mecha", "Cyberpunk", "Quest"],
]


def make_anime(index):
    anime_id = 10000 + index
    # Keep every alias distinct: numbered titles such as "Anime 1" and
    # "Anime 10" overlap and are correctly rejected as ambiguous distractors.
    suffix = chr(65 + index)
    title = f"検証作品{suffix}"
    cover = f"https://example.test/cover-{index + 1}.svg"
    return {
        "id": anime_id,
        "countryOfOrigin": "JP",
        "source": "ORIGINAL",
        "isAdult": False,
        "format": "TV",
        "title": {
            "native": title,
            "english": f"Verification Anime {suffix}",
            "romaji": f"Verification Anime {suffix}",
        },
        "description": "これはブラウザ自動検査用の架空作品データです。物語と登場人物の情報を含みます。",
        "coverImage": {"large": cover, "medium": cover, "extraLarge": cover},
        "episodes": 12,
        "season": CURRENT_SEASON,
        "seasonYear": NOW_JST.year,
        "startDate": {"year": NOW_JST.year, "month": SEASON_START_MONTH, "day": 1},
        "averageScore": 70 + (index % 20),
        "popularity": 50000 - index * 1000,
        "genres": GENRES[index % len(GENRES)],
        "tags": [
            {"name": tag, "rank": 75 + (index % 20), "isMediaSpoiler": False}
            for tag in TAGS[index % len(TAGS)]
        ],
        "studios": {"nodes": [{"name": f"検証スタジオ{index % 5 + 1}"}]},
        "characters": {"nodes": []},
        "relations": {"edges": []},
        "siteUrl": f"https://anilist.co/anime/{anime_id}",
        "externalLinks": [
            {
                "url": f"https://example.test/official-{index + 1}",
                "site": "Official Site",
                "language": "Japanese",
                "isDisabled": False,
            }
        ],
    }


QUIZ_FIXTURES = [make_anime(i) for i in range(12)]
RECOMMENDATION_FIXTURES = [make_anime(i) for i in range(24)]
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, accept",
}


def install_routes(page):
    def catalogue(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"schemaVersion": 2, "items": QUIZ_FIXTURES}, ensure_ascii=False),
        )

    def image(route):
        route.fulfill(
            status=200,
            content_type="image/svg+xml",
            body='<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180"><rect width="120" height="180" fill="#ddd"/></svg>',
        )

    def graphql(route):
        if route.request.method == "OPTIONS":
            route.fulfill(status=204, headers=CORS_HEADERS)
            return
        payload = route.request.post_data_json or {}
        query = payload.get("query", "")
        aliases = re.findall(r"([A-Za-z][A-Za-z0-9_]*)\s*:\s*Page\s*\(", query)
        if aliases:
            data = {
                alias: {"pageInfo": {"hasNextPage": False}, "media": []}
                for alias in aliases
            }
        else:
            data = {
                "Page": {
                    "pageInfo": {"hasNextPage": False, "totalPages": 1},
                    "media": RECOMMENDATION_FIXTURES,
                }
            }
        route.fulfill(
            status=200,
            headers={**CORS_HEADERS, "Content-Type": "application/json"},
            body=json.dumps({"data": data}, ensure_ascii=False),
        )

    page.route("**/data/anime-catalog.json", catalogue)
    page.route(
        "**/data/title-image-exclusions.json",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({
                "schemaVersion": 1,
                "generatedAt": None,
                "source": "browser-smoke-test",
                "catalogCount": 0,
                "checkedCount": 0,
                "excludedCount": 0,
                "excludedIds": [],
                # These synthetic SVG fixtures contain no lettering, so mark
                # them as OCR-audited clean images for the isolated browser test.
                "records": [
                    {"id": anime["id"], "hasText": False, "hasTitleText": False}
                    for anime in QUIZ_FIXTURES
                ],
            }),
        ),
    )
    page.route(re.compile(r"^https://graphql\.anilist\.co/?$"), graphql)
    page.route(re.compile(r"^https://example\.test/.*"), image)


def test_quiz_start_answer_finish(browser):
    context = browser.new_context(viewport={"width": 1280, "height": 900}, locale="ja-JP")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    install_routes(page)

    page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded")
    page.wait_for_function(
        """() => {
          const button = document.querySelector('#start');
          return button && !button.classList.contains('hidden')
            && !button.disabled && button.textContent.includes('クイズを開始');
        }""",
        timeout=60000,
    )
    # Use image-to-title mode: the compact fixture catalogue intentionally has
    # no four distinct release years, so title-to-year mode has no valid options.
    page.locator("#modeSelect").select_option("image")
    page.locator("#answerFormatSelect").select_option("choices")
    page.locator("#difficultySelect").select_option("easy")
    page.locator("#questionCount").fill("1")
    page.locator("#start").click()
    page.locator("#answers button.answer").first.wait_for(state="visible", timeout=20000)
    assert page.locator("#answers button.answer").count() == 4, "Quiz must show four answer choices"
    page.locator("#answers button.answer").first.click()
    page.locator("#result:not(.hidden)").wait_for(state="visible", timeout=20000)
    assert page.locator("#resultText").inner_text().strip(), "Quiz completion summary must be displayed"
    assert not errors, "Quiz page raised JavaScript errors: " + " | ".join(errors)
    context.close()





def test_live_quiz_preparation_performance(browser):
    """Measure real deployed-catalog startup and warm replays in Chromium."""
    context = browser.new_context(
        viewport={"width": 1280, "height": 900},
        locale="ja-JP",
        service_workers="block",
    )
    page = context.new_page()
    page_errors = []
    performance_logs = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on(
        "console",
        lambda message: performance_logs.append(message.text)
        if "[AQW performance] quiz preparation" in message.text else None,
    )

    navigation_started = __import__("time").perf_counter()
    page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_function(
        """() => {
          const button = document.querySelector('#start');
          return button && !button.classList.contains('hidden') && !button.disabled;
        }""",
        timeout=120000,
    )
    ready_ms = round((__import__("time").perf_counter() - navigation_started) * 1000, 1)

    # Capture the profile-fetch duration without changing the returned profile.
    page.evaluate("""() => {
      window.__aqwProfileLoadSamples = [];
      const original = window.aqwLoadPersonalDifficultyProfile;
      if (typeof original === 'function' && !original.__aqwPerfWrapped) {
        const wrapped = async function(...args) {
          const started = performance.now();
          try { return await original.apply(this, args); }
          finally { window.__aqwProfileLoadSamples.push(Math.round(performance.now() - started)); }
        };
        wrapped.__aqwPerfWrapped = true;
        window.aqwLoadPersonalDifficultyProfile = wrapped;
      }
    }""")

    page.locator("#modeSelect").select_option("mixed")
    page.locator("#answerFormatSelect").select_option("choices")
    page.locator("#difficultySelect").select_option("easy")
    page.locator("#questionCount").fill("1")

    rounds = []
    for round_index in range(3):
        log_start = len(performance_logs)
        profile_start = page.evaluate("() => window.__aqwProfileLoadSamples.length")
        started = __import__("time").perf_counter()
        start_button = page.locator("#start" if round_index == 0 else "#restart")
        start_button.wait_for(state="visible", timeout=30000)
        start_button.click()
        try:
            page.locator("#answers button.answer").first.wait_for(state="visible", timeout=30000)
        except Exception as error:
            state = page.evaluate("""() => ({
              quizStatus: document.querySelector('#quizStatus')?.textContent || '',
              answerPrompt: document.querySelector('#answerPrompt')?.textContent || '',
              answerCount: document.querySelectorAll('#answers button.answer').length,
              quizAreaClass: document.querySelector('#quizArea')?.className || '',
              startDisabled: document.querySelector('#start')?.disabled ?? null,
              preparationStages: window.__aqwQuizPreparationStages || [],
              candidateSelectionMs: window.__aqwLastCandidateSelectionMs ?? null,
              quizPreparationMs: window.__aqwLastQuizPreparationMs ?? null
            })""")
            raise AssertionError("First quiz question did not render within 30 seconds: " + json.dumps(state, ensure_ascii=False)) from error
        first_question_ms = round((__import__("time").perf_counter() - started) * 1000, 1)

        metrics = page.evaluate("""() => ({
          candidateSelectionMs: window.__aqwLastCandidateSelectionMs ?? null,
          quizPreparationMs: window.__aqwLastQuizPreparationMs ?? null,
          profileLoadSamples: (window.__aqwProfileLoadSamples || []).slice(),
          candidateCount: (window.__aqwLastCandidateSelectionMs == null) ? null :
            (window.__aqwLastCandidateCount ?? null),
          catalogueResources: performance.getEntriesByType('resource')
            .filter(entry => /anime-catalog|title-image-exclusions/.test(entry.name))
            .map(entry => ({name: entry.name.split('/').pop(), durationMs: Math.round(entry.duration * 10) / 10,
              transferSize: entry.transferSize || null}))
        })""")
        profile_samples = metrics["profileLoadSamples"][profile_start:]
        log_text = performance_logs[log_start:]
        rounds.append({
            "round": round_index + 1,
            "clickToFirstQuestionMs": first_question_ms,
            "candidateSelectionMs": metrics["candidateSelectionMs"],
            "quizPreparationMs": metrics["quizPreparationMs"],
            "profileLoadMs": profile_samples[-1] if profile_samples else None,
            "performanceLog": log_text[-1] if log_text else None,
            "catalogueResources": metrics["catalogueResources"],
        })

        page.locator("#answers button.answer").first.click()
        page.locator("#result:not(.hidden)").wait_for(state="visible", timeout=30000)
        if round_index < 2:
            page.locator("#restart").wait_for(state="visible", timeout=30000)

    assert not page_errors, "Live quiz raised JavaScript errors: " + " | ".join(page_errors)
    print("PERFORMANCE: " + json.dumps({
        "browser": "Playwright Chromium (GitHub Actions Linux runner)",
        "catalogueReadyMs": ready_ms,
        "rounds": rounds,
        "note": "First question timing includes quiz preparation and question rendering; profile duration is captured only when the profile loader exists."
    }, ensure_ascii=False))
    context.close()

def test_main_navigation_and_search(browser):
    """Verify every primary tab and the title-search form remains interactive."""
    context = browser.new_context(viewport={"width": 1280, "height": 900}, locale="ja-JP")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.route("**/supabase-js@2*", lambda route: route.abort())
    install_routes(page)
    page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded")
    page.locator("#start").wait_for(state="visible", timeout=60000)

    page.locator("#searchTab").click()
    assert page.locator("#search").is_visible(), "Search tab must open the search panel"
    page.locator("#query").fill("作品A")
    page.locator("#searchButton").click()
    page.locator("#results .anime").first.wait_for(state="visible", timeout=20000)
    assert page.locator("#results .anime").count() > 0, "Search must render matching anime cards"

    page.locator("#progressTab").click()
    assert page.locator("#progressPanel").is_visible(), "Progress tab must open the achievements panel"
    page.locator("#socialTab").click()
    assert page.locator("#social").is_visible(), "Community tab must open even when Supabase is unavailable"
    page.locator("#rankingTab").click()
    assert page.locator("#ranking").is_visible(), "Ranking tab must open even when Supabase is unavailable"
    page.locator("#quizTab").click()
    assert page.locator("#quiz").is_visible(), "Quiz tab must return to the quiz panel"
    assert not errors, "Primary navigation/search raised JavaScript errors: " + " | ".join(errors)
    context.close()


def test_quiz_pause_and_quit(browser):
    """Verify pause/resume and quit controls respond during an active quiz."""
    context = browser.new_context(viewport={"width": 1280, "height": 900}, locale="ja-JP")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("dialog", lambda dialog: dialog.accept())
    install_routes(page)
    page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded")
    page.locator("#start").wait_for(state="visible", timeout=60000)
    page.locator("#modeSelect").select_option("image")
    page.locator("#answerFormatSelect").select_option("choices")
    page.locator("#difficultySelect").select_option("easy")
    page.locator("#questionCount").fill("1")
    page.locator("#start").click()
    page.locator("#answers button.answer").first.wait_for(state="visible", timeout=20000)

    page.locator("#pauseButton").click()
    assert page.locator("#pauseNotice").is_visible(), "Pause must display the pause notice"
    page.locator("#pauseButton").click()
    assert not page.locator("#pauseNotice").is_visible(), "Resume must hide the pause notice"
    page.locator("#quitQuizButton").click()
    page.wait_for_function(
        "() => document.querySelector('#quizArea')?.classList.contains('hidden') && !document.querySelector('#setupControls')?.classList.contains('hidden')",
        timeout=10000,
    )
    assert not errors, "Pause/resume/quit raised JavaScript errors: " + " | ".join(errors)
    context.close()



def test_mobile_quiz_layout(browser):
    """Check that the quiz controls and four choices fit a narrow mobile viewport."""
    context = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="ja-JP")
    page = context.new_page()
    install_routes(page)
    page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded")
    page.wait_for_function(
        "() => { const button = document.querySelector('#start'); return button && !button.classList.contains('hidden') && !button.disabled; }",
        timeout=60000,
    )
    page.locator("#modeSelect").select_option("image")
    page.locator("#answerFormatSelect").select_option("choices")
    page.locator("#difficultySelect").select_option("easy")
    page.locator("#questionCount").fill("1")
    page.locator("#start").click()
    answers = page.locator("#answers button.answer")
    answers.first.wait_for(state="visible", timeout=20000)
    assert answers.count() == 4, "Mobile quiz must show four answer choices"
    for index in range(answers.count()):
        bounds = answers.nth(index).bounding_box()
        assert bounds and bounds["x"] >= 0 and bounds["x"] + bounds["width"] <= 391, (
            f"Mobile answer choice {index + 1} extends beyond the viewport: {bounds}"
        )
    answers.first.tap()
    page.locator("#result:not(.hidden)").wait_for(state="visible", timeout=20000)
    context.close()


def test_auth_form_reads_filled_inputs(browser):
    """Ensure filled fields are not misreported as empty when Supabase is unavailable."""
    context = browser.new_context(viewport={"width": 1280, "height": 900}, locale="ja-JP")
    page = context.new_page()
    page.route("**/supabase-js@2*", lambda route: route.abort())
    page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded")
    # The account form lives in the Community section, which is intentionally
    # hidden until selected in the normal navigation. Reveal only for this test.
    page.locator("#social").evaluate("(el) => el.classList.remove('hidden')")
    page.locator("#aqwAuthForm").wait_for(state="visible", timeout=20000)
    page.locator("#aqwEmail").fill("smoke-test@example.invalid")
    page.locator("#aqwPassword").fill("SmokeTestPassword123!")
    page.locator("#aqwSignIn").click()
    page.wait_for_function(
        "() => document.querySelector('#aqwAuthMessage')?.textContent.trim().length > 0",
        timeout=10000,
    )
    actual = page.locator("#aqwAuthMessage").inner_text().strip()
    assert "メールアドレスとパスワードの両方を入力してください。" not in actual, (
        "Filled email and password were incorrectly read as empty"
    )
    assert "ログイン機能を読み込めませんでした" in actual, (
        "With Supabase intentionally blocked, the form should report service unavailability"
    )
    context.close()


def test_recommendation_diagnosis(browser):
    context = browser.new_context(viewport={"width": 1280, "height": 900}, locale="ja-JP")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    install_routes(page)

    page.goto(f"{BASE_URL}/recommend.html", wait_until="domcontentloaded")
    page.locator("#stepLabel").wait_for(state="visible", timeout=20000)
    step_text = page.locator("#stepLabel").inner_text()
    match = re.search(r"/\s*(\d+)", step_text)
    assert match, f"Could not read diagnosis question count: {step_text}"
    question_count = int(match.group(1))
    assert question_count == 18, f"Diagnosis must contain exactly 18 questions: {question_count}"

    for step in range(question_count):
        choices = page.locator("#choices button.choice")
        choices.first.wait_for(state="visible", timeout=10000)
        assert choices.count() == 4, f"Question {step + 1} must have four choices"
        choices.first.click()
        page.locator("#next").click()
        if step + 1 < question_count:
            page.wait_for_function(
                "(expected) => document.querySelector('#stepLabel')?.textContent.includes('QUESTION ' + expected + ' /')",
                arg=step + 2,
                timeout=10000,
            )

    page.locator("#results:not(.hidden)").wait_for(state="visible", timeout=60000)
    card_count = page.locator("#animeCards .anime").count() + page.locator("#discoveryCards .anime").count()
    assert card_count > 0, "Diagnosis completed but returned no recommendation cards"
    assert not errors, "Recommendation page raised JavaScript errors: " + " | ".join(errors)
    context.close()



def test_live_seasonal_anilist():
    """Verify the real AniList seasonal query, Japanese-origin filter, and at least one image URL."""
    season_end_month = SEASON_START_MONTH + 2
    next_month = season_end_month + 1
    next_year = NOW_JST.year
    if next_month == 13:
        next_month = 1
        next_year += 1
    start_year = NOW_JST.year if SEASON_START_MONTH > 1 else NOW_JST.year - 1
    start_bound = start_year * 10000 + (12 if SEASON_START_MONTH == 1 else SEASON_START_MONTH - 1) * 100
    end_bound = next_year * 10000 + next_month * 100 + 1
    query = """
    query {
      Page(page: 1, perPage: 50) {
        media(
          type: ANIME,
          countryOfOrigin: JP,
          format_in: [TV, ONA],
          startDate_greater: %d,
          startDate_lesser: %d,
          isAdult: false,
          sort: POPULARITY_DESC
        ) {
          id countryOfOrigin source(version: 2)
          relations { edges { relationType node { id type countryOfOrigin format } } }
          format startDate { year month day }
          title { romaji english native }
          coverImage { large medium }
        }
      }
    }
    """ % (start_bound, end_bound)
    request = Request(
        "https://graphql.anilist.co",
        data=json.dumps({"query": query}).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json", "User-Agent": "AnimeQuizWorld-smoke-test"},
        method="POST",
    )
    with urlopen(request, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if payload.get("errors"):
        raise AssertionError("AniList GraphQL returned errors: " + str(payload["errors"]))

    items = payload.get("data", {}).get("Page", {}).get("media", [])
    rules = {
        "MANGA": ("MANGA", {"MANGA", "ONE_SHOT"}),
        "LIGHT_NOVEL": ("MANGA", {"NOVEL"}),
        "NOVEL": ("MANGA", {"NOVEL"}),
        "DOUJINSHI": ("MANGA", {"MANGA", "ONE_SHOT", "NOVEL"}),
        "ANIME": ("ANIME", {"TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL"}),
    }

    def japanese_origin(item):
        if item.get("countryOfOrigin") != "JP":
            return False
        if item.get("source") == "ORIGINAL":
            return True
        rule = rules.get(item.get("source"))
        if not rule:
            return False
        node_type, formats = rule
        return any(
            edge.get("relationType") in {"SOURCE", "ADAPTATION"}
            and (node := edge.get("node") or {}).get("type") == node_type
            and node.get("countryOfOrigin") == "JP"
            and node.get("format") in formats
            for edge in (item.get("relations") or {}).get("edges", [])
        )

    season_items = [
        item for item in items
        if item.get("startDate", {}).get("year") == NOW_JST.year
        and SEASON_START_MONTH <= (item.get("startDate", {}).get("month") or 0) <= season_end_month
    ]
    eligible = [
        item for item in season_items
        if japanese_origin(item)
        and item.get("format") in {"TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL"}
        and ((item.get("coverImage") or {}).get("large") or (item.get("coverImage") or {}).get("medium"))
        and any((item.get("title") or {}).get(key) for key in ("native", "english", "romaji"))
    ]
    if not eligible:
        raise AssertionError(
            f"No eligible Japanese-origin seasonal anime. AniList returned {len(items)} items; "
            f"{len(season_items)} matched the current season; "
            f"{sum(1 for item in season_items if item.get('countryOfOrigin') == 'JP')} had countryOfOrigin=JP."
        )

    image_errors = []
    for item in eligible[:8]:
        image_url = (item.get("coverImage") or {}).get("large") or (item.get("coverImage") or {}).get("medium")
        if not image_url:
            continue
        try:
            image_request = Request(image_url, headers={"User-Agent": "AnimeQuizWorld-smoke-test"})
            with urlopen(image_request, timeout=12) as image_response:
                if image_response.status == 200 and image_response.headers.get("Content-Type", "").startswith("image/"):
                    print(f"PASS: live seasonal image URL ({item['id']})")
                    break
                image_errors.append(f"{item['id']}: HTTP {image_response.status}")
        except Exception as error:
            image_errors.append(f"{item.get('id')}: {error}")
    else:
        raise AssertionError("No seasonal cover image URL could be loaded: " + " | ".join(image_errors))
    print(
        f"PASS: live AniList seasonal query ({len(items)} returned, "
        f"{len(season_items)} current-season, {len(eligible)} eligible Japanese-origin)"
    )


def test_featured_season_rail(browser):
    context = browser.new_context(viewport={"width": 1280, "height": 900}, locale="ja-JP")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    install_routes(page)
    page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded")
    page.locator("#featuredRail .featured-card").first.wait_for(state="visible", timeout=30000)
    assert page.locator("#featuredRail .featured-card").count() >= 2, "Seasonal rail must render anime cards"
    page.wait_for_function(
        "() => { const image = document.querySelector('#featuredRail .featured-card img'); return image && image.complete && image.naturalWidth > 0; }",
        timeout=15000,
    )
    assert not errors, "Seasonal rail raised JavaScript errors: " + " | ".join(errors)
    context.close()


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            # Run the core quiz journey first so network-heavy checks cannot
            # delay detection of a broken start -> answer -> finish flow.
            test_quiz_start_answer_finish(browser)
            print("PASS: quiz start -> answer -> finish")
            test_main_navigation_and_search(browser)
            print("PASS: primary navigation and anime search")
            test_quiz_pause_and_quit(browser)
            print("PASS: quiz pause -> resume -> quit")
            test_recommendation_diagnosis(browser)
            print("PASS: recommendation diagnosis -> results")
            test_mobile_quiz_layout(browser)
            print("PASS: mobile quiz layout and touch answer")
            test_live_seasonal_anilist()
            test_featured_season_rail(browser)
            print("PASS: featured seasonal rail -> visible cards and loaded images")
            test_live_quiz_preparation_performance(browser)
            print("PASS: live-catalog quiz preparation performance (3 rounds)")
            test_auth_form_reads_filled_inputs(browser)
            print("PASS: auth form reads filled inputs")
        finally:
            browser.close()


if __name__ == "__main__":
    main()
