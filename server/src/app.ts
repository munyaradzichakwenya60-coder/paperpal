import { createClient } from "@supabase/supabase-js";
import express, { type NextFunction, type Request, type Response } from "express";
import { requireAuth } from "./auth.js";
import { GenerationError } from "./gemini.js";
import { activeProvider, generatePaper } from "./generate.js";
import { createRateLimiter } from "./rateLimit.js";
import { generateRequestSchema } from "./schema.js";
import { syllabus } from "./syllabus.js";

/** The API, shared by the local server (index.ts) and the Vercel function (api/index.ts). */
export const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

const generateLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: 30 });

// ── Public endpoints ───────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, provider: activeProvider() });
});

app.get("/api/syllabus", (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json(syllabus);
});

// ── Protected endpoints ────────────────────────────────────────────────────────

/**
 * POST /api/auth/profile
 * Creates or updates the profile row for the authenticated user.
 * Uses the service-role key server-side, so RLS is bypassed -- this is safe
 * because requireAuth already verified the JWT before we get here.
 */
app.post("/api/auth/profile", requireAuth, async (req, res) => {
  const { school_name, teacher_name, role } = req.body as {
    school_name?: string;
    teacher_name?: string;
    role?: string;
  };

  if (!school_name?.trim() || !teacher_name?.trim() || !role) {
    res.status(400).json({ error: "school_name, teacher_name and role are required." });
    return;
  }

  const validRoles = ["Teacher", "Head of Department", "Examiner"];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: "Invalid role." });
    return;
  }

  const db = getDb();
  if (!db) {
    res.status(503).json({ error: "Database not configured." });
    return;
  }

  const { error } = await db.from("profiles").upsert(
    {
      id: req.userId!,
      school_name: school_name.trim(),
      teacher_name: teacher_name.trim(),
      role,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("profile upsert failed:", error.message);
    res.status(500).json({ error: "Failed to save profile." });
    return;
  }

  res.json({ ok: true });
});

app.post("/api/papers/generate", requireAuth, generateLimiter, async (req, res) => {
  const parsed = generateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Some of the paper settings are not valid. Check the form and try again." });
    return;
  }
  try {
    const paper = await generatePaper(parsed.data);

    // Best-effort: save to DB. Never fail the response if this errors.
    try {
      const db = getDb();
      if (db && req.userId) {
        await db.from("papers").insert({
          user_id: req.userId,
          title: paper.meta.examTitle || `${paper.meta.subject} ${paper.meta.level}`,
          subject: paper.meta.subject,
          level: paper.meta.level,
          total_marks: paper.meta.totalMarks,
          duration_minutes: paper.meta.durationMinutes,
          paper_json: paper as unknown as Record<string, unknown>,
        });
      }
    } catch (dbErr) {
      console.warn("Failed to save paper to DB (non-fatal):", dbErr);
    }

    res.json(paper);
  } catch (err) {
    const message = err instanceof GenerationError ? err.message : "Something went wrong while generating the paper.";
    console.error("generate failed:", err instanceof Error ? err.message : err);
    res.status(502).json({ error: message });
  }
});

app.get("/api/papers/history", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      res.json([]);
      return;
    }
    const { data, error } = await db
      .from("papers")
      .select("id, title, subject, level, total_marks, duration_minutes, created_at")
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    console.error("history failed:", err);
    res.status(500).json({ error: "Could not load paper history." });
  }
});

// ── Fallback ───────────────────────────────────────────────────────────────────

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found." });
});

// Malformed JSON and any other unexpected error return JSON, never a stack trace.
app.use((err: { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "The request could not be read." });
    return;
  }
  console.error("unhandled error:", err);
  res.status(500).json({ error: "Something went wrong." });
});

// ── DB helper ──────────────────────────────────────────────────────────────────

/** Returns the Supabase admin client, or null if env vars are not configured. */
function getDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
