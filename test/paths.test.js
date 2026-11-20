import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  codexConfigPath,
  opencodeConfigPath,
  claudeCodeDir,
  cursorConfigDirs,
} from "../src/lib/paths.js";

test("codexConfigPath honors SYNAP_CONNECT_HOME override", () => {
  const env = { SYNAP_CONNECT_HOME: "/tmp/fake-home" };
  assert.equal(codexConfigPath(env), path.join("/tmp/fake-home", ".codex", "config.toml"));
});

test("opencodeConfigPath defaults to ~/.config/opencode/opencode.json", () => {
  const env = { SYNAP_CONNECT_HOME: "/tmp/fake-home" };
  assert.equal(
    opencodeConfigPath(env),
    path.join("/tmp/fake-home", ".config", "opencode", "opencode.json")
  );
});

test("opencodeConfigPath honors XDG_CONFIG_HOME when set", () => {
  const env = { SYNAP_CONNECT_HOME: "/tmp/fake-home", XDG_CONFIG_HOME: "/tmp/fake-xdg" };
  assert.equal(opencodeConfigPath(env), path.join("/tmp/fake-xdg", "opencode", "opencode.json"));
});

test("claudeCodeDir resolves under home", () => {
  const env = { SYNAP_CONNECT_HOME: "/tmp/fake-home" };
  assert.equal(claudeCodeDir(env), path.join("/tmp/fake-home", ".claude"));
});

test("cursorConfigDirs returns the macOS app-support path on darwin", () => {
  const env = { SYNAP_CONNECT_HOME: "/tmp/fake-home", SYNAP_CONNECT_PLATFORM: "darwin" };
  assert.deepEqual(cursorConfigDirs(env), [
    path.join("/tmp/fake-home", "Library", "Application Support", "Cursor"),
  ]);
});

test("cursorConfigDirs returns the XDG-style path on linux", () => {
  const env = { SYNAP_CONNECT_HOME: "/tmp/fake-home", SYNAP_CONNECT_PLATFORM: "linux" };
  assert.deepEqual(cursorConfigDirs(env), [path.join("/tmp/fake-home", ".config", "Cursor")]);
});
