import fs from "node:fs";
import path from "node:path";
import { cursorConfigDirs } from "../lib/paths.js";
import { API_BASE, DEFAULT_MODEL, SIGNUP_URL } from "../lib/synap.js";

export const id = "cursor";
export const label = "Cursor";
// Verified 2026-11-21: Cursor has no documented file-based or CLI way to add
// a custom OpenAI-compatible base URL/model. Cursor staff have confirmed on
// Cursor's own forum (forum.cursor.com/t/custom-base-urls-for-each-custom-model/147219)
// that BYOK through an "Override OpenAI Base URL" toggle in Settings is
// officially supported, but it is GUI-only, it is a single global override
// (not per-model), and it does not affect Tab/autocomplete, which keeps
// using Cursor's own infrastructure regardless. Because there is no
// config file or CLI surface to edit, this tool never writes anything for
// Cursor — it only detects the app and prints the verified manual steps.
export const supportTier = "manual";

export function detect(env = process.env) {
  const dirs = cursorConfigDirs(env);
  const installed =
    dirs.some((d) => fs.existsSync(d)) ||
    (process.platform === "darwin" && fs.existsSync("/Applications/Cursor.app")) ||
    binaryOnPath("cursor", env);
  // There is no file this tool can check for "already configured" — Cursor's
  // override lives in app-internal settings storage, not a readable dotfile.
  return { installed, configured: null, configPath: null };
}

export function manualSteps({ model = DEFAULT_MODEL } = {}) {
  return [
    "Cursor has no config file or CLI for this — it's a Settings toggle (verified against forum.cursor.com, confirmed by Cursor staff as officially supported but GUI-only):",
    "1. Open Cursor Settings (Cmd/Ctrl+Shift+J, or Cursor menu -> Settings -> Cursor Settings).",
    "2. Go to the Models section.",
    "3. Enable \"Override OpenAI Base URL\".",
    `4. Base URL: ${API_BASE}`,
    `5. API key: your Synap key (get one at ${SIGNUP_URL}).`,
    `6. Add/select model id: ${model}`,
    "7. Test in Chat or Agent.",
    "",
    "Caveats Cursor's own users have reported (not this tool's claim):",
    "- The override is global, not per-model: turning it on can redirect ALL OpenAI-family requests, including Cursor-managed models, to this base URL.",
    "- Tab/autocomplete does not use this override; it always uses Cursor's own infrastructure.",
  ];
}

function binaryOnPath(name, env) {
  const pathEnv = env.PATH || "";
  return pathEnv.split(path.delimiter).some((dir) => {
    try {
      return dir && fs.existsSync(path.join(dir, name));
    } catch {
      return false;
    }
  });
}
