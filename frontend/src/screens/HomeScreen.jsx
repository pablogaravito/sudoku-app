import { useState, useEffect } from 'react';
import ThemeToggle from '../components/ThemeToggle';
import { hasSavedGame } from '../hooks/useSudokuGame';
import styles from './HomeScreen.module.css';

const DIFFICULTIES = [
  { key: 'easy',   label: 'Easy',   desc: '~45 clues', color: '#16a34a' },
  { key: 'medium', label: 'Medium', desc: '~35 clues', color: '#d97706' },
  { key: 'hard',   label: 'Hard',   desc: '~29 clues', color: '#dc2626' },
  { key: 'expert', label: 'Expert', desc: '~29 clues', color: '#7c3aed' },
  { key: 'insane', label: 'Insane', desc: '~23 clues', color: '#be123c' },
];

export default function HomeScreen({
  onStart, onResume, onViewStats, onViewLeaderboard,
  theme, user, onSignOut,
}) {
  const [selected, setSelected] = useState('medium');
  const [savedDiff, setSavedDiff] = useState(null);

  useEffect(() => {
    const found = DIFFICULTIES.map(d => d.key).find(d => hasSavedGame(d));
    setSavedDiff(found ?? null);
  }, []);

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <div className={styles.userInfo}>
          {user && (
            <>
              <span className={styles.userName}>
                {user.user_metadata?.full_name ?? user.email}
              </span>
              <button className={styles.signOutBtn} onClick={onSignOut}>
                Sign out
              </button>
            </>
          )}
        </div>
        <ThemeToggle theme={theme.theme} onToggle={theme.toggle} />
      </div>

      <header className={styles.header}>
        <h1 className={styles.title}>Sudoku</h1>
        <p className={styles.subtitle}>A clean puzzle for a clear mind</p>
      </header>

      {savedDiff && (
        <div className={styles.resumeBanner}>
          <div className={styles.resumeInfo}>
            <span className={styles.resumeLabel}>Saved game</span>
            <span className={styles.resumeDiff}>{savedDiff}</span>
          </div>
          <button className={styles.resumeBtn} onClick={() => onResume(savedDiff)}>
            Resume →
          </button>
        </div>
      )}

      <section className={styles.section} aria-label="Choose difficulty">
        <p className={styles.sectionLabel}>new game</p>
        <div className={styles.difficultyGrid}>
          <div className={styles.diffRow}>
            {DIFFICULTIES.slice(0, 3).map(({ key, label, desc, color }) => (
              <button
                key={key}
                className={`${styles.diffBtn} ${selected === key ? styles.diffSelected : ''}`}
                style={{ '--diff-color': color }}
                onClick={() => setSelected(key)}
                aria-pressed={selected === key}
              >
                <span className={styles.diffLabel}>{label}</span>
                <span className={styles.diffDesc}>{desc}</span>
              </button>
            ))}
          </div>
          <div className={styles.diffRow}>
            {DIFFICULTIES.slice(3).map(({ key, label, desc, color }) => (
              <button
                key={key}
                className={`${styles.diffBtn} ${selected === key ? styles.diffSelected : ''}`}
                style={{ '--diff-color': color }}
                onClick={() => setSelected(key)}
                aria-pressed={selected === key}
              >
                <span className={styles.diffLabel}>{label}</span>
                <span className={styles.diffDesc}>{desc}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <button className={styles.playBtn} onClick={() => onStart(selected)}>
        New Game
      </button>

      {/* Navigation buttons */}
      <div className={styles.navBtns}>
        <button className={styles.navBtn} onClick={onViewStats}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          My Stats
        </button>
        <button className={styles.navBtn} onClick={onViewLeaderboard}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15l-2 5H7l-2-5"/><path d="M17 15l2 5h3l2-5"/>
            <path d="M14 15V9a2 2 0 00-4 0v6"/><circle cx="12" cy="5" r="2"/>
          </svg>
          Leaderboard
        </button>
      </div>
    </div>
  );
}
