import { useEffect, useState } from "react";
import { generatePaper, getHealth, getSyllabus } from "./api";
import { ControlPanel } from "./components/ControlPanel";
import { PaperSheet } from "./components/PaperSheet";
import type { GenerateRequest, GeneratedPaper, Syllabus } from "./types";

export default function App() {
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [provider, setProvider] = useState<"gemini" | "mock" | null>(null);
  const [paper, setPaper] = useState<GeneratedPaper | null>(null);
  const [view, setView] = useState<"paper" | "scheme">("paper");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSyllabus(), getHealth()])
      .then(([s, h]) => {
        setSyllabus(s);
        setProvider(h.provider);
      })
      .catch(() => setError("PaperPal can't reach its server. Start the server, then reload this page."));
  }, []);

  async function handleGenerate(req: GenerateRequest) {
    setLoading(true);
    setError(null);
    try {
      setPaper(await generatePaper(req));
      setView("paper");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      {syllabus ? (
        <ControlPanel syllabus={syllabus} loading={loading} onGenerate={handleGenerate} />
      ) : (
        <div className="panel">
          <h1 className="brand">PaperPal</h1>
          {!error && <p className="tagline">Loading…</p>}
        </div>
      )}

      <main className="desk">
        {provider === "mock" && (
          <p className="banner">
            Mock mode: no AI key is set, so papers contain sample text. Add GEMINI_API_KEY in server/.env to use real AI.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {paper ? (
          <>
            <div className="toolbar">
              <div className="segmented" role="group" aria-label="Document">
                <button type="button" className={view === "paper" ? "on" : ""} onClick={() => setView("paper")}>
                  Question paper
                </button>
                <button type="button" className={view === "scheme" ? "on" : ""} onClick={() => setView("scheme")}>
                  Marking scheme
                </button>
              </div>
              <button type="button" className="ghost" onClick={() => window.print()}>
                Print or save as PDF
              </button>
            </div>
            <PaperSheet paper={paper} view={view} />
          </>
        ) : (
          !error && (
            <div className="empty">
              <p>Choose a level and your topics, then generate your first paper.</p>
              <p>It appears here as a printable sheet, with the marking scheme one click away.</p>
            </div>
          )
        )}
      </main>
    </div>
  );
}
