import { useEffect, useState, type ReactNode } from "react";
import { PP_A, PP_B, PP_H, PP_W } from "./ppPaths";

const KEY = "paperpal-splash-seen";
const REDUCED = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const SHOW_MS = REDUCED ? 900 : 7600;

function alreadySeen() {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

const LETTERS = ["P", "a", "p", "e", "r", "P", "a", "l"];

export function Splash({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"show" | "leaving" | "done">(alreadySeen() ? "done" : "show");

  useEffect(() => {
    if (phase !== "show") return;
    const t = window.setTimeout(() => setPhase("leaving"), SHOW_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const t = window.setTimeout(() => {
      setPhase("done");
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {
        /* ignore */
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [phase]);

  return (
    <>
      <div style={phase === "done" ? undefined : { visibility: "hidden" }}>{children}</div>
      {phase !== "done" && (
        <div
          className={`splash${phase === "leaving" ? " leaving" : ""}`}
          role="status"
          aria-label="Loading PaperPal"
          onClick={() => phase === "show" && setPhase("leaving")}
        >
          <div className="splash-stage">
            <svg className="sp-mark" viewBox={`0 0 ${PP_W} ${PP_H}`} aria-hidden="true">
              <path className="sp-p1" d={PP_A} />
              <path className="sp-p2" d={PP_B} />
            </svg>
            <span className="sp-flash" />
            <svg className="sp-swoosh" viewBox="0 0 340 70" aria-hidden="true">
              <path d="M8 40 C 40 66, 120 66, 332 6 C 150 38, 70 42, 8 40 Z" />
            </svg>
            <h1 className="sp-word" aria-label="PaperPal">
              {LETTERS.map((l, i) => (
                <span key={i} className={i > 4 ? "gold" : ""} style={{ animationDelay: `${(3.1 + i * 0.11) * 1.45}s` }}>
                  {l}
                </span>
              ))}
            </h1>
            <p className="sp-tag">Exam papers. Marking schemes. Done.</p>
          </div>
        </div>
      )}
    </>
  );
}
