// Provider-agnostic LLM wrapper. Reads `LLM_API_KEY`, `LLM_PROVIDER`, and
// `LLM_MODEL` from env. Supported providers:
//
//   anthropic (default) → POST https://api.anthropic.com/v1/messages
//   groq                → POST https://api.groq.com/openai/v1/chat/completions
//
// The two are intentionally hand-rolled fetch calls instead of SDKs so each
// service stays at zero extra deps beyond viem. Note the differences encoded
// below: Anthropic uses a top-level `system` field and `max_tokens`; Groq is
// OpenAI-shaped, so the system prompt goes into the `messages` array and the
// token cap is `max_completion_tokens` (Groq treats plain `max_tokens` as
// deprecated — see https://console.groq.com/docs/api-reference).
//
// When `OFFLINE_MODE=1` the caller bypasses this module entirely and emits a
// deterministic stub — see each service's main file. When `LLM_API_KEY` is
// unset we return a labelled `[no-LLM-key] …` stub so the caller never
// silently fabricates output.

const DEFAULT_PROVIDER = "anthropic";
const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-haiku-4-5-20251001",
  groq: "llama-3.3-70b-versatile",
};

export type LLMRequest = {
  system: string;
  user: string;
  maxTokens?: number;
};

export async function runLLM(req: LLMRequest): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return `[no-LLM-key] ${req.user.slice(0, 200)}`;
  }
  const provider = (process.env.LLM_PROVIDER || DEFAULT_PROVIDER).toLowerCase();
  if (provider === "anthropic") return callAnthropic(apiKey, req);
  if (provider === "groq") return callGroq(apiKey, req);
  throw new Error(
    `LLM_PROVIDER='${provider}' not supported (use 'anthropic' or 'groq')`,
  );
}

async function callAnthropic(apiKey: string, req: LLMRequest): Promise<string> {
  const model = process.env.LLM_MODEL || DEFAULT_MODELS.anthropic;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? 512,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = json.content?.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("Anthropic returned no text content");
  return text;
}

async function callGroq(apiKey: string, req: LLMRequest): Promise<string> {
  const model = process.env.LLM_MODEL || DEFAULT_MODELS.groq;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: req.maxTokens ?? 512,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no message content");
  return text;
}
