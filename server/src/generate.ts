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
      provider,
      generatedAt: new Date().toISOString(),
    },
  };
}

const MAX_ATTEMPTS = 2;

export async function generatePaper(req: GenerateRequest): Promise<GeneratedPaper> {
  const provider = activeProvider();
  if (provider === "mock") return withMeta(mockPaper(req), req, "mock");

  let feedback = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const text = await callGemini(buildPrompt(req, feedback));
    try {
      const parsed = paperSchema.parse(JSON.parse(stripFences(text)));
      const problems = validatePaper(parsed, req);
      if (problems.length === 0) return withMeta(parsed, req, "gemini");
      feedback = problems.join(" ");
    } catch (err) {
      feedback = err instanceof Error ? `Invalid JSON or wrong shape: ${err.message.slice(0, 400)}` : "Invalid JSON.";
    }
  }
  throw new GenerationError("The AI could not produce a valid paper after two tries. Try again, or reduce the number of topics.");
}
