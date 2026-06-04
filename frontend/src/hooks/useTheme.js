// useTheme.js
// Manages light/dark theme preference.
// When a user is logged in, syncs with Supabase so preference persists
// across devices. Falls back to localStorage when not logged in.

import { useState, useEffect, useCallback } from 'react';
import { loadPreferences, savePreferences } from '../lib/statsService';

const STORAGE_KEY = 'sudoku-theme';

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function useTheme(user = null) {
  const [theme, setThemeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === 'light' || stored === 'dark') ? stored : getSystemTheme();
  });

  // Load theme from Supabase when user logs in
  useEffect(() => {
    if (!user) return;
    loadPreferences(user.id)
      .then(prefs => {
        if (prefs?.theme) {
          setThemeState(prefs.theme);
        }
      })
      .catch(() => {}); // fail silently, keep local theme
  }, [user?.id]);

  // Apply theme to <html> whenever it changes
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      // Save to Supabase if logged in
      if (user) {
        loadPreferences(user.id)
          .then(prefs => savePreferences(user.id, { ...prefs, theme: next }))
          .catch(() => {});
      }
      return next;
    });
  }, [user]);

  return { theme, toggle };
}
