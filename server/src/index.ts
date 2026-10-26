import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GenerationError } from "./gemini.js";
import { activeProvider, generatePaper } from "./generate.js";
import { generateRequestSchema } from "./schema.js";
import { syllabus } from "./syllabus.js";

const app = express();
app.use(express.json({ limit: "20kb" }));

// Allow same-origin module scripts to load without CORS issues
app.use((_req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, provider: activeProvider() });
});

app.get("/api/syllabus", (_req, res) => {
  res.json(syllabus);
});

app.post("/api/papers/generate", async (req, res) => {
  const parsed = generateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Some of the paper settings are not valid. Check the form and try again." });
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

// In production the server also serves the built client.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  console.log(`PaperPal server on http://localhost:${port} (AI provider: ${activeProvider()}, model: ${model})`);
});

