import { useState, useCallback } from 'react';
import HomeScreen from './screens/HomeScreen';
import GameScreen from './screens/GameScreen';
import StatsScreen from './screens/StatsScreen';
import AuthScreen from './screens/AuthScreen';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import {
  loadRemoteStats, saveRemoteStats,
} from './lib/statsService';
import './styles/index.css';

function emptyDiffStats() {
  return {
    won: 0, lost: 0,
    totalTime: 0, best: Infinity,
    winsNoHints: 0, totalHints: 0,
    currentStreak: 0, longestStreak: 0,
  };
}

export default function App() {
  const [screen, setScreen]         = useState('home');
  const [difficulty, setDifficulty] = useState('medium');
  const [resuming, setResuming]     = useState(false);
  const theme = useTheme();
  const auth  = useAuth();

  // ── Load stats ─────────────────────────────────────────────────────────────
  const getStats = useCallback(async () => {
    return loadRemoteStats(auth.user.id);
  }, [auth.user]);

  // ── Update a single difficulty's stats ────────────────────────────────────
  const updateStats = useCallback(async (diff, updater) => {
    const all = await loadRemoteStats(auth.user.id);
    const current = all[diff] ?? emptyDiffStats();
    const updated = updater(current);
    await saveRemoteStats(auth.user.id, diff, updated);
  }, [auth.user]);

  // ── Game events ────────────────────────────────────────────────────────────
  const handleStart = useCallback((diff) => {
    setDifficulty(diff);
    setResuming(false);
    setScreen('game');
  }, []);

  const handleResume = useCallback((diff) => {
    setDifficulty(diff);
    setResuming(true);
    setScreen('game');
  }, []);

  const handleComplete = useCallback(async ({ difficulty: diff, time, hintsUsed }) => {
    await updateStats(diff, (d) => ({
      ...d,
      won:           (d.won           ?? 0) + 1,
      totalTime:     (d.totalTime     ?? 0) + time,
      best:          Math.min(d.best  ?? Infinity, time),
      totalHints:    (d.totalHints    ?? 0) + hintsUsed,
      winsNoHints:   (d.winsNoHints   ?? 0) + (hintsUsed === 0 ? 1 : 0),
      currentStreak: (d.currentStreak ?? 0) + 1,
      longestStreak: Math.max(d.longestStreak ?? 0, (d.currentStreak ?? 0) + 1),
    }));
  }, [updateStats]);

  const handleAbandon = useCallback(async (diff) => {
    await updateStats(diff, (d) => ({
      ...d,
      lost:          (d.lost          ?? 0) + 1,
      currentStreak: 0,
    }));
    setScreen('home');
  }, [updateStats]);

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (auth.loading) return null;

  if (!auth.user) {
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
        <StatsScreen
          onBack={() => setScreen('home')}
          theme={theme}
          getStats={getStats}
          userId={auth.user?.id}
        />
      )}
    </>
  );
}
