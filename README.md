# PaperPal

PaperPal helps Zimbabwean secondary school teachers generate ZIMSEC-style test papers and full marking schemes in minutes. A teacher picks the level, subject, topics, paper type, difficulty, marks and time, and PaperPal writes the paper and the marking scheme, which the teacher reviews and prints.

This is the capstone project for the Uncommon.org software development track. The approved proposal is "Capstone Proposal – Munyaradzi – PaperPal".

## Features

- Paper builder for O-Level and A-Level subjects, with topic lists per subject
- AI generation of a paper and marking scheme through the Gemini API, checked by strict validation and retried when a check fails
- School profile (school name, teacher name, role) that is printed on the paper's cover
- Question paper and marking scheme views, and print or save as PDF from the browser
- Mock mode that returns sample papers when no API key is set
- Mobile-friendly layout
- Unit tests for validation, retry behaviour, input checking and rate limiting

Planned: sign up and login, saving papers to a question bank, per-question regenerate and editing, Word export, and subject-specific paper formats (Paper 1 and Paper 2 styles).

## Tech stack

- Frontend: React 18, TypeScript, Vite
- Backend: Node.js, Express, TypeScript, Zod for validation
- AI: Gemini API (`generateContent`), called only from the server
- Hosting: Vercel (static client and one serverless function in `api/`)
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
npm run dev         # API on :3001 and the client on :5173, with the client proxying /api
npm test            # server unit tests
npm run typecheck   # server and client
npm run build       # production build
npm start           # serve the API and the built client from one process
```

Open http://localhost:5173 while developing.

## Deployment (Vercel)

1. Import the GitHub repo in Vercel. `vercel.json` already sets the build, output folder, routes and security headers.
2. In Project Settings, Environment Variables, add `GEMINI_API_KEY` (and `GEMINI_MODEL` if you do not want the default).
3. Deploy. Check `/api/health`: it reports `"provider":"gemini"` when the key is picked up.

Generating a paper can take 10 to 40 seconds, so the function is configured with a 60-second limit. Your Vercel plan must allow that duration.

## AI integration

- **API:** Gemini `generateContent`, with JSON output requested. The model name is set with `GEMINI_MODEL` (default `gemini-2.5-flash`).
- **What it does:** takes the teacher's settings and writes a complete paper and a marking scheme as JSON.
- **Safeguards:** the response is parsed and checked with Zod. The server also checks that the question marks add up to the requested total, that each marking scheme adds up to its question's marks, and that multiple-choice questions have four options. If a check fails, the problems are sent back to the model and it tries again, up to three attempts within a 55-second budget. Only temporary AI errors are retried; a rejected API key fails immediately. After that the teacher sees a clear error.
- **Input checks:** the subject and topics a teacher chooses must exist in `server/src/syllabus.ts`, so free text never reaches the prompt.
- **Keys:** the API key stays on the server and is never sent to the browser.
- **Abuse protection:** the generate endpoint is limited to 30 requests per IP every 10 minutes. This is a stopgap until accounts and per-user limits are added.
- **Limitations:** the model can make mistakes in facts, calculations and marks, and it does not have the official ZIMSEC syllabus or past papers. The topic lists in `server/src/syllabus.ts` must be checked against the current syllabus. The prompt is written mainly for Mathematics-style papers, so papers for language and essay subjects need subject-specific formats. Teachers must review every paper and marking scheme before use.

## Data and privacy

- No student names or personal details are needed to generate a paper.
- The school profile is stored in the browser's local storage on the teacher's own device. The server does not store it.
- Generated papers are not saved on the server.

## Project structure

```
api/      Vercel serverless entry point (re-exports the shared Express app)
client/   React app (paper builder, profile and paper view)
server/   Express app, prompt, Gemini client, validation, rate limiting, tests
```
