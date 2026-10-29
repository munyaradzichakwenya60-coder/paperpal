import type { GeneratedPaper, Profile, Question } from "../types";
import { Diagram } from "./Diagram";

type Props = { paper: GeneratedPaper; view: "paper" | "scheme"; profile: Profile | null };


const levelLine = { "O-Level": "Ordinary Level", "A-Level": "Advanced Level" } as const;
const typeLine = {
  structured: "Structured questions",
  "multiple-choice": "Multiple choice",
  mixed: "Multiple choice and structured questions",
} as const;

/** "1(a)" -> { main: "1", part: "(a)" }. A plain "3" has no part. */
function splitNumber(n: string): { main: string; part: string } {
  const m = n.trim().match(/^(\d+)\s*\.?\s*(.*)$/);
  if (!m) return { main: n, part: "" };
  const rest = m[2].trim();
  if (!rest) return { main: m[1], part: "" };
  return { main: m[1], part: /^[a-z]{1,4}$/i.test(rest) ? `(${rest})` : rest };
}

/** Groups consecutive questions that share a main number, so 1(a) 1(b) 1(c) sit under one "1". */
function groupQuestions(questions: Question[]): { main: string; parts: { q: Question; part: string }[] }[] {
  const groups: { main: string; parts: { q: Question; part: string }[] }[] = [];
  for (const q of questions) {
    const { main, part } = splitNumber(q.number);
    const last = groups[groups.length - 1];
    if (last && last.main === main && part) last.parts.push({ q, part });
    else groups.push({ main, parts: [{ q, part }] });
  }
  return groups;
}

function candidateInstructions(paper: GeneratedPaper): { materials: string | null; read: string[]; info: string[] } {
  const { meta } = paper;
  const maths = /mathematics/i.test(meta.subject);
  const calc = maths || /physics|chemistry/i.test(meta.subject);
  const read = [
    "Write your name and class in the spaces at the top of this page.",
    "Write in dark blue or black pen. You may use a soft pencil for any diagrams or graphs.",
    "Do not use staples, paper clips, glue or correction fluid.",
  ];
  if (meta.paperType === "multiple-choice") {
    read.push("Answer all questions. For each question, circle the letter of the best answer.");
  } else if (meta.paperType === "mixed") {
    read.push("Answer all questions in Section A and all questions in Section B. Write your Section B answers in the spaces provided.");
  } else {
    read.push("Answer all questions. Write your answers in the spaces provided.");
  }
  if (maths) {
    read.push("If working is needed for any question it must be shown below that question.");
    read.push("Omission of essential working will result in loss of marks.");
    read.push("If the degree of accuracy is not specified in the question, and if the answer is not exact, give the answer to three significant figures. Give answers in degrees to one decimal place.");
    read.push("For \u03c0, use either your calculator value or 3.142.");
  }
  read.push("At the end of the examination, hand in all your work.");
  return {
    materials: maths ? "Geometrical instruments, electronic calculator" : calc ? "Electronic calculator" : null,
    read,
    info: [
      "The number of marks is given in brackets [ ] at the end of each question or part question.",
      `The total of the marks for this paper is ${meta.totalMarks}.`,
    ],
  };
}

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
          <div className="sheet-school">{profile?.schoolName ?? "School"}</div>
          {meta.examTitle && <div className="sheet-exam">{meta.examTitle}</div>}
          <h2 className="sheet-title">{meta.subject}</h2>
          <p className="sheet-paper-label">Marking scheme</p>
          <dl className="sheet-meta">
            <div><dt>Level</dt><dd>{levelLine[meta.level]}</dd></div>
            <div><dt>Total marks</dt><dd>{meta.totalMarks}</dd></div>
          </dl>
        </header>

        {paper.sections.map((section, sIdx) => (
          <section key={sIdx} className="part">
            {!(paper.sections.length === 1 && section.title === "Questions") && <h3 className="part-heading">{section.title}</h3>}
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
  const info = candidateInstructions(paper);
  const singleUntitled = paper.sections.length === 1 && paper.sections[0].title === "Questions";

  return (
    <article className="sheet" aria-label="Question paper">

      {/* Cover page */}
      <header className="sheet-head cover">
        <div className="sheet-school">{profile?.schoolName ?? "________________________ School"}</div>
        <div className={meta.examTitle ? "sheet-exam" : "sheet-exam blank"}>
          {meta.examTitle ?? "________________________ Examination"}
        </div>

        <p className="cover-level">{levelLine[meta.level]}</p>
        <h2 className="sheet-title">{meta.subject}</h2>
        <p className="sheet-paper-label">{typeLine[meta.paperType]}</p>

        <div className="sheet-time-row">
          <span>Time allowed: <strong>{formatDuration(meta.durationMinutes)}</strong></span>
          <span>Total marks: <strong>{meta.totalMarks}</strong></span>
        </div>

        <div className="sheet-candidate-fields">
          <div className="candidate-field"><span>Name</span><div className="candidate-line" /></div>
          <div className="candidate-field"><span>Class</span><div className="candidate-line" /></div>
          <div className="candidate-field"><span>Date</span><div className="candidate-line" /></div>
        </div>

        <p className="cover-note">Candidates answer on the question paper.</p>
        {info.materials && <p className="cover-note"><strong>Additional materials:</strong> {info.materials}</p>}

        <div className="sheet-instructions-box">
          <p className="instructions-heading">Read these instructions first</p>
          <ul className="instructions-list">
            {info.read.map((line) => <li key={line}>{line}</li>)}
          </ul>
          <p className="instructions-heading instructions-heading-spaced">Information for candidates</p>
          <ul className="instructions-list">
            {info.info.map((line) => <li key={line}>{line}</li>)}
            <li>This question paper consists of <span className="page-count-blank">____</span> printed pages.</li>
          </ul>
        </div>
      </header>

      <div className="turn-over">[Turn over]</div>

      {paper.sections.map((section, sIdx) => (
        <section key={sIdx} className="part">
          {!singleUntitled && <h3 className="part-heading">{section.title}</h3>}
          {section.instructions && <p className="part-note">{section.instructions}</p>}

          <div className="questions">
            {groupQuestions(section.questions).map((g) => (
              <div key={g.main + "-" + g.parts[0].q.number} className="qgroup">
                <span className="qg-num">{g.main}</span>
                <div className="qg-parts">
                  {g.parts.map(({ q, part }) => (
                    <div key={q.number} className="qpart">
                      <span className="qp-label">{part}</span>
                      <div className="q-body">
                        <p className="q-text">{q.text}</p>
                        {q.diagram && <Diagram diagram={q.diagram} />}
                        {q.options && (
                          <ol className="options" type="A">
                            {q.options.map((o, i) => <li key={i}>{o}</li>)}
                          </ol>
                        )}
                        {!q.options && <AnswerLines count={q.answerLines} />}
                      </div>
                      <span className="q-marks">[{q.marks}]</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {sIdx < paper.sections.length - 1 && <div className="turn-over">[Turn over]</div>}
        </section>
      ))}

      <footer className="sheet-foot">
        <span>Total: {meta.totalMarks} marks</span>
        <span>Generated with AI. The teacher must review before use.</span>
      </footer>
    </article>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  const hours = `${h} hour${h > 1 ? "s" : ""}`;
  return m ? `${hours} ${m} minutes` : hours;
}
