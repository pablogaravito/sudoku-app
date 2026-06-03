import { useState, useCallback } from 'react';
import HomeScreen from './screens/HomeScreen';
import GameScreen from './screens/GameScreen';
import StatsScreen from './screens/StatsScreen';
import AuthScreen from './screens/AuthScreen';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import './styles/index.css';

// ── Local stats (fallback while not logged in, or for guests) ─────────────────
const STATS_KEY = 'sudoku-stats';

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch { console.warn('Could not save stats'); }
}

function emptyDiffStats() {
  return {
    started: 0, won: 0, lost: 0,
    totalTime: 0, best: Infinity,
    winsNoHints: 0, totalHints: 0,
    currentStreak: 0, longestStreak: 0,
  };
}

export default function App() {
  const [screen, setScreen]       = useState('home');
  const [difficulty, setDifficulty] = useState('medium');
  const [resuming, setResuming]   = useState(false);
  const theme = useTheme();
  const auth  = useAuth();

  const handleStart = useCallback((diff) => {
    const stats = loadStats();
    if (!stats[diff]) stats[diff] = emptyDiffStats();
    stats[diff].started = (stats[diff].started ?? 0) + 1;
    saveStats(stats);
    setDifficulty(diff);
    setResuming(false);
    setScreen('game');
  }, []);

  const handleResume = useCallback((diff) => {
    setDifficulty(diff);
    setResuming(true);
    setScreen('game');
  }, []);

  const handleComplete = useCallback(({ difficulty: diff, time, hintsUsed }) => {
    const stats = loadStats();
    if (!stats[diff]) stats[diff] = emptyDiffStats();
    const d = stats[diff];
    d.won           = (d.won          ?? 0) + 1;
    d.totalTime     = (d.totalTime    ?? 0) + time;
    d.best          = Math.min(d.best ?? Infinity, time);
    d.totalHints    = (d.totalHints   ?? 0) + hintsUsed;
    d.winsNoHints   = (d.winsNoHints  ?? 0) + (hintsUsed === 0 ? 1 : 0);
    d.currentStreak = (d.currentStreak ?? 0) + 1;
    d.longestStreak = Math.max(d.longestStreak ?? 0, d.currentStreak);
    saveStats(stats);
  }, []);

  const handleAbandon = useCallback((diff) => {
    const stats = loadStats();
    if (!stats[diff]) stats[diff] = emptyDiffStats();
    stats[diff].lost          = (stats[diff].lost ?? 0) + 1;
    stats[diff].currentStreak = 0;
    saveStats(stats);
    setScreen('home');
  }, []);

  const requireAuth = import.meta.env.VITE_REQUIRE_AUTH !== 'false';

  // While checking for existing session, show nothing (avoids flash)
  // Skip this wait entirely if auth is disabled
  if (requireAuth && auth.loading) return null;

  // Not logged in → show auth screen (only if auth is required)
  if (requireAuth && !auth.user) {
    return (
      <AuthScreen
        onGoogleSignIn={auth.signInWithGoogle}
        onSendOtp={auth.sendOtp}
        onVerifyOtp={auth.verifyOtp}
        theme={theme}
      />
    );
  }

  return (
    <>
      {screen === 'home'  && (
        <HomeScreen
          onStart={handleStart}
          onResume={handleResume}
          onViewStats={() => setScreen('stats')}
          theme={theme}
          user={auth.user}
          onSignOut={auth.signOut}
        />
      )}
      {screen === 'game'  && (
        <GameScreen
          key={`${difficulty}-${resuming}`}
          difficulty={difficulty}
          resumeFromSave={resuming}
          onHome={() => setScreen('home')}
          onAbandon={handleAbandon}
          onComplete={handleComplete}
          theme={theme}
        />
      )}
      {screen === 'stats' && (
        <StatsScreen onBack={() => setScreen('home')} theme={theme} />
      )}
    </>
  );
}
