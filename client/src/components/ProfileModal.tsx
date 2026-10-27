import { useState } from "react";
import type { Profile } from "../types";

type Props = {
  /** existing profile when editing, null on first-time setup */
  existing: Profile | null;
  onSave: (p: Profile) => void;
  onClose?: () => void;
};

const roles: Profile["role"][] = ["Teacher", "Head of Department", "Examiner"];

export function ProfileModal({ existing, onSave, onClose }: Props) {
  const [schoolName, setSchoolName] = useState(existing?.schoolName ?? "");
  const [teacherName, setTeacherName] = useState(existing?.teacherName ?? "");
  const [role, setRole] = useState<Profile["role"]>(existing?.role ?? "Teacher");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolName.trim()) { setError("School name is required."); return; }
    if (!teacherName.trim()) { setError("Your name is required."); return; }
    onSave({ schoolName: schoolName.trim(), teacherName: teacherName.trim(), role });
  }

  const isSetup = !existing;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal">
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {isSetup ? "Welcome to PaperPal" : "Edit profile"}
          </h2>
          {!isSetup && onClose && (
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          )}
        </div>

        {isSetup && (
          <p className="modal-intro">
            Set up your profile once. Your school name and details will appear on every paper you generate.
          </p>
        )}

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>School name</span>
            <input
              type="text"
              placeholder="e.g. Warren Hills High School"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              autoFocus
            />
          </label>

          <label className="field">
            <span>Your name</span>
            <input
              type="text"
              placeholder="e.g. Mr T. Moyo"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Profile["role"])}>
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>

          {error && <p className="modal-error">{error}</p>}

          <button type="submit" className="generate">
            {isSetup ? "Get started" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
