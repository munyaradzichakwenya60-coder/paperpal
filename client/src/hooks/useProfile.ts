import { useState, useEffect } from "react";
import type { Profile } from "../types";

const STORAGE_KEY = "paperpal_profile";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProfile(JSON.parse(raw) as Profile);
    } catch {
      // corrupted storage — start fresh
    }
    setLoaded(true);
  }, []);

  function saveProfile(p: Profile) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setProfile(p);
  }

  function clearProfile() {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
  }

  return { profile, loaded, saveProfile, clearProfile };
}
