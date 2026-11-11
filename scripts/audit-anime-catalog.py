#!/usr/bin/env python3
"""Audit Anime Quiz World catalogue.

Input: data/anime-catalog.json (AniList-shaped schemaVersion 2).
Output: replaces the catalogue with Japanese-origin eligible works only and
writes data/title-image-exclusions.json. Cover images are OCR-checked with
Tesseract; only images with no title match are marked safe for title-image quiz.
Requires Python 3.10+, Pillow, and the Tesseract executable with jpn and eng data.
"""
from __future__ import annotations

import argparse
import io
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data" / "anime-catalog.json"
EXCLUSIONS = ROOT / "data" / "title-image-exclusions.json"
ALLOWED_FORMATS = {"TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL"}
SOURCE_RULES = {
    "MANGA": ("MANGA", {"MANGA", "ONE_SHOT"}),
    "LIGHT_NOVEL": ("MANGA", {"NOVEL"}),
    "NOVEL": ("MANGA", {"NOVEL"}),
    "DOUJINSHI": ("MANGA", {"MANGA", "ONE_SHOT", "NOVEL"}),
    "ANIME": ("ANIME", ALLOWED_FORMATS),
}


def norm(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).casefold()
    return re.sub(r"[^\wぁ-んァ-ヶ一-龯]", "", value, flags=re.UNICODE)


def japanese_origin(item: dict) -> bool:
    if item.get("countryOfOrigin") != "JP":
        return False
    if item.get("originVerified") is True or item.get("source") == "ORIGINAL":
        return True
    rule = SOURCE_RULES.get(item.get("source"))
    if not rule:
        return False
    node_type, formats = rule
    return any(
        edge.get("relationType") in {"SOURCE", "ADAPTATION"}
        and isinstance(edge.get("node"), dict)
        and edge["node"].get("type") == node_type
        and edge["node"].get("countryOfOrigin") == "JP"
        and edge["node"].get("format") in formats
        for edge in (item.get("relations") or {}).get("edges", [])
    )


def title_variants(item: dict) -> set[str]:
    title = item.get("title") or {}
    values = [title.get(k) for k in ("native", "english", "romaji")]
    values += item.get("synonyms") or []
    return {norm(v) for v in values if isinstance(v, str) and norm(v)}


def image_url(item: dict) -> str:
    cover = item.get("coverImage") or {}
    return cover.get("large") or cover.get("medium") or cover.get("extraLarge") or ""


def ocr_image(url: str, languages: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "AnimeQuizWorld-Audit/1.0"})
    with urllib.request.urlopen(request, timeout=25) as response:
        data = response.read(12 * 1024 * 1024 + 1)
    if len(data) > 12 * 1024 * 1024:
        raise ValueError("image exceeds 12 MiB")
    from PIL import Image
    with Image.open(io.BytesIO(data)) as image:
        image.thumbnail((1800, 1800))
        image = image.convert("RGB")
        with tempfile.NamedTemporaryFile(suffix=".png") as tmp:
            image.save(tmp.name, format="PNG")
            result = subprocess.run(
                ["tesseract", tmp.name, "stdout", "-l", languages, "--psm", "11"],
                check=True, capture_output=True, text=True, timeout=45,
            )
            return result.stdout


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=CATALOG)
    parser.add_argument("--output", type=Path, default=CATALOG)
    parser.add_argument("--languages", default="jpn+eng")
    parser.add_argument("--limit", type=int, default=0, help="test only first N records (0 = all)")
    args = parser.parse_args()

    if not shutil.which("tesseract"):
        print("ERROR: Tesseract OCR is not installed.", file=sys.stderr)
        return 2
    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        print("ERROR: Pillow is missing. Install with: python -m pip install Pillow", file=sys.stderr)
        return 2
    if not args.input.exists():
        print(f"ERROR: catalogue not found: {args.input}", file=sys.stderr)
        return 2

    payload = json.loads(args.input.read_text(encoding="utf-8"))
    if payload.get("schemaVersion") != 2 or not isinstance(payload.get("items"), list):
        print("ERROR: expected schemaVersion 2 with an items array.", file=sys.stderr)
        return 2

    original = payload["items"]
    kept = [
        item for item in original
        if isinstance(item, dict)
        and japanese_origin(item)
        and item.get("format") in ALLOWED_FORMATS
        and item.get("isAdult") is not True
        and "Hentai" not in (item.get("genres") or [])
        and item.get("id")
        and image_url(item).startswith("https://")
        and title_variants(item)
    ]
    if args.limit:
        audit_items = kept[:args.limit]
    else:
        audit_items = kept

    excluded, records = [], []
    failures = []
    for index, item in enumerate(audit_items, 1):
        anime_id = int(item["id"])
        try:
            text = ocr_image(image_url(item), args.languages)
            ocr_key = norm(text)
            matched = any(len(key) >= 2 and key in ocr_key for key in title_variants(item))
            records.append({"id": anime_id, "hasTitleText": bool(matched), "method": "tesseract-ocr"})
            if matched:
                excluded.append(anime_id)
            if index % 25 == 0:
                print(f"OCR checked: {index}/{len(audit_items)}")
        except Exception as error:
            # Fail closed: images that could not be checked are excluded from image questions.
            excluded.append(anime_id)
            records.append({"id": anime_id, "hasTitleText": True, "method": "unverified", "error": str(error)[:180]})
            failures.append(anime_id)

    # A partial --limit run must not overwrite the full catalogue or claim the rest were audited.
    if args.limit:
        print(f"TEST ONLY: retained {len(kept)} Japanese-origin records; OCR checked {len(records)}.")
        print(f"Title/uncertain images excluded: {len(excluded)}; full files were not changed.")
        return 0

    payload["items"] = kept
    payload["generatedAt"] = datetime.now(timezone.utc).isoformat()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    audit = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "Tesseract OCR (Japanese + English), normalized literal title matching; failures excluded",
        "catalogCount": len(kept),
        "checkedCount": len(records),
        "excludedCount": len(set(excluded)),
        "excludedIds": sorted(set(excluded)),
        "records": records,
    }
    EXCLUSIONS.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Japanese-origin catalogue: {len(original)} -> {len(kept)}")
    print(f"Images OCR checked: {len(records)}; title/uncertain images excluded: {len(set(excluded))}")
    print(f"Unverified images (excluded): {len(failures)}")
    print(f"Wrote: {args.output.relative_to(ROOT) if args.output.is_relative_to(ROOT) else args.output}")
    print(f"Wrote: {EXCLUSIONS.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
