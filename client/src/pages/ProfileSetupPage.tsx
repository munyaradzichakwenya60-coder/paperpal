/**
 * /app/profile-setup
 *
 * Shown to Google OAuth users on their first sign-in -- they have an account
 * but no profile row yet. Collects school name, teacher name, and role, then
 * upserts the profile and forwards to /app.
 */
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Profile } from "../types";

const roles: Profile["role"][] = ["Teacher", "Head of Department", "Examiner"];

export function ProfileSetupPage() {
  const { state, updateProfile } = useAuth();
  const navigate = useNavigate();

  const displayName =
    state.status === "authenticated"
      ? state.user.user_metadata?.full_name ?? state.user.email ?? ""
      : "";

  const [schoolName, setSchoolName] = useState("");
  const [teacherName, setTeacherName] = useState(displayName);
  const [role, setRole] = useState<Profile["role"]>("Teacher");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await updateProfile({ schoolName, teacherName, role });
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate("/app", { replace: true });
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-brand">PaperPal</h1>
        <p className="auth-sub">Almost there — tell us about yourself</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            <span>School name</span>
            <input
              type="text"
              autoComplete="organization"
              required
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Warren Hills High School"
            />
          </label>

          <label className="auth-field">
            <span>Your full name</span>
            <input
              type="text"
              autoComplete="name"
              required
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
            />
          </label>

          <label className="auth-field">
            <span>Your role</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Profile["role"])}>
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : null}
            {loading ? "Saving…" : "Get started"}
          </button>
        </form>
      </div>
    </div>
  );
}
