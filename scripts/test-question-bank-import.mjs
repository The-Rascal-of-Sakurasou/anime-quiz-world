import assert from "node:assert/strict";
import { buildQuestionBankSql, validateQuestionBank } from "./build-question-bank-seed.mjs";

const valid = [
  {
    source_key: "test:work:001",
    category: "work",
    prompt: "O'Brien's example question?",
    image_url: "https://cdn.example.test/anime-cover.jpg",
    options: [
      { id: "a", text: "Option A" },
      { id: "b", text: "Option B" },
    ],
    correct_option_id: "a",
  },
  {
    source_key: "test:character:002",
    category: "character",
    prompt: "Who is the character?",
    options: [
      { id: "left", text: "Left" },
      { id: "right", text: "Right" },
      { id: "center", text: "Center" },
    ],
    correct_option_id: "center",
  },
];

const normalized = validateQuestionBank(valid);
assert.equal(normalized.length, 2);
assert.equal(normalized[0].payload.image_url, valid[0].image_url);
assert.equal("correct_option_id" in normalized[0].payload, false);

const sql = buildQuestionBankSql(valid);
assert.match(sql, /on conflict \(source_key\) do update set/);
assert.match(sql, /O''Brien/);
assert.match(sql, /'test:work:001'/);
assert.match(sql, /'a', true/);
assert.doesNotMatch(sql, /"correct_option_id"\s*:/);

assert.throws(() => validateQuestionBank([]), /non-empty JSON array/);
assert.throws(() => validateQuestionBank([{ ...valid[0], source_key: "same" }, { ...valid[1], source_key: "same" }]), /Duplicate source_key/);
assert.throws(() => validateQuestionBank([{ ...valid[0], correct_option_id: "missing" }]), /must match one of its option IDs/);
assert.throws(() => validateQuestionBank([{ ...valid[0], options: [{ id: "a", text: "A" }, { id: "a", text: "Duplicate" }] }]), /duplicate option ID/);
assert.throws(() => validateQuestionBank([{ ...valid[0], image_url: "http://example.test/image.jpg" }]), /must use HTTPS/);
assert.throws(() => validateQuestionBank([{ ...valid[0], explanation: "The answer is Option A" }]), /unsupported field/);
assert.throws(() => validateQuestionBank([valid[0], { ...valid[0], source_key: "different-id" }]), /duplicates another question's content/);

console.log("Question-bank import generator tests passed.");
