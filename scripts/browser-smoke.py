#!/usr/bin/env python3
"""Deterministic browser smoke tests for the deployed Anime Quiz World UI.

The tests use a small fixture catalogue and a mocked AniList GraphQL response so
they exercise the real deployed HTML/JavaScript without depending on API quotas
or downloading the full production catalogue.
"""
import json
import os
import re
from playwright.sync_api import sync_playwright

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
    title = f"検証作品{index + 1}"
    cover = f"https://example.test/cover-{index + 1}.svg"
    return {
        "id": anime_id,
        "countryOfOrigin": "JP",
        "source": "ORIGINAL",
        "isAdult": False,
        "format": "TV",
        "title": {
            "native": title,
            "english": f"Verification Anime {index + 1}",
            "romaji": f"Verification Anime {index + 1}",
        },
        "description": "これはブラウザ自動検査用の架空作品データです。物語と登場人物の情報を含みます。",
        "coverImage": {"large": cover, "medium": cover, "extraLarge": cover},
        "episodes": 12,
        "seasonYear": 2010 + index,
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
                "records": [],
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
    page.locator("#modeSelect").select_option("titleYear")
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
    assert 1 <= question_count <= 20, f"Diagnosis exceeds its 20-question cap: {question_count}"

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


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            test_quiz_start_answer_finish(browser)
            print("PASS: quiz start -> answer -> finish")
            test_recommendation_diagnosis(browser)
            print("PASS: recommendation diagnosis -> results")
        finally:
            browser.close()


if __name__ == "__main__":
    main()
