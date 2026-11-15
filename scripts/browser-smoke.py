#!/usr/bin/env python3
"""Deterministic browser smoke tests for the deployed Anime Quiz World UI.

The tests use a small fixture catalogue and a mocked AniList GraphQL response so
they exercise the real deployed HTML/JavaScript without depending on API quotas
or downloading the full production catalogue.
"""
import gzip
import json
import os
import re
import sys
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
    format = ["TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL"][index % 6]
    source = ["ORIGINAL", "MANGA", "LIGHT_NOVEL", "NOVEL", "VISUAL_NOVEL", "VIDEO_GAME"][index % 6]
    title = f"検証作品{suffix}"
    cover = f"https://example.test/cover-{index + 1}.png"
    return {
        "id": anime_id,
        "countryOfOrigin": "JP",
        "source": source,
        "isAdult": False,
        "format": format,
        "title": {
            "native": title,
            "english": f"Verification Anime {suffix}",
            "romaji": f"Verification Anime {suffix}",
        },
        "description": (
            [
                "雪に閉ざされた海辺の町で、古い灯台を守る少女は、夜ごとに届く不思議な手紙の謎を追い始める。仲間との出会いを重ねながら、町に隠された過去と向き合っていく。",
                "小さなロボット工房を営む少年は、失われた設計図を見つけたことから、巨大な機械都市をめぐる争いに巻き込まれる。職人たちと力を合わせ、未来を変える発明に挑む。",
                "人々の夢を記録する図書館に配属された新人司書は、存在しないはずの本を発見する。ページに記された記憶をたどるうち、現実と夢の境界が揺らぎ始める。",
                "山あいの学校に転校してきた生徒は、放課後だけ開く秘密の放送室を見つける。仲間と番組を作りながら、町で長く語り継がれる奇妙な出来事の真相を探る。",
                "空に浮かぶ島々を旅する配達人は、宛先のない荷物を預かる。各地で出会う人々の願いを届けるうちに、世界をつなぐ古い約束の意味を知っていく。",
                "海底の研究基地で目覚めた少女は、自分の名前以外の記憶を失っていた。調査隊とともに深海を探索し、静かな海に隠された大きな秘密を解き明かす。",
                "古い商店街の写真館で働く青年は、撮影した写真に未来の風景が写ることに気づく。住人たちの小さな悩みに向き合いながら、変わり始めた日常を見守る。",
                "魔法が使えない見習い騎士は、地図にない森で不思議な生き物と出会う。異なる力を持つ仲間たちと旅を続け、王国を覆う謎に立ち向かっていく。",
                "月面都市で暮らす整備士は、停止した古い通信機から地球の声を受信する。限られた時間の中で仲間と協力し、遠く離れた人々へ大切な知らせを届けようとする。",
                "歴史資料を整理する学生は、年代の異なる記録に同じ人物の名前を見つける。大学の仲間と調査を進めるうち、街の歴史を書き換えた出来事に近づいていく。",
                "小さな劇団の新人役者は、上演中にだけ現れる謎の台本を手にする。舞台仲間と稽古を重ね、観客にも作者にも知られていない物語の結末を探し求める。",
                "雪山の観測所に赴任した研究員は、毎晩同じ時刻に届く信号を記録する。厳しい自然の中で仲間と調査を続け、信号が示す場所へ向かう決意を固める。"
            ][index % 12] + "（検証用作品番号：" + str(index + 1) + "）"
        ),
        # Several unique aliases ensure the synonym mode also has easy-difficulty fixtures.
        "synonyms": [
            f"検証の略称{suffix}",
            f"検証別名{suffix}",
            f"検証愛称{suffix}",
            f"略称検証{suffix}",
            f"検証作品短縮名{suffix}",
        ],
        "coverImage": {"large": cover, "medium": cover, "extraLarge": cover},
        "episodes": None if format == "MOVIE" else 2 + index,
        "season": CURRENT_SEASON,
        "seasonYear": 2010 + index // 4,
        "startDate": {"year": 2010 + index, "month": 1, "day": 1},
        "averageScore": 70 + (index % 20),
        "popularity": 50000 - index * 1000,
        "genres": GENRES[index % len(GENRES)],
        "tags": [
            {"name": tag, "rank": 75 + (index % 20), "isMediaSpoiler": False}
            for tag in TAGS[index % len(TAGS)]
        ],
        "studios": {"nodes": [{"name": f"検証スタジオ{index % 5 + 1}"}]},
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


QUIZ_FIXTURES = [make_anime(i) for i in range(24)]
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

    def compressed_catalogue(route):
        payload = json.dumps(
            {"schemaVersion": 2, "items": QUIZ_FIXTURES},
            ensure_ascii=False,
        ).encode("utf-8")
        route.fulfill(
            status=200,
            content_type="application/gzip",
            body=gzip.compress(payload, mtime=0),
        )

    def image(route):
        # A real PNG avoids browser-specific SVG decoding differences in CI.
        route.fulfill(
            status=200,
            content_type="image/png",
            body=__import__("base64").b64decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p5sAAAAASUVORK5CYII="
            ),
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
        elif "season:" in query and "seasonYear:" in query:
            # The featured rail uses the current season and Japanese-origin
            # filters. Give this test deterministic matching records instead
            # of reusing old recommendation fixtures that are correctly filtered.
            seasonal_fixtures = []
            for index in (0, 1):
                item = dict(QUIZ_FIXTURES[index])
                item.update({
                    "source": "ORIGINAL",
                    "format": "TV",
                    "season": CURRENT_SEASON,
                    "seasonYear": NOW_JST.year,
                    "startDate": {
                        "year": NOW_JST.year,
                        "month": SEASON_START_MONTH,
                        "day": index + 1,
                    },
                    "countryOfOrigin": "JP",
                })
                seasonal_fixtures.append(item)
            data = {
                "Page": {
                    "pageInfo": {"hasNextPage": False, "totalPages": 1},
                    "media": seasonal_fixtures,
                }
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

    page.route("**/data/anime-catalog.json.gz", compressed_catalogue)
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
                # The production image-quiz policy accepts valid cover URLs
                # without requiring a separate OCR audit file.
                "records": [],
            }),
        ),
    )
    page.route(re.compile(r"^https://graphql\.anilist\.co/?$"), graphql)
    page.route(re.compile(r"^https://example\.test/.*"), image)



