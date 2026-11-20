import fs from "node:fs";
import path from "node:path";
import { modify, applyEdits, parse } from "jsonc-parser";
import { opencodeConfigPath, opencodeDir } from "../lib/paths.js";
import { backupIfExists, readIfExists, writeFile } from "../lib/backup.js";
import { API_BASE, DEFAULT_MODEL } from "../lib/synap.js";

export const id = "opencode";
export const label = "OpenCode";
export const supportTier = "full";

const PROVIDER_ID = "synap";

// Verified 2026-11-21 against opencode.ai/docs/config and
// opencode.ai/docs/providers: config lives at
// ~/.config/opencode/opencode.json (global) or opencode.json in a project,
// with higher-precedence project/system configs able to shadow this file.
// This tool always edits the global config. Custom OpenAI-compatible
// providers go under top-level "providers.<id>", with "package":
// "@opencode/ai/providers/openai-compatible", "settings.baseURL", an "env"
// array of credential env-var names (checked in order), and a "models" map
// keyed by the OpenCode model id.
const EDIT_FORMATTING = { tabSize: 2, insertSpaces: true, eol: "\n" };

export function detect(env = process.env) {
  const configPath = opencodeConfigPath(env);
  const installed = fs.existsSync(opencodeDir(env)) || binaryOnPath("opencode", env);
  const text = readIfExists(configPath);
  let configured = false;
  if (text) {
    try {
      const data = parse(text) || {};
      configured = Boolean(data?.providers?.[PROVIDER_ID]);
    } catch {
      configured = false;
    }
  }
  return { installed, configured, configPath };
}

export function connect({ model = DEFAULT_MODEL, env = process.env, dryRun = false, setDefault = true } = {}) {
  const configPath = opencodeConfigPath(env);
  const before = readIfExists(configPath) || "";

  let text = before;
  if (!text.trim()) {
    text = "{}\n";
  }

  const providerValue = {
    name: "Synap (Linkrra)",
    env: ["SYNAP_API_KEY"],
    package: "@opencode/ai/providers/openai-compatible",
    settings: { baseURL: API_BASE },
    models: {
      [model]: { name: `${model} (Synap)` },
    },
  };

  text = applyEditAt(text, ["providers", PROVIDER_ID], providerValue);
  if (!hasSchema(text)) {
    text = applyEditAt(text, ["$schema"], "https://opencode.ai/config.json");
  }
  if (setDefault) {
    text = applyEditAt(text, ["model"], `${PROVIDER_ID}/${model}`);
  }

  if (dryRun) {
    return { configPath, before, after: text, backupPath: null, written: false };
  }

  const backupPath = backupIfExists(configPath);
  writeFile(configPath, text);
  return { configPath, before, after: text, backupPath, written: true };
}

function hasSchema(text) {
  try {
    const data = parse(text) || {};
    return Boolean(data.$schema);
  } catch {
    return false;
  }
}

function applyEditAt(text, jsonPath, value) {
  const edits = modify(text, jsonPath, value, { formattingOptions: EDIT_FORMATTING });
  return applyEdits(text, edits);
}

function binaryOnPath(name, env) {
  const pathEnv = env.PATH || "";
  const exts = process.platform === "win32" ? [".exe", ".cmd", ""] : [""];
  return pathEnv.split(path.delimiter).some((dir) =>
    exts.some((ext) => {
      try {
        return dir && fs.existsSync(path.join(dir, name + ext));
      } catch {
        return false;
      }
    })
  );
}
