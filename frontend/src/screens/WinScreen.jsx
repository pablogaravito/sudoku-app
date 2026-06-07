// WinScreen.jsx
// Shown after completing a puzzle. Celebrates new records and top positions.

import styles from './WinScreen.module.css';

const DIFF_COLORS = {
  easy: '#16a34a', medium: '#d97706', hard: '#dc2626',
  expert: '#7c3aed', insane: '#be123c',
};

const RANK_MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getRankSuffix(n) {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

export default function WinScreen({ winInfo, onPlayAgain, onHome, onViewStats, theme }) {
  const { isNewRecord, isNewCleanRecord, globalRank, periodBest, time, difficulty, hintsUsed } = winInfo;
  const isClean    = hintsUsed === 0;
  const isTopThree = globalRank && globalRank <= 3;
  const isTopTen   = globalRank && globalRank <= 10;

  return (
    <div className={styles.screen}>
      <div className={styles.card}>

        {/* ── Main emoji ──────────────────────────────────────────────── */}
        <div className={styles.emoji}>
          {isTopThree ? RANK_MEDALS[globalRank] : isNewRecord ? '🏆' : '🎉'}
        </div>

        {/* ── Title ───────────────────────────────────────────────────── */}
        <h1 className={styles.title}>
          {isTopThree ? `You're #${globalRank}!` : 'Solved!'}
        </h1>

        {/* ── Time ────────────────────────────────────────────────────── */}
        <p className={styles.time}>{formatTime(time)}</p>

        <p
          className={styles.difficulty}
          style={{ color: DIFF_COLORS[difficulty] }}
        >
          {difficulty}
        </p>

        {/* ── Achievements ────────────────────────────────────────────── */}
        <div className={styles.badges}>
          {isNewRecord && isClean && (
            <div className={styles.badge}>🏆 New personal best!</div>
          )}
          {isNewRecord && !isClean && (
            <div className={styles.badge}>⏱️ New overall best — but hints were used</div>
          )}
          {isNewCleanRecord && (
            <div className={styles.badge}>🏆 New clean personal best!</div>
          )}
          {!isNewRecord && !isNewCleanRecord && periodBest === 'week' && (
            <div className={styles.badge}>📅 Best time this week!</div>
          )}
          {!isNewRecord && !isNewCleanRecord && periodBest === 'month' && (
            <div className={styles.badge}>📆 Best time this month!</div>
          )}
          {isTopTen && !isTopThree && isClean && (
            <div className={styles.badge}>
              🌟 You're #{globalRank}{getRankSuffix(globalRank)} globally for {difficulty}!
            </div>
          )}
          {isTopThree && isClean && (
            <div className={`${styles.badge} ${styles.badgeGold}`}>
              {RANK_MEDALS[globalRank]} {globalRank}{getRankSuffix(globalRank)} place globally for {difficulty}!
            </div>
          )}
          {isClean && (
            <div className={styles.badge}>✨ Clean solve — no hints used!</div>
          )}
          {!isClean && (
            <div className={styles.badgeWarning}>
              ℹ️ Hint used — this time won't count on the leaderboard
            </div>
          )}
        </div>

        {hintsUsed > 0 && (
          <p className={styles.hints}>
            {hintsUsed} hint{hintsUsed !== 1 ? 's' : ''} used
          </p>
        )}

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={onPlayAgain}>
            Play again
          </button>
          <button className={styles.btnSecondary} onClick={onViewStats}>
            View stats
          </button>
          <button className={styles.btnSecondary} onClick={onHome}>
            Change difficulty
          </button>
        </div>

      </div>
    </div>
  );
}