def install_live_catalogue_routes(page):
    """Stub AniList seasonal discovery but keep the deployed catalogue request real."""
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
                    "media": [],
                }
            }
        route.fulfill(
            status=200,
            headers={**CORS_HEADERS, "Content-Type": "application/json"},
            body=json.dumps({"data": data}, ensure_ascii=False),
        )

    page.route(re.compile(r"^https://graphql\.anilist\.co/?$"), graphql)


def test_public_catalogue_all_modes(browser):
    """Exercise all four quiz formats against the real catalogue served by GitHub Pages."""
    context = browser.new_context(
        viewport={"width": 1280, "height": 900},
        locale="ja-JP",
        service_workers="block",
    )
    page = context.new_page()
    errors = []
    catalogue_requests = []
    page.on("pageerror", lambda error: errors.append(str(error) + "\\n" + (getattr(error, "stack", "") or "")))
    page.on(
        "request",
        lambda request: catalogue_requests.append(request.url)
        if "anime-catalog.json" in request.url else None,
    )
    install_live_catalogue_routes(page)
    page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded", timeout=60000)
    page.locator("#quizTab").click()
    page.locator("#quiz").wait_for(state="visible", timeout=20000)
    page.evaluate("prepare()")
    page.wait_for_function(
        "() => typeof pool !== 'undefined' && pool.length >= 9000",
        timeout=120000,
    )
    page.evaluate("goHome()")
    page.locator("#setupControls").wait_for(state="visible", timeout=20000)
    page.wait_for_function(
        """() => {
          const button = document.querySelector('#start');
          return button && !button.classList.contains('hidden')
            && !button.disabled && button.textContent.includes('クイズを開始')
            && !button.textContent.includes('読み込み中');
        }""",
        timeout=120000,
    )
    stats = page.evaluate("""() => ({
      poolCount: typeof pool === 'undefined' ? null : pool.length,
      synopsisCount: typeof hasUsableSynopsis === 'function' && typeof pool !== 'undefined'
        ? pool.filter(item => hasUsableSynopsis(item)).length : null,
      embeddedCharacterRecords: typeof pool === 'undefined' ? null
        : pool.filter(item => Object.prototype.hasOwnProperty.call(item, 'characters')).length
    })""")
    assert stats["poolCount"] is not None and stats["poolCount"] >= 9000, (
        "The published quiz catalogue is unexpectedly small: " + json.dumps(stats, ensure_ascii=False)
    )
    assert stats["synopsisCount"] is not None and stats["synopsisCount"] >= 400, (
        "The published catalogue has too few Japanese synopsis questions: " + json.dumps(stats, ensure_ascii=False)
    )
    assert stats["embeddedCharacterRecords"] == 0, (
        "Unused character records returned in the shared catalogue: " + json.dumps(stats, ensure_ascii=False)
    )
    local_japanese_search = page.evaluate("""async () => {
      const results = await fetchAnime({search: "葬送のフリーレン"});
      return results.map(titleOf);
    }""")
    assert any("葬送のフリーレン" in title for title in local_japanese_search), (
        "Local search failed to find Frieren in the real shared catalogue when AniList returned no matches: "
        + repr(local_japanese_search)
    )
    local_english_search = page.evaluate("""async () => {
      const results = await fetchAnime({search: "Frieren"});
      return results.map(titleOf);
    }""")
    assert any("葬送のフリーレン" in title for title in local_english_search), (
        "Local search failed to find a Japanese title from its English name: " + repr(local_english_search)
    )
    curated_search_ids = page.evaluate("""async () => ({
      idolmaster: (await fetchAnime({search: "アイドルマスター"})).map(anime => Number(anime.id)),
      oshiriTantei: (await fetchAnime({search: "おしりたんてい"})).map(anime => Number(anime.id))
    })""")
    assert 10278 in curated_search_ids["idolmaster"], (
        "Local search must find the curated 2011 THE IDOLM@STER record: " + repr(curated_search_ids)
    )
    assert 100790 in curated_search_ids["oshiriTantei"], (
        "Local search must find the curated Oshiri Tantei record: " + repr(curated_search_ids)
    )
    assert any(url.endswith("anime-catalog.json.gz") for url in catalogue_requests), (
        "The public page did not request the compressed catalogue: " + repr(catalogue_requests)
    )
    assert not any(url.endswith("anime-catalog.json") for url in catalogue_requests), (
        "The public page fell back to the uncompressed catalogue: " + repr(catalogue_requests)
    )

    modes = ["synopsis", "titleYear", "synonym", "titleStudio"]
    timings = []
    for index, mode in enumerate(modes):
        if index:
            page.locator("#homeAfterQuiz").click()
            page.locator("#setupControls").wait_for(state="visible", timeout=20000)
        page.locator("#modeSelect").select_option(mode)
        page.locator("#answerFormatSelect").select_option("choices")
        page.locator("#difficultySelect").select_option("easy")
        page.locator("#questionCount").fill("1")
        start_button = page.locator("#start")
        start_button.wait_for(state="visible", timeout=20000)
        started = __import__("time").perf_counter()
        start_button.click()
        answers = page.locator("#answers button.answer")
        answers.first.wait_for(state="visible", timeout=45000)
        elapsed_ms = round((__import__("time").perf_counter() - started) * 1000, 1)
        labels = [re.sub(r"\s+", " ", value).strip().casefold() for value in answers.all_inner_texts()]
        assert answers.count() == 4 and len(set(labels)) == 4, (
            f"Public {mode} mode did not produce four distinct choices: {labels}"
        )
        rendered_mode = page.evaluate(
            "() => typeof currentQuestionMode === 'undefined' ? null : currentQuestionMode"
        )
        assert rendered_mode == mode, (
            f"Public {mode} mode silently fell back to {rendered_mode!r}"
        )
        prompt = page.locator("#answerPrompt").inner_text().strip()
        assert prompt, f"Public {mode} mode did not render a question prompt"
        if mode == "titleYear":
            selected_mode_label = page.locator("#modeSelect option:checked").inner_text()
            assert "公開・放送年" in selected_mode_label, (
                "The Japanese title-year mode label must cover release and broadcast years: "
                + selected_mode_label
            )
            result_mode_label = page.evaluate(
                "() => resultLabels({playMode: 'normal', questionMode: 'titleYear'}).mode"
            )
            assert "公開・放送年" in result_mode_label, (
                "The Japanese result label must identify release and broadcast years: "
                + result_mode_label
            )
            year_prompt_suffix = page.evaluate("() => qText('titleYear')")
            assert "公開・放送年" in year_prompt_suffix, (
                "Year questions must cover both film release and TV broadcast years: "
                + year_prompt_suffix
            )
        if mode == "synopsis":
            assert re.search(r"[ぁ-んァ-ヶ一-龯]", prompt), (
                "Public synopsis mode did not render Japanese synopsis text: " + prompt
            )
        answers.first.click()
        page.locator("#result:not(.hidden)").wait_for(state="visible", timeout=30000)
        result_text = page.locator("#resultText").inner_text().strip()
        assert result_text, f"Public {mode} mode did not finish with a result summary"
        timings.append({"mode": mode, "clickToQuestionMs": elapsed_ms})
    assert not errors, "Public quiz raised JavaScript errors: " + " | ".join(errors)
    print("PUBLIC CATALOGUE: " + json.dumps(stats, ensure_ascii=False))
    print("PUBLIC FOUR-MODE QUIZ: " + json.dumps(timings, ensure_ascii=False))
    context.close()


