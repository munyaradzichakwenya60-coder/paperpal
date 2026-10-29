import { z } from "zod";
import { syllabus } from "./syllabus.js";

export const levels = ["O-Level", "A-Level"] as const;
export const paperTypes = ["structured", "multiple-choice", "mixed", "sectioned"] as const;
export const difficulties = ["easier", "balanced", "harder"] as const;

export const generateRequestSchema = z.object({
  level: z.enum(levels),
  subject: z.string().min(2).max(60),
  topics: z.array(z.string().min(2).max(80)).min(1).max(8),
  paperType: z.enum(paperTypes),
  difficulty: z.enum(difficulties),
  totalMarks: z.number().int().min(10).max(150),
  questionCount: z.number().int().min(10).max(80).optional(),
  durationMinutes: z.number().int().min(15).max(240),
  // Typed by the teacher, printed on the paper (e.g. "Term 3 End of Term Examination"). Never sent to the AI.
  examTitle: z.string().trim().max(80).optional().transform((t) => t || undefined),
}).superRefine((req, ctx) => {
  // Subjects and topics go into the AI prompt, so only values from the syllabus are accepted.
  const subject = syllabus.subjects.find((s) => s.name === req.subject);
  if (!subject) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["subject"], message: "Unknown subject." });
    return;
  }
  const allowed = new Set(subject.levels[req.level]);
  req.topics.forEach((topic, i) => {
    if (!allowed.has(topic)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["topics", i], message: `Unknown topic: ${topic}` });
    }
  });
  if (req.paperType === "sectioned" && req.totalMarks !== SECTIONED_TOTAL_MARKS) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["totalMarks"], message: `A sectioned paper is out of ${SECTIONED_TOTAL_MARKS} marks.` });
  }
  if (new Set(req.topics).size !== req.topics.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["topics"], message: "Topics must not repeat." });
  }
});
export type GenerateRequest = z.infer<typeof generateRequestSchema>;


// ── Diagrams ────────────────────────────────────────────────────────────────
// The AI describes a figure as data and the client draws it, so figures are always clean and labelled.
const label = z.string().trim().min(1).max(24);
const optLabel = z.string().trim().max(24).nullish();
const coord = z.number().min(-1000).max(1000);

const vennDiagram = z.object({
  type: z.literal("venn"),
  /** Set names, e.g. ["F", "B"]. */
  sets: z.array(label).min(2).max(3),
  /** Region labels or counts. Two sets: [A only, A and B, B only, outside]. Three sets: [A only, B only, C only, A&B only, A&C only, B&C only, all three, outside]. null = blank. */
  counts: z.array(z.union([z.string().max(12), z.number()]).nullable()).max(8).nullish(),
});

const triangleDiagram = z.object({
  type: z.literal("triangle"),
  vertices: z.array(label).length(3),
  /** Side labels for [AB, BC, CA] in vertex order. */
  sides: z.array(optLabel).length(3).nullish(),
  /** Angle labels at each vertex in vertex order. */
  angles: z.array(optLabel).length(3).nullish(),
  /** Index (0 to 2) of a vertex that has a right-angle mark. */
  rightAngleAt: z.number().int().min(0).max(2).nullish(),
});

const numberLineDiagram = z.object({
  type: z.literal("numberline"),
  min: coord,
  max: coord,
  step: z.number().positive().default(1),
  points: z.array(z.object({ value: coord, style: z.enum(["open", "closed"]).default("closed"), label: optLabel })).max(6).nullish(),
  /** A shaded range for inequalities. A null end means the line continues past the edge. */
  shade: z.object({
    from: coord.nullable(),
    to: coord.nullable(),
    fromOpen: z.boolean().default(false),
    toOpen: z.boolean().default(false),
  }).nullish(),
}).refine((d) => d.max > d.min && (d.max - d.min) / d.step <= 40, { message: "Bad number line range." });

const gridDiagram = z.object({
  type: z.literal("grid"),
  xMin: z.number().int().min(-20).max(20),
  xMax: z.number().int().min(-20).max(20),
  yMin: z.number().int().min(-20).max(20),
  yMax: z.number().int().min(-20).max(20),
  points: z.array(z.object({ label: optLabel, x: coord, y: coord })).max(12).nullish(),
  polygons: z.array(z.object({ name: optLabel, points: z.array(z.tuple([coord, coord])).min(2).max(8) })).max(4).nullish(),
}).refine((d) => d.xMax > d.xMin && d.yMax > d.yMin && d.xMax - d.xMin <= 30 && d.yMax - d.yMin <= 30, { message: "Bad grid range." });

