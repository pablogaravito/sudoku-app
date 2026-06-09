import { useState, useCallback } from 'react';
import HomeScreen from './screens/HomeScreen';
import GameScreen from './screens/GameScreen';
import StatsScreen from './screens/StatsScreen';
import WinScreen from './screens/WinScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import AuthScreen from './screens/AuthScreen';
import UsernameScreen from './screens/UsernameScreen';
import TopBar from './components/TopBar';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import {
  loadRemoteStats, saveRemoteStats, getRankForTime,
  insertGameSession, checkPeriodBest,
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
  const [screen, setScreen]               = useState('home');
  const [difficulty, setDifficulty]       = useState('medium');
  const [resuming, setResuming]           = useState(false);
  const [winInfo, setWinInfo]             = useState(null);
  const [changingUsername, setChangingUsername] = useState(false);

  const auth    = useAuth();
  const theme   = useTheme(auth.user);
  const profile = useProfile(auth.user?.id);

  const getStats = useCallback(async () => {
    return loadRemoteStats(auth.user.id);
  }, [auth.user]);

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
    const all         = await loadRemoteStats(auth.user.id);
    const prev        = all[diff];
    const prevBest    = prev?.best ?? Infinity;
    const isNewRecord = time < prevBest;
    const isClean     = hintsUsed === 0;

    // For clean games, also track best clean time
    const prevBestClean    = prev?.bestCleanTime ?? Infinity;
    const isNewCleanRecord = isClean && time < prevBestClean;

    const [globalRank, periodBest] = await Promise.all([
      isNewRecord ? getRankForTime(auth.user.id, diff, time) : Promise.resolve(null),
      checkPeriodBest(auth.user.id, diff, time),
    ]);

    await Promise.all([
      saveRemoteStats(auth.user.id, diff, {
        ...(prev ?? emptyDiffStats()),
        won:           (prev?.won           ?? 0) + 1,
        totalTime:     (prev?.totalTime     ?? 0) + time,
        best:          Math.min(prevBest, time),
        bestCleanTime: isClean ? Math.min(prevBestClean, time) : (prev?.bestCleanTime ?? null),
        totalHints:    (prev?.totalHints    ?? 0) + hintsUsed,
        winsNoHints:   (prev?.winsNoHints   ?? 0) + (isClean ? 1 : 0),
        currentStreak: (prev?.currentStreak ?? 0) + 1,
        longestStreak: Math.max(prev?.longestStreak ?? 0, (prev?.currentStreak ?? 0) + 1),
      }),
      insertGameSession(auth.user.id, diff, time, hintsUsed, isNewRecord, globalRank),
    ]);

    setWinInfo({ isNewRecord, isNewCleanRecord, globalRank, periodBest, time, difficulty: diff, hintsUsed });
    setScreen('win');
  }, [auth.user]);

  const handleAbandon = useCallback(async (diff) => {
    const all  = await loadRemoteStats(auth.user.id);
    const prev = all[diff] ?? emptyDiffStats();
    await saveRemoteStats(auth.user.id, diff, {
      ...prev,
      lost:          (prev.lost          ?? 0) + 1,
      currentStreak: 0,
    });
    setScreen('home');
  }, [auth.user]);

  const handleUsernameComplete = useCallback((newUsername) => {
    if (newUsername) profile.updateUsername(newUsername);
    setChangingUsername(false);
    setScreen('home');
  }, [profile]);

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (auth.loading || profile.loading) return null;

  if (!auth.user) {
    return <AuthScreen
      onGoogleSignIn={auth.signInWithGoogle}
      onSendOtp={auth.sendOtp}
      onVerifyOtp={auth.verifyOtp}
      theme={theme}
    />;
  }

  // First login — no username set
  if (!profile.profile?.username && !changingUsername) {
    return (
      <>
        <TopBar
          user={auth.user}
          username={profile.profile?.username}
          theme={theme}
          onSignOut={auth.signOut}
          onChangeUsername={() => setChangingUsername(true)}
        />
        <UsernameScreen
          user={auth.user}
          onComplete={handleUsernameComplete}
          theme={theme}
          isChanging={false}
        />
      </>
    );
  }

  // Changing username
  if (changingUsername) {
    return (
      <>
        <TopBar
          user={auth.user}
          username={profile.profile?.username}
          theme={theme}
          onSignOut={auth.signOut}
          onChangeUsername={() => setChangingUsername(true)}
        />
        <UsernameScreen
          user={{ ...auth.user, username: profile.profile?.username }}
          onComplete={handleUsernameComplete}
          onCancel={() => setChangingUsername(false)}
          theme={theme}
          isChanging={true}
        />
      </>
    );
  }

  // The persistent TopBar shows on all screens except game
  const showTopBar = screen !== 'game';

  return (
    <>
      {showTopBar && (
        <TopBar
          user={auth.user}
          username={profile.profile?.username}
          theme={theme}
          onSignOut={auth.signOut}
          onChangeUsername={() => setChangingUsername(true)}
        />
      )}

      {screen === 'home' && (
        <HomeScreen
          onStart={handleStart}
          onResume={handleResume}
          onViewStats={() => setScreen('stats')}
          onViewLeaderboard={() => setScreen('leaderboard')}
        />
      )}
      {screen === 'game' && (
        <GameScreen
          key={`${difficulty}-${resuming}`}
          difficulty={difficulty}
          resumeFromSave={resuming}
          userId={auth.user?.id}
          onHome={() => setScreen('home')}
          onAbandon={handleAbandon}
          onComplete={handleComplete}
        />
      )}
      {screen === 'win' && winInfo && (
        <WinScreen
          winInfo={winInfo}
          onPlayAgain={() => { setScreen('game'); setResuming(false); }}
          onHome={() => setScreen('home')}
          onViewStats={() => setScreen('stats')}
          theme={theme}
        />
      )}
      {screen === 'leaderboard' && (
        <LeaderboardScreen
          onBack={() => setScreen('home')}
          userId={auth.user?.id}
        />
      )}
      {screen === 'stats' && (
        <StatsScreen
          onBack={() => setScreen('home')}
          getStats={getStats}
          userId={auth.user?.id}
        />
      )}
    </>
  );
}