def test_compressed_catalogue_preferred(browser):
    """Verify modern browsers load the gzip catalogue without falling back to JSON."""
    context = browser.new_context(locale="ja-JP")
    page = context.new_page()
    catalogue_requests = []
    page.on("request", lambda request: catalogue_requests.append(request.url)
            if "anime-catalog.json" in request.url else None)
    install_routes(page)
    page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded")
    page.wait_for_function(
        """() => {
          const button = document.querySelector('#start');
          return button && !button.classList.contains('hidden') && !button.disabled
            && button.textContent.trim() === 'クイズを開始';
        }""",
        timeout=60000,
    )
    assert any(url.endswith('anime-catalog.json.gz') for url in catalogue_requests), (
        "The compressed shared catalogue was not requested: " + repr(catalogue_requests)
    )
    assert not any(url.endswith('anime-catalog.json') for url in catalogue_requests), (
        "The browser fell back to the uncompressed JSON catalogue: " + repr(catalogue_requests)
    )
    context.close()

def test_quiz_translation_question_text(browser):
    """Ensure question text and core UI translations work in every supported locale."""
    context = browser.new_context(locale="ja-JP")
    page = context.new_page()
    install_routes(page)
    page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded")
    page.wait_for_function("typeof qText === 'function'", timeout=20000)
    translations = page.evaluate("""() => {
      const previous = lang;
      const output = {};
      for (const locale of ['ja', 'en', 'ko', 'zh', 'es', 'fr', 'pt', 'de']) {
        lang = locale;
        output[locale] = {question: qText('image'), countLabel: tr('countLabel')};
      }
      lang = previous;
      return output;
    }""")
    for locale, values in translations.items():
        assert values["question"].strip(), f"Question prompt is empty for {locale}"
        assert values["countLabel"].strip(), f"Core translation is empty for {locale}"
    assert translations["ja"]["question"] != translations["en"]["question"]
    assert translations["ko"]["countLabel"] != translations["en"]["countLabel"]
    context.close()

def test_quiz_start_answer_finish(browser):
    context = browser.new_context(viewport={"width": 1280, "height": 900}, locale="ja-JP")
    page = context.new_page()
    errors = []
    page.add_init_script("""() => {
      window.__aqwPageErrors = [];
      window.addEventListener('error', event => {
        window.__aqwPageErrors.push(event.error?.stack || event.message || 'Unknown page error');
      });
      window.addEventListener('unhandledrejection', event => {
        window.__aqwPageErrors.push(event.reason?.stack || String(event.reason));
      });
    }""")
    page.on("pageerror", lambda error: errors.append(getattr(error, "stack", None) or str(error)))
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
    # Use the Japanese synopsis mode; the fixture supplies distinct summaries.
    page.locator("#modeSelect").select_option("synopsis")
    page.locator("#answerFormatSelect").select_option("choices")
    page.locator("#difficultySelect").select_option("easy")
    page.locator("#questionCount").fill("1")
    page.locator("#start").click()
    page.locator("#answers button.answer").first.wait_for(state="visible", timeout=20000)
    assert page.locator("#answers button.answer").count() == 4, "Quiz must show four answer choices"
    page.locator("#answers button.answer").first.click()
    page.locator("#result:not(.hidden)").wait_for(state="visible", timeout=20000)
    assert page.locator("#resultText").inner_text().strip(), "Quiz completion summary must be displayed"
    diagnostic_errors = page.evaluate("() => window.__aqwPageErrors || []")
    assert not errors and not diagnostic_errors, (
        "Quiz page raised JavaScript errors: " + " | ".join(errors + diagnostic_errors)
    )
    context.close()





