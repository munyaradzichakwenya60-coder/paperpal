import type { GeneratedPaper, Profile, Question } from "../types";
import { Diagram } from "./Diagram";
import { MathText } from "./MathText";

type Props = { paper: GeneratedPaper; view: "paper" | "scheme"; profile: Profile | null };

const levelLine = { "O-Level": "Ordinary Level", "A-Level": "Advanced Level" } as const;
const typeLine = {
  structured: "Structured questions",
  "multiple-choice": "Multiple choice",
  mixed: "Multiple choice and structured questions",
  sectioned: "Paper 2",
} as const;

// Fixed shape of a sectioned paper (same numbers the server enforces).
const SECTION_NOTES = [
  { marks: 52, note: "Answer all questions in this section." },
  { marks: 48, note: "Answer any four questions from this section.", extra: "Each question carries 12 marks." },
] as const;

// ── Question numbering: "1(a)(ii)" -> main 1, letter a, roman ii ────────────
type Parsed = { main: string; letter: string; roman: string };

function parseNumber(n: string): Parsed {
  const m = n.trim().match(/^(\d+)\s*\.?\s*(?:\(?([a-z])\)?)?\s*(?:\(?([ivx]+)\)?)?$/i);
  if (!m) return { main: n.trim(), letter: "", roman: "" };
  return { main: m[1], letter: (m[2] ?? "").toLowerCase(), roman: (m[3] ?? "").toLowerCase() };
}

type Sub = { roman: string; q: Question };
type Letter = { letter: string; partStem: string | null; subs: Sub[] };
type Main = { main: string; stem: string | null; figure: Question["diagram"] | null; letters: Letter[] };

// Questions whose figure is printed under the shared setting instead of inside their own row.
const promoted = new WeakSet<Question>();

function groupQuestions(questions: Question[]): Main[] {
  const mains: Main[] = [];
  for (const q of questions) {
    const p = parseNumber(q.number);
    let main = mains[mains.length - 1];
    if (!main || main.main !== p.main) {
      main = { main: p.main, stem: null, figure: null, letters: [] };
      mains.push(main);
    }
    if (q.stem && !main.stem) main.stem = q.stem;
    // A figure on the first part of a question belongs under the shared setting, as in printed papers.
    if (q.diagram && main.stem && main.letters.length === 0) { main.figure = q.diagram; promoted.add(q); }
    let letter = main.letters[main.letters.length - 1];
    if (!letter || letter.letter !== p.letter || (!p.letter && !p.roman)) {
      letter = { letter: p.letter, partStem: null, subs: [] };
      main.letters.push(letter);
    }
    if (q.partStem && !letter.partStem) letter.partStem = q.partStem;
    letter.subs.push({ roman: p.roman, q });
  }
  return mains;
}

function AnswerLines({ count }: { count?: number }) {
  if (!count || count < 1) return null;
  return (
    <div className="answer-lines" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => <div key={i} className="answer-line" />)}
    </div>
  );
}

function QuestionBody({ q }: { q: Question }) {
  return (
    <div className="q-body">
      <p className="q-text"><MathText>{q.text}</MathText></p>
      {q.diagram && !promoted.has(q) && <Diagram diagram={q.diagram} />}
      {!q.diagram && q.diagramPlaceholder && <div className="diagram-missing">Diagram needed: draw or paste the figure here before printing.</div>}
      {q.options && (
        <ol className="options" type="A">
          {q.options.map((o, i) => <li key={i}><MathText>{o}</MathText></li>)}
        </ol>
      )}
      {!q.options && <AnswerLines count={q.answerLines ?? undefined} />}
    </div>
  );
}

function Marks({ n }: { n: number }) {
  return <span className="q-marks">[{n}]</span>;
}

