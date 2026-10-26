// Vercel serverless entry point — wraps the Express app.
// Environment variables (GEMINI_API_KEY, GEMINI_MODEL) are set in Vercel dashboard.
import "dotenv/config";
import express from "express";
import { GenerationError } from "../server/src/gemini.js";
import { activeProvider, generatePaper } from "../server/src/generate.js";
import { generateRequestSchema } from "../server/src/schema.js";
import { syllabus } from "../server/src/syllabus.js";

const app = express();
app.use(express.json({ limit: "20kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, provider: activeProvider() });
});

app.get("/api/syllabus", (_req, res) => {
  res.json(syllabus);
});

app.post("/api/papers/generate", async (req, res) => {
  const parsed = generateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Some of the paper settings are not valid." });
    return;
  }
  try {
    res.json(await generatePaper(parsed.data));
  } catch (err) {
    const message = err instanceof GenerationError ? err.message : "Something went wrong while generating the paper.";
    console.error("generate failed:", err instanceof Error ? err.message : err);
    res.status(502).json({ error: message });
  }
});

export default app;
