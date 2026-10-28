import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types";

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: User; session: Session; profile: Profile | null };

type AuthContextValue = {
  state: AuthState;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, profile: Profile) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (profile: Profile) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  // Fetch the profile row for a given user id
  async function fetchProfile(userId: string): Promise<Profile | null> {
    const { data } = await supabase
      .from("profiles")
      .select("school_name, teacher_name, role")
      .eq("id", userId)
      .maybeSingle();
    if (!data) return null;
    return { schoolName: data.school_name, teacherName: data.teacher_name, role: data.role };
  }

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({ status: "authenticated", user: session.user, session, profile });
      } else {
        setState({ status: "unauthenticated" });
      }
    });

    // Keep state in sync with Supabase auth events (login, logout, token refresh, OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({ status: "authenticated", user: session.user, session, profile });
      } else {
        setState({ status: "unauthenticated" });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithPassword(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string, profile: Profile) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Sign up failed. Please try again." };

    // Use the session access token to insert the profile via our server endpoint.
    // Direct browser inserts are blocked by RLS until the session is fully established.
    const token = data.session?.access_token;
    if (!token) {
      // Email confirmation is enabled -- user must confirm before the session exists.
      // Profile will be created on first login after confirmation.
      return { error: null };
    }

    const res = await fetch("/api/auth/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        school_name: profile.schoolName,
        teacher_name: profile.teacherName,
        role: profile.role,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      return { error: body.error ?? "Failed to save profile." };
    }
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function updateProfile(profile: Profile) {
    if (state.status !== "authenticated") return { error: "Not signed in." };

    const res = await fetch("/api/auth/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.session.access_token}`,
      },
      body: JSON.stringify({
        school_name: profile.schoolName,
        teacher_name: profile.teacherName,
        role: profile.role,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      return { error: body.error ?? "Failed to save profile." };
    }
    // Reflect update locally without a round-trip
    setState((prev) =>
      prev.status === "authenticated" ? { ...prev, profile } : prev,
    );
    return { error: null };
  }

  return (
    <AuthContext.Provider value={{ state, signInWithPassword, signInWithGoogle, signUp, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
