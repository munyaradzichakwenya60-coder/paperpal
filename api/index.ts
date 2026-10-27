// Vercel serverless entry point. The API itself lives in server/src/app.ts.
// Environment variables (GEMINI_API_KEY, GEMINI_MODEL) are set in the Vercel dashboard.
import { app } from "../server/src/app.js";

export default app;
