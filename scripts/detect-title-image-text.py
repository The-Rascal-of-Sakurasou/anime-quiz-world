#!/usr/bin/env python3
"""Audit AniList cover images for visible text using Japanese/English Tesseract OCR.

Any recognized text makes an image unsafe, even without an exact title match.
Failed image downloads or OCR runs are retried and never treated as clean images.
"""
import argparse
import concurrent.futures
import hashlib
import json
import subprocess
import time
import unicodedata
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

CATALOG = Path("data/anime-catalog.json")
OUTPUT = Path("data/title-image-exclusions.json")
WORKERS = 4
MAX_IMAGE_BYTES = 8 * 1024 * 1024
USER_AGENT = "AnimeQuizWorld-title-image-audit/1.0"


def normalize(value):
    value = unicodedata.normalize("NFKC", str(value or "")).casefold()
    return "".join(ch for ch in value if ch.isalnum())


def title_candidates(anime):
    title = anime.get("title") or {}
    values = [title.get("native"), title.get("english"), title.get("romaji")]
    values.extend(anime.get("synonyms") or [])
    result = []
    seen = set()
    for value in values:
        key = normalize(value)
        if not key or key in seen:
            continue
        # Avoid excluding a cover because OCR happened to recognize a short,
        # common word. Japanese names can be shorter than Latin-script names.
        # Japanese titles can be short; Latin-script titles need a longer match
        # to avoid excluding covers for common short words or numbers.
        has_japanese = any("\u3040" <= ch <= "\u30ff" or "\u3400" <= ch <= "\u9fff" for ch in str(value))
        if len(key) < (2 if has_japanese else 4):
            continue
        seen.add(key)
        result.append((str(value), key))
    return result


def fingerprint(candidates):
    joined = "\n".join(key for _, key in candidates)
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


def cover_url(anime):
    cover = anime.get("coverImage") or {}
    return str(cover.get("large") or cover.get("medium") or cover.get("extraLarge") or "").strip()


def download_image(url):
    if not url.startswith(("https://", "http://")):
        raise ValueError("Unsupported image URL")
    last_error = None
    for attempt in range(2):
        try:
            request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "image/*"})
            with urlopen(request, timeout=20) as response:
                data = response.read(MAX_IMAGE_BYTES + 1)
                if len(data) > MAX_IMAGE_BYTES:
                    raise ValueError("Image exceeds size limit")
                if not data:
                    raise ValueError("Empty image")
                return data
        except (HTTPError, URLError, TimeoutError, OSError) as error:
            last_error = error
            if attempt == 0:
                time.sleep(1.0)
    raise RuntimeError(str(last_error or "Image download failed"))


def run_ocr(image_bytes, page_segmentation_mode=11):
    result = subprocess.run(
        ["tesseract", "stdin", "stdout", "-l", "jpn+eng", "--psm", str(page_segmentation_mode)],
        input=image_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=25,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.decode("utf-8", "replace")[-500:])
    return normalize(result.stdout.decode("utf-8", "replace"))


def title_matches(ocr_text, candidates):
    normalized_text = normalize(ocr_text)
    return [(label, key) for label, key in candidates if key in normalized_text]


def detect_one(anime):
    anime_id = str(anime.get("id", ""))
    url = cover_url(anime)
    candidates = title_candidates(anime)
    if not anime_id.isdigit() or not url or not candidates:
        return None, "missing-data"
    image = download_image(url)
    # Conservative policy: any recognized text makes the image unsafe.
    # Stop as soon as one segmentation mode detects text. Additional modes
    # are only needed when the current mode returns no text at all.
    # This preserves fail-closed behavior while avoiding redundant OCR work
    # for the many covers that already contain visible lettering.
    ocr_text = ""
    for mode in (11, 6, 3):
        ocr_text = run_ocr(image, mode)
        if ocr_text:
            break
    matches = title_matches(ocr_text, candidates)
    has_any_text = bool(ocr_text)
    return {
        "id": int(anime_id),
        "imageUrl": url,
        "titleFingerprint": fingerprint(candidates),
        "hasText": has_any_text,
        "hasTitleText": bool(matches) or has_any_text,
        "matchedTitle": matches[0][0] if matches else None,
    }, None