def test_all_question_modes(browser):
    """Verify every selectable question mode can prepare, answer, and finish."""
    modes = ["image", "synopsis", "synonym", "studio", "year", "titleYear", "titleStudio", "titleSynopsis", "titleEpisodes", "titleGenre", "titleFormat"]
    context = browser.new_context(locale="ja-JP")
    page = context.new_page()
    install_routes(page)
    page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded")
    page.wait_for_function("document.querySelector('#modeSelect option') !== null", timeout=20000)
    mode_values = page.locator("#modeSelect option").evaluate_all("(options) => options.map(option => option.value)")
    expected_modes = ["mixed", "image", "synopsis", "synonym", "studio", "year", "titleYear", "titleStudio", "titleSynopsis", "titleEpisodes", "titleGenre", "titleFormat"]
    assert mode_values == expected_modes, (
        "The quiz menu must expose every supported, data-backed question mode: "
        + repr(mode_values)
    )
    context.close()
    for mode in modes:
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            locale="ja-JP",
            service_workers="block",
        )
        page = context.new_page()
        errors = []
        console_errors = []
        image_failures = []
        image_responses = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("console", lambda message: console_errors.append(message.text)
                 if message.type == "error" else None)
        page.on("requestfailed", lambda request: image_failures.append({
            "url": request.url, "failure": request.failure
        }) if "example.test" in request.url else None)
        page.on("response", lambda response: image_responses.append({
            "url": response.url, "status": response.status,
            "contentType": response.headers.get("content-type")
        }) if "example.test" in response.url else None)
        install_routes(page)
        page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded")
        page.wait_for_function(
            "() => { const button = document.querySelector('#start'); return button && !button.classList.contains('hidden') && !button.disabled; }",
            timeout=60000,
        )
        page.locator("#modeSelect").select_option(mode)
        page.locator("#answerFormatSelect").select_option("choices")
        page.locator("#difficultySelect").select_option("easy")
        page.locator("#questionCount").fill("1")
        # Keep the question alive while validating image decoding in slower CI runners.
        page.locator("#timeLimitSelect").select_option("60")
        page.locator("#start").click()
        answers = page.locator("#answers button.answer")
        try:
            answers.first.wait_for(state="visible", timeout=20000)
        except Exception as error:
            status = page.locator("#quizStatus").inner_text() if page.locator("#quizStatus").count() else ""
            raise AssertionError(f"Question mode {mode} did not produce a question: {status}") from error
        assert answers.count() == 4, f"Question mode {mode} must provide exactly four choices"
        labels = [re.sub(r"\\s+", " ", value).strip().casefold() for value in answers.all_inner_texts()]
        assert len(set(labels)) == 4, f"Question mode {mode} must provide four distinct answer labels: {labels}"
        prompt = page.locator("#answerPrompt").inner_text().strip()
        assert prompt, f"Question mode {mode} must display a prompt"
        rendered_mode = page.evaluate("() => typeof currentQuestionMode === 'undefined' ? null : currentQuestionMode")
        assert rendered_mode == mode, (
            f"Question mode {mode} silently fell back to {rendered_mode!r}; "
            "render errors: " + " | ".join(console_errors)
        )
        if mode == "synopsis":
            assert re.search(r"[ぁ-んァ-ヶ一-龯]", prompt), (
                "Japanese synopsis questions must display a Japanese prompt: " + prompt
            )
            for label in answers.all_inner_texts():
                assert re.search(r"[ぁ-んァ-ヶ一-龯]", label), (
                    "Japanese synopsis answer choices must use Japanese titles: " + label
                )
        assert not console_errors, (
            f"Question mode {mode} logged browser console errors: " + " | ".join(console_errors)
        )
        if mode == "image":
            initial_image_state = page.evaluate("""() => {
              const image = document.querySelector('#cover');
              return {
                src: image?.getAttribute('src') || '',
                currentSrc: image?.currentSrc || '',
                complete: image?.complete ?? null,
                naturalWidth: image?.naturalWidth ?? null,
                className: image?.className || '',
                alt: image?.alt || '',
                feedback: document.querySelector('#feedback')?.textContent || '',
                prompt: document.querySelector('#answerPrompt')?.textContent || ''
              };
            }""")
            try:
                page.wait_for_function(
                    "() => { const image = document.querySelector('#cover'); return image && !image.classList.contains('hidden') && image.complete && image.naturalWidth > 0; }",
                    timeout=15000,
                )
            except Exception as error:
                image_state = page.evaluate("""() => {
                  const image = document.querySelector('#cover');
                  return {
                    src: image?.getAttribute('src') || '',
                    currentSrc: image?.currentSrc || '',
                    complete: image?.complete ?? null,
                    naturalWidth: image?.naturalWidth ?? null,
                    naturalHeight: image?.naturalHeight ?? null,
                    className: image?.className || '',
                    alt: image?.alt || '',
                    feedback: document.querySelector('#feedback')?.textContent || '',
                    prompt: document.querySelector('#answerPrompt')?.textContent || '',
                    mode: document.querySelector('#modeSelect')?.value || '',
                    questionMode: typeof currentQuestionMode === 'undefined' ? null : currentQuestionMode,
                    questionIndex: typeof index === 'undefined' ? null : index,
                    questionCount: typeof questions === 'undefined' ? null : questions.length,
                    currentQuestion: typeof questions === 'undefined' ? null : (() => {
                      const q = questions[index];
                      return q ? {
                        id: q.id,
                        title: q.title,
                        coverImage: q.coverImage || null,
                        selectedImage: q.coverImage?.extraLarge || q.coverImage?.large || q.coverImage?.medium || ''
                      } : null;
                    })()
                  };
                }""")
                raise AssertionError(
                    "Image question did not load its cover: "
                    + json.dumps({"initialState": initial_image_state, "state": image_state, "responses": image_responses, "requestFailures": image_failures, "pageErrors": errors, "consoleErrors": console_errors}, ensure_ascii=False)
                ) from error
        if mode == "synopsis":
            correct_answer = page.evaluate("() => correctAnswer")
            assert isinstance(correct_answer, str) and re.search(r"[ぁ-んァ-ヶ一-龯]", correct_answer), (
                "Japanese synopsis questions must store a Japanese correct-answer title: "
                + str(correct_answer)
            )
            correct_choice = page.locator("#answers button.answer").filter(has_text=correct_answer)
            assert correct_choice.count() == 1, (
                "The Japanese correct-answer title must appear exactly once among the choices: "
                + correct_answer
            )
            correct_choice.click()
        else:
            answers.first.click()
        page.locator("#result:not(.hidden)").wait_for(state="visible", timeout=20000)
        if mode == "synopsis":
            result_text = page.locator("#resultText").inner_text()
            assert "1問中 1問正解" in result_text, (
                "Selecting the Japanese synopsis answer must be scored as correct: " + result_text
            )
        if mode == "synopsis":
            # Typed synopsis questions ask for the title too; do not show the generic base-title note.
            page.locator("#homeAfterQuiz").click()
            page.wait_for_function(
                "() => { const button = document.querySelector('#start'); return button && !button.classList.contains('hidden') && !button.disabled; }",
                timeout=20000,
            )
            page.locator("#modeSelect").select_option("synopsis")
            page.locator("#answerFormatSelect").select_option("typed")
            page.locator("#difficultySelect").select_option("easy")
            page.locator("#questionCount").fill("1")
            page.locator("#timeLimitSelect").select_option("60")
            page.locator("#start").click()
            page.locator("#typedAnswer").wait_for(state="visible", timeout=20000)
            typed_prompt = page.locator("#answerPrompt").inner_text()
            assert "作品名の基本部分だけ入力してください" not in typed_prompt, (
                "Typed synopsis questions must not show the generic title-entry note: " + typed_prompt
            )
            typed_correct_answer = page.evaluate("() => correctAnswer")
            assert isinstance(typed_correct_answer, str) and typed_correct_answer.strip(), (
                "Typed synopsis question must have a Japanese title answer"
            )
            page.locator("#typedAnswer").fill(typed_correct_answer)
            page.locator("#submitTypedAnswer").click()
            page.locator("#result:not(.hidden)").wait_for(state="visible", timeout=20000)
            typed_result = page.locator("#resultText").inner_text()
            assert "1問中 1問正解" in typed_result, (
                "Typing the Japanese synopsis answer must be scored as correct: " + typed_result
            )
        assert not errors, f"Question mode {mode} raised JavaScript errors: " + " | ".join(errors)
        context.close()
        print(f"PASS: question mode {mode}")


