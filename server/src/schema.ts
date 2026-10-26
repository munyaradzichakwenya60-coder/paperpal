import { z } from "zod";

export const levels = ["O-Level", "A-Level"] as const;
export const paperTypes = ["structured", "multiple-choice", "mixed"] as const;
export const difficulties = ["easier", "balanced", "harder"] as const;

export const generateRequestSchema = z.object({
  level: z.enum(levels),
  subject: z.string().min(2).max(60),
  topics: z.array(z.string().min(2).max(80)).min(1).max(8),
  paperType: z.enum(paperTypes),
  difficulty: z.enum(difficulties),
  totalMarks: z.number().int().min(10).max(100),
  durationMinutes: z.number().int().min(15).max(240),
});
export type GenerateRequest = z.infer<typeof generateRequestSchema>;

const markingPoint = z.object({
  point: z.string().min(1),
  marks: z.number().int().min(1),
});

const question = z.object({
  number: z.string().min(1),
  text: z.string().min(5),
  marks: z.number().int().min(1),
  answerLines: z.number().int().min(0).max(8).optional().nullable(),
  options: z.array(z.string().min(1)).length(4).optional().nullable(),
  markingScheme: z.array(markingPoint).min(1),
});

const section = z.object({
  title: z.string().min(1),
  instructions: z.string().optional().nullable(),
  questions: z.array(question).min(1),
});

export const paperSchema = z.object({
  title: z.string().min(3),
  instructions: z.array(z.string().min(1)).min(1).max(8),
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
    provider: "gemini" | "mock";
    generatedAt: string;
  };
};

/** Checks the rules the AI output must follow. Returns a list of problems (empty = valid). */
export function validatePaper(paper: Paper, req: GenerateRequest): string[] {
  const problems: string[] = [];
  const questions = paper.sections.flatMap((s) => s.questions);

  const total = questions.reduce((sum, q) => sum + q.marks, 0);
  if (total !== req.totalMarks) {
    problems.push(`Question marks add up to ${total} but the paper must total exactly ${req.totalMarks}.`);
  }

  for (const q of questions) {
    const schemeTotal = q.markingScheme.reduce((sum, p) => sum + p.marks, 0);
    if (schemeTotal !== q.marks) {
      problems.push(`Question ${q.number} is worth ${q.marks} marks but its marking scheme adds up to ${schemeTotal}.`);
    }
    if (req.paperType === "multiple-choice" && !q.options) {
      problems.push(`Question ${q.number} must have exactly 4 options because this is a multiple-choice paper.`);
    }
  }
  return problems;
}
