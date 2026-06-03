// src/hooks/useAuth.js
//
// Manages authentication state for the whole app.
//
// Supabase auth is session-based — when a user logs in, Supabase stores
// the session in localStorage automatically and restores it on page load.
// We just need to listen for changes and keep React state in sync.

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we check for existing session

  useEffect(() => {
    // Clean up the # left by OAuth redirect
    if (window.location.hash === "#") {
      window.history.replaceState(null, "", window.location.pathname);
    }
    // Check if there's already a session (e.g. user refreshed the page)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for login/logout events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return { user, loading, signInWithGoogle, signOut };
}
