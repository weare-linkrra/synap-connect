import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "jsonc-parser";
import * as opencode from "../src/tools/opencode.js";
import { opencodeConfigPath } from "../src/lib/paths.js";

function fakeHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "synap-connect-opencode-"));
}

test("opencode.connect creates a fresh opencode.json when none exists", () => {
  const home = fakeHome();
  const env = { SYNAP_CONNECT_HOME: home };

  assert.equal(opencode.detect(env).configured, false);

  const result = opencode.connect({ model: "qwen3-coder-30b", env });
  assert.ok(fs.existsSync(opencodeConfigPath(env)));
  assert.equal(result.backupPath, null);

  const data = parse(fs.readFileSync(opencodeConfigPath(env), "utf8"));
  assert.equal(data.providers.synap.package, "@opencode/ai/providers/openai-compatible");
  assert.equal(data.providers.synap.settings.baseURL, "https://synap402.com/v1");
  assert.deepEqual(data.providers.synap.env, ["SYNAP_API_KEY"]);
  assert.ok(data.providers.synap.models["qwen3-coder-30b"]);
  assert.equal(data.model, "synap/qwen3-coder-30b");
  assert.equal(data.$schema, "https://opencode.ai/config.json");

  assert.equal(opencode.detect(env).configured, true);
});

test("opencode.connect merges into an existing config without clobbering unrelated keys or providers", () => {
  const home = fakeHome();
  const env = { SYNAP_CONNECT_HOME: home };
  const configPath = opencodeConfigPath(env);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });

  const existing = {
    model: "anthropic/claude-sonnet-5-5",
    permissions: { edit: "ask" },
    providers: {
      anthropic: { name: "Anthropic", env: ["ANTHROPIC_API_KEY"] },
    },
  };
  fs.writeFileSync(configPath, JSON.stringify(existing, null, 2) + "\n", "utf8");

  const result = opencode.connect({ model: "qwen3-coder-30b", env });
  assert.ok(result.backupPath);
  assert.equal(JSON.parse(fs.readFileSync(result.backupPath, "utf8")).model, "anthropic/claude-sonnet-5-5");

  const data = parse(fs.readFileSync(configPath, "utf8"));
  // Unrelated top-level keys survive untouched.
  assert.deepEqual(data.permissions, { edit: "ask" });
  // Sibling provider survives untouched.
  assert.deepEqual(data.providers.anthropic, { name: "Anthropic", env: ["ANTHROPIC_API_KEY"] });
  // New provider added.
  assert.equal(data.providers.synap.settings.baseURL, "https://synap402.com/v1");
  // Default model switched to Synap's, as the connect command is meant to do.
  assert.equal(data.model, "synap/qwen3-coder-30b");
});

test("opencode.connect with setDefault:false leaves the existing default model alone", () => {
  const home = fakeHome();
  const env = { SYNAP_CONNECT_HOME: home };
  const configPath = opencodeConfigPath(env);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({ model: "anthropic/claude-sonnet-5-5" }) + "\n", "utf8");

  opencode.connect({ model: "qwen3-coder-30b", env, setDefault: false });

  const data = parse(fs.readFileSync(configPath, "utf8"));
  assert.equal(data.model, "anthropic/claude-sonnet-5-5");
  assert.ok(data.providers.synap);
});

test("opencode.connect dryRun never writes to disk", () => {
  const home = fakeHome();
  const env = { SYNAP_CONNECT_HOME: home };
  const result = opencode.connect({ model: "qwen3-coder-30b", env, dryRun: true });
  assert.equal(result.written, false);
  assert.equal(fs.existsSync(opencodeConfigPath(env)), false);
});
