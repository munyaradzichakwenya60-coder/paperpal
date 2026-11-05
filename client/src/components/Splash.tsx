import { useEffect, useState, type ReactNode } from "react";

const KEY = "paperpal-splash-seen";
const SHOW_MS = 2300;

function alreadySeen() {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function Splash({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"show" | "leaving" | "done">(alreadySeen() ? "done" : "show");

  useEffect(() => {
    if (phase === "done") return;
    const t1 = window.setTimeout(() => setPhase("leaving"), SHOW_MS);
    const t2 = window.setTimeout(() => {
      setPhase("done");
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {
        /* ignore */
      }
    }, SHOW_MS + 550);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [phase === "done"]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {children}
      {phase !== "done" && (
        <div className={`splash${phase === "leaving" ? " leaving" : ""}`} role="status" aria-label="Loading PaperPal">
          <svg className="splash-mark" viewBox="0 0 64 64" aria-hidden="true">
            <path className="splash-sheet" d="M16 6h22l12 12v36a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z" />
            <path className="splash-fold" d="M38 6l12 12H42a4 4 0 0 1-4-4z" />
            <path className="splash-line" d="M19 28h22" />
            <path className="splash-line" d="M19 36h22" />
            <path className="splash-line" d="M19 44h12" />
            <path className="splash-tick" d="M32 48l6 6 12-14" />
          </svg>
          <h1 className="splash-name">
            Paper<span>Pal</span>
          </h1>
          <p className="splash-tag">Exam papers and marking schemes, done.</p>
          <div className="splash-bar" />
        </div>
      )}
    </>
  );
}
