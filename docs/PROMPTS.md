# Prompts used

Two kinds of prompts produced PaperPal: the prompt the app sends to the AI at run time, and the prompts used while building the app with an AI coding assistant (Claude). The first is exact, taken from `server/src/prompt.ts`. The second is a reconstruction of the kind of requests made, written from memory of the project, not a verbatim log.

## 1. Run-time prompt (what PaperPal sends to Gemini or OpenRouter)

`buildPrompt()` assembles one prompt per request from the teacher's validated settings. Nothing the teacher types freely reaches it: subject and topics are checked against `server/src/syllabus.ts`.

### Structure

| Block | Purpose |
|---|---|
| Role | "You are an experienced Zimbabwean secondary school {subject} teacher who writes ZIMSEC-style examination papers." |
| Task | "Write one complete {level} {subject} examination paper with a full marking scheme." |
| Topics | The chosen topics, joined with semicolons |
| Paper type guide | One of four: structured, multiple-choice, mixed, sectioned (ZIMSEC Paper 2 style, 52 marks in Section A, seven 12-mark questions in Section B) |
| Difficulty guide | Easier, balanced or harder, expressed as a spread across AO1 (recall), AO2 (application) and AO3 (problem solving) |
| Mark instruction | Exact totals, question counts and mark splits for the paper type |
| Time | Duration, with about 1 to 1.5 minutes per mark |
| Formatting rules | Question numbering (1, 1(a), 1(a)(i)), stems and part stems, no repeated labels, one connected scenario per question, Zimbabwean context (US dollars, local names and places), plain-text maths notation (x^2, frac(3,4), sqrt(5)), ZIMSEC conventions such as the decimal comma |
| Diagram rules | Twelve JSON diagram types (venn, triangle, number line, grid, bar, circle, table, annulus, inequality, solid, bearing, graph) the app draws itself. The model must not mention a figure unless it supplies a valid diagram object |
| Mark allocation rules | Each question's marks equal the sum of its marking scheme; top-level marks equal the total; one mark per multiple-choice question; no part over 5 marks unless needed |
| Marking scheme rules | M, A and B marks, order of award, follow-through (ft), alternative methods, rubrics for essay questions |
| Output contract | JSON only, in a fixed shape, no text outside the JSON |

### Example of the settings-dependent lines

For O-Level Mathematics, topics Sets, Equations and inequalities and Graphs of functions, structured, balanced, 20 marks, 30 minutes:

```
You are an experienced Zimbabwean secondary school Mathematics teacher who writes ZIMSEC-style examination papers.
Write one complete O-Level Mathematics examination paper with a full marking scheme.

Topics to cover: Sets; Equations and inequalities; Graphs of functions.
Paper type: Structured questions only. Each question has a stem and numbered parts (a), (b), (c) etc. ...
Difficulty: A spread across AO1, AO2 and AO3. Roughly a third each. ...
Total marks: exactly 20. Distribute across questions as appropriate for the topic.
Time allowed: 30 minutes (allow about 1-1.5 minutes per mark for structured questions).
```

The fixed rules (formatting, diagrams, marks, marking scheme, JSON shape) follow these lines unchanged.

### Retry prompt

If validation fails (marks do not add up, a scheme does not match its question, a multiple-choice question lacks four options, a diagram is malformed), the same prompt is sent again with one extra line:

```
Your previous answer was rejected. Fix these issues: {list of specific problems}
```

### Why it is written this way

- The role and ZIMSEC vocabulary (command words, M/A/B marks, AO1 to AO3) pull the output towards the local exam style.
- Explicit numeric rules (marks, question counts) exist because models often get arithmetic wrong; the server then verifies them rather than trusting the model.
- The diagram section exists because models cannot draw. They describe a figure as data and PaperPal renders it, which keeps figures correct and consistent.
- "JSON only" with a fixed shape lets the server validate the output with a schema.
- The rule "never refer to a figure unless you supply one" came from early papers that said "the diagram shows..." with no diagram.

## 2. Build prompts (working with an AI coding assistant)

These are representative of the requests that shaped the app, reconstructed and paraphrased.

1. **Foundation:** "Build a web app for Zimbabwean teachers to generate ZIMSEC-style test papers and marking schemes. React and TypeScript front end, Express back end, Gemini for the AI, deployed on Vercel. Keep the API key on the server."
2. **Quality control:** "Check that the marks add up to the total and each marking scheme adds up to its question. If the AI gets it wrong, send the problems back and retry."
3. **Accounts and storage:** "Add sign up and login with email and Google using Supabase. Save each teacher's profile and papers, and make sure teachers can only see their own."
4. **Resilience:** "Gemini sometimes says it is overloaded or out of quota. Fall back to a lighter model, then to OpenRouter, and track what each paper costs."
5. **Exam realism:** "Make the cover page and instructions look like a real ZIMSEC paper. Add the sectioned Paper 2 format with 100 marks."
6. **Diagrams:** "Questions about sets, triangles, graphs and bearings need figures. Have the AI describe them as data and draw them in the app."
7. **Branding:** "Use ZIMSEC-style navy, grey and gold, no green. Add a splash screen inspired by a logo animation, then my double-P logo. Login and sign up come after the splash. Make the forms flat and the inputs styled."
8. **Documentation:** "We are in Phase 2: write the README, describe the AI integration, add screenshots and a statement on ethical and responsible AI use, and document the prompts."

Each request was followed by review, testing (30 automated tests plus manual checks in the browser) and small corrections before merging.
