import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as codex from "../src/tools/codex.js";
import { codexConfigPath } from "../src/lib/paths.js";

function fakeHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "synap-connect-codex-"));
}

test("codex.connect creates a fresh config.toml when none exists, no backup made", () => {
  const home = fakeHome();
  const env = { SYNAP_CONNECT_HOME: home };

  const before = codex.detect(env);
  assert.equal(before.configured, false);

  const result = codex.connect({ model: "qwen3-coder-30b", env });
  assert.equal(result.backupPath, null);
  assert.ok(fs.existsSync(codexConfigPath(env)));

  const after = codex.detect(env);
  assert.equal(after.configured, true);

  const text = fs.readFileSync(codexConfigPath(env), "utf8");
  assert.ok(text.includes("[model_providers.synap]"));
  assert.ok(text.includes('base_url = "https://synap402.com/v1"'));
  assert.ok(text.includes('wire_api = "responses"'));
  assert.ok(text.includes('env_key = "SYNAP_API_KEY"'));
  assert.ok(text.includes('model_provider = "synap"'));
  assert.ok(text.includes('model = "qwen3-coder-30b"'));
});

test("codex.connect backs up an existing config and preserves unrelated tables", () => {
  const home = fakeHome();
  const env = { SYNAP_CONNECT_HOME: home };
  const configPath = codexConfigPath(env);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const existing = [
    "# my own notes",
    'model = "gpt-6.1-sol"',
    'model_provider = "openai"',
    "",
    "[model_providers.openai]",
    'name = "OpenAI"',
    "",
    "[sandbox]",
    'mode = "workspace-write"',
    "",
  ].join("\n");
  fs.writeFileSync(configPath, existing, "utf8");

  const result = codex.connect({ model: "qwen3-coder-30b", env });
  assert.ok(result.backupPath, "expected a backup path");
  assert.match(path.basename(result.backupPath), /^config\.toml\.bak-\d+$/);
  assert.equal(fs.readFileSync(result.backupPath, "utf8"), existing);

  const text = fs.readFileSync(configPath, "utf8");
  assert.ok(text.includes("# my own notes"));
  assert.ok(text.includes("[model_providers.openai]"));
  assert.ok(text.includes('name = "OpenAI"'));
  assert.ok(text.includes("[sandbox]"));
  assert.ok(text.includes('mode = "workspace-write"'));
  assert.ok(text.includes("[model_providers.synap]"));
  assert.ok(text.includes('model_provider = "synap"'));
  assert.ok(!text.includes('model_provider = "openai"'));
});

test("codex.connect dryRun never writes to disk", () => {
  const home = fakeHome();
  const env = { SYNAP_CONNECT_HOME: home };
  const result = codex.connect({ model: "qwen3-coder-30b", env, dryRun: true });
  assert.equal(result.written, false);
  assert.equal(fs.existsSync(codexConfigPath(env)), false);
  assert.ok(result.after.includes("[model_providers.synap]"));
});

test("codex.detect reports installed when ~/.codex exists", () => {
  const home = fakeHome();
  fs.mkdirSync(path.join(home, ".codex"), { recursive: true });
  const env = { SYNAP_CONNECT_HOME: home, PATH: "" };
  assert.equal(codex.detect(env).installed, true);
});

test("codex.detect reports not installed on a clean fake home with empty PATH", () => {
  const home = fakeHome();
  const env = { SYNAP_CONNECT_HOME: home, PATH: "" };
  assert.equal(codex.detect(env).installed, false);
});
