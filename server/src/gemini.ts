export class GenerationError extends Error {}

const DEFAULT_MODEL = "gemini-2.5-flash";

/** Sends one prompt to the Gemini API and returns the raw text (expected to be JSON). */
export async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GenerationError("No Gemini API key is configured on the server.");
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    throw new GenerationError("Could not reach the AI service. Check the connection and try again.");
  }

  if (!res.ok) {
    // The status code is safe to share; the body can echo request details, so it is not returned.
    throw new GenerationError(`The AI service returned an error (status ${res.status}). Check the API key and model name.`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new GenerationError("The AI service returned an empty answer. Try again.");
  return text;
}
