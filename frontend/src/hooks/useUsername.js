// useUsername.js
// Handles username availability checking and saving.

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export function useUsername() {
  const [checking, setChecking]   = useState(false);
  const [available, setAvailable] = useState(null); // null | true | false
  const [error, setError]         = useState(null);

  /**
   * Check if a username is valid format and available in the db.
   * Debounce this on the calling side.
   */
  const checkAvailability = useCallback(async (username, currentUserId) => {
    setAvailable(null);
    setError(null);

    if (!username) return;

    if (!USERNAME_REGEX.test(username)) {
      setError('3–20 characters, letters, numbers and underscores only');
      return;
    }

    setChecking(true);
    try {
      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (dbError) throw dbError;

      // Available if no row found, or the row belongs to the current user
      const taken = data && data.id !== currentUserId;
      setAvailable(!taken);
      if (taken) setError('This username is already taken');
    } catch {
      setError('Could not check availability');
    } finally {
      setChecking(false);
    }
  }, []);

  /**
   * Save a username to the profiles table.
   * Returns true on success, throws on error.
   */
  const saveUsername = useCallback(async (userId, username) => {
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', userId);

    if (dbError) {
      // Unique constraint violation
      if (dbError.code === '23505') {
        throw new Error('This username was just taken — please try another');
      }
      throw dbError;
    }
    return true;
  }, []);

  return { checking, available, error, checkAvailability, saveUsername };
}
