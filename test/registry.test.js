import test from "node:test";
import assert from "node:assert/strict";
import { tools, findTool } from "../src/tools/registry.js";

test("tools lists the four target tools in priority order with declared support tiers", () => {
  assert.deepEqual(tools.map((t) => t.id), ["codex", "opencode", "cursor", "claude-code"]);
  assert.equal(tools.find((t) => t.id === "codex").supportTier, "full");
  assert.equal(tools.find((t) => t.id === "opencode").supportTier, "full");
  assert.equal(tools.find((t) => t.id === "cursor").supportTier, "manual");
  assert.equal(tools.find((t) => t.id === "claude-code").supportTier, "unsupported");
});

test("findTool resolves common aliases", () => {
  assert.equal(findTool("codex").id, "codex");
  assert.equal(findTool("codex-cli").id, "codex");
  assert.equal(findTool("OpenCode").id, "opencode");
  assert.equal(findTool("cursor").id, "cursor");
  assert.equal(findTool("claude-code").id, "claude-code");
  assert.equal(findTool("claude").id, "claude-code");
});

test("findTool returns null for unknown input", () => {
  assert.equal(findTool("vscode"), null);
  assert.equal(findTool(""), null);
  assert.equal(findTool(undefined), null);
});
