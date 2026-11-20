// Facts and live lookups about Synap (https://synap402.com).
//
// Prices are NEVER hardcoded here — the only thing hardcoded is the API base,
// the recommended default model id, and a small set of URLs that are stable
// product surfaces (account/pricing/login pages). Anything price-shaped is
// fetched live from /v1/models at the moment the CLI runs.

export const API_BASE = "https://synap402.com/v1";
export const MODELS_URL = `${API_BASE}/models`;
export const DEFAULT_MODEL = "qwen3-coder-30b";
export const ACCOUNT_URL = "https://synap402.com/ai/account.html";
export const TOPUP_URL = "https://synap402.com/ai/account.html?amount=10#buy";
export const PRICING_URL = "https://synap402.com/pricing.html";
export const SIGNUP_URL = "https://synap402.com/login";
export const X402_URL = "https://synap402.com/.well-known/x402";

// Approved public privacy line — verbatim, do not paraphrase.
export const PRIVACY_LINE =
  "Zero data retention: prompts and completions are never stored or used for training.";

// Free-tier terms as given for this task. Limits are account-scoped and come
// from Synap's own product terms, not from the live /v1/models payload, so
// they are stated here rather than fetched.
export const FREE_TIER_NOTE =
  "Free tier on qwen3-coder-30b: 100,000 tokens/day for your first 7 days, then 50,000 tokens/day, 50 requests/day, per account. A Synap account + API key is required to get this allowance.";

const FETCH_TIMEOUT_MS = 6000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch the live Synap model list. Returns { ok: true, models } on success,
 * or { ok: false, error } if the network call fails — callers must treat
 * failure as "couldn't confirm live data right now", not as a hard error,
 * since this is best-effort enrichment, never load-bearing for the config
 * merge itself.
 */
export async function fetchLiveModels() {
  try {
    const res = await fetchWithTimeout(MODELS_URL);
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const body = await res.json();
    const models = Array.isArray(body?.data) ? body.data : [];
    return { ok: true, models };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Find a model entry's live pricing (USD per million tokens) from a models
 * list already fetched with fetchLiveModels(). Returns null if not found or
 * if the entry has no pricing block (e.g. a free/router model).
 */
export function findLivePricing(models, modelId) {
  const entry = models.find((m) => m?.id === modelId);
  if (!entry?.pricing) return null;
  const { prompt_per_million, completion_per_million, currency } = entry.pricing;
  if (typeof prompt_per_million !== "number" || typeof completion_per_million !== "number") {
    return null;
  }
  return { prompt_per_million, completion_per_million, currency: currency || "USD" };
}

/**
 * Best-effort live check that an API key is accepted by Synap. Never throws;
 * returns { ok: true|false, checked: true } on a definitive answer, or
 * { checked: false } if the network call itself failed (key status unknown).
 */
export async function verifyApiKey(apiKey) {
  if (!apiKey) return { checked: false };
  try {
    const res = await fetchWithTimeout(MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    // /v1/models doesn't require auth on Synap, so a 200 here only proves the
    // endpoint is reachable, not that the key is valid. Use chat/completions
    // with max_tokens=1 against the free-tier model instead, since that path
    // does enforce the key.
    if (!res.ok) return { checked: true, ok: false, status: res.status };
    const probe = await fetchWithTimeout(`${API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    if (probe.status === 401) return { checked: true, ok: false, status: 401 };
    return { checked: true, ok: true, status: probe.status };
  } catch (err) {
    return { checked: false, error: err?.message || String(err) };
  }
}
