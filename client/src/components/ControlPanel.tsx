import { useState } from "react";
import type { Difficulty, GenerateRequest, Level, PaperType, Profile, Syllabus } from "../types";

type Props = {
  syllabus: Syllabus;
  loading: boolean;
  onGenerate: (req: GenerateRequest) => void;
  profile: Profile | null;
  onEditProfile: () => void;
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
  { value: "mixed", label: "Mixed (multiple choice and structured)" },
];

export function ControlPanel({ syllabus, loading, onGenerate, profile, onEditProfile }: Props) {
  const [level, setLevel] = useState<Level>("O-Level");
  const [subject, setSubject] = useState(syllabus.subjects[0].name);
  const [topics, setTopics] = useState<string[]>([]);
  const [paperType, setPaperType] = useState<PaperType>("structured");
  const [difficulty, setDifficulty] = useState<Difficulty>("balanced");
  const [totalMarks, setTotalMarks] = useState(40);
  const [durationMinutes, setDurationMinutes] = useState(60);

  // Only show subjects that have topics for the selected level
  const subjectsForLevel = syllabus.subjects.filter((s) => s.levels[level].length > 0);

  const available = syllabus.subjects.find((s) => s.name === subject)?.levels[level] ?? [];
  const marksOk = Number.isInteger(totalMarks) && totalMarks >= 10 && totalMarks <= 100;
  const timeOk = Number.isInteger(durationMinutes) && durationMinutes >= 15 && durationMinutes <= 240;
  const topicsOk = topics.length >= 1 && topics.length <= 8;
  const canSubmit = marksOk && timeOk && topicsOk && !loading;

  function changeLevel(next: Level) {
    setLevel(next);
    setTopics([]);
    // If current subject has no topics at the new level, switch to first available subject
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

  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onGenerate({ level, subject, topics, paperType, difficulty, totalMarks, durationMinutes });
      }}
    >
      <h1 className="brand">PaperPal</h1>
      <p className="tagline">Build a syllabus-aligned test and its marking scheme.</p>

      {/* Profile chip */}
      {profile && (
        <button type="button" className="profile-chip" onClick={onEditProfile}>
          <span className="profile-school">{profile.schoolName}</span>
          <span className="profile-role">{profile.teacherName} · {profile.role}</span>
        </button>
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
        <span>Subject</span>
        <select
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setTopics([]);
          }}
        >
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
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend>Difficulty</legend>
        <div className="segmented">
          {difficulties.map((d) => (
            <label key={d.value} className={difficulty === d.value ? "on" : ""}>
              <input
                type="radio"
                name="difficulty"
                checked={difficulty === d.value}
                onChange={() => setDifficulty(d.value)}
              />
              {d.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="row">
        <label className="field">
          <span>Total marks</span>
          <input
            type="number"
            min={10}
            max={100}
            value={totalMarks}
            onChange={(e) => setTotalMarks(Number(e.target.value))}
            aria-invalid={!marksOk}
          />
          {!marksOk && <em className="hint">Use 10 to 100.</em>}
        </label>
        <label className="field">
          <span>Time (minutes)</span>
          <input
            type="number"
            min={15}
            max={240}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            aria-invalid={!timeOk}
          />
          {!timeOk && <em className="hint">Use 15 to 240.</em>}
        </label>
      </div>

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
