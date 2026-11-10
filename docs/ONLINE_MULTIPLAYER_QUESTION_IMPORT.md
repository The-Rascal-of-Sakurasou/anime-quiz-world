# Online Multiplayer Question Import Specification

Status: design specification only. This document does not import data, alter Supabase, or deploy an Edge Function.

## Purpose

Define a repeatable, reviewable way to load verified questions into the private multiplayer question bank. The multiplayer server must select and score questions from trusted data; clients must never receive answer keys before a round is finalized.

## Supported record shape

Each imported question maps to one row in `private.aqw_question_bank`.

Required fields:

- `category`: stable, allowlisted category key (for example `anime_title`, `studio`, `year`, `synopsis`, or `alias`).
- `question_payload.prompt`: non-empty Japanese prompt shown to players.
- `question_payload.options`: array of 2–6 choices. Every choice has a unique, non-empty `id` and non-empty display `text`.
- `correct_option_id`: ID of exactly one option in the same question.
- `is_active`: whether the question is eligible for new matches.

Optional provenance metadata should be retained in the import manifest, not exposed to players:

- Source name and source URL.
- Date checked.
- Reviewer or review status.
- Canonical work identifier and edition/season identifier, where applicable.
- Notes about ambiguous titles, alternate spellings, or regional naming.

## Example fixture (synthetic; not an anime fact)

```json
{
  "category": "anime_title",
  "question_payload": {
    "prompt": "【テスト問題】架空の作品コード A-01 に対応する表示名は？",
    "options": [
      { "id": "a", "text": "架空作品 A-01" },
      { "id": "b", "text": "架空作品 B-02" },
      { "id": "c", "text": "架空作品 C-03" },
      { "id": "d", "text": "架空作品 D-04" }
    ]
  },
  "correct_option_id": "a",
  "is_active": false
}
```

The fixture is intentionally inactive and must not be used as live quiz content.

## Validation before import

1. Reject missing prompts, blank text, unsupported category keys, or fewer than 2 / more than 6 options.
2. Reject duplicate option IDs and duplicate display text after Unicode NFKC normalization and whitespace normalization.
3. Confirm the correct option ID exists exactly once.
4. Confirm the fact is supported by a primary or otherwise authoritative source. For official production studio, broadcast year, official title, and official site questions, prefer the rights holder, broadcaster, production committee, or the studio's own publication.
5. For synopsis and alias questions, verify that the text actually distinguishes the intended work and does not accidentally describe another season, film, remake, or spin-off.
6. Keep a source URL and checked date for every factual question. Do not import unverifiable facts or scraped material whose reuse is not permitted.
7. Check the catalogue for duplicates using canonical work ID plus edition/season/format. Similar titles alone are not enough to merge separate seasons or films.
8. Keep the answer key in the private table only. Never place `correct_option_id`, answer flags, or answer explanations in the public prompt/options payload.

## Import and release procedure

1. Prepare a reviewed JSON/CSV batch outside the public client.
2. Run structural validation against the schema rules above.
3. Review a sample of every category and all low-confidence or ambiguous records.
4. Import only through a trusted administrative process with service-role credentials held server-side. Never place service-role keys in GitHub Pages, browser JavaScript, or a public repository.
5. Keep new rows inactive until a staging review is complete; then activate the approved batch.
6. Run the multiplayer test plan, including answer secrecy, simultaneous submissions, duplicate prevention, and question reuse checks.
7. Record batch ID, row counts, rejected rows, source manifest, and rollback procedure.

## Operational safeguards

- No public or authenticated-user insert/update policy should be added for the question bank.
- Do not expose a general-purpose import endpoint to the browser.
- Do not silently overwrite an existing question when a duplicate is found; quarantine it for review.
- Deactivate disputed or outdated questions rather than deleting audit context.
- If an official source changes, re-review affected records and preserve the prior source/check history.
- Keep test fixtures separate from production question batches.

## Current implementation boundary

The existing multiplayer SQL and Edge Function are still drafts. This specification is also a draft. No question rows have been imported, no production schema has been changed, and no multiplayer service has been deployed.
