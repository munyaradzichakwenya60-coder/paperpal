import { callGemini, GenerationError } from "./gemini.js";
import { mockPaper } from "./mock.js";
import { buildPrompt } from "./prompt.js";
import { paperSchema, validatePaper, type GenerateRequest, type GeneratedPaper, type Paper } from "./schema.js";

export function activeProvider(): "gemini" | "mock" {
  const chosen = process.env.AI_PROVIDER?.toLowerCase();
  if (chosen === "mock") return "mock";
  if (chosen === "gemini") return "gemini";
  return process.env.GEMINI_API_KEY ? "gemini" : "mock";
}

function stripFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

function withMeta(paper: Paper, req: GenerateRequest, provider: "gemini" | "mock"): GeneratedPaper {
  return {
    ...paper,
    meta: {
      level: req.level,
      subject: req.subject,
      topics: req.topics,
      paperType: req.paperType,
      durationMinutes: req.durationMinutes,
      totalMarks: req.totalMarks,
      examTitle: req.examTitle,
      provider,
      generatedAt: new Date().toISOString(),
    },
  };
}

const MAX_ATTEMPTS = 3;
// Serverless functions have a hard time limit, so stop retrying before it is reached.
const TIME_BUDGET_MS = 55_000;
const MIN_ATTEMPT_MS = 8_000;

export async function generatePaper(req: GenerateRequest): Promise<GeneratedPaper> {
  const provider = activeProvider();
  if (provider === "mock") return withMeta(mockPaper(req), req, "mock");

  const deadline = Date.now() + TIME_BUDGET_MS;
  let feedback = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) break;

    let text = "";
    try {
      text = await callGemini(buildPrompt(req, feedback), Math.min(40_000, remaining));
    } catch (err) {
      // A bad key or model name will not fix itself, so only temporary errors are retried.
      if (!(err instanceof GenerationError) || !err.retryable || attempt === MAX_ATTEMPTS) throw err;
      continue;
    }

    try {
      const parsed = paperSchema.parse(JSON.parse(stripFences(text)));
      const problems = validatePaper(parsed, req);
      if (problems.length === 0) return withMeta(parsed, req, "gemini");
      console.error(`[attempt ${attempt}] validation problems:`, problems);
      feedback = problems.join(" ");
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 400) : "Invalid JSON.";
      console.error(`[attempt ${attempt}] parse or schema error:`, msg);
      feedback = `Invalid JSON or wrong shape: ${msg}`;
    }
  }
  throw new GenerationError("The AI could not produce a valid paper in time. Try again, or reduce the number of topics.", true);
}
