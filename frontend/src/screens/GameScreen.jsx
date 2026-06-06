import { useEffect, useState } from 'react';
import { useSudokuGame, saveGame, deleteSavedGame } from '../hooks/useSudokuGame';
import { useTimer } from '../hooks/useTimer';
import SudokuBoard from '../components/SudokuBoard';
import NumberPad from '../components/NumberPad';
import styles from './GameScreen.module.css';

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

export default function GameScreen({ difficulty, resumeFromSave, onHome, onAbandon, onComplete }) {
  const game  = useSudokuGame(difficulty, resumeFromSave);
  const timer = useTimer();

  // Whether to show the "leave game?" confirmation modal
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Start timer on mount, offset by saved elapsed time if resuming
  useEffect(() => {
    if (game.elapsedAtSave > 0) {
      // pre-seed the timer with saved elapsed time
      timer.addSeconds(game.elapsedAtSave);
    }
    timer.start();
  }, []);

  useEffect(() => {
    if (game.isComplete) {
      timer.pause();
      deleteSavedGame(difficulty);
      onComplete({ difficulty, time: timer.elapsed, hintsUsed: game.hintsUsed });
    }
  }, [game.isComplete]);

  // Auto-pause when the tab/window loses focus (phone call, switching apps, etc.)
  useEffect(() => {
    const handleBlur = () => {
      if (timer.running) timer.pause();
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [timer.running]);

  // Auto-save whenever the timer pauses and there's progress
  // This covers both manual pause AND blur-triggered pause
  useEffect(() => {
    if (!timer.running && game.canUndo && !game.isComplete) {
      saveGame(game.rawState, timer.elapsed);
    }
  }, [timer.running]);

  const handlePlayAgain = () => {
    timer.reset();
    game.newGame(difficulty);
    setTimeout(() => timer.start(), 50);
  };

  // A game counts as "abandoned" (loss) if the player made at least one move.
  // Leaving before touching anything doesn't penalise the win rate.
  const wasStarted = game.canUndo || timer.elapsed > 10;

  // "In progress" = at least one move made and not complete
  const hasProgress = game.canUndo && !game.isComplete;

  const handleHomeClick = () => {
    if (hasProgress) {
      timer.pause();
      setShowLeaveModal(true);
    } else {
      // No moves made — leave cleanly without counting as abandoned
      onHome();
    }
  };

  const handleSaveAndLeave = () => {
    saveGame(game.rawState, timer.elapsed);
    // Saving counts as a pause, not an abandon — don't break streak or count as loss
    onHome();
  };

  const handleAbandon = () => {
    deleteSavedGame(difficulty);
    onAbandon(difficulty); // breaks streak, game already counted as started
  };

  const handleResume = () => {
    setShowLeaveModal(false);
    timer.start();
  };

  const remainingCounts = getRemainingCounts(game.board);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.iconBtn} onClick={handleHomeClick} aria-label="Home">
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
          <button className={styles.iconBtn} onClick={timer.toggle} aria-label={timer.running ? 'Pause' : 'Resume'}>
            {timer.running
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            }
          </button>
        </div>
      </header>

      <div className={`${styles.boardWrapper} ${!timer.running ? styles.paused : ''}`}>
        {!timer.running && !showLeaveModal && !game.isComplete && (
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

      <NumberPad
        onNumber={game.placeNumber}
        onErase={game.eraseCell}
        onUndo={game.undo}
        onToggleNotes={game.toggleNotesMode}
        onHint={game.useHint}
        notesMode={game.notesMode}
        canUndo={game.canUndo}
        hintsLeft={game.hintsLeft}
        hintsAllowed={game.hintsAllowed}
        remainingCounts={remainingCounts}
      />

      {/* ── Leave confirmation modal ─────────────────────────────────────── */}
      {showLeaveModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Leave this puzzle?</h2>
            <p className={styles.modalBody}>
              You have a game in progress. What would you like to do?
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalBtnPrimary} onClick={handleSaveAndLeave}>
                Save &amp; leave
              </button>
              <button className={styles.modalBtnDanger} onClick={handleAbandon}>
                Abandon puzzle
              </button>
              <button className={styles.modalBtnSecondary} onClick={handleResume}>
                Keep playing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
