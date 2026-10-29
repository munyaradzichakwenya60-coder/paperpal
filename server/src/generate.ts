import { callGemini, GenerationError, type AiReply, type Usage } from "./gemini.js";
import { callOpenRouter } from "./openrouter.js";
import { mockPaper } from "./mock.js";
import { buildPrompt } from "./prompt.js";
import { paperSchema, validatePaper, type GenerateRequest, type GeneratedPaper, type Paper } from "./schema.js";

export type Provider = "gemini" | "openrouter";

/**
 * The AI providers to try, in order. AI_PROVIDER pins one ("gemini", "openrouter" or "mock").
 * Otherwise Gemini is used first and OpenRouter is the backup for when Gemini's quota runs out.
 */
export function providerChain(): Provider[] {
  const chosen = process.env.AI_PROVIDER?.toLowerCase();
  if (chosen === "gemini") return ["gemini"];
  if (chosen === "openrouter") return ["openrouter"];
  if (chosen === "mock") return [];
  const chain: Provider[] = [];
  if (process.env.GEMINI_API_KEY) chain.push("gemini");
  if (process.env.OPENROUTER_API_KEY) chain.push("openrouter");
  return chain;
}

export function activeProvider(): Provider | "mock" {
  return providerChain()[0] ?? "mock";
}

function callProvider(provider: Provider, prompt: string, timeoutMs: number): Promise<AiReply> {
  return provider === "openrouter" ? callOpenRouter(prompt, timeoutMs) : callGemini(prompt, timeoutMs);
}

function stripFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

// USD per 1M tokens (input, output) as listed by Google for Gemini 2.5 Flash. Override with GEMINI_PRICE_IN / GEMINI_PRICE_OUT.
const PRICE_IN = Number(process.env.GEMINI_PRICE_IN) || 0.3;
const PRICE_OUT = Number(process.env.GEMINI_PRICE_OUT) || 2.5;

type Tally = Usage & { calls: number };
const emptyTally = (): Tally => ({ calls: 0, promptTokens: 0, outputTokens: 0, thinkingTokens: 0 });

/** Estimated cost; only meaningful for Gemini paid pricing. OpenRouter free models cost nothing. */
function costUsd(t: Tally, provider: Provider | "mock"): number | null {
  if (provider !== "gemini") return null;
  return Number(((t.promptTokens * PRICE_IN + (t.outputTokens + t.thinkingTokens) * PRICE_OUT) / 1_000_000).toFixed(5));
}

function withMeta(paper: Paper, req: GenerateRequest, provider: Provider | "mock", tally: Tally = emptyTally()): GeneratedPaper {
  const usage = { ...tally, estimatedCostUsd: costUsd(tally, provider) };
  if (provider !== "mock") {
    console.log(`[usage] ${provider} ${req.subject} ${req.paperType} ${req.questionCount ?? "?"}q calls=${usage.calls} in=${usage.promptTokens} out=${usage.outputTokens} think=${usage.thinkingTokens} cost=$${usage.estimatedCostUsd ?? "n/a"}`);
  }
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
      usage,
    },
  };
}

const MAX_ATTEMPTS = 3;
const MIN_ATTEMPT_MS = 8_000;
// A long paper (40 questions with marking schemes) can take a few minutes to write.
const MAX_ATTEMPT_MS = 240_000;
// Serverless functions have a hard time limit (maxDuration in vercel.json is 300 s), so stop before it.
const TIME_BUDGET_MS = Number(process.env.AI_TIME_BUDGET_MS) || 270_000;

export async function generatePaper(req: GenerateRequest): Promise<GeneratedPaper> {
  const chain = providerChain();
  if (chain.length === 0) return withMeta(mockPaper(req), req, "mock");

  const deadline = Date.now() + TIME_BUDGET_MS;
  let feedback = "";
  let lastError: unknown = null;
  const tally = emptyTally();

  for (const [index, provider] of chain.entries()) {
    const hasBackup = index < chain.length - 1;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining < MIN_ATTEMPT_MS) break;

      let text = "";
      try {
        const reply = await callProvider(provider, buildPrompt(req, feedback), Math.min(MAX_ATTEMPT_MS, remaining));
        text = reply.text;
        tally.calls += 1;
        tally.promptTokens += reply.usage.promptTokens;
        tally.outputTokens += reply.usage.outputTokens;
        tally.thinkingTokens += reply.usage.thinkingTokens;
      } catch (err) {
        lastError = err;
        if (!(err instanceof GenerationError)) throw err;
        // Out of quota, busy or down: go straight to the backup provider if there is one.
        if (hasBackup) {
          console.error(`${provider} failed, trying ${chain[index + 1]}:`, err.message);
          break;
        }
        // A bad key or model name will not fix itself, so only temporary errors are retried.
        if (!err.retryable || attempt === MAX_ATTEMPTS) break;
        continue;
      }

      try {
        const parsed = paperSchema.parse(JSON.parse(stripFences(text)));
        const problems = validatePaper(parsed, req);
        if (problems.length === 0) return withMeta(parsed, req, provider, tally);
        console.error(`[${provider} attempt ${attempt}] validation problems:`, problems);
        feedback = problems.join(" ");
      } catch (err) {
        const msg = err instanceof Error ? err.message.slice(0, 400) : "Invalid JSON.";
        console.error(`[${provider} attempt ${attempt}] parse or schema error:`, msg);
        feedback = `Invalid JSON or wrong shape: ${msg}`;
      }
    }
  }

  if (lastError instanceof GenerationError && !lastError.retryable) throw lastError;
  throw new GenerationError("The AI could not produce a valid paper in time. Try again, or reduce the number of topics.", true);
}
