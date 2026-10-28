/**
 * /auth/callback
 *
 * Supabase redirects here after a successful Google OAuth flow.
 * The SDK's detectSessionInUrl:true picks up the ?code= param automatically
 * in the supabase.ts initialiser, so by the time this component renders the
 * session is already set. We just need to forward the user to the right page.
 *
 * If the user has no profile row yet (first Google sign-in), send them to
 * /app/profile-setup. Otherwise send them straight to /app.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AuthCallbackPage() {
  const { state } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (state.status === "loading") return; // wait for session to resolve

    if (state.status === "unauthenticated") {
      // OAuth failed or was cancelled
      navigate("/login", { replace: true });
      return;
    }

    if (!state.profile) {
      // First-time Google user — needs to fill in school name / role
      navigate("/app/profile-setup", { replace: true });
    } else {
      navigate("/app", { replace: true });
    }
  }, [state, navigate]);

  return (
    <div className="auth-loading">
      <div className="auth-spinner" aria-label="Signing you in…" />
    </div>
  );
}