function MainQuestion({ m }: { m: Main }) {
  return (
    <div className="qmain">
      <span className="qm-num">{m.main}</span>
      <div className="qm-body">
        {m.stem && <p className="q-stem"><MathText>{m.stem}</MathText></p>}
        {m.figure && <Diagram diagram={m.figure} />}
        {m.letters.map((l, li) => {
          const single = l.subs.length === 1 && !l.subs[0].roman;
          if (single) {
            const q = l.subs[0].q;
            return (
              <div key={li} className="qrow">
                <span className="q-label">{l.letter ? `(${l.letter})` : ""}</span>
                <QuestionBody q={q} />
                <Marks n={q.marks} />
              </div>
            );
          }
          return (
            <div key={li} className="qletter">
              <div className="qrow">
                <span className="q-label">{l.letter ? `(${l.letter})` : ""}</span>
                <div className="q-body">{l.partStem && <p className="q-text"><MathText>{l.partStem}</MathText></p>}</div>
                <span />
              </div>
              {l.subs.map(({ roman, q }) => (
                <div key={q.number} className="qrow qsub">
                  <span className="q-label">{roman ? `(${roman})` : ""}</span>
                  <QuestionBody q={q} />
                  <Marks n={q.marks} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Cover page text ─────────────────────────────────────────────────────────
function coverInfo(paper: GeneratedPaper) {
  const { meta } = paper;
  const maths = /mathematics/i.test(meta.subject);
  const sectioned = meta.paperType === "sectioned";

  const materials: string[] = [];
  if (maths) materials.push("Mathematical Instruments", "Mathematical Tables", "Non programmable Electronic Calculator");
  else if (/physics|chemistry/i.test(meta.subject)) materials.push("Non programmable Electronic Calculator");
  if (sectioned) materials.push("Answer booklet");

  let read: string[];
  let bold: string | null = null;
  if (sectioned) {
    read = [
      "Write your name and class in the spaces provided on the answer booklet.",
      "Answer all questions in Section A and any four questions from Section B.",
      "If you use more than one booklet, fasten them together.",
      "All working must be clearly shown on the same sheet as the rest of the answer.",
    ];
    if (maths) {
      read.push(
        "Omission of essential working will result in loss of marks.",
        "If the degree of accuracy is not specified in the question and if the answer is not exact, the answer should be given correct to three significant figures. Answers in degrees should be given correct to one decimal place.",
      );
      bold = "Mathematical tables and Non programmable electronic calculators may be used to evaluate explicit numerical expressions.";
    }
  } else {
    read = [
      "Write your name and class in the spaces at the top of this page.",
      "Write in dark blue or black pen. You may use a soft pencil for any diagrams or graphs.",
      "Do not use staples, paper clips, glue or correction fluid.",
      meta.paperType === "multiple-choice"
        ? "Answer all questions. For each question, circle the letter of the best answer."
        : meta.paperType === "mixed"
          ? "Answer all questions in Section A and all questions in Section B. Write your Section B answers in the spaces provided."
          : "Answer all questions. Write your answers in the spaces provided.",
    ];
    if (maths) {
      read.push(
        "If working is needed for any question it must be shown below that question.",
        "Omission of essential working will result in loss of marks.",
        "If the degree of accuracy is not specified in the question, and if the answer is not exact, give the answer to three significant figures. Give answers in degrees to one decimal place.",
      );
    }
  }
  return { materials, read, bold };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  const hours = `${h} hour${h > 1 ? "s" : ""}`;
  return m ? `${hours} ${m} minutes` : hours;
}

export function PaperSheet({ paper, view, profile }: Props) {
  const { meta } = paper;
  const sectioned = meta.paperType === "sectioned";

  if (view === "scheme") {
    return (
      <article className="sheet" aria-label="Marking scheme">
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
                      {q.markingScheme.map((p, i) => <div key={i} className="mark-point"><MathText>{p.point}</MathText></div>)}
                    </td>
                    <td className="col-m">
                      {q.markingScheme.map((p, i) => <div key={i} className="mark-point">{p.marks}</div>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        <footer className="sheet-foot">
          <span>Total: {meta.totalMarks} marks</span>
          <span>Generated with AI. Verify before use.</span>
        </footer>
      </article>
    );
  }

  const info = coverInfo(paper);
  const singleUntitled = paper.sections.length === 1 && paper.sections[0].title === "Questions";

  return (
    <article className="sheet" aria-label="Question paper">
      <header className="sheet-head cover">
        <div className="sheet-school">{profile?.schoolName ?? "________________________ School"}</div>
        <div className={meta.examTitle ? "sheet-exam" : "sheet-exam blank"}>
          {meta.examTitle ?? "________________________ Examination"}
        </div>
        <p className="cover-level">{levelLine[meta.level]}</p>

        <div className="cover-subject-row">
          <div>
            <h2 className="cover-subject">{meta.subject}</h2>
            <p className="cover-paper">{typeLine[meta.paperType]}</p>
          </div>
          <div className="cover-time">
            <strong>{formatDuration(meta.durationMinutes)}</strong>
            <span>Total marks: {meta.totalMarks}</span>
          </div>
        </div>

        <div className="sheet-candidate-fields">
          <div className="candidate-field"><span>Name</span><div className="candidate-line" /></div>
          <div className="candidate-field"><span>Class</span><div className="candidate-line" /></div>
          <div className="candidate-field"><span>Date</span><div className="candidate-line" /></div>
        </div>

        {info.materials.length > 0 && (
          <div className="cover-materials">
            <p>Additional materials:</p>
            {info.materials.map((m) => <p key={m}>{m}</p>)}
          </div>
        )}

        <div className="sheet-instructions-box">
          <p className="instructions-heading">Instructions to candidates</p>
          <ul className="instructions-list">
            {info.read.map((line) => <li key={line}>{line}</li>)}
          </ul>
          {info.bold && <p className="instructions-bold">{info.bold}</p>}
          <p className="instructions-heading instructions-heading-spaced">Information for candidates</p>
          <ul className="instructions-list">
            <li>The number of marks is given in brackets [ ] at the end of each question or part question.</li>
            {!sectioned && <li>The total of the marks for this paper is {meta.totalMarks}.</li>}
          </ul>
          <p className="cover-pages">This question paper consists of <span className="page-count-blank">____</span> printed pages.</p>
        </div>
      </header>

      {paper.sections.map((section, sIdx) => {
        const fixed = sectioned ? SECTION_NOTES[sIdx] : undefined;
        const heading = fixed ? `${section.title.replace(/\s*\[.*$/, "")} [${fixed.marks} marks]` : section.title;
        return (
          <section key={sIdx} className="part">
            {!singleUntitled && <h3 className={fixed ? "part-heading centred" : "part-heading"}>{heading}</h3>}
            {fixed && (
              <p className="part-note centred">
                {fixed.note}
                {"extra" in fixed && <><br />{fixed.extra}</>}
              </p>
            )}
            {!fixed && section.instructions && <p className="part-note">{section.instructions}</p>}
            <div className="questions">
              {groupQuestions(section.questions).map((m) => <MainQuestion key={`${sIdx}-${m.main}`} m={m} />)}
            </div>
          </section>
        );
      })}

      <footer className="sheet-foot">
        <span>{sectioned ? "Section A and any four questions from Section B" : `Total: ${meta.totalMarks} marks`}</span>
        <span>Generated with AI. The teacher must review before use.</span>
      </footer>
    </article>
  );
}
