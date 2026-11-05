import { useEffect, useState, type ReactNode } from "react";

const KEY = "paperpal-splash-seen";
const REDUCED = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const SHOW_MS = REDUCED ? 900 : 6800;

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
            {/* 1. paper drops in and bounces */}
            <svg className="sp-paper" viewBox="0 0 64 64" aria-hidden="true">
              <g className="sp-body">
                <path d="M16 6h22l12 12v36a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z" />
                <path className="sp-fold" d="M38 6l12 12H42a4 4 0 0 1-4-4z" />
              </g>
              <path className="sp-lines" d="M19 28h22M19 36h22M19 44h12" />
              <path className="sp-tick" d="M32 48l6 6 12-14" />
            </svg>
            <span className="sp-speed s1" />
            <span className="sp-speed s2" />
            {/* 2. gold liquid blobs swirl into the swoosh */}
            <span className="sp-blob b1" />
            <span className="sp-blob b2" />
            <span className="sp-blob b3" />
            {/* 3. swoosh sweeps in */}
            <svg className="sp-swoosh" viewBox="0 0 340 70" aria-hidden="true">
              <path d="M8 40 C 40 66, 120 66, 332 6 C 150 38, 70 42, 8 40 Z" />
            </svg>
            {/* 4. letters rise and snap into place */}
            <h1 className="sp-word" aria-label="PaperPal">
              {LETTERS.map((l, i) => (
                <span key={i} className={i > 4 ? "gold" : ""} style={{ animationDelay: `${(2.55 + i * 0.11) * 1.45}s` }}>
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
