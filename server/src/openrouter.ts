import { GenerationError, type AiReply } from "./gemini.js";

const DEFAULT_MODEL = "nvidia/nemotron-3.5-super-vl:free";

/** Sends one prompt to OpenRouter (OpenAI-compatible chat completions) and returns the raw text (expected to be JSON). */
export async function callOpenRouter(prompt: string, timeoutMs = 40_000): Promise<AiReply> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new GenerationError("No OpenRouter API key is configured on the server.");
  const model = (process.env.OPENROUTER_MODEL || DEFAULT_MODEL).replace(/["'\s]/g, "");

  let res: Response;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "X-Title": "PaperPal",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 32_000,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const e = err as Error & { cause?: unknown };
    console.error("openrouter fetch failed:", e.name, e.message, "cause:", String(e.cause));
    throw new GenerationError("Could not reach the AI service. Check the connection and try again.", true);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`openrouter error ${res.status} (${model}):`, body.slice(0, 500));
    const temporary = res.status === 429 || res.status >= 500;
    throw new GenerationError(
      temporary
        ? "The AI service is busy right now. Please try again in a moment."
        : `The AI service rejected the request (status ${res.status}). Check the API key and model name.`,
      temporary,
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
    usage?: { prompt_tokens?: number; completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } };
  };
  // OpenRouter sometimes answers 200 with an error object (e.g. upstream provider limits).
  if (data.error) {
    console.error(`openrouter in-body error (${model}):`, data.error.message);
    throw new GenerationError("The AI service is busy right now. Please try again in a moment.", true);
  }
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new GenerationError("The AI service returned an empty answer. Try again.", true);
  const u = data.usage;
  const thinking = u?.completion_tokens_details?.reasoning_tokens ?? 0;
  return {
    text,
    usage: { promptTokens: u?.prompt_tokens ?? 0, outputTokens: Math.max(0, (u?.completion_tokens ?? 0) - thinking), thinkingTokens: thinking },
  };
}
