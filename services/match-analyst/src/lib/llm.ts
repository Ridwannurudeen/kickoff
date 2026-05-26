// Provider-agnostic LLM wrapper. Reads `LLM_API_KEY` + `LLM_MODEL` from env.
//
// The default integration is Anthropic's Messages API (HTTPS, no SDK dependency
// so the service has zero extra deps beyond viem). Drop-in replacements: change
// the `endpoint`, `headers`, and request body in `callRemote` to your provider.
//
// When `OFFLINE_MODE=1` the caller bypasses this module entirely and emits a
// deterministic stub — see each service's main file.

const DEFAULT_MODEL = "claude-3-5-haiku-latest";

export type LLMRequest = {
  system: string;
  user: string;
  maxTokens?: number;
};

export async function runLLM(req: LLMRequest): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    // No key in env -> emit a labelled stub so we never silently fabricate output.
    return `[no-LLM-key] ${req.user.slice(0, 200)}`;
  }
  return callRemote(apiKey, req);
}

async function callRemote(apiKey: string, req: LLMRequest): Promise<string> {
  const model = process.env.LLM_MODEL || DEFAULT_MODEL;
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
    throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = json.content?.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("LLM returned no text content");
  return text;
}
