import type { GeneratedPaper, PaperType, Profile } from "../types";

type Props = { paper: GeneratedPaper; view: "paper" | "scheme"; profile: Profile | null };

const paperTypeLabel: Record<PaperType, string> = {
  structured: "Structured questions paper",
  "multiple-choice": "Multiple choice paper",
  mixed: "Multiple choice and structured questions paper",
};

// Fixed ZIMSEC-style instructions — the school's own exam header replaces the board's wording,
// so the AI no longer supplies these.
const instructionsToCandidates: Record<PaperType, string[]> = {
  structured: [
    "Answer ALL questions.",
    "Write your answers in the spaces provided on the question paper using black or blue pens.",
    "If working is needed for any question, it must be shown in the space below that question.",
    "Omission of essential working will result in loss of marks.",
    "Decimal answers which are not exact should be given correct to three significant figures unless stated otherwise.",
  ],
  "multiple-choice": [
    "Answer ALL questions.",
    "For each question, circle the letter (A, B, C or D) of the best answer.",
    "Check that all the pages of this paper are present before you begin.",
  ],
  mixed: [
    "Answer ALL questions in Section A and ALL questions in Section B.",
    "For Section A, circle the letter (A, B, C or D) of the best answer for each question.",
    "For Section B, write your answers in the spaces provided on the question paper using black or blue pens.",
    "If working is needed for any question, it must be shown in the space below that question.",
    "Omission of essential working will result in loss of marks.",
  ],
};

/** Render blank answer lines below a question */
function AnswerLines({ count }: { count?: number }) {
  if (!count || count < 1) return null;
  return (
    <div className="answer-lines" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="answer-line" />
      ))}
    </div>
  );
}

export function PaperSheet({ paper, view, profile }: Props) {
  const { meta } = paper;

  if (view === "scheme") {
    return (
      <article className="sheet" aria-label="Marking scheme">
        {/* Scheme header */}
        <header className="sheet-head">
          <div className="sheet-school">Marking Scheme</div>
          <h2 className="sheet-title">{paper.title}</h2>
          {profile && (
            <p className="sheet-byline">
              {profile.schoolName} · {profile.teacherName}
            </p>
          )}
          <dl className="sheet-meta">
            <div><dt>Subject</dt><dd>{meta.subject}</dd></div>
            <div><dt>Level</dt><dd>{meta.level}</dd></div>
            <div><dt>Total marks</dt><dd>{meta.totalMarks}</dd></div>
          </dl>
        </header>

        {paper.sections.map((section) => (
          <section key={section.title} className="part">
            <h3 className="part-heading">{section.title}</h3>
            <table className="scheme-table">
              <thead>
                <tr>
                  <th className="col-q">Question</th>
                  <th className="col-ans">Answer / marking points</th>
                  <th className="col-m">Marks</th>
                </tr>
              </thead>
              <tbody>
                {section.questions.map((q) => (
                  <tr key={q.number} className="scheme-row">
                    <td className="col-q">{q.number}</td>
                    <td className="col-ans">
                      {q.markingScheme.map((p, i) => (
                        <div key={i} className="mark-point">{p.point}</div>
                      ))}
                    </td>
                    <td className="col-m">
                      {q.markingScheme.map((p, i) => (
                        <div key={i} className="mark-point">{p.marks}</div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        <footer className="sheet-foot">
          <span>Total: {meta.totalMarks} marks</span>
          <span>Generated with AI — verify before use.</span>
        </footer>
      </article>
    );
  }

  // ── Question paper view ────────────────────────────────────────────────────
  return (
    <article className="sheet" aria-label="Question paper">

      {/* Cover page block */}
      <header className="sheet-head">
        <div className="sheet-school">
          {profile?.schoolName ?? "________________________"}
        </div>
        <div className="sheet-exam">
          {meta.paperTitle ?? paper.title ?? "________________________ Examination"}
        </div>

        <h2 className="sheet-title">{meta.subject.toUpperCase()}</h2>
        <p className="sheet-paper-label">
          {meta.level} · {paperTypeLabel[meta.paperType]}
        </p>

        <div className="sheet-time-row">
          <span>Time allowed: <strong>{meta.durationMinutes} minutes</strong></span>
          <span>Total marks: <strong>{meta.totalMarks}</strong></span>
        </div>

        <div className="sheet-candidate-fields">
          <div className="candidate-field">
            <span>Name</span>
            <div className="candidate-line" />
          </div>
          <div className="candidate-field">
            <span>Class</span>
            <div className="candidate-line" />
          </div>
          <div className="candidate-field">
            <span>Date</span>
            <div className="candidate-line" />
          </div>
        </div>

        <p className="sheet-answer-note">Candidates answer on the question paper.</p>

        {/* Instructions box */}
        <div className="sheet-instructions-box">
          <p className="instructions-heading">INSTRUCTIONS TO CANDIDATES</p>
          <ul className="instructions-list">
            {instructionsToCandidates[meta.paperType].map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="instructions-heading instructions-heading-spaced">INFORMATION FOR CANDIDATES</p>
          <ul className="instructions-list">
            <li>The number of marks is given in brackets [ ] at the end of each question or part question.</li>
            <li>This question paper consists of <span className="page-count-blank">____</span> printed pages.</li>
          </ul>
        </div>
      </header>

      <div className="turn-over">[Turn over]</div>

      {/* Sections and questions */}
      {paper.sections.map((section, sIdx) => (
        <section key={section.title} className="part">
          <h3 className="part-heading">{section.title}</h3>
          {section.instructions && (
            <p className="part-note">{section.instructions}</p>
          )}

          <ol className="questions">
            {section.questions.map((q) => (
              <li key={q.number} className="q">
                <span className="q-num">{q.number}.</span>
                <div className="q-body">
                  <p className="q-text">{q.text}</p>
                  {q.options && (
                    <ol className="options" type="A">
                      {q.options.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ol>
                  )}
                  {!q.options && (
                    <AnswerLines count={q.answerLines} />
                  )}
                </div>
                <span className="q-marks">[{q.marks}]</span>
              </li>
            ))}
          </ol>

          {sIdx < paper.sections.length - 1 && (
            <div className="turn-over">[Turn over]</div>
          )}
        </section>
      ))}

      <footer className="sheet-foot">
        <span>Total: {meta.totalMarks} marks</span>
        <span>Generated with AI — teacher must review before use.</span>
      </footer>
    </article>
  );
}
