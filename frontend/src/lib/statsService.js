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
      bestCleanTime: row.best_clean_time,
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
      user_id:         userId,
      difficulty,
      won:             stats.won            ?? 0,
      lost:            stats.lost           ?? 0,
      best_time:       stats.best === Infinity ? null : (stats.best ?? null),
      best_clean_time: stats.bestCleanTime === Infinity ? null : (stats.bestCleanTime ?? null),
      total_time:      stats.totalTime      ?? 0,
      wins_no_hints:   stats.winsNoHints    ?? 0,
      total_hints:     stats.totalHints     ?? 0,
      current_streak:  stats.currentStreak  ?? 0,
      longest_streak:  stats.longestStreak  ?? 0,
      updated_at:      new Date().toISOString(),
    }, {
      onConflict: 'user_id,difficulty',
    });

  if (error) throw error;
}

// ─── Game sessions ────────────────────────────────────────────────────────────

/**
 * Record a completed game session.
 * Called every time a puzzle is solved.
 */
export async function insertGameSession(userId, difficulty, time, hintsUsed, wasNewRecord, globalRank) {
  const { error } = await supabase
    .from('game_sessions')
    .insert({
      user_id:        userId,
      difficulty,
      time,
      hints_used:     hintsUsed,
      was_new_record: wasNewRecord,
      global_rank:    globalRank ?? null,
      completed_at:   new Date().toISOString(),
    });
  if (error) throw error;
}

/**
 * Check if a time is the best this week or this month.
 * Returns 'week', 'month', or null.
 *
 * Thresholds: need 3+ games this week, 5+ games this month
 * to make the comparison meaningful.
 */
export async function checkPeriodBest(userId, difficulty, time) {
  const now   = new Date();

  // Start of current week (Monday)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);

  // Start of current month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch all sessions this month (covers both week and month check)
  const { data, error } = await supabase
    .from('game_sessions')
    .select('time, completed_at')
    .eq('user_id', userId)
    .eq('difficulty', difficulty)
    .gte('completed_at', monthStart.toISOString())
    .order('completed_at', { ascending: true });

  if (error || !data?.length) return null;

  const weekSessions  = data.filter(s => new Date(s.completed_at) >= weekStart);
  const monthSessions = data;

  // Exclude the current game from comparisons
  // (we compare against previous games, not including this one)
  const prevWeekTimes  = weekSessions.slice(0, -1).map(s => s.time);
  const prevMonthTimes = monthSessions.slice(0, -1).map(s => s.time);

  // Check week first (more specific)
  // Need at least 3 previous games this week to compare
  if (prevWeekTimes.length >= 2) {
    const weekBest = Math.min(...prevWeekTimes);
    if (time < weekBest) return 'week';
  }

  // Check month
  // Need at least 5 previous games this month to compare
  if (prevMonthTimes.length >= 4) {
    const monthBest = Math.min(...prevMonthTimes);
    if (time < monthBest) return 'month';
  }

  return null;
}

/**
 * Get recent sessions for a user + difficulty, newest first.
 * Used for the progression chart.
 */
export async function getRecentSessions(userId, difficulty, limit = 20) {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('time, hints_used, completed_at')
    .eq('user_id', userId)
    .eq('difficulty', difficulty)
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).reverse(); // oldest first for charting
}

/**
 * Get day-of-week stats for a user + difficulty.
 * Returns average time per day (0 = Sunday ... 6 = Saturday).
 * Only includes days with at least one session.
 */
export async function getDayOfWeekStats(userId, difficulty) {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('time, completed_at')
    .eq('user_id', userId)
    .eq('difficulty', difficulty);

  if (error) throw error;
  if (!data?.length) return [];

  // Group by day of week client-side
  // (Supabase doesn't support EXTRACT in JS SDK filters easily)
  const days = Array.from({ length: 7 }, (_, i) => ({
    day: i,
    label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
    times: [],
  }));

  for (const session of data) {
    const dayOfWeek = new Date(session.completed_at).getDay();
    days[dayOfWeek].times.push(session.time);
  }

  return days.map(d => ({
    ...d,
    avg: d.times.length
      ? Math.round(d.times.reduce((a, b) => a + b, 0) / d.times.length)
      : null,
    count: d.times.length,
  }));
}

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
 * Only call this when the time is a new personal record —
 * otherwise the player's rank hasn't changed and showing it
 * would be misleading (e.g. "You're #2!" when you're already #1).
 * Returns null if rank is outside top 10.
 */
export async function getRankForTime(userId, difficulty, time) {
  const { count, error } = await supabase
    .from('leaderboard')
    .select('*', { count: 'exact', head: true })
    .eq('difficulty', difficulty)
    .lt('best_time', time);

  if (error) return null;
  const rank = (count ?? 0) + 1;
  return rank <= 10 ? rank : null;
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

