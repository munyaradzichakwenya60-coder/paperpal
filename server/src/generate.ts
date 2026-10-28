import { callGemini, GenerationError } from "./gemini.js";
import { callOpenRouter } from "./openrouter.js";
import { mockPaper } from "./mock.js";
import { buildPrompt } from "./prompt.js";
import { paperSchema, validatePaper, type GenerateRequest, type GeneratedPaper, type Paper } from "./schema.js";

export type Provider = "gemini" | "openrouter";

/**
 * The AI providers to try, in order. AI_PROVIDER pins one ("gemini", "openrouter" or "mock");
 * otherwise every configured provider is tried -- OpenRouter first, Gemini as fallback.
 */
export function providerChain(): Provider[] {
  const chosen = process.env.AI_PROVIDER?.toLowerCase();
  if (chosen === "gemini") return ["gemini"];
  if (chosen === "openrouter") return ["openrouter"];
  if (chosen === "mock") return [];
  const chain: Provider[] = [];
  if (process.env.OPENROUTER_API_KEY) chain.push("openrouter");
  if (process.env.GEMINI_API_KEY) chain.push("gemini");
  return chain;
}

export function activeProvider(): Provider | "mock" {
  return providerChain()[0] ?? "mock";
}

function stripFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

function withMeta(paper: Paper, req: GenerateRequest, provider: Provider | "mock"): GeneratedPaper {
  return {
    ...paper,
    // The school prints its own header, so the teacher's title wins over the AI's.
    title: req.paperTitle ?? paper.title,
    meta: {
      level: req.level,
      subject: req.subject,
      topics: req.topics,
      paperType: req.paperType,
      durationMinutes: req.durationMinutes,
      totalMarks: req.totalMarks,
      paperTitle: req.paperTitle ?? null,
      provider,
      generatedAt: new Date().toISOString(),
    },
  };
}

function callProvider(provider: Provider, prompt: string, timeoutMs: number): Promise<string> {
  return provider === "openrouter" ? callOpenRouter(prompt, timeoutMs) : callGemini(prompt, timeoutMs);
}

const MAX_ATTEMPTS = 3;
const MIN_ATTEMPT_MS = 8_000;
// Room for a single large generation; the total budget stops before the serverless time limit.
const MAX_ATTEMPT_MS = 240_000;
const TIME_BUDGET_MS = Number(process.env.AI_TIME_BUDGET_MS) || 55_000;

export async function generatePaper(req: GenerateRequest): Promise<GeneratedPaper> {
  const chain = providerChain();
  if (chain.length === 0) return withMeta(mockPaper(req), req, "mock");

  const deadline = Date.now() + TIME_BUDGET_MS;
  let feedback = "";
  let lastError: unknown = null;

  for (const provider of chain) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining < MIN_ATTEMPT_MS) break;

      let text = "";
      try {
        text = await callProvider(provider, buildPrompt(req, feedback), Math.min(MAX_ATTEMPT_MS, remaining));
      } catch (err) {
        lastError = err;
        // A bad key or model name will not fix itself, so only temporary errors are retried.
        if (!(err instanceof GenerationError) || !err.retryable || attempt === MAX_ATTEMPTS) break;
        continue;
      }

      try {
        const parsed = paperSchema.parse(JSON.parse(stripFences(text)));
        const problems = validatePaper(parsed, req);
        if (problems.length === 0) return withMeta(parsed, req, provider);
        console.error(`[attempt ${attempt}] validation problems:`, problems);
        feedback = problems.join(" ");
      } catch (err) {
        if (err instanceof GenerationError) throw err;
        const msg = err instanceof Error ? err.message.slice(0, 400) : "Invalid JSON.";
        console.error(`[attempt ${attempt}] parse or schema error:`, msg);
        feedback = `Invalid JSON or wrong shape: ${msg}`;
      }
    }
  }
  if (lastError instanceof GenerationError && !lastError.retryable) throw lastError;
  throw new GenerationError("The AI could not produce a valid paper in time. Try again, or reduce the number of topics.", true);
}
