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

export default function HomeScreen({ onStart, onResume, onViewStats, theme }) {
  const [selected, setSelected] = useState('medium');
  const [savedDiff, setSavedDiff] = useState(null);

  // Check localStorage for any saved game on mount
  useEffect(() => {
    const found = DIFFICULTIES.map(d => d.key).find(d => hasSavedGame(d));
    setSavedDiff(found ?? null);
  }, []);

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <div />
        <ThemeToggle theme={theme.theme} onToggle={theme.toggle} />
      </div>

      <header className={styles.header}>
        <h1 className={styles.title}>Sudoku</h1>
        <p className={styles.subtitle}>A clean puzzle for a clear mind</p>
      </header>

      {/* Resume banner — only shown when a saved game exists */}
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

      <button className={styles.statsLink} onClick={onViewStats}>
        View stats &amp; records →
      </button>
    </div>
  );
}
