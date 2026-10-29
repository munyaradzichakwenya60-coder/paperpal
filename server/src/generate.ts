import { callGemini, GenerationError, type AiReply, type Usage } from "./gemini.js";
import { callOpenRouter } from "./openrouter.js";
import { mockPaper } from "./mock.js";
import { buildPrompt } from "./prompt.js";
import { paperSchema, validatePaper, MISSING_DIAGRAM, type GenerateRequest, type GeneratedPaper, type Paper } from "./schema.js";

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

function callProvider(provider: Provider, prompt: string, timeoutMs: number, model?: string): Promise<AiReply> {
  return provider === "openrouter" ? callOpenRouter(prompt, timeoutMs) : callGemini(prompt, timeoutMs, model);
}

/** When the main Gemini model is overloaded, a lighter sibling model usually still answers. Set GEMINI_FALLBACK_MODEL="" to turn this off. */
const fallbackModel = () => (process.env.GEMINI_FALLBACK_MODEL ?? "gemini-2.5-flash-lite").replace(/["'\s]/g, "");

function stripFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

// USD per 1M tokens (input, output) as listed by Google. Flash-Lite is the fallback model. Override the main model's prices with GEMINI_PRICE_IN / GEMINI_PRICE_OUT.
const priceFor = (model?: string): [number, number] =>
  /lite/i.test(model ?? "") ? [0.1, 0.4] : [Number(process.env.GEMINI_PRICE_IN) || 0.3, Number(process.env.GEMINI_PRICE_OUT) || 2.5];

type Tally = Usage & { calls: number; costUsd: number };
const emptyTally = (): Tally => ({ calls: 0, promptTokens: 0, outputTokens: 0, thinkingTokens: 0, costUsd: 0 });

/** Estimated cost; only meaningful for Gemini paid pricing. OpenRouter free models cost nothing. */
function costUsd(t: Tally, provider: Provider | "mock"): number | null {
  if (provider !== "gemini") return null;
  return Number(t.costUsd.toFixed(5));
}

function withMeta(paper: Paper, req: GenerateRequest, provider: Provider | "mock", tally: Tally = emptyTally()): GeneratedPaper {
  const { costUsd: _c, ...counts } = tally;
  const usage = { ...counts, estimatedCostUsd: costUsd(tally, provider) };
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

const ROMANS = "(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)";
// A label the AI copied into the question text: "1(a)(i) ", "2(a) ", "(b) ", "(ii) ".
const SELF_LABEL = new RegExp(`^\\s*(?:question\\s+)?(?:\\d+\\s*\\([a-z]\\)(?:\\(${ROMANS}\\))?|\\([a-z]\\)(?:\\(${ROMANS}\\))?|\\(${ROMANS}\\))\\s*[.:)-]?\\s+`, "i");

function stripLabel(s: string | null | undefined): string | null | undefined {
  if (!s) return s;
  const out = s.replace(SELF_LABEL, "");
  return out.length >= 3 ? out : s;
}

/**
 * Tidies how the AI numbered and wrote the parts so the printed paper lines up:
 * labels copied into the text are removed, a first part left as "1(a)" next to "1(a)(ii)" becomes "1(a)(i)",
 * and a lead-in glued to the first sub-part ("Find ...: (i) Football only.") is split into a partStem.
 */
export function normalizeParts(paper: Paper): void {
  const qs = paper.sections.flatMap((s) => s.questions);
  for (const q of qs) {
    q.text = stripLabel(q.text) as string;
    q.stem = stripLabel(q.stem) ?? q.stem;
    q.partStem = stripLabel(q.partStem) ?? q.partStem;
  }
  const key = (n: string) => n.trim().match(/^(\d+\s*\([a-z]\))\s*(?:\(([ivx]+)\))?$/i);
  const groups = new Map<string, Paper["sections"][number]["questions"]>();
  for (const q of qs) {
    const m = key(q.number);
    if (!m) continue;
    const g = m[1].replace(/\s+/g, "").toLowerCase();
    groups.set(g, [...(groups.get(g) ?? []), q]);
  }
  for (const [g, list] of groups) {
    const hasRoman = list.some((q) => key(q.number)?.[2]);
    const first = list[0];
    if (!hasRoman || key(first.number)?.[2]) continue;
    first.number = `${g}(i)`;
    const split = /^(.*?)[:\s]*\(i\)\s+(.+)$/s.exec(first.text);
    if (split && split[1].trim().length >= 3 && split[2].trim().length >= 3 && !first.partStem) {
      first.partStem = split[1].trim().replace(/[:\s]+$/, "") + ":";
      first.text = split[2].trim();
    }
  }
}

/**
 * Fixes small slips the AI makes so a whole paper is not thrown away for them:
 * a marking scheme that is 1 or 2 marks off its question gets the difference on its last point.
 * The question's own marks never change, so section and paper totals stay exact.
 */
export function repairPaper(paper: Paper): string[] {
  const fixed: string[] = [];
  for (const q of paper.sections.flatMap((s) => s.questions)) {
    const total = q.markingScheme.reduce((s, p) => s + p.marks, 0);
    const diff = q.marks - total;
    if (diff === 0 || Math.abs(diff) > 2) continue;
    // Take marks from (or give marks to) the last point that can absorb the change.
    for (let i = q.markingScheme.length - 1; i >= 0; i--) {
      const next = q.markingScheme[i].marks + diff;
      if (next >= 1) {
        q.markingScheme[i].marks = next;
        fixed.push(`${q.number} ${diff > 0 ? "+" : ""}${diff}`);
        break;
      }
    }
  }
  return fixed;
}

/** After the AI has been given a chance to fix them, figures it cannot draw become a placeholder for the teacher. */
function addDiagramPlaceholders(paper: Paper, problems: string[]): void {
  const open = new Set(problems.filter((p) => p.startsWith(MISSING_DIAGRAM)).map((p) => /question (\S+)\)/.exec(p)?.[1]));
  for (const q of paper.sections.flatMap((s) => s.questions)) {
    if (open.has(q.number)) q.diagramPlaceholder = true;
  }
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
  let model: string | undefined;
  let usedFallback = false;

  for (const [index, provider] of chain.entries()) {
    const hasBackup = index < chain.length - 1;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining < MIN_ATTEMPT_MS) break;

      let text = "";
      try {
        const reply = await callProvider(provider, buildPrompt(req, feedback), Math.min(MAX_ATTEMPT_MS, remaining), model);
        text = reply.text;
        tally.calls += 1;
        tally.promptTokens += reply.usage.promptTokens;
        tally.outputTokens += reply.usage.outputTokens;
        tally.thinkingTokens += reply.usage.thinkingTokens;
        const [pin, pout] = priceFor(reply.model);
        tally.costUsd += (reply.usage.promptTokens * pin + (reply.usage.outputTokens + reply.usage.thinkingTokens) * pout) / 1_000_000;
      } catch (err) {
        lastError = err;
        if (!(err instanceof GenerationError)) throw err;
        // "High demand" and rate limits usually clear in seconds, so retry the same provider a couple
        // of times before giving up on it. A bad key or model name will not fix itself.
        // Out of quota is the exception: waiting will not help, so switch to the backup straight away.
        if (err.quota && hasBackup) {
          console.error(`${provider} out of quota, trying ${chain[index + 1]}:`, err.message);
          break;
        }
        // Still busy after one retry: try the lighter Gemini model right away instead of waiting longer.
        if (provider === "gemini" && err.retryable && !usedFallback && attempt >= 2 && fallbackModel()) {
          model = fallbackModel();
          usedFallback = true;
          console.error(`gemini busy, switching to ${model}:`, err.message);
          continue;
        }
        if (err.retryable && attempt < MAX_ATTEMPTS) {
          console.error(`[${provider} attempt ${attempt}] busy, retrying shortly:`, err.message);
          await new Promise((r) => setTimeout(r, attempt * 4_000));
          continue;
        }
        if (hasBackup) console.error(`${provider} failed, trying ${chain[index + 1]}:`, err.message);
        break;
      }

      try {
        const parsed = paperSchema.parse(JSON.parse(stripFences(text)));
        normalizeParts(parsed);
        const repaired = repairPaper(parsed);
        if (repaired.length) console.warn(`[${provider} attempt ${attempt}] adjusted marking schemes:`, repaired.join(", "));
        let problems = validatePaper(parsed, req);
        if (problems.length === 0) return withMeta(parsed, req, provider, tally);
        // From the second try on, a paper whose only flaw is a figure the AI could not draw is still useful:
        // the question gets a "diagram needed" box and the teacher adds the figure.
        if (attempt >= 2 && problems.every((p) => p.startsWith(MISSING_DIAGRAM))) {
          addDiagramPlaceholders(parsed, problems);
          problems = validatePaper(parsed, req);
          if (problems.length === 0) return withMeta(parsed, req, provider, tally);
        }
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
