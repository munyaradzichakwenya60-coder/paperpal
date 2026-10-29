export class GenerationError extends Error {
  /** True for temporary problems (timeouts, rate limits, server errors) that are worth retrying. */
  constructor(message: string, public readonly retryable = false, public readonly quota = false) {
    super(message);
  }
}

const DEFAULT_MODEL = "gemini-2.5-flash";

/** Token counts the provider reports for one call. Thinking tokens are billed as output. */
export type Usage = { promptTokens: number; outputTokens: number; thinkingTokens: number };
export type AiReply = { text: string; usage: Usage; model?: string };

/** Sends one prompt to the Gemini API and returns the raw text (expected to be JSON). */
export async function callGemini(prompt: string, timeoutMs = 40_000, modelOverride?: string): Promise<AiReply> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GenerationError("No Gemini API key is configured on the server.");
  const model = (modelOverride || process.env.GEMINI_MODEL || DEFAULT_MODEL).replace(/["'\s]/g, "");
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
      res.status === 429,
    );
  }

  let data: {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  };
  try {
    data = await res.json();
  } catch (err) {
    // A timeout can also hit while the answer is still downloading.
    console.error("gemini body read failed:", (err as Error).message);
    throw new GenerationError("The AI service took too long to answer. Please try again.", true);
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new GenerationError("The AI service returned an empty answer. Try again.", true);
  const u = data.usageMetadata;
  return {
    text,
    model,
    usage: { promptTokens: u?.promptTokenCount ?? 0, outputTokens: u?.candidatesTokenCount ?? 0, thinkingTokens: u?.thoughtsTokenCount ?? 0 },
  };
}
