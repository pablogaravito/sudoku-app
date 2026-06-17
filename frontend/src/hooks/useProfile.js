// useProfile.js
// Loads the user's profile (username etc) from Supabase.
// Returns null while loading, {} if no profile yet.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useProfile(userId) {
  const [profile, setProfile]   = useState(null); // null = loading
  const [loading, setLoading]   = useState(true);

  const loadProfile = useCallback(async () => {
    if (!userId) { setProfile(null); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, preferences, created_at')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch {
      setProfile({});
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    loadProfile();
  }, [loadProfile]);

  // Call this after saving a new username to update local state
  const updateUsername = useCallback((username) => {
    setProfile(prev => ({ ...prev, username }));
  }, []);

  const updatePreferences = useCallback((preferences) => {
    setProfile(prev => ({ ...prev, preferences }));
  }, []);

  return { profile, loading, updateUsername, updatePreferences, reload: loadProfile };
}
