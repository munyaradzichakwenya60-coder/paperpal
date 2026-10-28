import type { NextFunction, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

// Build a Supabase admin client once at module load -- uses the service role key
// which can read any row and bypass RLS.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAdminClient(): ReturnType<typeof createClient<any>> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// Lazy singleton -- only created if auth is actually used.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: ReturnType<typeof createClient<any>> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adminClient(): ReturnType<typeof createClient<any>> {
  if (!_adminClient) _adminClient = getAdminClient();
  return _adminClient;
}

/** Middleware: verifies the Bearer JWT from Supabase and attaches req.userId. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const token = header.slice(7);
  try {
    // getUser() validates the JWT server-side and returns the user from Supabase.
    // It rejects expired or tampered tokens.
    const { data: { user }, error } = await adminClient().auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: "Invalid or expired session. Sign in again." });
      return;
    }
    (req as Request & { userId: string }).userId = user.id;
    next();
  } catch {
    res.status(401).json({ error: "Authentication check failed." });
  }
}

/** Type augmentation so downstream handlers can read req.userId without casting. */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
