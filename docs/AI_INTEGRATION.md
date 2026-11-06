# AI integration

## Which AI, and what it does

PaperPal uses large language models to write an exam paper and its marking scheme from a teacher's settings (level, subject, topics, paper type, difficulty, total marks, time). The model returns structured JSON that the app renders as a printable paper.

| Role | Provider and model | When it is used |
|---|---|---|
| Primary | Google Gemini API, `gemini-2.5-flash` (`generateContent`, JSON output, temperature 0.7) | Every request by default |
| Fallback | Gemini `gemini-2.5-flash-lite` | After a retry, when the main model is overloaded (503 / high demand) |
| Backup | OpenRouter, default `nvidia/nemotron-3.5-super-vl:free` (OpenAI-compatible chat completions) | When Gemini quota is exhausted |
| Mock | Built-in sample papers | When no AI key is configured, or `AI_PROVIDER=mock` |

All calls are made from the server. API keys never reach the browser.

## Request flow

1. The browser sends the settings to `POST /api/papers/generate` with the teacher's Supabase login token.
2. The server verifies the token, applies a rate limit (30 requests per IP per 10 minutes) and validates the input with Zod. The subject and topics must exist in `server/src/syllabus.ts`, so free text never reaches the prompt.
3. `prompt.ts` builds the prompt: ZIMSEC command words, mark types (M, A, B), assessment objectives AO1 to AO3, the chosen paper format, difficulty and diagram rules. The school name, teacher name and email are not included.
4. The provider chain is tried (Gemini, then the lighter Gemini, then OpenRouter), up to 3 attempts per provider within a 270 second budget. Only temporary errors are retried. A quota error switches provider immediately.
5. The response is checked (below). If it fails, the exact problems are added to the prompt and the model tries again.
6. A valid paper is returned to the teacher and saved to their account (best effort). Token usage and an estimated cost are recorded on each paper.

## Quality checks

- Zod schema parse of the whole paper
- Question marks add up to the requested total
- Each marking scheme adds up to its question's marks
- Multiple-choice questions have exactly four options
- Diagram descriptions are well formed (12 types, drawn by the app, not by the AI)
- `repairPaper` fixes small mark slips (1 to 2 marks) automatically
- `normalizeParts` tidies question numbering
- Figures the AI cannot describe become clearly marked diagram placeholders

## Limitations

- The model can make mistakes in facts, calculations and marks. Every paper and marking scheme must be reviewed by the teacher.
- It has no access to the official ZIMSEC syllabus or past papers. Topic lists are maintained by hand and should be checked against the current syllabus.
- The prompt is strongest for Mathematics and science-style papers. Language and essay subjects need subject-specific formats.
- Diagrams are limited to the 12 supported types.
- The free OpenRouter backup model is slower and lower quality than Gemini.
- Gemini can be overloaded at busy times; PaperPal then falls back, which can lower quality or increase waiting time.
- Free-tier AI quotas limit how many papers can be generated per day.
