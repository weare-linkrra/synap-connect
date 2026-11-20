import test from "node:test";
import assert from "node:assert/strict";
import { upsertTable, upsertTopLevelKey, hasTable, readTopLevelKey } from "../src/lib/toml-edit.js";

test("upsertTable appends a new table to an empty file", () => {
  const out = upsertTable("", "[model_providers.synap]", ['base_url = "https://x"']);
  assert.ok(out.includes("[model_providers.synap]"));
  assert.ok(out.includes('base_url = "https://x"'));
});

test("upsertTable preserves unrelated tables and comments before and after", () => {
  const original = [
    "# a user comment",
    "model = \"gpt-6.1-sol\"",
    "",
    "[model_providers.other]",
    'name = "Other"',
    "",
    "[sandbox]",
    "mode = \"workspace-write\"",
    "",
  ].join("\n");

  const out = upsertTable(original, "[model_providers.synap]", ['base_url = "https://synap402.com/v1"']);

  assert.ok(out.includes("# a user comment"));
  assert.ok(out.includes("[model_providers.other]"));
  assert.ok(out.includes('name = "Other"'));
  assert.ok(out.includes("[sandbox]"));
  assert.ok(out.includes('mode = "workspace-write"'));
  assert.ok(out.includes("[model_providers.synap]"));
  assert.ok(out.includes('base_url = "https://synap402.com/v1"'));
});

test("upsertTable is idempotent and replaces its own previous block in place", () => {
  let text = "[other]\nkey = 1\n";
  text = upsertTable(text, "[model_providers.synap]", ['base_url = "https://a"']);
  text = upsertTable(text, "[model_providers.synap]", ['base_url = "https://b"']);

  // Only one occurrence of the header, and the body reflects the latest call.
  const occurrences = text.split("[model_providers.synap]").length - 1;
  assert.equal(occurrences, 1);
  assert.ok(text.includes('base_url = "https://b"'));
  assert.ok(!text.includes('base_url = "https://a"'));
  assert.ok(text.includes("[other]"));
  assert.ok(text.includes("key = 1"));
});

test("upsertTable with a leadingComment swallows its own previous comment on re-run, not unrelated ones", () => {
  let text = "# unrelated note above\n[keep]\nx = 1\n";
  text = upsertTable(text, "[model_providers.synap]", ['v = "1"'], { leadingComment: "# synap note v1" });
  assert.ok(text.includes("# synap note v1"));
  assert.ok(text.includes("# unrelated note above"));

  text = upsertTable(text, "[model_providers.synap]", ['v = "2"'], { leadingComment: "# synap note v2" });
  assert.ok(text.includes("# synap note v2"));
  assert.ok(!text.includes("# synap note v1"));
  assert.ok(text.includes("# unrelated note above"), "unrelated comment elsewhere must survive");
  assert.ok(text.includes("[keep]"));
  assert.ok(text.includes("x = 1"));
});

test("hasTable finds an existing table and reports absence correctly", () => {
  const text = "[model_providers.synap]\nbase_url = \"x\"\n";
  assert.equal(hasTable(text, "[model_providers.synap]"), true);
  assert.equal(hasTable(text, "[model_providers.other]"), false);
  assert.equal(hasTable(null, "[model_providers.synap]"), false);
});

test("upsertTopLevelKey inserts a key when the file has no such key yet", () => {
  const out = upsertTopLevelKey("[sandbox]\nmode = \"x\"\n", "model", '"qwen3-coder-30b"');
  assert.ok(out.startsWith('model = "qwen3-coder-30b"'));
  assert.ok(out.includes("[sandbox]"));
});

test("upsertTopLevelKey replaces an existing top-level key in place, leaving tables untouched", () => {
  const original = 'model = "old-model"\nmodel_provider = "openai"\n\n[model_providers.openai]\nname = "OpenAI"\n';
  let out = upsertTopLevelKey(original, "model", '"qwen3-coder-30b"');
  out = upsertTopLevelKey(out, "model_provider", '"synap"');

  assert.ok(out.includes('model = "qwen3-coder-30b"'));
  assert.ok(!out.includes('model = "old-model"'));
  assert.ok(out.includes('model_provider = "synap"'));
  assert.ok(out.includes("[model_providers.openai]"));
  assert.ok(out.includes('name = "OpenAI"'));
});

test("upsertTopLevelKey never touches a same-named key inside a table", () => {
  const original = "[model_providers.evil]\nmodel = \"should-not-move\"\n";
  const out = upsertTopLevelKey(original, "model", '"qwen3-coder-30b"');
  // The top-level assignment is inserted at the top; the one inside the table is untouched.
  assert.ok(out.startsWith('model = "qwen3-coder-30b"'));
  assert.ok(out.includes('model = "should-not-move"'));
});

test("readTopLevelKey reads back what upsertTopLevelKey wrote", () => {
  let text = "";
  text = upsertTopLevelKey(text, "model_provider", '"synap"');
  assert.equal(readTopLevelKey(text, "model_provider"), '"synap"');
  assert.equal(readTopLevelKey(text, "nope"), null);
});
