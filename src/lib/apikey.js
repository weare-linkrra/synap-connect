import readline from "node:readline";

/**
 * Resolve the user's OWN Synap API key from, in order: an explicit --api-key
 * flag, the SYNAP_API_KEY env var, or (if interactive and allowed) a prompt.
 * Never returns a fleet/default key — if none of the three produce one, the
 * caller is expected to proceed without a literal key (configs reference the
 * SYNAP_API_KEY env var by name, not an embedded secret) and tell the user
 * where to get one.
 */
export async function resolveApiKey({ flagValue, env = process.env, interactive = true, stdin = process.stdin, stdout = process.stdout } = {}) {
  if (flagValue) return { apiKey: flagValue, source: "flag" };
  if (env.SYNAP_API_KEY) return { apiKey: env.SYNAP_API_KEY, source: "env" };
  if (!interactive || !stdin.isTTY) return { apiKey: null, source: "none" };

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = await new Promise((resolve) => {
      rl.question(
        "Synap API key (leave blank to skip and configure SYNAP_API_KEY yourself later): ",
        resolve
      );
    });
    const trimmed = answer.trim();
    return trimmed ? { apiKey: trimmed, source: "prompt" } : { apiKey: null, source: "none" };
  } finally {
    rl.close();
  }
}
