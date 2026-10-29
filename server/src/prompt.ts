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
  sectioned:
    "A two-section paper in the style of a ZIMSEC Paper 2. " +
    "SECTION A (compulsory): exactly 5 structured questions, numbered 1 to 5, worth exactly 52 marks in total (for example 8, 10, 10, 12 and 12). " +
    "SECTION B: exactly 7 structured questions, numbered 6 to 12, each worth exactly 12 marks. Candidates answer all of Section A and any four questions of Section B. " +
    "Every numbered question has several lettered parts (a), (b), (c) and most parts have roman sub-parts (i), (ii), (iii); each sub-part carries its own mark (1 to 5). " +
    "Section A questions are short and test the basics of different topics. Section B questions are longer and each combines three or four different skills from the chosen topics. " +
    "No options. Candidates write in an answer booklet, so set answerLines to 0 on every question.",
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
  // Build the mark/question count instruction based on paper type
  let markInstruction: string;
  if (req.paperType === "multiple-choice") {
    markInstruction =
      `Number of questions: exactly ${req.questionCount ?? req.totalMarks}. ` +
      `Each question is worth exactly 1 mark. Total marks: ${req.totalMarks}.`;
  } else if (req.paperType === "mixed" && req.questionCount) {
    const structuredMarks = req.totalMarks - req.questionCount;
    markInstruction =
      `SECTION A: exactly ${req.questionCount} multiple-choice questions, each worth 1 mark (${req.questionCount} marks total). ` +
      `SECTION B: structured questions totalling exactly ${structuredMarks} marks. ` +
      `Grand total: exactly ${req.totalMarks} marks.`;
  } else if (req.paperType === "sectioned") {
    markInstruction =
      "Marks: Section A is exactly 52 marks. Section B has 7 questions of exactly 12 marks each (84 marks), of which candidates answer 4 (48 marks). " +
      "The paper is out of 100 marks for the candidate.";
  } else {
    markInstruction = `Total marks: exactly ${req.totalMarks}. Distribute across questions as appropriate for the topic.`;
  }

  const lines = [
    `You are an experienced Zimbabwean secondary school ${req.subject} teacher who writes ZIMSEC-style examination papers.`,
    `Write one complete ${req.level} ${req.subject} examination paper with a full marking scheme.`,
    "",
    `Topics to cover: ${req.topics.join("; ")}.`,
    `Paper type: ${typeGuide[req.paperType]}`,
    `Difficulty: ${difficultyGuide[req.difficulty]}`,
    markInstruction,
    `Time allowed: ${req.durationMinutes} minutes (allow about 1–1.5 minutes per mark for structured questions).`,
    "",
    "FORMATTING RULES — follow exactly:",
    "- Do NOT write cover-page instructions, a paper title, or any school or exam board name. PaperPal prints those itself.",
    "- Each question must have a clear question number (1, 2, 3 … continuously) and its marks shown as [n] — the marks field.",
    "- Number format in the number field: \"1\" for a question with no parts, \"1(a)\" and \"1(b)\" for parts, \"1(a)(i)\" and \"1(a)(ii)\" for sub-parts. Write every part as its own question object, in order.",
    "- stem: text shared by all parts of a numbered question (for example the setting of question 3), written only on the FIRST part of that question, otherwise null.",
    "- partStem: text shared by the sub-parts (i), (ii) of one lettered part, written only on the FIRST sub-part of that part, otherwise null. The text field of each part then holds only that part's own request.",
    "- For a question that candidates must answer on graph paper, end the stem with: \"Answer the whole of this question on a sheet of graph paper.\"",
    "- Use Zimbabwean context where natural: US dollars, local names (Tinashe, Chido, Farai, Sibongile), local places.",
    "- Keep language simple, unambiguous and at the right reading level for the candidate.",
    "- Do not use LaTeX. PaperPal typesets this plain-text notation everywhere (questions, options, marking scheme, tables):",
    "  powers x^2 or (a+b)^2 or M^(-1); subscripts x_1 or 503_6; fractions frac(3,4); mixed numbers 2 frac(1,2); roots sqrt(5);",
    "  matrices mat(3,a;4,2) (commas between columns, semicolons between rows) and column vectors mat(7;-3); comparison signs <=, >=, !=; multiplication *.",
    "  You may also type these symbols directly: ξ ∪ ∩ ∈ ∉ ⊂ π ° ± √ ∠ θ × ÷ ≤ ≥.",
    "- For Mathematics follow ZIMSEC conventions: a decimal comma (1,4 km; 4,5 %), a space between thousands ($7 200), coordinates and set elements separated by semicolons ((-3; 8), {1; 2; 3}).",
    "- Each structured question or part must have an answerLines field (integer, 1–6, or 0 for none) indicating how many answer lines to show below it.",
    "",
    "DIAGRAMS:",
    "- If a question needs a figure, add a \"diagram\" object to that question. PaperPal draws it. Never describe a figure only in words, and never write 'the diagram' unless you include a diagram object.",
    "- Do not write 'not drawn to scale' in the text. PaperPal adds it.",
    "- Venn diagram: {\"type\":\"venn\",\"sets\":[\"F\",\"B\"],\"counts\":[...]}. Two sets: counts = [F only, both, B only, outside]. Three sets: counts = [A only, B only, C only, A&B only, A&C only, B&C only, all three, outside]. Use null for a region the candidate must fill in or shade, a number or a letter (e.g. \"x\") for a known region.",
    "- Triangle: {\"type\":\"triangle\",\"vertices\":[\"A\",\"B\",\"C\"],\"sides\":[\"8 cm\",null,\"x\"],\"angles\":[null,\"40°\",null],\"rightAngleAt\":1}. sides = [AB, BC, CA], angles = at each vertex, rightAngleAt = vertex index or null.",
    "- Number line (inequalities, integers): {\"type\":\"numberline\",\"min\":-5,\"max\":5,\"step\":1,\"points\":[{\"value\":2,\"style\":\"closed\",\"label\":null}],\"shade\":{\"from\":-3,\"to\":null,\"fromOpen\":true,\"toOpen\":false}}. A null end of shade runs off the line.",
    "- Coordinate grid (reflection, translation, enlargement, plotting): {\"type\":\"grid\",\"xMin\":-6,\"xMax\":6,\"yMin\":-6,\"yMax\":6,\"points\":[{\"label\":\"P\",\"x\":3,\"y\":-2}],\"polygons\":[{\"name\":\"A\",\"points\":[[1,1],[3,1],[3,2]]}]}.",
    "- Bar chart: {\"type\":\"bar\",\"title\":\"Goals scored\",\"xLabel\":\"Team\",\"yLabel\":\"Goals\",\"bars\":[{\"label\":\"Lions\",\"value\":12}]}.",
    "- Circle (circle theorems): {\"type\":\"circle\",\"centre\":\"O\",\"points\":[\"A\",\"B\",\"C\",\"D\"],\"chords\":[[\"A\",\"B\"],[\"B\",\"C\"]],\"radii\":[\"A\",\"C\"],\"marks\":[{\"at\":\"B\",\"text\":\"40°\"}]}. Points are spread evenly around the circle in the order given.",
    "- Table (a table of values, a frequency table): {\"type\":\"table\",\"headers\":[\"x\",\"1\",\"2\",\"3\"],\"rows\":[[\"y\",\"12\",\"6\",\"4\"]],\"rowLabels\":true}. Use the maths notation inside cells. A blank cell the candidate must fill can be a letter such as m.",
    "- Pipe or ring cross-section: {\"type\":\"annulus\",\"inner\":\"3,2 cm\",\"outer\":\"3,5 cm\"} (inner and outer diameter).",
    "- Region defined by inequalities (hatched on the unwanted side): {\"type\":\"inequality\",\"xMin\":-4,\"xMax\":5,\"yMin\":-4,\"yMax\":5,\"lines\":[{\"from\":[-2,-4],\"to\":[-2,5],\"dashed\":true},{\"from\":[0,0],\"to\":[3,3]}],\"inside\":[0,2],\"regionLabel\":\"R\",\"points\":[{\"x\":3,\"y\":3,\"label\":\"(3; 3)\"}]}. inside is any point in the wanted region.",
    "- Do NOT draw a grid for a question that asks candidates to draw a graph, a histogram or a transformation. Give the table or coordinates in the text and tell them to use graph paper.",
    "- Use a diagram whenever the topic naturally needs one (sets, geometry, graphs, statistics, transformations, inequalities). For Mathematics papers aim for at least one or two diagram questions when the topics allow. Other subjects: only when really needed.",
    "- Answer-space questions that ask candidates to draw or shade (for example 'shade the region') should give the blank figure.",
    "",
    "MARK ALLOCATION RULES:",
    "- Each question's marks field must equal the sum of its markingScheme marks.",
    "- The marks of all top-level questions must add up to exactly the total marks.",
    "- For MCQ questions, marks must be exactly 1 each. No exceptions.",
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
  "sections": [
    {
      "title": string,   // e.g. "Section A" ("Section A [52 marks]" style headings are added by PaperPal)
      "instructions": string | null,
      "questions": [
        {
          "number": string,
          "stem": string | null,
          "partStem": string | null,
          "text": string,
          "marks": integer,
          "answerLines": integer,
          "options": string[4] | null,
          "diagram": object | null,
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
