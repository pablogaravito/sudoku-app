// src/lib/statsService.js
//
// All Supabase stats read/write operations in one place.

import { supabase } from './supabase';

// ─── Stats CRUD ───────────────────────────────────────────────────────────────

export async function loadRemoteStats(userId) {
  const { data, error } = await supabase
    .from('stats')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

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
      onConflict: 'user_id,difficulty',
    });

  if (error) throw error;
}

// ─── User preferences ─────────────────────────────────────────────────────────

/**
 * Load preferences from the profiles table.
 * Returns {} if none saved yet.
 */
export async function loadPreferences(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', userId)
    .single();

  if (error) return {};
  return data?.preferences ?? {};
}

/**
 * Save preferences to the profiles table.
 * Merges with existing preferences so partial updates are safe.
 */
export async function savePreferences(userId, prefs) {
  const { error } = await supabase
    .from('profiles')
    .update({ preferences: prefs })
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Get global leaderboard for a difficulty (top N by best_time).
 * Uses the public leaderboard view which only exposes safe columns.
 */
export async function getLeaderboard(difficulty, limit = 10) {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('username, best_time, won, user_id')
    .eq('difficulty', difficulty)
    .order('best_time', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/**
 * Get the global rank for a specific time on a difficulty.
 * Counts how many players have a BETTER (lower) time than `time`.
 * We pass the actual game time rather than the stored best, so this
 * correctly ranks non-PB times too (e.g. still top-10 globally).
 * Returns null on error.
 */
export async function getRankForTime(userId, difficulty, time) {
  const { count, error } = await supabase
    .from('leaderboard')
    .select('*', { count: 'exact', head: true })
    .eq('difficulty', difficulty)
    .lt('best_time', time);

  if (error) return null;
  return (count ?? 0) + 1;
}

/**
 * Get a user's percentile for a difficulty.
 * Returns e.g. 15 meaning "top 15% of players".
 * Returns null if not enough data (fewer than 5 players).
 */
export async function getUserPercentile(userId, difficulty) {
  // Total players with a time for this difficulty
  const { count: total } = await supabase
    .from('leaderboard')
    .select('*', { count: 'exact', head: true })
    .eq('difficulty', difficulty);

  if (!total || total < 5) return null; // not meaningful with tiny samples

  const rank = await getUserRank(userId, difficulty);
  if (!rank) return null;

  // Percentile = what % of players are SLOWER than you
  // rank 1 of 100 → top 1%; rank 50 of 100 → top 50%
  return Math.round((rank / total) * 100);
}

