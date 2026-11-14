# Wikidata anime discovery candidates

This is a separate discovery snapshot for finding additional Japanese-origin anime records.

- Source: Wikidata Query Service
- Structured data license: CC0
- Selection: country of origin (P495) is Japan (Q17), and instance/subclass of anime (Q1107)
- Refresh: weekly through GitHub Actions, with a manual workflow-dispatch option
- Rate-limit behavior: one query per run, bounded retries, timeout, and Retry-After handling
- Cache: JSON plus deterministic gzip snapshot

## Important limitations

This is **not** the live recommendation catalogue. Wikidata's coverage and metadata are incomplete. A candidate must be checked for Japanese-origin status, eligible format, adult-content exclusions, image validity, duplicates, and required recommendation metadata before it can be promoted to `data/anime-catalog.json`.

The QID is a Wikidata identifier and must never be treated as an AniList ID. Existing AniList bulk synchronization remains separately disabled pending terms review. No AniList bulk collection is performed by this workflow.

Wikidata requests follow the published Query Service limits and data-access guidance. The snapshot identifies Wikidata as its source as requested by Wikidata's reuse guidance.
