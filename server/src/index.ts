import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "./app.js";
import { activeProvider } from "./generate.js";

// When the client has been built, the server also serves it (single-host deployment).
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