def test_question_count_controls(browser):
    """Check custom question counts and fixed-count play modes."""
    context = browser.new_context(locale="ja-JP")
    page = context.new_page()
    install_routes(page)
    page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded")
    page.wait_for_function(
        "() => { const button = document.querySelector('#start'); return button && !button.classList.contains('hidden') && !button.disabled; }",
        timeout=60000,
    )
    count = page.locator("#questionCount")
    preset = page.locator("#questionCountPreset")
    group_labels = page.locator("#modeSelect optgroup").evaluate_all("(groups) => groups.map(group => group.label)")
    assert group_labels == ["作品を当てる", "作品情報を当てる"], (
        "Question modes must be grouped into clear categories: " + repr(group_labels)
    )
    difficulty_help = page.locator("#difficultyHelp").inner_text()
    assert "60%" in difficulty_help and "40%" in difficulty_help, (
        "Difficulty guidance must disclose the 60/40 weighting: " + difficulty_help
    )
    assert count.get_attribute("min") == "1" and count.get_attribute("max") == "10000", (
        "Custom question count must be limited to 1–10,000"
    )
    count.fill("37")
    assert preset.input_value() == "custom", "A non-preset count must select the custom option"
    preset.select_option("20")
    assert count.input_value() == "20", "Selecting a preset must update the numeric input"
    page.locator("#playMode").select_option("daily")
    assert count.is_disabled() and preset.is_disabled(), "Daily mode must disable the custom count controls"
    assert "10問固定" in page.locator("#questionCountHelp").inner_text(), (
        "Daily mode must explain its fixed question count"
    )
    page.locator("#playMode").select_option("normal")
    assert count.is_enabled() and preset.is_enabled(), "Normal mode must allow custom question counts"
    page.locator("#playMode").select_option("endless")
    assert count.is_disabled() and preset.is_disabled(), "Endless mode must disable the fixed question count"
    context.close()


