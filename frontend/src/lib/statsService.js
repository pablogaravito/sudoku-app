// src/lib/statsService.js
//
// All Supabase stats read/write operations in one place.
// App.jsx calls these instead of touching localStorage directly.
//
// We keep localStorage as a fallback for the no-auth (GitHub Pages) version.

import { supabase } from './supabase';

const LOCAL_KEY = 'sudoku-stats';

// ─── localStorage helpers (used by no-auth version) ───────────────────────────

export function loadLocalStats() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveLocalStats(stats) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(stats));
  } catch { console.warn('Could not save stats locally'); }
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

/**
 * Load all stats rows for a user, returned as a difficulty-keyed object
 * matching our existing stats shape.
 */
export async function loadRemoteStats(userId) {
  const { data, error } = await supabase
    .from('stats')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  // Convert array of rows → { easy: {...}, medium: {...}, ... }
  const result = {};
  for (const row of data) {
    result[row.difficulty] = {
      won:           row.won,
      lost:          row.lost,
      best:          row.best_time,
      totalTime:     row.total_time,
      winsNoHints:   row.wins_no_hints,
      totalHints:    row.total_hints,
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
    };
  }
  return result;
}

/**
 * Upsert a single difficulty's stats for a user.
 * "Upsert" = insert if not exists, update if it does.
 * The unique(user_id, difficulty) constraint we set up handles this cleanly.
 */
export async function saveRemoteStats(userId, difficulty, stats) {
  const { error } = await supabase
    .from('stats')
    .upsert({
      user_id:        userId,
      difficulty,
      won:            stats.won           ?? 0,
      lost:           stats.lost          ?? 0,
      best_time:      stats.best === Infinity ? null : (stats.best ?? null),
      total_time:     stats.totalTime     ?? 0,
      wins_no_hints:  stats.winsNoHints   ?? 0,
      total_hints:    stats.totalHints    ?? 0,
      current_streak: stats.currentStreak ?? 0,
      longest_streak: stats.longestStreak ?? 0,
      updated_at:     new Date().toISOString(),
    }, {
      onConflict: 'user_id,difficulty',  // update existing row if found
    });

  if (error) throw error;
}
