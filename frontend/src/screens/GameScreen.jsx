// GameScreen.jsx
//
// This is the "container" screen — it owns nothing itself except what it
// delegates to useSudokuGame and useTimer. Its job is purely wiring:
// take outputs from hooks → pass as props to components.
//
// Notice how clean the JSX is because all logic lives in the hooks.

import { useEffect } from 'react';
import { useSudokuGame } from '../hooks/useSudokuGame';
import { useTimer } from '../hooks/useTimer';
import SudokuBoard from '../components/SudokuBoard';
import NumberPad from '../components/NumberPad';
import ThemeToggle from '../components/ThemeToggle';
import styles from './GameScreen.module.css';

// How many of each digit (1–9) remain to be placed?
// When a digit reaches 0, we grey out its button.
function getRemainingCounts(board) {
  const counts = { 1:9, 2:9, 3:9, 4:9, 5:9, 6:9, 7:9, 8:9, 9:9 };
  for (const row of board)
    for (const val of row)
      if (val > 0) counts[val]--;
  return counts;
}

const DIFF_COLORS = {
  easy: '#16a34a', medium: '#d97706', hard: '#dc2626', expert: '#7c3aed'
};

export default function GameScreen({ difficulty, onHome, onComplete, theme }) {
  const game  = useSudokuGame(difficulty);
  const timer = useTimer();

  // Start timer when component mounts, stop when complete
  useEffect(() => { timer.start(); }, []);
  useEffect(() => {
    if (game.isComplete) {
      timer.pause();
      onComplete({ difficulty, time: timer.elapsed });
    }
  }, [game.isComplete]);

  const remainingCounts = getRemainingCounts(game.board);

  return (
    <div className={styles.screen}>
      {/* Header bar */}
      <header className={styles.header}>
        <button className={styles.iconBtn} onClick={onHome} aria-label="Home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </button>

        <div className={styles.meta}>
          <span className={styles.diffBadge} style={{ color: DIFF_COLORS[difficulty] }}>
            {difficulty}
          </span>
          <span className={styles.timer} aria-live="polite">{timer.formatted}</span>
        </div>

        <div className={styles.headerRight}>
          <ThemeToggle theme={theme.theme} onToggle={theme.toggle} />
          <button className={styles.iconBtn} onClick={timer.toggle} aria-label={timer.running ? 'Pause' : 'Resume'}>
            {timer.running
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            }
          </button>
        </div>
      </header>

      {/* Board (blurred when paused) */}
      <div className={`${styles.boardWrapper} ${!timer.running ? styles.paused : ''}`}>
        {!timer.running && (
          <div className={styles.pauseOverlay} onClick={timer.toggle}>
            <span>Paused — tap to resume</span>
          </div>
        )}
        <SudokuBoard
          board={game.board}
          givenBoard={game.puzzle}
          selectedCell={game.selectedCell}
          notes={game.notes}
          onCellClick={game.selectCell}
        />
      </div>

      {/* Number pad */}
      <NumberPad
        onNumber={game.placeNumber}
        onErase={game.eraseCell}
        onUndo={game.undo}
        onToggleNotes={game.toggleNotesMode}
        onHint={game.useHint}
        notesMode={game.notesMode}
        canUndo={game.canUndo}
        remainingCounts={remainingCounts}
      />

      {/* Win overlay */}
      {game.isComplete && (
        <div className={styles.winOverlay}>
          <div className={styles.winCard}>
            <div className={styles.winEmoji}>🎉</div>
            <h2 className={styles.winTitle}>Solved!</h2>
            <p className={styles.winTime}>{timer.formatted}</p>
            <p className={styles.winDiff}>{difficulty}</p>
            <div className={styles.winActions}>
              <button className={styles.winBtn} onClick={() => game.newGame(difficulty)}>Play again</button>
              <button className={styles.winBtnSecondary} onClick={onHome}>Change difficulty</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
