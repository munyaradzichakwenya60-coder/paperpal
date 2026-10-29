export class GenerationError extends Error {
  /** True for temporary problems (timeouts, rate limits, server errors) that are worth retrying. */
  constructor(message: string, public readonly retryable = false) {
    super(message);
  }
}

const DEFAULT_MODEL = "gemini-2.5-flash";

/** Token counts the provider reports for one call. Thinking tokens are billed as output. */
export type Usage = { promptTokens: number; outputTokens: number; thinkingTokens: number };
export type AiReply = { text: string; usage: Usage };

/** Sends one prompt to the Gemini API and returns the raw text (expected to be JSON). */
export async function callGemini(prompt: string, timeoutMs = 40_000): Promise<AiReply> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GenerationError("No Gemini API key is configured on the server.");
  const model = (process.env.GEMINI_MODEL || DEFAULT_MODEL).replace(/["'\s]/g, "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.7, maxOutputTokens: 32_768 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const e = err as Error & { cause?: unknown };
    console.error("gemini fetch failed:", e.name, e.message, "cause:", String(e.cause));
    throw new GenerationError("Could not reach the AI service. Check the connection and try again.", true);
  }

  if (!res.ok) {
    // The status code is safe to share; the body can echo request details, so it is not returned.
    const body = await res.text().catch(() => "");
    console.error(`gemini error ${res.status} (${model}):`, body.slice(0, 500));
    const temporary = res.status === 429 || res.status >= 500;
    throw new GenerationError(
      temporary
        ? "The AI service is busy right now. Please try again in a moment."
        : `The AI service rejected the request (status ${res.status}). Check the API key and model name.`,
      temporary,
    );
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new GenerationError("The AI service returned an empty answer. Try again.", true);
  const u = data.usageMetadata;
  return {
    text,
    usage: { promptTokens: u?.promptTokenCount ?? 0, outputTokens: u?.candidatesTokenCount ?? 0, thinkingTokens: u?.thoughtsTokenCount ?? 0 },
  };
}
