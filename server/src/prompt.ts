import type { GenerateRequest } from "./schema.js";

const typeGuide = {
  structured: "Structured questions with a short stem and answers worked out in writing. Do not include options.",
  "multiple-choice": "Multiple-choice questions. Every question must have exactly 4 options in the options array (no letters in the option text) and exactly one correct answer, which the marking scheme states.",
  mixed: "A mix: Section A with multiple-choice questions (each with exactly 4 options) and Section B with structured questions (no options).",
} as const;

const difficultyGuide = {
  easier: "Mostly recall and routine application, with one or two moderately challenging questions.",
  balanced: "A spread from routine questions to a few challenging, multi-step questions.",
  harder: "Mostly multi-step and problem-solving questions, with a few routine questions.",
} as const;

export function buildPrompt(req: GenerateRequest, feedback = ""): string {
  const lines = [
    `You are an experienced Zimbabwean secondary school ${req.subject} teacher who writes ZIMSEC-style examination papers.`,
    `Write one ${req.level} ${req.subject} paper with a full marking scheme.`,
    "",
    `Topics to cover: ${req.topics.join("; ")}.`,
    `Paper type: ${typeGuide[req.paperType]}`,
    `Difficulty: ${difficultyGuide[req.difficulty]}`,
    `Total marks: exactly ${req.totalMarks}. Time allowed: ${req.durationMinutes} minutes, so size the paper to fit.`,
    "",
    "Rules:",
    "- Use clear command words such as state, calculate, explain, show that, find and solve.",
    "- Use Zimbabwean context where natural (US dollars, local places and names) and keep wording simple and unambiguous.",
    "- Each question's marks must equal the sum of the marks in its markingScheme.",
    "- The marks of all questions must add up to exactly the total marks.",
    "- The marking scheme lists each mark point with its marks, includes the final answer, and notes acceptable alternative methods where relevant.",
    "- Write maths with plain text (for example x^2, 3/4, sqrt(5)). Do not use LaTeX.",
    "- Number questions 1, 2, 3 ... continuously across sections.",
    "",
    "Respond with JSON only, no markdown fences, in exactly this shape:",
    `{"title": string, "instructions": string[], "sections": [{"title": string, "instructions"?: string, "questions": [{"number": string, "text": string, "marks": integer, "options"?: string[4], "markingScheme": [{"point": string, "marks": integer}]}]}]}`,
  ];
  if (feedback) {
    lines.push("", `Your previous answer was rejected for these reasons. Fix them: ${feedback}`);
  }
  return lines.join("\n");
}
