import * as codex from "./codex.js";
import * as opencode from "./opencode.js";
import * as cursor from "./cursor.js";
import * as claudeCode from "./claude-code.js";

// Priority order matches the task's target-tool priority order.
export const tools = [codex, opencode, cursor, claudeCode];

export function findTool(idOrAlias) {
  const key = String(idOrAlias || "").toLowerCase().trim();
  const aliases = {
    codex: "codex",
    "codex-cli": "codex",
    opencode: "opencode",
    "open-code": "opencode",
    cursor: "cursor",
    "claude-code": "claude-code",
    claude: "claude-code",
    "claude-cli": "claude-code",
  };
  const id = aliases[key];
  if (!id) return null;
  return tools.find((t) => t.id === id) || null;
}
