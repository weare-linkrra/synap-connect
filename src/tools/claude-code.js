import fs from "node:fs";
import path from "node:path";
import { claudeCodeDir } from "../lib/paths.js";

export const id = "claude-code";
export const label = "Claude Code";
// Verified 2026-11-21 against code.claude.com/docs/en/llm-gateway-connect:
// Claude Code's ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN mechanism points it
// at an endpoint that must speak the Anthropic Messages API wire protocol
// (POST {base_url}/v1/messages with Anthropic-shaped request/response
// bodies) — that is what Claude Code's own connectivity check sends and
// expects. Synap exposes an OpenAI-compatible API (/v1/chat/completions,
// OpenAI request/response shapes), which is a different wire protocol, not
// merely a different base URL. Anthropic's docs describe gateways that
// translate between the two (e.g. a LiteLLM-style proxy in front of an
// OpenAI-compatible backend), but that requires running a separate
// translation proxy — it is not something Claude Code itself does, and not
// something this tool can responsibly set up by writing a plain
// ANTHROPIC_BASE_URL at Synap's OpenAI-compatible endpoint, because that
// would silently produce a non-working configuration (Claude Code would
// send Anthropic-shaped requests to an endpoint that expects OpenAI-shaped
// ones). So: this is a real, current protocol mismatch, not a missing
// feature this tool chose not to implement. This tool writes NOTHING for
// Claude Code and only prints this explanation.
export const supportTier = "unsupported";

export function detect(env = process.env) {
  const installed = fs.existsSync(claudeCodeDir(env)) || binaryOnPath("claude", env);
  return { installed, configured: null, configPath: null };
}

export function limitationMessage() {
  return [
    "Claude Code is NOT supported by synap-connect, and this is a protocol",
    "mismatch, not a missing feature:",
    "",
    "- Claude Code speaks the Anthropic Messages API wire protocol over",
    "  ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN (POST {base_url}/v1/messages,",
    "  Anthropic-shaped request/response bodies).",
    "- Synap exposes an OpenAI-compatible API (POST /v1/chat/completions,",
    "  OpenAI-shaped request/response bodies).",
    "- These are different wire formats, not just different base URLs.",
    "  Pointing ANTHROPIC_BASE_URL at Synap's OpenAI-compatible endpoint",
    "  would not work — Claude Code would send Anthropic-shaped requests to",
    "  an endpoint that expects OpenAI-shaped ones.",
    "",
    "There is no known, documented adapter that makes this work without a",
    "separate translation proxy (something like LiteLLM) sitting in between,",
    "which is out of scope for this tool. synap-connect will not write an",
    "ANTHROPIC_BASE_URL config here, because it would look configured while",
    "silently not working.",
    "",
    "Source: https://code.claude.com/docs/en/llm-gateway-connect",
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