const barDiagram = z.object({
  type: z.literal("bar"),
  title: optLabel,
  xLabel: optLabel,
  yLabel: optLabel,
  bars: z.array(z.object({ label: label, value: z.number().min(0).max(1_000_000) })).min(2).max(10),
});

const circleDiagram = z.object({
  type: z.literal("circle"),
  centre: optLabel,
  /** Labels of points on the circumference, placed evenly around the circle. */
  points: z.array(label).min(2).max(6),
  chords: z.array(z.tuple([label, label])).max(8).nullish(),
  /** Points joined to the centre. */
  radii: z.array(label).max(6).nullish(),
  /** Angle labels written next to a vertex, e.g. { at: "C", text: "40°" }. */
  marks: z.array(z.object({ at: label, text: z.string().trim().min(1).max(12) })).max(6).nullish(),
});


const tableDiagram = z.object({
  type: z.literal("table"),
  /** Header cells (top row). */
  headers: z.array(z.string().max(40)).min(1).max(9),
  /** Body rows; every row should have as many cells as there are headers. Cells can use the maths text notation. */
  rows: z.array(z.array(z.string().max(40)).max(9)).min(1).max(8),
  /** When true the first cell of every row is a bold row label (as in a frequency table). */
  rowLabels: z.boolean().nullish(),
});

const annulusDiagram = z.object({
  type: z.literal("annulus"),
  /** Dimension labels, e.g. "3,2 cm" for the inner diameter and "3,5 cm" for the outer. */
  inner: z.string().trim().max(20),
  outer: z.string().trim().max(20),
});

const inequalityDiagram = z.object({
  type: z.literal("inequality"),
  xMin: z.number().min(-20).max(20),
  xMax: z.number().min(-20).max(20),
  yMin: z.number().min(-20).max(20),
  yMax: z.number().min(-20).max(20),
  /** Boundary lines. The side that does NOT contain `inside` is hatched. */
  lines: z.array(z.object({
    from: z.tuple([coord, coord]),
    to: z.tuple([coord, coord]),
    dashed: z.boolean().nullish(),
  })).min(1).max(4),
  /** A point inside the wanted region R. */
  inside: z.tuple([coord, coord]),
  regionLabel: optLabel,
  /** Labelled points such as corners, drawn with their coordinates. */
  points: z.array(z.object({ x: coord, y: coord, label: z.string().trim().max(20) })).max(6).nullish(),
}).refine((d) => d.xMax > d.xMin && d.yMax > d.yMin, { message: "Bad range." });

export const diagramSchema = z.union([
  vennDiagram, triangleDiagram, numberLineDiagram, gridDiagram, barDiagram, circleDiagram,
  tableDiagram, annulusDiagram, inequalityDiagram,
]);
export type Diagram = z.infer<typeof diagramSchema>;

const markingPoint = z.object({
  point: z.string().min(1),
  marks: z.number().int().min(1),
});

const question = z.object({
  number: z.string().min(1),
  /** Introductory text printed once above the first part of a numbered question (e.g. the setting shared by 1(a) and 1(b)). */
  stem: z.string().trim().max(1500).nullish(),
  /** Introductory text printed above the sub-parts (i), (ii) of a lettered part such as 1(a). */
  partStem: z.string().trim().max(1500).nullish(),
  text: z.string().min(3),
  marks: z.number().int().min(1),
  answerLines: z.number().int().min(0).max(8).optional().nullable(),
  options: z.array(z.string().min(1)).length(4).optional().nullable(),
  // A malformed figure is dropped (not fatal); validatePaper then asks the AI to redraw it if the text needs one.
  diagram: diagramSchema.nullish().catch(undefined),
  markingScheme: z.array(markingPoint).min(1),
});

const section = z.object({
  // The AI sometimes returns null or "" for a section title (most often on single-section papers).
  title: z.string().nullish().transform((t) => t?.trim() || "Questions"),
  instructions: z.string().optional().nullable(),
  questions: z.array(question).min(1),
});

export const paperSchema = z.object({
  // The cover page (school, exam title, instructions) is built by the client, so these are optional.
  title: z.string().max(120).nullish().transform((t) => t ?? ""),
  instructions: z.array(z.string()).nullish().transform((a) => a ?? []),
  sections: z.array(section).min(1).max(4),
});
export type Paper = z.infer<typeof paperSchema>;

