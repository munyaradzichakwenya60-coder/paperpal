import { useEffect, useRef, useState } from "react";
import { generatePaper, getHealth, getSyllabus } from "./api";
import { ControlPanel } from "./components/ControlPanel";
import { PaperSheet } from "./components/PaperSheet";
import { ProfileModal } from "./components/ProfileModal";
import { useProfile } from "./hooks/useProfile";
import type { GenerateRequest, GeneratedPaper, Syllabus } from "./types";

export default function App() {
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [provider, setProvider] = useState<"gemini" | "mock" | null>(null);
  const [paper, setPaper] = useState<GeneratedPaper | null>(null);
  const [view, setView] = useState<"paper" | "scheme">("paper");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const { profile, loaded, saveProfile } = useProfile();

  // On phones the form sits above the paper, so bring the new paper into view.
  useEffect(() => {
    if (!paper || !window.matchMedia("(max-width: 900px)").matches) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    toolbarRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, [paper]);

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

  // Show setup modal on first visit once the profile check has loaded
  const showSetup = loaded && !profile && !editingProfile;

  return (
    <div className="app">
      {/* First-time setup or edit modal */}
      {(showSetup || editingProfile) && (
        <ProfileModal
          existing={editingProfile ? profile : null}
          onSave={(p) => {
            saveProfile(p);
            setEditingProfile(false);
          }}
          onClose={editingProfile ? () => setEditingProfile(false) : undefined}
        />
      )}

      {syllabus ? (
        <ControlPanel
          syllabus={syllabus}
          loading={loading}
          onGenerate={handleGenerate}
          profile={profile}
          onEditProfile={() => setEditingProfile(true)}
        />
      ) : (
        <div className="panel">
          <h1 className="brand">PaperPal</h1>
          {!error && <p className="tagline">Loading...</p>}
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
            <div className="toolbar" ref={toolbarRef}>
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
              <button
                type="button"
                className="ghost settings-link"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                Change paper settings
              </button>
            </div>
            <PaperSheet paper={paper} view={view} profile={profile} />
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
