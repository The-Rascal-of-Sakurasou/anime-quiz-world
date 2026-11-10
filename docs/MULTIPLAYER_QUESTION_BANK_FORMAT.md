# Multiplayer question bank import format

The multiplayer question bank is private and server-authoritative. The browser receives the prompt and options, but never receives `correct_option_id`.

## JSON format

Provide a JSON array. Every question must contain:

| Field | Required | Rules |
|---|---|---|
| `source_key` | Yes | Stable unique ID from the source dataset; 1–160 characters |
| `category` | No | Defaults to `general`; maximum 40 characters |
| `prompt` | Yes | 1–500 characters |
| `image_url` | No | HTTPS URL only; maximum 2,048 characters |
| `options` | Yes | 2–6 objects, each with unique `id` and non-empty `text` |
| `correct_option_id` | Yes | Must match one option ID |

Each option ID is limited to 100 characters and option text to 300 characters. Extra fields are rejected so answer explanations, answer text, or other private metadata cannot accidentally be exposed in the question payload.

Example structure (fictional placeholder data, not a real quiz item):

```json
[
  {
    "source_key": "sample:work:001",
    "category": "work",
    "prompt": "Which title matches this fictional description?",
    "image_url": "https://example.org/sample-cover.jpg",
    "options": [
      { "id": "a", "text": "Example title A" },
      { "id": "b", "text": "Example title B" },
      { "id": "c", "text": "Example title C" }
    ],
    "correct_option_id": "b"
  }
]
```

## Generate an SQL import file

Run locally with Node.js:

```bash
node scripts/build-question-bank-seed.mjs questions.json question-bank-seed.sql
```

The generator validates the whole JSON file before writing SQL. It rejects duplicate source keys, duplicate question content, duplicate option IDs, invalid answer IDs, non-HTTPS images, and unsupported fields.

Imports are idempotent by `source_key`: re-importing the same source key updates that record rather than creating another copy. Review the generated SQL and question accuracy before applying it.

## Safety and deployment

- The generator only creates a local SQL file; it does not connect to Supabase.
- Apply the SQL only to a disposable test database while the multiplayer feature is still in development.
- Do not put answer explanations or the answer key inside `question_payload`.
- Use source IDs that remain stable across dataset refreshes.
- Confirm that every question has a reliable source and that image URLs are permitted for the intended use.
- Production import permissions and an admin workflow have not yet been implemented.