def self_test():
    assert normalize(" ＳＴＥＩＮＳ；ＧＡＴＥ ") == "steinsgate"
    assert normalize("青春ブタ野郎") == "青春ブタ野郎"
    assert normalize("Kono Subarashii Sekai ni Shukufuku wo!") == "konosubarashiisekainishukufukuwo"
    sample = {"title": {"native": "青春ブタ野郎はバニーガール先輩の夢を見ない", "english": "Rascal Does Not Dream of Bunny Girl Senpai"}}
    candidates = title_candidates(sample)
    text = normalize("青春ブタ野郎はバニーガール先輩の夢を見ない")
    assert title_matches(text, candidates)
    assert not title_matches("random text only", candidates)
    # OCR text without a literal title match must still be treated as unsafe.
    assert bool(normalize("random text only"))
    short_sample = {"title": {"native": "蟲師"}}
    short_candidates = title_candidates(short_sample)
    assert ("蟲師", normalize("蟲師")) in short_candidates
    assert title_matches("蟲師", short_candidates)
    print("Title-image OCR self-tests passed.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    items = catalog.get("items")
    if not isinstance(items, list):
        raise RuntimeError("Anime catalogue has no items array")

    previous = {}
    if OUTPUT.exists():
        try:
            payload = json.loads(OUTPUT.read_text(encoding="utf-8"))
            previous = {str(row["id"]): row for row in payload.get("records", []) if isinstance(row, dict) and row.get("id") is not None}
        except (ValueError, TypeError):
            previous = {}

    records = {}
    todo = []
    skipped = 0
    eligible_count = 0
    for anime in items:
        anime_id = str(anime.get("id", ""))
        url = cover_url(anime)
        candidates = title_candidates(anime)
        if not anime_id.isdigit() or not url or not candidates:
            skipped += 1
            continue
        eligible_count += 1
        old = previous.get(anime_id)
        current_fingerprint = fingerprint(candidates)
        if old and old.get("imageUrl") == url and old.get("titleFingerprint") == current_fingerprint and isinstance(old.get("hasText"), bool) and isinstance(old.get("hasTitleText"), bool):
            records[anime_id] = old
        else:
            todo.append(anime)

    failures = []
    completed = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(detect_one, anime): anime for anime in todo}
        for future in concurrent.futures.as_completed(futures):
            anime = futures[future]
            anime_id = str(anime.get("id"))
            try:
                row, error = future.result()
                if row:
                    records[anime_id] = row
                    completed += 1
                else:
                    failures.append((anime_id, error or "unknown"))
            except Exception as error:  # Keep failed images retryable on the next run.
                failures.append((anime_id, str(error)[:200]))
            if (completed + len(failures)) % 100 == 0:
                print(f"OCR progress: {completed + len(failures)}/{len(todo)} new images")

    excluded_now = sorted(row["id"] for row in records.values() if row.get("hasText") is True or row.get("hasTitleText") is True)
    report = {
        "schemaVersion": 1,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "catalogCount": len(items),
        "eligibleCount": eligible_count,
        "checkedCount": len(records),
        "reusedPreviousCount": max(0, len(records) - completed),
        "newlyProcessedCount": completed,
        "skippedCount": skipped,
        "failedCount": len(failures),
        "excludedCount": len(set(excluded_now) | {int(anime_id) for anime_id, _reason in failures if str(anime_id).isdigit()}),
        "failures": [{"animeId": anime_id, "reason": reason} for anime_id, reason in failures[:1000]],
    }
    report_path = Path("artifacts/title-image-audit/report.json")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + chr(10), encoding="utf-8")

    if failures:
        print(f"OCR could not verify {len(failures)} images; those image IDs will be excluded until a later successful audit.")

    ordered = sorted(records.values(), key=lambda row: int(row["id"]))
    # Fail closed: images that could not be downloaded or OCR-checked stay out
    # of quiz use until a later successful audit verifies them.
    failed_ids = [int(anime_id) for anime_id, _reason in failures if str(anime_id).isdigit()]
    excluded = sorted(set(
        [row["id"] for row in ordered if row.get("hasText") is True or row.get("hasTitleText") is True] + failed_ids
    ))
    previous_payload = {}
    try:
        previous_payload = json.loads(OUTPUT.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        pass

    output = {
        "schemaVersion": 1,
        "generatedAt": previous_payload.get("generatedAt") if previous_payload.get("records") == ordered else time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "Tesseract OCR (Japanese + English), literal title matching",
        "catalogCount": len(items),
        "checkedCount": len(ordered),
        "excludedCount": len(excluded),
        "excludedIds": excluded,
        "records": ordered,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Checked {len(ordered)} images; excluded {len(excluded)} images with detected text or failed OCR; failed {len(failures)}; skipped {skipped}.")
    if failures:
        print("Some images will be retried on the next scheduled run.")
        print("First failures:", failures[:10])


if __name__ == "__main__":
    main()
