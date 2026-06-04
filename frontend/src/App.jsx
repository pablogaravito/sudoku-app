import { useState, useCallback } from 'react';
import HomeScreen from './screens/HomeScreen';
import GameScreen from './screens/GameScreen';
import StatsScreen from './screens/StatsScreen';
import WinScreen from './screens/WinScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import AuthScreen from './screens/AuthScreen';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import {
  loadRemoteStats, saveRemoteStats, getRankForTime,
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
  const [winInfo, setWinInfo]       = useState(null);
  const theme = useTheme(auth.user);
  const auth  = useAuth();

  // ── Load stats (for StatsScreen) ──────────────────────────────────────────
  const getStats = useCallback(async () => {
    return loadRemoteStats(auth.user.id);
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
    // Load current stats BEFORE updating so we can detect a new personal record
    const all = await loadRemoteStats(auth.user.id);
    const prev = all[diff];
    const prevBest = prev?.best ?? Infinity;
    const isNewRecord = time < prevBest;

    // Save updated stats
    await saveRemoteStats(auth.user.id, diff, {
      ...(prev ?? emptyDiffStats()),
      won:           (prev?.won           ?? 0) + 1,
      totalTime:     (prev?.totalTime     ?? 0) + time,
      best:          Math.min(prevBest, time),
      totalHints:    (prev?.totalHints    ?? 0) + hintsUsed,
      winsNoHints:   (prev?.winsNoHints   ?? 0) + (hintsUsed === 0 ? 1 : 0),
      currentStreak: (prev?.currentStreak ?? 0) + 1,
      longestStreak: Math.max(prev?.longestStreak ?? 0, (prev?.currentStreak ?? 0) + 1),
    });

    // Always check global rank for THIS game's time — not just on personal bests.
    // A non-PB time can still crack the global top 10.
    const globalRank = await getRankForTime(auth.user.id, diff, time);

    setWinInfo({ isNewRecord, globalRank, time, difficulty: diff, hintsUsed });
    setScreen('win');
  }, [auth.user]);

  const handleAbandon = useCallback(async (diff) => {
    const all = await loadRemoteStats(auth.user.id);
    const prev = all[diff] ?? emptyDiffStats();
    await saveRemoteStats(auth.user.id, diff, {
      ...prev,
      lost:          (prev.lost          ?? 0) + 1,
      currentStreak: 0,
    });
    setScreen('home');
  }, [auth.user]);

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
          onViewLeaderboard={() => setScreen('leaderboard')}
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
      {screen === 'win'   && winInfo && (
        <WinScreen
          winInfo={winInfo}
          onPlayAgain={() => {
            setScreen('game');
            setResuming(false);
          }}
          onHome={() => setScreen('home')}
          onViewStats={() => setScreen('stats')}
          theme={theme}
        />
      )}
      {screen === 'leaderboard' && (
        <LeaderboardScreen
          onBack={() => setScreen('home')}
          theme={theme}
          userId={auth.user?.id}
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