def test_live_quiz_preparation_performance(browser):
    """Measure real deployed-catalog startup and warm replays in Chromium."""
    context = browser.new_context(
        viewport={"width": 1280, "height": 900},
        locale="ja-JP",
        service_workers="block",
    )
    page = context.new_page()
    page.add_init_script("""(() => {
      window.__aqwLongTasks = [];
      window.__aqwIndexedDBPutSamples = [];
      if (typeof IDBObjectStore !== 'undefined') {
        const originalPut = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function(...args) {
          const started = performance.now();
          try { return originalPut.apply(this, args); }
          finally {
            const duration = performance.now() - started;
            window.__aqwIndexedDBPutSamples.push({
              store: this.name,
              key: args.length > 1 ? String(args[1]) : 'inline',
              durationMs: Math.round(duration * 10) / 10
            });
          }
        };
      }
      if ('PerformanceObserver' in window) {
        try {
          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              window.__aqwLongTasks.push({
                startTime: Math.round(entry.startTime * 10) / 10,
                duration: Math.round(entry.duration * 10) / 10,
                name: entry.name,
                attribution: (entry.attribution || []).map(item => ({
                  name: item.name,
                  containerType: item.containerType,
                  containerName: item.containerName
                }))
              });
            }
          }).observe({entryTypes: ['longtask']});
        } catch {}
      }
    })();""")
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
          return button && !button.classList.contains('hidden') && !button.disabled
            && button.textContent.includes('クイズを開始')
            && !button.textContent.includes('読み込み中');
        }""",
        timeout=120000,
    )
    ready_ms = round((__import__("time").perf_counter() - navigation_started) * 1000, 1)

    # Measure synchronous question rendering separately from candidate preparation.
    page.evaluate("""() => {
      window.__aqwQuestionRenderMetrics = {};
      for (const name of ['showQuestion', 'showQuestionInternal']) {
        const original = window[name];
        if (typeof original === 'function' && !original.__aqwPerfWrapped) {
          const wrapped = function(...args) {
            const started = performance.now();
            try { return original.apply(this, args); }
            finally { window.__aqwQuestionRenderMetrics[name] = Math.round(performance.now() - started); }
          };
          wrapped.__aqwPerfWrapped = true;
          window[name] = wrapped;
        }
      }
    }""")

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
          preparationStages: (window.__aqwQuizPreparationStages || []).slice(),
          profileLoadSamples: (window.__aqwProfileLoadSamples || []).slice(),
          candidateCount: (window.__aqwLastCandidateSelectionMs == null) ? null :
            (window.__aqwLastCandidateCount ?? null),
          questionMode: typeof currentQuestionMode === 'undefined' ? null : currentQuestionMode,
          questionRenderMs: window.__aqwQuestionRenderMetrics?.showQuestion ?? null,
          questionRenderInternalMs: window.__aqwQuestionRenderMetrics?.showQuestionInternal ?? null,
          poolCount: typeof pool === 'undefined' ? null : pool.length,
          failedImageCount: typeof failedImageUrls === 'undefined' ? null : failedImageUrls.size,
          questionSummaryCached: typeof questionChoiceSummaryCache === 'undefined' ? null :
            !!(questionChoiceSummaryCache && questionChoiceSummaryCache.pool === pool),
          catalogueResources: performance.getEntriesByType('resource')
            .filter(entry => /anime-catalog|title-image-exclusions/.test(entry.name))
            .map(entry => ({name: entry.name.split('/').pop(), durationMs: Math.round(entry.duration * 10) / 10,
              transferSize: entry.transferSize || null})),
          longTasks: (window.__aqwLongTasks || []).slice(-20),
          indexedDBPutSamples: (window.__aqwIndexedDBPutSamples || []).slice(-30)
        })""")
        profile_samples = metrics["profileLoadSamples"][profile_start:]
        log_text = performance_logs[log_start:]
        rounds.append({
            "round": round_index + 1,
            "clickToFirstQuestionMs": first_question_ms,
            "candidateSelectionMs": metrics["candidateSelectionMs"],
            "quizPreparationMs": metrics["quizPreparationMs"],
            "questionRenderMs": metrics["questionRenderMs"],
            "questionRenderInternalMs": metrics["questionRenderInternalMs"],
            "longTasks": metrics["longTasks"],
            "indexedDBPutSamples": metrics["indexedDBPutSamples"],
            "preparationStages": metrics["preparationStages"],
            "profileLoadMs": profile_samples[-1] if profile_samples else None,
            "performanceLog": log_text[-1] if log_text else None,
            "catalogueResources": metrics["catalogueResources"],
        })

        page.locator("#answers button.answer").first.click()
        page.locator("#result:not(.hidden)").wait_for(state="visible", timeout=30000)
        if round_index < 2:
            page.locator("#restart").wait_for(state="visible", timeout=30000)
            try:
                page.wait_for_function(
                    """() => typeof questionChoiceSummaryCache !== 'undefined'
                      && questionChoiceSummaryCache
                      && questionChoiceSummaryCache.pool === pool""",
                    timeout=15000,
                )
            except Exception as error:
                cache_state = page.evaluate("""() => ({
                  quizFinished: typeof quizFinished === 'undefined' ? null : quizFinished,
                  poolCount: typeof pool === 'undefined' ? null : pool.length,
                  cacheExists: typeof questionChoiceSummaryCache !== 'undefined' && !!questionChoiceSummaryCache,
                  cachePoolCount: typeof questionChoiceSummaryCache === 'undefined' ? null : questionChoiceSummaryCache?.pool?.length ?? null,
                  buildExists: typeof questionChoiceSummaryBuild !== 'undefined' && !!questionChoiceSummaryBuild,
                  buildPoolCount: typeof questionChoiceSummaryBuild === 'undefined' ? null : questionChoiceSummaryBuild?.pool?.length ?? null,
                  quizActive: document.body.classList.contains('quiz-active'),
                  resultVisible: !document.querySelector('#result')?.classList.contains('hidden')
                })""")
                raise AssertionError(
                    "Restart question index did not become ready: "
                    + json.dumps(cache_state, ensure_ascii=False)
                ) from error

    # Enforce generous but meaningful regression budgets on the real catalogue.
    # These measurements run on the same GitHub Actions Chromium runner each time.
    catalogue_ready_budget_ms = 10000
    first_question_budget_ms = 2500
    question_render_budget_ms = 250
    catalogue_transfer_budget_bytes = 4 * 1024 * 1024
    assert ready_ms <= catalogue_ready_budget_ms, (
        f"Catalogue readiness exceeded {catalogue_ready_budget_ms} ms: {ready_ms} ms"
    )
    for sample in rounds:
        assert sample["clickToFirstQuestionMs"] <= first_question_budget_ms, (
            f"Quiz start exceeded {first_question_budget_ms} ms in round "
            f"{sample['round']}: {sample['clickToFirstQuestionMs']} ms"
        )
        assert sample["questionRenderMs"] is not None, (
            f"Question render timing was not captured in round {sample['round']}"
        )
        assert sample["questionRenderMs"] <= question_render_budget_ms, (
            f"Question rendering exceeded {question_render_budget_ms} ms in round "
            f"{sample['round']}: {sample['questionRenderMs']} ms"
        )
    catalogue_transfer_bytes = sum(
        resource["transferSize"] or 0
        for sample in rounds[:1]
        for resource in sample["catalogueResources"]
    )
    if catalogue_transfer_bytes:
        assert catalogue_transfer_bytes <= catalogue_transfer_budget_bytes, (
            "Compressed catalogue resources exceeded the 4 MiB transfer budget: "
            f"{catalogue_transfer_bytes} bytes"
        )

    assert not page_errors, "Live quiz raised JavaScript errors: " + " | ".join(page_errors)
    print("PERFORMANCE BUDGETS: " + json.dumps({
        "catalogueReadyMs": ready_ms,
        "catalogueReadyBudgetMs": catalogue_ready_budget_ms,
        "firstQuestionBudgetMs": first_question_budget_ms,
        "questionRenderBudgetMs": question_render_budget_ms,
        "catalogueTransferBytes": catalogue_transfer_bytes or None,
        "catalogueTransferBudgetBytes": catalogue_transfer_budget_bytes,
    }, ensure_ascii=False))
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

    def empty_anilist_search(route):
        payload = route.request.post_data_json or {}
        if (payload.get("variables") or {}).get("search"):
            route.fulfill(
                status=200,
                headers={**CORS_HEADERS, "Content-Type": "application/json"},
                body=json.dumps({"data": {"Page": {
                    "pageInfo": {"hasNextPage": False, "totalPages": 1},
                    "media": [],
                }}}, ensure_ascii=False),
            )
        else:
            route.fallback()

    # Prove the local shared catalogue powers search when AniList has no matches.
    page.route("https://graphql.anilist.co", empty_anilist_search)
    page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded")
    page.locator("#start").wait_for(state="visible", timeout=60000)

    page.locator("#searchTab").click()
    assert page.locator("#search").is_visible(), "Search tab must open the search panel"
    page.evaluate("""() => {
      sharedSearchCatalogCache = [{
        id: 990001, countryOfOrigin: "JP", source: "ORIGINAL", originVerified: true,
        isAdult: false, format: "TV", popularity: 100,
        title: { native: "共有カタログ専用検索作品", english: "Local Catalogue Search Fixture", romaji: "Local Catalogue Search Fixture" },
        synonyms: ["共有カタログ略称"],
        coverImage: { large: "https://example.test/cover.jpg" }, genres: [],
        externalLinks: [{
          url: "https://example.test/official-1", site: "Official Site",
          type: "INFO", language: "Japanese", isDisabled: false
        }]
      }];
    }""")
    dedupe_ids = page.evaluate("""() => {
      const make = (id, native, english, year, format, popularity) => ({
        id, countryOfOrigin: "JP", source: "ORIGINAL", originVerified: true,
        isAdult: false, format, seasonYear: year, popularity,
        title: { native, english, romaji: english }, coverImage: { large: "https://example.test/cover.jpg" },
        genres: []
      });
      return deduplicateSearchResults([
        make(1, "作品A", "Title A", 2024, "TV", 100),
        make(2, "作品A", "Title A", 2024, "TV", 90),
        make(3, "作品A", "Title A Season 2", 2025, "TV", 80),
        make(4, "別作品", "Title A", 2024, "TV", 70),
        make(5, "作品A", "Title A", 2024, "OVA", 60)
      ]).map(item => item.id);
    }""")
    assert dedupe_ids == [1, 3, 4, 5], (
        "Search deduplication must remove exact duplicates without hiding sequels, "
        "different titles sharing an alias, or distinct formats: " + str(dedupe_ids)
    )
    sequel_alias = page.evaluate("""() => {
      const item = {
        id: 991, countryOfOrigin: "JP", isAdult: false, format: "TV", seasonYear: 2020,
        title: { native: "暗殺教室 第2期", english: "Assassination Classroom Second Season", romaji: "Ansatsu Kyoushitsu 2nd Season" },
        synonyms: [], genres: []
      };
      return aliasCandidates(item);
    }""")
    assert "暗教2期" in sequel_alias, (
        "Curated Japanese abbreviations must also match season-title variants: "
        + str(sequel_alias)
    )
    synonym_aliases = page.evaluate("""() => aliasCandidates({
      id: 992, title: { native: "検証作品", english: "Test Anime", romaji: "Test Anime" },
      synonyms: ["検証の略称", "検証作品"], genres: []
    })""")
    assert "検証の略称" in synonym_aliases and "検証作品" not in synonym_aliases, (
        "A real alternate title must remain eligible as an alias, while the primary title itself must not be duplicated: "
        + str(synonym_aliases)
    )
    sequel_synopsis = page.evaluate("""() => descriptionOf({
      title: { native: "進撃の巨人 The Final Season Part 2", english: "Attack on Titan: The Final Season Part 2" }
    })""")
    assert len(sequel_synopsis) >= 45 and re.search(r"[ぁ-んァ-ヶ一-龯]", sequel_synopsis), (
        "Japanese synopsis overrides must also resolve supported sequel/part title variants: "
        + sequel_synopsis
    )
    page.locator("#query").fill("共有カタログ専用検索作品")
    page.locator("#searchButton").click()
    page.locator("#results .anime").first.wait_for(state="visible", timeout=20000)
    assert page.locator("#results .anime").count() > 0, "Search must render matching anime cards"
    assert page.locator("#results .anime strong").first.inner_text() == "共有カタログ専用検索作品", (
        "Search must find a title that exists only in the shared catalogue when AniList returns no matches"
    )
    page.route(
        "https://example.test/official-1",
        lambda route: route.fulfill(
            status=200,
            content_type="text/html",
            body="<!doctype html><title>Official destination</title><p>official destination</p>",
        ),
    )
    official_link = page.locator("#results .anime a").first
    assert official_link.get_attribute("target") == "_self", (
        "Official-site links must navigate in the current page on mobile browsers"
    )
    assert official_link.get_attribute("href") == "https://example.test/official-1"
    with page.expect_navigation(url="https://example.test/official-1", wait_until="domcontentloaded"):
        official_link.click()
    assert "official destination" in page.locator("body").inner_text().lower()
    page.go_back(wait_until="domcontentloaded")

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


