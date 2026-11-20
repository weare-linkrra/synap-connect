import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main } from "../src/cli.js";
import { codexConfigPath } from "../src/lib/paths.js";

function fakeHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "synap-connect-cli-"));
}

function capture() {
  const lines = [];
  return { lines, log: (l) => lines.push(String(l)), error: (l) => lines.push(String(l)) };
}

test("`synap-connect --list` mentions every supported tool and its tier, writes nothing", async () => {
  const home = fakeHome();
  const env = { SYNAP_CONNECT_HOME: home, PATH: "" };
  const { lines, log, error } = capture();

  const code = await main(["--list"], { env, log, error });

  assert.equal(code, 0);
  const text = lines.join("\n");
  assert.match(text, /OpenAI Codex CLI.*full/);
  assert.match(text, /OpenCode.*full/);
  assert.match(text, /Cursor.*manual/);
  assert.match(text, /Claude Code.*unsupported/);
  assert.deepEqual(fs.readdirSync(home), []);
});

test("no arguments behaves like --list", async () => {
  const env = { SYNAP_CONNECT_HOME: fakeHome(), PATH: "" };
  const { lines, log, error } = capture();
  const code = await main([], { env, log, error });
  assert.equal(code, 0);
  assert.ok(lines.join("\n").includes("Supported tools"));
});

test("`synap-connect claude-code` prints the protocol-mismatch limitation and writes nothing", async () => {
  const home = fakeHome();
  const env = { SYNAP_CONNECT_HOME: home, PATH: "" };
  const { lines, log, error } = capture();

  const code = await main(["claude-code", "--yes"], { env, log, error });

  assert.equal(code, 0);
  const text = lines.join("\n");
  assert.match(text, /not supported/i);
  assert.match(text, /Anthropic Messages API/);
  assert.match(text, /OpenAI-compatible/);
  assert.equal(fs.existsSync(path.join(home, ".claude")), false);
});

test("`synap-connect cursor` prints manual GUI steps and writes nothing", async () => {
  const home = fakeHome();
  const env = { SYNAP_CONNECT_HOME: home, PATH: "" };
  const { lines, log, error } = capture();

  const code = await main(["cursor", "--yes"], { env, log, error });

  assert.equal(code, 0);
  const text = lines.join("\n");
  assert.match(text, /Override OpenAI Base URL/);
  assert.match(text, /qwen3-coder-30b/);
  assert.deepEqual(fs.readdirSync(home), []);
});

test("`synap-connect codex --dry-run` previews the change without touching disk", async () => {
  const home = fakeHome();
  const env = { SYNAP_CONNECT_HOME: home, PATH: "" };
  const { lines, log, error } = capture();

  const code = await main(["codex", "--dry-run", "--yes"], { env, log, error });

  assert.equal(code, 0);
  assert.ok(lines.join("\n").includes("[model_providers.synap]"));
  assert.equal(fs.existsSync(codexConfigPath(env)), false);
});

test("unknown tool name errors with a non-zero exit code", async () => {
  const env = { SYNAP_CONNECT_HOME: fakeHome(), PATH: "" };
  const { lines, log, error } = capture();
  const code = await main(["notatool"], { env, log, error });
  assert.equal(code, 1);
  assert.ok(lines.join("\n").includes("Unknown tool"));
});
