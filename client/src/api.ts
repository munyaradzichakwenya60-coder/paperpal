import type { GenerateRequest, GeneratedPaper, Syllabus } from "./types";

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
  const res = await fetch("/api/papers/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "Something went wrong. Try again.");
  return data as GeneratedPaper;
}