def test_quiz_quit_only(browser):
    """Verify the removed pause controls stay absent and quitting an active quiz works."""
    context = browser.new_context(viewport={"width": 1280, "height": 900}, locale="ja-JP")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("dialog", lambda dialog: dialog.accept())
    install_routes(page)
    page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded")
    page.locator("#start").wait_for(state="visible", timeout=60000)
    page.locator("#modeSelect").select_option("synopsis")
    page.locator("#answerFormatSelect").select_option("choices")
    page.locator("#difficultySelect").select_option("easy")
    page.locator("#questionCount").fill("1")
    page.locator("#start").click()
    page.locator("#answers button.answer").first.wait_for(state="visible", timeout=20000)

    assert page.locator("#pauseButton").count() == 0, "Pause control must be absent"
    assert page.locator("#pauseNotice").count() == 0, "Pause notice must be absent"
    page.locator("#quitQuizButton").click()
    page.wait_for_function(
        "() => document.querySelector('#quizArea')?.classList.contains('hidden') && !document.querySelector('#setupControls')?.classList.contains('hidden')",
        timeout=10000,
    )
    assert not errors, "Quit raised JavaScript errors: " + " | ".join(errors)
    context.close()



def test_multiplayer_auth_gate(browser):
    """Ensure the online match controls remain hidden until a user is authenticated."""
    context = browser.new_context(viewport={"width": 1280, "height": 900}, locale="ja-JP")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.route(
        "**/supabase-js@2*",
        lambda route: route.fulfill(
            status=200,
            content_type="application/javascript",
            body="window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null},error:null})}})};",
        ),
    )
    page.goto(f"{BASE_URL}/multiplayer.html", wait_until="domcontentloaded")
    page.locator("#authGate:not(.hidden)").wait_for(state="visible", timeout=10000)
    assert page.locator("#mainArea:not(.hidden)").count() == 0, "Online match controls must remain hidden without a session"
    assert not errors, "Multiplayer authentication gate raised JavaScript errors: " + " | ".join(errors)
    context.close()


