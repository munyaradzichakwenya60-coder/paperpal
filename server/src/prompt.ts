import type { GenerateRequest } from "./schema.js";

const typeGuide = {
  structured:
    "Structured questions only. Each question has a stem and numbered parts (a), (b), (c) etc. No options array. " +
    "Use ZIMSEC command words: state, calculate, find, solve, explain, show that, describe, sketch, draw, write down. " +
    "Build from easier to harder parts within each question. " +
    "In the marking scheme use M for method mark, A for accuracy mark, B for independent mark. " +
    "Show full working for each mark point.",
  "multiple-choice":
    "Multiple-choice questions only (Paper 1 style). Every question must have exactly 4 options in the options array " +
    "(no letters in the option text — PaperPal adds A B C D). Exactly one option is correct. " +
    "Questions should test a range of topics and levels. " +
    "In the marking scheme state the correct option and a brief reason.",
  mixed:
    "Two sections. SECTION A: multiple-choice questions (each with exactly 4 options, one correct). " +
    "SECTION B: structured questions with parts (a), (b), (c). " +
    "Number questions continuously across both sections. " +
    "In the marking scheme use M/A/B labels for structured questions and state the correct option for multiple-choice.",
} as const;

const difficultyGuide = {
  easier:
    "Mostly AO1 (recall and recognition) and routine AO2 (straightforward application). " +
    "One or two questions at AO3 (problem-solving or unfamiliar context). " +
    "Keep numbers manageable and contexts familiar.",
  balanced:
    "A spread across AO1, AO2 and AO3. Roughly a third each. " +
    "Include multi-step questions and at least one question that demands explanation or justification. " +
    "Use a mix of short (1–2 mark) and longer (3–5 mark) parts.",
  harder:
    "Mostly AO2 and AO3. Include multi-step problems, unfamiliar contexts and questions that require " +
    "candidates to show working, justify decisions or interpret results. " +
    "Routine recall questions may appear but should not dominate.",
} as const;

export function buildPrompt(req: GenerateRequest, feedback = ""): string {
  const lines = [
    `You are an experienced Zimbabwean secondary school ${req.subject} teacher who writes ZIMSEC-style examination papers.`,
    `Write one complete ${req.level} ${req.subject} examination paper with a full marking scheme.`,
    "",
    `Topics to cover: ${req.topics.join("; ")}.`,
    `Paper type: ${typeGuide[req.paperType]}`,
    `Difficulty: ${difficultyGuide[req.difficulty]}`,
    `Total marks: exactly ${req.totalMarks}.`,
    `Time allowed: ${req.durationMinutes} minutes (allow about 1–1.5 minutes per mark for structured questions).`,
    "",
    "FORMATTING RULES — follow exactly:",
    "- Write instructions in the ZIMSEC style:",
    '  Structured: "Answer all questions. Write your answers in the spaces provided."',
    '  MCQ: "Answer all questions. For each question, circle the letter of the best answer."',
    '  Mixed: "Answer all questions in Section A and all questions in Section B. Write Section B answers in the spaces provided."',
    "- Each question must have a clear question number (1, 2, 3 … continuously) and its marks shown as [n] — the marks field.",
    "- Parts of a question use (a), (b), (c) as the question number field (e.g. \"1(a)\", \"1(b)\").",
    "- Use Zimbabwean context where natural: US dollars, local names (Tinashe, Chido, Farai, Sibongile), local places.",
    "- Keep language simple, unambiguous and at the right reading level for the candidate.",
    "- Do not use LaTeX. Write mathematics in plain text: x^2, 3/4, sqrt(5), >=, <=, angle ABC.",
    "- Each structured question or part must have an answerLines field (integer, 1–6) indicating how many answer lines to show below it.",
    "",
    "MARK ALLOCATION RULES:",
    "- Each question's marks field must equal the sum of its markingScheme marks.",
    "- The marks of all top-level questions must add up to exactly the total marks.",
    "- For structured questions, split marks across parts so no single part exceeds 5 marks unless the question truly demands it.",
    "- For the marking scheme: use the format 'M1 for [method]', 'A1 for [answer]', 'B1 for [independent fact]'. State alternative accepted methods.",
    "",
    "MARKING SCHEME RULES:",
    "- List mark points in the order they would be awarded.",
    "- For each method mark (M) also state what the A mark depends on (e.g. 'A1 ft from (a)').",
    "- For multiple-choice, state the correct answer letter and a one-line reason.",
    "- For composition/essay questions, provide a marking rubric with band descriptors instead of point marks.",
    "",
    "Respond with JSON only, no markdown fences, in exactly this shape:",
    `{
  "title": string,
  "instructions": string[],
  "sections": [
    {
      "title": string,
      "instructions": string | null,
      "questions": [
        {
          "number": string,
          "text": string,
          "marks": integer,
          "answerLines": integer,
          "options": string[4] | null,
          "markingScheme": [
            { "point": string, "marks": integer }
          ]
        }
      ]
    }
  ]
}`,
    "Do not include any text before or after the JSON.",
  ];

  if (feedback) {
    lines.push("", `Your previous answer was rejected. Fix these issues: ${feedback}`);
  }

  return lines.join("\n");
}
