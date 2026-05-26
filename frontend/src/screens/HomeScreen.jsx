import { useState } from 'react';
import ThemeToggle from '../components/ThemeToggle';
import styles from './HomeScreen.module.css';

const DIFFICULTIES = [
  { key: 'easy',   label: 'Easy',   desc: '~45 clues',  color: '#16a34a' },
  { key: 'medium', label: 'Medium', desc: '~35 clues',  color: '#d97706' },
  { key: 'hard',   label: 'Hard',   desc: '~29 clues',  color: '#dc2626' },
  { key: 'expert', label: 'Expert', desc: '~23 clues',  color: '#7c3aed' },
];

export default function HomeScreen({ onStart, onViewStats, theme }) {
  const [selected, setSelected] = useState('medium');

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

      <section className={styles.section} aria-label="Choose difficulty">
        <p className={styles.sectionLabel}>difficulty</p>
        <div className={styles.difficultyGrid}>
          {DIFFICULTIES.map(({ key, label, desc, color }) => (
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
