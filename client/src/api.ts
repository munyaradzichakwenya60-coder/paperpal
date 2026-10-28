import { supabase } from "./lib/supabase";
import type { GenerateRequest, GeneratedPaper, Syllabus } from "./types";

/** Returns the Authorization header value for the current session, or null if not signed in. */
async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function getSyllabus(): Promise<Syllabus> {
  const res = await fetch("/api/syllabus");
  if (!res.ok) throw new Error("syllabus");
  return res.json();
}

export async function getHealth(): Promise<{ ok: boolean; provider: "gemini" | "mock" }> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error("health");
  return res.json();
}

export async function generatePaper(req: GenerateRequest): Promise<GeneratedPaper> {
  const headers = await authHeader();
  const res = await fetch("/api/papers/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(req),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "Something went wrong. Try again.");
  return data as GeneratedPaper;
}

export type PaperHistoryItem = {
  id: string;
  title: string;
  subject: string;
  level: string;
  total_marks: number;
  duration_minutes: number;
  created_at: string;
};

export async function getPaperHistory(): Promise<PaperHistoryItem[]> {
  const headers = await authHeader();
  const res = await fetch("/api/papers/history", { headers });
  if (!res.ok) return [];
  return res.json();
}
