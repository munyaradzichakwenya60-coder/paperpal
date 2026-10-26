# PaperPal

PaperPal helps Zimbabwean secondary school teachers generate ZIMSEC-style test papers and full marking schemes in minutes. A teacher picks the level, topics, paper type, difficulty, marks and time, and PaperPal writes the paper and the marking scheme, which the teacher reviews and prints.

This is the capstone project for the Uncommon.org software development track. The approved proposal is "Capstone Proposal – Munyaradzi – PaperPal".

## Status

Work in progress. What works today:

- Paper builder form (level, subject, topics, paper type, difficulty, total marks, time)
- AI generation of the paper and marking scheme through the Gemini API, with strict JSON validation and one automatic retry
- Question paper and marking scheme views, and print or save as PDF from the browser
- Mock mode that returns sample papers when no API key is set
- Unit tests for the validation and retry logic

Planned before submission: per-question regenerate and editing, Word export, saving papers to a question bank, deployment, and the screenshots and demo.

## Tech stack

- Frontend: React 18, TypeScript, Vite
- Backend: Node.js, Express, TypeScript, Zod for validation
- AI: Gemini API (`generateContent`), called only from the server
- Tests: Node's built-in test runner

## Setup

Requires Node.js 20 or newer.

```bash
npm install
cp server/.env.example server/.env
```

Edit `server/.env` and set `GEMINI_API_KEY`. Never commit this file. Without a key the app runs in mock mode and returns sample text.

## Run

```bash
npm run dev      # server on :3001, client on :5173
npm test -w server
npm run build    # production build; the server then also serves the client
npm start
```

Open http://localhost:5173.

## AI integration

- **API:** Gemini `generateContent`, with JSON output requested. The model name is set with `GEMINI_MODEL` (default `gemini-2.5-flash`).
- **What it does:** takes the teacher's settings and writes a complete paper and a marking scheme as JSON.
- **Safeguards:** the response is parsed and checked with Zod. The server also checks that the question marks add up to the requested total, that each marking scheme adds up to its question's marks, and that multiple-choice questions have four options. If a check fails, the problems are sent back to the model for one retry. After two failures the teacher sees a clear error.
- **Keys:** the API key stays on the server and is never sent to the browser.
- **Limitations:** the model can make mistakes in facts, calculations and marks, and it does not have the official ZIMSEC syllabus or past papers. The topic lists in `server/src/syllabus.ts` are a starter set to be checked against the current syllabus. Teachers must review every paper and marking scheme before use.

## Project structure

```
client/   React app (paper builder and paper view)
server/   Express API, prompt, Gemini client, validation, tests
```
