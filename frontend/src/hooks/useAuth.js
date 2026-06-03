// useAuth.js
// Manages authentication state — Google OAuth + Email OTP.
// Account linking is handled automatically by Supabase when the same
// email is used across different providers.

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // Clean up # left by OAuth redirect after Supabase has processed it
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Google OAuth ───────────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
    });
    if (error) throw error;
  };

  // ── Email OTP — step 1: send code ──────────────────────────────────────────
  const sendOtp = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Don't create a new user if they don't exist yet — they need to
        // explicitly sign up. Set to false to allow new signups via OTP.
        shouldCreateUser: true,
      },
    });
    if (error) throw error;
  };

  // ── Email OTP — step 2: verify code ───────────────────────────────────────
  const verifyOtp = async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw error;
  };

  // ── Sign out ───────────────────────────────────────────────────────────────
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    user, loading,
    signInWithGoogle,
    sendOtp,
    verifyOtp,
    signOut,
  };
}