export type GeneratedPaper = Paper & {
  meta: {
    level: GenerateRequest["level"];
    subject: string;
    topics: string[];
    paperType: GenerateRequest["paperType"];
    durationMinutes: number;
    totalMarks: number;
    examTitle?: string;
    provider: "gemini" | "openrouter" | "mock";
    generatedAt: string;
  };
};

const needsDiagram = /\b(the (diagram|figure|graph|grid|number line|bar chart|circle)|(diagram|figure) (below|above|shows)|shown (below|above)|venn diagram)\b/i;

export const SECTION_A_MARKS = 52;
export const SECTION_B_QUESTIONS = 7;
export const SECTION_B_MARKS_EACH = 12;
export const SECTION_A_QUESTIONS = 5;
/** Candidates answer all of Section A and any four questions of Section B. */
export const SECTIONED_TOTAL_MARKS = SECTION_A_MARKS + 4 * SECTION_B_MARKS_EACH;

/** "3(b)(ii)" -> "3". */
export function mainNumber(n: string): string {
  return n.trim().match(/^\d+/)?.[0] ?? n.trim();
}

function validateSectioned(paper: Paper): string[] {
  const problems: string[] = [];
  if (paper.sections.length !== 2) {
    return [`A sectioned paper must have exactly two sections (Section A and Section B) but has ${paper.sections.length}.`];
  }
  const [a, b] = paper.sections;
  const sumByMain = (qs: typeof a.questions) => {
    const m = new Map<string, number>();
    for (const q of qs) m.set(mainNumber(q.number), (m.get(mainNumber(q.number)) ?? 0) + q.marks);
    return m;
  };
  const aMain = sumByMain(a.questions);
  const aTotal = [...aMain.values()].reduce((x, y) => x + y, 0);
  if (aMain.size !== SECTION_A_QUESTIONS) problems.push(`Section A must have exactly ${SECTION_A_QUESTIONS} numbered questions (1 to ${SECTION_A_QUESTIONS}) but has ${aMain.size}.`);
  if (aTotal !== SECTION_A_MARKS) problems.push(`Section A marks add up to ${aTotal} but must total exactly ${SECTION_A_MARKS}.`);
  const bMain = sumByMain(b.questions);
  if (bMain.size !== SECTION_B_QUESTIONS) problems.push(`Section B must have exactly ${SECTION_B_QUESTIONS} numbered questions (${SECTION_A_QUESTIONS + 1} to ${SECTION_A_QUESTIONS + SECTION_B_QUESTIONS}) but has ${bMain.size}.`);
  for (const [n, marks] of bMain) {
    if (marks !== SECTION_B_MARKS_EACH) problems.push(`Section B question ${n} is worth ${marks} marks but every Section B question must be worth exactly ${SECTION_B_MARKS_EACH}.`);
  }
  return problems;
}

/** Checks the rules the AI output must follow. Returns a list of problems (empty = valid). */
export function validatePaper(paper: Paper, req: GenerateRequest): string[] {
  const problems: string[] = [];
  const questions = paper.sections.flatMap((s) => s.questions);

  if (req.paperType === "sectioned") {
    problems.push(...validateSectioned(paper));
  } else {
    const total = questions.reduce((sum, q) => sum + q.marks, 0);
    if (total !== req.totalMarks) {
      problems.push(`Question marks add up to ${total} but the paper must total exactly ${req.totalMarks}.`);
    }
  }

  for (const q of questions) {
    const schemeTotal = q.markingScheme.reduce((sum, p) => sum + p.marks, 0);
    if (schemeTotal !== q.marks) {
      problems.push(`Question ${q.number} is worth ${q.marks} marks but its marking scheme adds up to ${schemeTotal}.`);
    }
    if (!q.diagram && needsDiagram.test(`${q.stem ?? ""} ${q.partStem ?? ""} ${q.text}`)) {
      problems.push(`Question ${q.number} refers to a diagram, figure or Venn diagram but has no valid diagram object. Add one, or reword the question so it does not need one.`);
    }
    if (req.paperType === "multiple-choice" && !q.options) {
      problems.push(`Question ${q.number} must have exactly 4 options because this is a multiple-choice paper.`);
    }
  }
  return problems;
}
