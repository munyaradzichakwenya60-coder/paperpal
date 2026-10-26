import type { GeneratedPaper } from "../types";

type Props = { paper: GeneratedPaper; view: "paper" | "scheme" };

export function PaperSheet({ paper, view }: Props) {
  const { meta } = paper;
  return (
    <article className="sheet" aria-label={view === "paper" ? "Question paper" : "Marking scheme"}>
      <header className="sheet-head">
        <h2>{paper.title}</h2>
        <p className="sheet-kind">{view === "paper" ? "Question paper" : "Marking scheme"}</p>
        <dl className="sheet-meta">
          <div>
            <dt>Subject</dt>
            <dd>{meta.subject}</dd>
          </div>
          <div>
            <dt>Level</dt>
            <dd>{meta.level}</dd>
          </div>
          <div>
            <dt>Time allowed</dt>
            <dd>{meta.durationMinutes} minutes</dd>
          </div>
          <div>
            <dt>Total marks</dt>
            <dd>{meta.totalMarks}</dd>
          </div>
        </dl>
      </header>

      {view === "paper" && (
        <section className="instructions">
          <h3>Instructions</h3>
          <ul>
            {paper.instructions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      {paper.sections.map((section) => (
        <section key={section.title} className="part">
          <h3>{section.title}</h3>
          {section.instructions && view === "paper" && <p className="part-note">{section.instructions}</p>}
          <ol className="questions">
            {section.questions.map((q) => (
              <li key={q.number} className="q">
                <span className="q-num">{q.number}.</span>
                <div className="q-body">
                  {view === "paper" ? (
                    <>
                      <p>{q.text}</p>
                      {q.options && (
                        <ol className="options" type="A">
                          {q.options.map((o) => (
                            <li key={o}>{o}</li>
                          ))}
                        </ol>
                      )}
                    </>
                  ) : (
                    <ul className="scheme">
                      {q.markingScheme.map((p, i) => (
                        <li key={i}>
                          <span>{p.point}</span>
                          <span className="mark">{p.marks}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <span className="q-marks">[{q.marks}]</span>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <footer className="sheet-foot">
        <span>Total: {meta.totalMarks} marks</span>
        <span>Generated with AI. Reviewed by the teacher before use.</span>
      </footer>
    </article>
  );
}
