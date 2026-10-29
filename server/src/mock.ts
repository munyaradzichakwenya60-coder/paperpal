import type { GenerateRequest, Paper } from "./schema.js";

function splitMarks(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const extra = total - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < extra ? 1 : 0));
}

/** Deterministic sample paper so the app can be developed and demoed without an AI key. */
export function mockPaper(req: GenerateRequest): Paper {
  const count = Math.min(10, Math.max(3, Math.round(req.totalMarks / 5)));
  const marks = splitMarks(req.totalMarks, count);
  const multipleChoice = req.paperType === "multiple-choice";

  const questions = marks.map((m, i) => {
    const topic = req.topics[i % req.topics.length];
    const base = {
      number: String(i + 1),
      text: `Sample question ${i + 1} on ${topic}. This text comes from mock mode. Add a Gemini API key to generate real questions.`,
      marks: m,
      markingScheme: splitMarks(m, Math.min(m, 3)).map((pm, j) => ({
        point: `Sample marking point ${j + 1}`,
        marks: pm,
      })),
    };
    if (i === 0 && !multipleChoice) {
      return {
        ...base,
        text: base.text + " (Sample diagram below.)",
        diagram: { type: "venn" as const, sets: ["A", "B"], counts: [null, null, null, null] },
      };
    }
    return multipleChoice ? { ...base, options: ["A", "B", "C", "D"].map((l) => `Option ${l}`) } : base;
  });

  return {
    title: "",
    instructions: [],
    sections: [{ title: "Section A", questions }],
  };
}
