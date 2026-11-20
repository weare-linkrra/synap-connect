import { tools, findTool } from "./tools/registry.js";
import { resolveApiKey } from "./lib/apikey.js";
import {
  DEFAULT_MODEL,
  PRICING_URL,
  TOPUP_URL,
  SIGNUP_URL,
  FREE_TIER_NOTE,
  PRIVACY_LINE,
  fetchLiveModels,
  findLivePricing,
  verifyApiKey,
} from "./lib/synap.js";

function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--model" || arg === "-m") {
      out.flags.model = argv[++i];
    } else if (arg === "--api-key" || arg === "-k") {
      out.flags.apiKey = argv[++i];
    } else if (arg === "--dry-run") {
      out.flags.dryRun = true;
    } else if (arg === "--no-default") {
      out.flags.noDefault = true;
    } else if (arg === "--yes" || arg === "-y") {
      out.flags.yes = true;
    } else if (arg === "--list") {
      out.flags.list = true;
    } else if (arg === "--help" || arg === "-h") {
      out.flags.help = true;
    } else {
      out._.push(arg);
    }
  }
  return out;
}

export async function main(argv, io = {}) {
  const log = io.log || console.log;
  const errorLog = io.error || console.error;
  const env = io.env || process.env;

  const { _: positional, flags } = parseArgs(argv);

  if (flags.help) {
    printHelp(log);
    return 0;
  }

  if (flags.list || positional.length === 0) {
    await runList(log, env);
    return 0;
  }

  const toolArg = positional[0];
  const tool = findTool(toolArg);
  if (!tool) {
    errorLog(`Unknown tool: "${toolArg}"`);
    errorLog("");
    printHelp(errorLog);
    return 1;
  }

  return runConnect(tool, { flags, env, log, errorLog, io });
}

function printHelp(log) {
  log("synap-connect — add Synap (https://synap402.com) as a model provider in coding tools");
  log("");
  log("Usage:");
  log("  synap-connect                 Show supported tools + detection status (same as --list)");
  log("  synap-connect --list");
  log("  synap-connect <tool> [options]");
  log("");
  log("Tools:");
  for (const t of tools) {
    log(`  ${t.id.padEnd(12)} ${t.label} (${t.supportTier})`);
  }
  log("");
  log("Options:");
  log("  --model, -m <id>    Model id to configure as default (default: " + DEFAULT_MODEL + ")");
  log("  --api-key, -k <key> Your Synap API key (or set SYNAP_API_KEY env var)");
  log("  --dry-run           Show what would change without writing any file");
  log("  --no-default        Don't change the tool's default model");
  log("  --yes, -y           Don't prompt interactively for an API key");
  log("  --help, -h          Show this help");
}

async function runList(log, env) {
  log("Supported tools for `synap-connect <tool>`:");
  log("");
  for (const tool of tools) {
    const result = tool.detect(env);
    const installed = result.installed ? "installed" : "not detected";
    const configuredPart =
      result.configured === null
        ? ""
        : result.configured
        ? ", already configured for Synap"
        : ", not yet configured for Synap";
    log(`- ${tool.label} [${tool.id}] — ${tool.supportTier} support — ${installed}${configuredPart}`);
    if (result.configPath) log(`    config: ${result.configPath}`);
  }
  log("");
  log(`Recommended default model: ${DEFAULT_MODEL}`);
  log(FREE_TIER_NOTE);
  log(`Pricing (live): ${PRICING_URL}`);
  log(`Get a key / top up: ${TOPUP_URL}`);
}

async function runConnect(tool, { flags, env, log, errorLog, io }) {
  const model = flags.model || DEFAULT_MODEL;

  if (tool.supportTier === "unsupported") {
    const detection = tool.detect(env);
    log(`${tool.label}: ${detection.installed ? "detected on this machine" : "not detected"}.`);
    log("");
    for (const line of tool.limitationMessage()) log(line);
    return 0;
  }

  if (tool.supportTier === "manual") {
    const detection = tool.detect(env);
    log(`${tool.label}: ${detection.installed ? "detected on this machine" : "not detected"}.`);
    log("");
    for (const line of tool.manualSteps({ model })) log(line);
    log("");
    log(FREE_TIER_NOTE);
    log(`Pricing (live): ${PRICING_URL}`);
    log(`Get a key / top up: ${TOPUP_URL}`);
    return 0;
  }

  // "full" support tools: codex, opencode.
  const { apiKey, source } = await resolveApiKey({
    flagValue: flags.apiKey,
    env,
    interactive: !flags.yes,
    stdin: io.stdin || process.stdin,
    stdout: io.stdout || process.stdout,
  });

  const result = tool.connect({ model, env, dryRun: Boolean(flags.dryRun), setDefault: !flags.noDefault });

  if (flags.dryRun) {
    log(`[dry run] Would write ${result.configPath}:`);
    log("");
    log(result.after);
    return 0;
  }

  log(`${tool.label}: updated ${result.configPath}`);
  if (result.backupPath) {
    log(`Backed up previous config to ${result.backupPath}`);
  } else {
    log("No existing config found — created a new one.");
  }
  log("");

  if (apiKey) {
    log(`Using an API key from ${source === "env" ? "SYNAP_API_KEY" : source}.`);
    log("The config file references the SYNAP_API_KEY environment variable (never an embedded literal key).");
    log(`Make sure SYNAP_API_KEY is exported in your shell: export SYNAP_API_KEY="${maskKey(apiKey)}"`);
    const check = await verifyApiKey(apiKey);
    if (check.checked) {
      log(check.ok ? "Live check: API key accepted." : "Live check: API key was NOT accepted — double check it.");
    }
  } else {
    log("No API key provided. The config references the SYNAP_API_KEY environment variable.");
    log(`Get a free key (sign up with Google): ${SIGNUP_URL}`);
    log(`Then: export SYNAP_API_KEY="sk-pool-..."`);
  }

  log("");
  log(`Default model: ${model}${model === DEFAULT_MODEL ? " (free tier)" : ""}`);
  log(FREE_TIER_NOTE);

  const live = await fetchLiveModels();
  if (live.ok) {
    const pricing = findLivePricing(live.models, model);
    if (pricing) {
      log(
        `Live price right now: $${pricing.prompt_per_million}/M prompt tokens, ` +
          `$${pricing.completion_per_million}/M completion tokens (${pricing.currency}). Source: ${PRICING_URL}`
      );
    }
  }
  log(`Full pricing (live): ${PRICING_URL}`);
  log(`Top up / manage your key: ${TOPUP_URL}`);
  log(PRIVACY_LINE);

  if (tool.id === "codex") {
    log("");
    log(
      "Note: Codex requires wire_api = \"responses\" for custom providers. This was configured exactly as " +
        "Codex's own docs specify; whether Synap's endpoint also serves the Responses API shape wasn't " +
        "independently verified. If Codex errors on a protocol mismatch, see the synap-connect README."
    );
  }

  return 0;
}

function maskKey(key) {
  if (!key || key.length < 8) return "****";
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}