def test_public_information_and_admin_pages(browser):
    """Smoke-test public information pages and the unauthenticated admin gate."""
    context = browser.new_context(viewport={"width": 1280, "height": 900}, locale="ja-JP")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    for path, heading in [
        ("guide.html", "遊び方・お知らせ"),
        ("privacy.html", "プライバシーポリシー"),
        ("terms.html", "利用規約"),
    ]:
        page.goto(f"{BASE_URL}/{path}", wait_until="domcontentloaded")
        page.locator("h1").filter(has_text=heading).wait_for(state="visible", timeout=10000)
        assert page.title().strip(), f"{path} must have a document title"

    page.route(
        "**/supabase-js@2*",
        lambda route: route.fulfill(
            status=200,
            content_type="application/javascript",
            body="window.supabase={createClient:()=>({auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};",
        ),
    )
    page.goto(f"{BASE_URL}/admin.html", wait_until="domcontentloaded")
    page.locator("#loginCard:not(.hidden)").wait_for(state="visible", timeout=10000)
    assert page.locator("#loginForm").is_visible(), "Admin console must show sign-in when no session exists"
    assert page.locator("#loginButton").is_enabled(), "Admin sign-in control must be enabled"
    assert not errors, "Public/admin pages raised JavaScript errors: " + " | ".join(errors)
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
    page.locator("#modeSelect").select_option("synopsis")
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


def test_mobile_page_overflow(browser):
    """Check every primary page at narrow, common, and tablet mobile widths."""
    paths = [
        "index.html",
        "recommend.html",
        "multiplayer.html",
        "guide.html",
        "privacy.html",
        "terms.html",
        "admin.html",
    ]
    for width in (320, 360, 390, 768):
        context = browser.new_context(
            viewport={"width": width, "height": 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
            locale="ja-JP",
        )
        page = context.new_page()
        install_routes(page)
        try:
            for path in paths:
                page.goto(f"{BASE_URL}/{path}", wait_until="domcontentloaded")
                page.wait_for_timeout(250)
                dimensions = page.evaluate("""() => ({
                    viewport: window.innerWidth,
                    document: document.documentElement.scrollWidth,
                    body: document.body?.scrollWidth || 0
                })""")
                widest = max(dimensions["document"], dimensions["body"])
                assert widest <= dimensions["viewport"] + 1, (
                    f"Mobile horizontal overflow at {width}px on {path}: {dimensions}"
                )
        finally:
            context.close()


def test_auth_form_reads_filled_inputs(browser):
    """Ensure filled fields are not misreported as empty when Supabase is unavailable."""
    context = browser.new_context(viewport={"width": 1280, "height": 900}, locale="ja-JP")
    page = context.new_page()
    page.route("**/supabase-js@2*", lambda route: route.abort())
    page.goto(f"{BASE_URL}/index.html", wait_until="domcontentloaded")
    # Open the Community section through its real navigation control so the
    # lazy Supabase initializer runs exactly as it does for site visitors.
    page.locator("#socialTab").click()
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
    assert question_count == 20, f"Diagnosis must contain exactly 20 questions: {question_count}"

    # Four substantive choices plus neutral and free-text options.
    expected_choice_count = 6

    for step in range(question_count):
        choices = page.locator("#choices button.choice")
        choices.first.wait_for(state="visible", timeout=10000)
        assert choices.count() == expected_choice_count, f"Question {step + 1} must have four substantive choices plus two optional choices"
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

    # Record one recommendation rating first. The analytics panel (which
    # contains the self-test control) is intentionally hidden until feedback exists.
    first_card = page.locator("#animeCards .anime, #discoveryCards .anime").first
    first_card.get_by_role("button", name="合っている").click()
    page.wait_for_function(
        "() => document.querySelector('#shareStatus')?.textContent.includes('評価を保存しました')",
        timeout=10000,
    )
    # Run the page's complete recommendation self-test suite, including the
    # 20-question structure, non-overlapping dimensions, scoring, exclusions,
    # duplicate prevention, and foreign-title eligibility rules.
    self_test_button = page.get_by_role("button", name="推薦ロジックを自己点検")
    self_test_button.wait_for(state="visible", timeout=10000)
    self_test_button.click()
    self_test_text = page.locator("#results").inner_text()
    match = re.search(r"自己点検結果：(\d+) / (\d+) 項目成功", self_test_text)
    assert match, "Recommendation self-test did not produce a result: " + self_test_text
    assert match.group(1) == match.group(2), (
        "Recommendation self-tests reported failures: " + self_test_text
    )

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
    public_smoke = "--public-smoke" in sys.argv
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            if public_smoke:
                test_public_catalogue_all_modes(browser)
                print("PASS: public catalogue and all four quiz formats")
                test_live_quiz_preparation_performance(browser)
                print("PASS: public live-catalogue quiz preparation performance (3 rounds)")
                test_recommendation_diagnosis(browser)
                print("PASS: public recommendation diagnosis -> results")
                test_mobile_quiz_layout(browser)
                print("PASS: public mobile quiz layout and touch answer")
                test_mobile_page_overflow(browser)
                print("PASS: public mobile page overflow (7 pages)")
                return
            # Run the core quiz journey first so network-heavy checks cannot
            # delay detection of a broken start -> answer -> finish flow.
            test_compressed_catalogue_preferred(browser)
            print("PASS: compressed catalogue preferred without JSON fallback")
            test_quiz_translation_question_text(browser)
            print("PASS: question text translations (8 locales)")
            test_quiz_start_answer_finish(browser)
            print("PASS: quiz start -> answer -> finish")
            test_all_question_modes(browser)
            print("PASS: all selectable question modes")
            test_question_count_controls(browser)
            print("PASS: custom and fixed question count controls")
            test_main_navigation_and_search(browser)
            print("PASS: primary navigation and anime search")
            test_quiz_quit_only(browser)
            print("PASS: quiz quit (pause controls absent)")
            test_multiplayer_auth_gate(browser)
            print("PASS: multiplayer authentication gate")
            test_recommendation_diagnosis(browser)
            print("PASS: recommendation diagnosis -> results")
            test_public_information_and_admin_pages(browser)
            print("PASS: guide/privacy/terms/admin authentication gate")
            test_mobile_quiz_layout(browser)
            print("PASS: mobile quiz layout and touch answer")
            test_mobile_page_overflow(browser)
            print("PASS: mobile page overflow (7 pages)")
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
