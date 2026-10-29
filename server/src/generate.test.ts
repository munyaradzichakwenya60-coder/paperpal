import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { generatePaper } from "./generate.js";
import { mockPaper } from "./mock.js";
import { paperSchema, validatePaper, type GenerateRequest } from "./schema.js";

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


it("a null section title from the AI falls back to a default", () => {
  const parsed = paperSchema.parse({
    title: "Test paper",
    instructions: ["Answer all questions."],
    sections: [{
      title: null,
      questions: [{ number: "1", text: "What is 2 + 2?", marks: 1, markingScheme: [{ point: "4", marks: 1 }] }],
    }],
  });
  assert.equal(parsed.sections[0].title, "Questions");
});

describe("diagrams", () => {
  const base = {
    title: "x",
    instructions: [],
    sections: [{ title: "A", questions: [{ number: "1", text: "Shade the region on the Venn diagram.", marks: 1, markingScheme: [{ point: "ok", marks: 1 }] }] }],
  };

  it("keeps a valid diagram", () => {
    const withDiagram = structuredClone(base) as any;
    withDiagram.sections[0].questions[0].diagram = { type: "venn", sets: ["A", "B"], counts: [null, 3, null, 2] };
    const parsed = paperSchema.parse(withDiagram);
    assert.equal(parsed.sections[0].questions[0].diagram?.type, "venn");
  });

  it("drops a malformed diagram, and validation then asks for it again", () => {
    const bad = structuredClone(base) as any;
    bad.sections[0].questions[0].diagram = { type: "venn", sets: ["A"] };
    const parsed = paperSchema.parse(bad);
    assert.equal(parsed.sections[0].questions[0].diagram, undefined);
    const problems = validatePaper(parsed, { ...req, totalMarks: 1 });
    assert.ok(problems.some((p) => p.includes("diagram")));
  });
});

describe("OpenRouter backup", () => {
  const realFetch = globalThis.fetch;
  const urls: string[] = [];

  beforeEach(() => {
    delete process.env.AI_PROVIDER;
    process.env.GEMINI_API_KEY = "gem-key";
    process.env.OPENROUTER_API_KEY = "or-key";
    urls.length = 0;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
  });

  it("uses Gemini first and switches to OpenRouter when Gemini is out of quota", async () => {
    const good = mockPaper(req);
    globalThis.fetch = (async (url: string) => {
      urls.push(String(url));
      if (String(url).includes("generativelanguage")) return new Response("quota", { status: 429 });
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(good) } }] }));
    }) as unknown as typeof fetch;

    const paper = await generatePaper(req);
    assert.equal(paper.meta.provider, "openrouter");
    assert.equal(urls.length, 2);
    assert.ok(urls[0].includes("generativelanguage"));
    assert.ok(urls[1].includes("openrouter.ai"));
  });

  it("does not touch OpenRouter while Gemini works", async () => {
    const good = mockPaper(req);
    globalThis.fetch = (async (url: string) => {
      urls.push(String(url));
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(good) }] } }] }));
    }) as unknown as typeof fetch;

    const paper = await generatePaper(req);
    assert.equal(paper.meta.provider, "gemini");
    assert.equal(urls.length, 1);
  });
});
