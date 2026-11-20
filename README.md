# synap-connect

Connect [Synap](https://synap402.com) — Linkrra's OpenAI-compatible model API —
as a model provider inside popular AI coding tools, with one command.

Synap gives you an OpenAI-compatible endpoint (`/v1/models`, `/v1/chat/completions`,
streaming) backed by open models on dedicated GPUs, plus a free daily allowance on
`qwen3-coder-30b` (see [Free tier](#free-tier) below), and a true no-account,
pay-per-call path over x402 for anything beyond that.

This tool is BYOK: it never embeds, requests, or sends anywhere any Linkrra-internal
API key. It only ever uses *your own* Synap key, and the configs it writes reference
the `SYNAP_API_KEY` environment variable by name — they never write a literal secret
into a dotfile on disk.

## Install

```bash
npm install -g synap-connect
```

Or run it without installing anything:

```bash
npx synap-connect <tool>
```

## Usage

```bash
synap-connect                 # same as --list
synap-connect --list          # show supported tools + whether each is detected
synap-connect codex           # configure OpenAI Codex CLI
synap-connect opencode        # configure OpenCode
synap-connect cursor          # print verified manual steps (Cursor is GUI-only)
synap-connect claude-code     # print the known, honest limitation (see below)
```

Options:

| Flag | Meaning |
| --- | --- |
| `--model, -m <id>` | Model id to set as default (default: `qwen3-coder-30b`, Synap's free-tier model) |
| `--api-key, -k <key>` | Your Synap API key. Also read from `SYNAP_API_KEY`, or prompted for interactively |
| `--dry-run` | Print what would change, write nothing |
| `--no-default` | Add the provider but don't change the tool's default model |
| `--yes, -y` | Don't prompt interactively for a key (useful in scripts/CI) |

Every write-capable command backs up the file it touches first, to
`<file>.bak-<unix-timestamp>`, and only ever edits the one table/section this tool
owns — it does not reformat or remove anything else in your config.

## Support table

Verified against each tool's own docs/source on 2026-11-21 — not guessed.

| Tool | Support | What was verified |
| --- | --- | --- |
| **OpenAI Codex CLI** | Full (config written), with one caveat — see below | `~/.codex/config.toml`, `[model_providers.<id>]` schema, `wire_api` values, reserved ids — all against developers.openai.com/codex (config-reference, config-sample) |
| **OpenCode** | Full | `~/.config/opencode/opencode.json`, `providers.<id>` schema (`package`, `settings.baseURL`, `env`, `models`) — against opencode.ai/docs/config and opencode.ai/docs/providers |
| **Cursor** | Manual only (prints steps, writes nothing) | Confirmed there is no file/CLI config surface; a Cursor staff reply on Cursor's own forum confirms the GUI "Override OpenAI Base URL" toggle is the officially supported, BYOK path |
| **Claude Code** | Unsupported (prints why, writes nothing) | Confirmed Claude Code's `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN` path requires an endpoint speaking the **Anthropic Messages API** wire protocol. Synap speaks the **OpenAI** chat/completions protocol. These are different wire formats, not just different base URLs — pointing Claude Code at Synap directly would not work |

### Codex

Codex's current config schema (`[model_providers.<id>]`) only supports
`wire_api = "responses"` — every example in OpenAI's own docs, including
third-party/self-hosted OpenAI-compatible endpoints, uses `"responses"`, and the
config reference states it is the only supported value. That means Codex talks to
a custom provider using the OpenAI **Responses** API shape, not
`/v1/chat/completions`.

Synap's confirmed, documented endpoints are `/v1/models` and `/v1/chat/completions`.
Whether Synap's `/v1` base also serves the Responses API shape could not be
verified by this tool without a real API key (an unauthenticated probe to
`/v1/responses` returns the same 401 as a nonexistent route, since auth runs before
route dispatch — so a 401 doesn't prove the route exists). `synap-connect codex`
writes the config exactly as Codex's own docs specify. If Codex reports a
protocol/schema error after connecting, that mismatch is the most likely cause —
please [open an issue](https://github.com/weare-linkrra/synap-connect/issues) if
you hit this, with the exact Codex CLI version and error.

### Cursor

Cursor has no config file or CLI surface for a custom OpenAI-compatible endpoint.
`synap-connect cursor` detects whether Cursor is installed and prints the verified
manual steps (Settings → Models → "Override OpenAI Base URL"), plus two caveats
Cursor's own users have reported: the override is global (not per model) and does
not affect Tab/autocomplete.

### Claude Code

This is the CLI synap-connect itself happens to run inside of, which made this one
easy to verify directly: Claude Code's `ANTHROPIC_BASE_URL` points it at an endpoint
that must speak the Anthropic Messages API (`POST {base_url}/v1/messages`,
Anthropic-shaped request/response bodies) — see
[Anthropic's own gateway docs](https://code.claude.com/docs/en/llm-gateway-connect).
Synap exposes an OpenAI-compatible API instead. `synap-connect claude-code`
deliberately writes nothing, because writing an `ANTHROPIC_BASE_URL` pointed at
Synap would look configured while silently not working. Running Synap behind
Claude Code would need a separate Anthropic↔OpenAI translation proxy in front of
it (e.g. something LiteLLM-shaped) — out of scope for this tool.

## Free tier

`qwen3-coder-30b` is Synap's free-tier model: 100,000 tokens/day for your first 7
days, then 50,000 tokens/day, 50 requests/day — scoped per account. You still need
a Synap account + API key to get that allowance (sign up with Google:
<https://synap402.com/login>). There's also a true no-account, pay-per-call path in
USDC over x402 (<https://synap402.com/.well-known/x402>) for use beyond an IDE
default.

- Live pricing (never hardcoded — this tool reads `GET /v1/models` at runtime): <https://synap402.com/pricing.html>
- Account / top up: <https://synap402.com/ai/account.html>

Zero data retention: prompts and completions are never stored or used for training.

## License

MIT — see [LICENSE](./LICENSE).

[synap402.com](https://synap402.com)
