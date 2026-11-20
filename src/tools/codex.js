import fs from "node:fs";
import path from "node:path";
import { codexConfigPath, codexDir } from "../lib/paths.js";
import { backupIfExists, readIfExists, writeFile } from "../lib/backup.js";
import { upsertTable, upsertTopLevelKey, hasTable } from "../lib/toml-edit.js";
import { API_BASE, DEFAULT_MODEL, SIGNUP_URL, ACCOUNT_URL } from "../lib/synap.js";

export const id = "codex";
export const label = "OpenAI Codex CLI";
export const supportTier = "full";

const HEADER = "[model_providers.synap]";

// Verified 2026-11-21 against developers.openai.com/codex (config-reference
// and config-sample pages, which redirect to learn.chatgpt.com/docs/config-file/*):
// every [model_providers.<id>] example in the official docs — including
// third-party/self-hosted OpenAI-compatible endpoints — sets
// wire_api = "responses", and the config reference states "responses" is
// currently the only supported value. Codex therefore talks to a custom
// provider's base_url using the OpenAI *Responses* API shape, not
// /v1/chat/completions. Synap's confirmed, documented endpoints are
// /v1/models and /v1/chat/completions; whether its /v1 endpoint also serves
// the Responses API shape could not be confirmed without a live API key
// (an unauthenticated probe returns 401 before any route-not-found check
// would distinguish the two). This is written to the config as specified by
// Codex's own docs; if Codex reports a protocol/schema error after this,
// that mismatch is the most likely cause.
const UNCERTAINTY_NOTE =
  '# NOTE (synap-connect): Codex requires wire_api = "responses" for all custom\n' +
  "# providers per its current docs. Synap's documented endpoints are /v1/models\n" +
  "# and /v1/chat/completions; whether it also serves the Responses API shape at\n" +
  "# this base_url was not verified. If Codex throws a protocol error, this is\n" +
  "# the likely cause — see https://github.com/weare-linkrra/synap-connect#codex";

export function detect(env = process.env) {
  const configPath = codexConfigPath(env);
  const installed = fs.existsSync(codexDir(env)) || binaryOnPath("codex", env);
  const text = readIfExists(configPath);
  const configured = hasTable(text, HEADER);
  return { installed, configured, configPath };
}

export function connect({ model = DEFAULT_MODEL, env = process.env, dryRun = false } = {}) {
  const configPath = codexConfigPath(env);
  const before = readIfExists(configPath) || "";

  const body = [
    'name = "Synap (Linkrra)"',
    `base_url = "${API_BASE}"`,
    'wire_api = "responses"',
    'env_key = "SYNAP_API_KEY"',
    `env_key_instructions = "Get a free key at ${SIGNUP_URL} (sign up with Google), or top up at ${ACCOUNT_URL}"`,
  ];

  let next = upsertTable(before, HEADER, body, { leadingComment: UNCERTAINTY_NOTE });

  next = upsertTopLevelKey(next, "model_provider", '"synap"');
  next = upsertTopLevelKey(next, "model", `"${model}"`);

  if (dryRun) {
    return { configPath, before, after: next, backupPath: null, written: false };
  }

  const backupPath = backupIfExists(configPath);
  writeFile(configPath, next);
  return { configPath, before, after: next, backupPath, written: true };
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
