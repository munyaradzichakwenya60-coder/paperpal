import { useState } from "react";
import type { Difficulty, GenerateRequest, Level, PaperType, Profile, Syllabus } from "../types";

type Props = {
  syllabus: Syllabus;
  loading: boolean;
  onGenerate: (req: GenerateRequest) => void;
  profile: Profile | null;
  onEditProfile: () => void;
  onSignOut: () => void;
};

const levels: Level[] = ["O-Level", "A-Level"];
const difficulties: { value: Difficulty; label: string }[] = [
  { value: "easier", label: "Easier" },
  { value: "balanced", label: "Balanced" },
  { value: "harder", label: "Harder" },
];
const paperTypes: { value: PaperType; label: string }[] = [
  { value: "structured", label: "Structured questions" },
  { value: "multiple-choice", label: "Multiple choice" },
  { value: "mixed", label: "Mixed (MCQ + structured)" },
];

export function ControlPanel({ syllabus, loading, onGenerate, profile, onEditProfile, onSignOut }: Props) {
  const [level, setLevel] = useState<Level>("O-Level");
  const [subject, setSubject] = useState(syllabus.subjects[0].name);
  const [topics, setTopics] = useState<string[]>([]);
  const [paperType, setPaperType] = useState<PaperType>("structured");
  const [difficulty, setDifficulty] = useState<Difficulty>("balanced");

  // Structured: user sets total marks directly
  const [totalMarks, setTotalMarks] = useState(40);
  // MCQ / mixed: user sets question count (each = 1 mark)
  const [questionCount, setQuestionCount] = useState(40);
  // Mixed only: user also sets structured marks
  const [structuredMarks, setStructuredMarks] = useState(20);

  const [durationMinutes, setDurationMinutes] = useState(60);
  const [examTitle, setExamTitle] = useState("");

  // Only show subjects that have topics for the selected level
  const subjectsForLevel = syllabus.subjects.filter((s) => s.levels[level].length > 0);
  const available = syllabus.subjects.find((s) => s.name === subject)?.levels[level] ?? [];

  // Derived total marks based on paper type
  const derivedTotal =
    paperType === "multiple-choice"
      ? questionCount
      : paperType === "mixed"
        ? questionCount + structuredMarks
        : totalMarks;

  // Validation
  const marksOk =
    paperType === "structured"
      ? Number.isInteger(totalMarks) && totalMarks >= 10 && totalMarks <= 100
      : paperType === "multiple-choice"
        ? Number.isInteger(questionCount) && questionCount >= 10 && questionCount <= 80
        : Number.isInteger(questionCount) && questionCount >= 10 && questionCount <= 60 &&
          Number.isInteger(structuredMarks) && structuredMarks >= 10 && structuredMarks <= 80;
  const timeOk = Number.isInteger(durationMinutes) && durationMinutes >= 15 && durationMinutes <= 240;
  const topicsOk = topics.length >= 1 && topics.length <= 8;
  const canSubmit = marksOk && timeOk && topicsOk && !loading;

  function changeLevel(next: Level) {
    setLevel(next);
    setTopics([]);
    const current = syllabus.subjects.find((s) => s.name === subject);
    if (!current || current.levels[next].length === 0) {
      const first = syllabus.subjects.find((s) => s.levels[next].length > 0);
      if (first) setSubject(first.name);
    }
  }

  function toggleTopic(topic: string) {
    setTopics((current) =>
      current.includes(topic) ? current.filter((t) => t !== topic) : [...current, topic],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const req: GenerateRequest = {
      level,
      subject,
      topics,
      paperType,
      difficulty,
      totalMarks: derivedTotal,
      questionCount: paperType !== "structured" ? questionCount : undefined,
      durationMinutes,
      examTitle: examTitle.trim() || undefined,
    };
    onGenerate(req);
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h1 className="brand">PaperPal</h1>
      <p className="tagline">Build a syllabus-aligned test and its marking scheme.</p>

      {/* Profile chip */}
      {profile && (
        <div className="profile-row">
          <button type="button" className="profile-chip" onClick={onEditProfile}>
            <span className="profile-school">{profile.schoolName}</span>
            <span className="profile-role">{profile.teacherName} · {profile.role}</span>
          </button>
          <button type="button" className="sign-out-btn" onClick={onSignOut} title="Sign out">
            ⎋
          </button>
        </div>
      )}

      <fieldset>
        <legend>Level</legend>
        <div className="segmented">
          {levels.map((l) => (
            <label key={l} className={level === l ? "on" : ""}>
              <input type="radio" name="level" checked={level === l} onChange={() => changeLevel(l)} />
              {l}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>Exam title</span>
        <input
          type="text"
          maxLength={80}
          placeholder="e.g. Term 3 End of Term Examination"
          value={examTitle}
          onChange={(e) => setExamTitle(e.target.value)}
        />
      </label>

      <label className="field">
        <span>Subject</span>
        <select value={subject} onChange={(e) => { setSubject(e.target.value); setTopics([]); }}>
          {subjectsForLevel.map((s) => (
            <option key={s.name}>{s.name}</option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend>
          Topics <small>{topics.length} of 8 chosen</small>
        </legend>
        <div className="topics">
          {available.map((t) => {
            const checked = topics.includes(t);
            return (
              <label key={t} className={checked ? "topic on" : "topic"}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && topics.length >= 8}
                  onChange={() => toggleTopic(t)}
                />
                {t}
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="field">
        <span>Paper type</span>
        <select value={paperType} onChange={(e) => setPaperType(e.target.value as PaperType)}>
          {paperTypes.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend>Difficulty</legend>
        <div className="segmented">
          {difficulties.map((d) => (
            <label key={d.value} className={difficulty === d.value ? "on" : ""}>
              <input type="radio" name="difficulty" checked={difficulty === d.value} onChange={() => setDifficulty(d.value)} />
              {d.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Mark / question count inputs -- change based on paper type */}
      {paperType === "structured" && (
        <div className="row">
          <label className="field">
            <span>Total marks</span>
            <input
              type="number" min={10} max={100}
              value={totalMarks}
              onChange={(e) => setTotalMarks(Number(e.target.value))}
              aria-invalid={!marksOk}
            />
            {!marksOk && <em className="hint">Use 10 to 100.</em>}
          </label>
          <label className="field">
            <span>Time (minutes)</span>
            <input
              type="number" min={15} max={240}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              aria-invalid={!timeOk}
            />
            {!timeOk && <em className="hint">Use 15 to 240.</em>}
          </label>
        </div>
      )}

      {paperType === "multiple-choice" && (
        <div className="row">
          <label className="field">
            <span>Number of questions</span>
            <input
              type="number" min={10} max={80}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              aria-invalid={!marksOk}
            />
            {!marksOk && <em className="hint">Use 10 to 80.</em>}
            <em className="hint">1 mark each — total: {questionCount} marks</em>
          </label>
          <label className="field">
            <span>Time (minutes)</span>
            <input
              type="number" min={15} max={240}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              aria-invalid={!timeOk}
            />
            {!timeOk && <em className="hint">Use 15 to 240.</em>}
          </label>
        </div>
      )}

      {paperType === "mixed" && (
        <>
          <div className="row">
            <label className="field">
              <span>MCQ questions</span>
              <input
                type="number" min={10} max={60}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
              />
              <em className="hint">1 mark each</em>
            </label>
            <label className="field">
              <span>Structured marks</span>
              <input
                type="number" min={10} max={80}
                value={structuredMarks}
                onChange={(e) => setStructuredMarks(Number(e.target.value))}
              />
              <em className="hint">Section B total</em>
            </label>
          </div>
          <p className="note" style={{ marginTop: -8 }}>
            Total: {derivedTotal} marks ({questionCount} MCQ + {structuredMarks} structured)
          </p>
          <label className="field">
            <span>Time (minutes)</span>
            <input
              type="number" min={15} max={240}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              aria-invalid={!timeOk}
            />
            {!timeOk && <em className="hint">Use 15 to 240.</em>}
          </label>
        </>
      )}

      <button type="submit" className="generate" disabled={!canSubmit}>
        {loading ? "Writing your paper…" : "Generate paper"}
      </button>
      {!topicsOk && <p className="hint">Choose at least one topic.</p>}
      <p className="note">
        Papers and marking schemes are written by AI. Check every question and mark before you use them.
      </p>
    </form>
  );
}
