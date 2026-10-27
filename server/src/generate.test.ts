import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { generatePaper } from "./generate.js";
import { mockPaper } from "./mock.js";
import { validatePaper, type GenerateRequest } from "./schema.js";

const req: GenerateRequest = {
  level: "O-Level",
  subject: "Mathematics",
  topics: ["Sets", "Probability"],
  paperType: "structured",
  difficulty: "balanced",
  totalMarks: 20,
  durationMinutes: 45,
};

describe("validatePaper", () => {
  it("accepts a paper whose marks add up", () => {
    assert.deepEqual(validatePaper(mockPaper(req), req), []);
  });

  it("flags a wrong paper total", () => {
    const paper = mockPaper(req);
    paper.sections[0].questions[0].marks += 1;
    const problems = validatePaper(paper, req);
    assert.ok(problems.some((p) => p.includes("must total exactly 20")));
  });

  it("flags a marking scheme that does not match the question marks", () => {
    const paper = mockPaper(req);
    paper.sections[0].questions[1].markingScheme[0].marks += 1;
    assert.ok(validatePaper(paper, req).length > 0);
  });

  it("requires options on multiple-choice papers", () => {
    const mcq = { ...req, paperType: "multiple-choice" as const };
    assert.ok(validatePaper(mockPaper(req), mcq).length > 0);
    assert.deepEqual(validatePaper(mockPaper(mcq), mcq), []);
  });
});

describe("generatePaper with the Gemini provider", () => {
  const realFetch = globalThis.fetch;
  let calls = 0;

  beforeEach(() => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-key";
    calls = 0;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.AI_PROVIDER;
    delete process.env.GEMINI_API_KEY;
  });

  const reply = (obj: unknown) =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }));

  it("retries once when the first answer fails validation, then succeeds", async () => {
    const bad = mockPaper(req);
    bad.sections[0].questions[0].marks += 3;
    const good = mockPaper(req);
    globalThis.fetch = (async () => reply(calls++ === 0 ? bad : good)) as typeof fetch;

    const paper = await generatePaper(req);
    assert.equal(calls, 2);
    assert.equal(paper.meta.provider, "gemini");
  });

  it("gives up with a clear error after two invalid answers", async () => {
    const bad = mockPaper(req);
    bad.sections[0].questions[0].marks += 3;
    globalThis.fetch = (async () => reply(bad)) as typeof fetch;

    await assert.rejects(() => generatePaper(req), /could not produce a valid paper/);
  });

  it("does not retry when the AI service rejects the key", async () => {
    globalThis.fetch = (async () => {
      calls++;
      return new Response("", { status: 403 });
    }) as typeof fetch;

    await assert.rejects(() => generatePaper(req), /rejected the request/);
    assert.equal(calls, 1);
  });

  it("retries a temporary AI service error", async () => {
    const good = mockPaper(req);
    globalThis.fetch = (async () => (calls++ === 0 ? new Response("", { status: 503 }) : reply(good))) as typeof fetch;

    const paper = await generatePaper(req);
    assert.equal(calls, 2);
    assert.equal(paper.meta.provider, "gemini");
  });
});
