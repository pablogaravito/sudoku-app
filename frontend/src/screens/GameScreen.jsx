import { useEffect, useState, useRef } from 'react';
import { useSudokuGame, saveGame, deleteSavedGame } from '../hooks/useSudokuGame';
import { useTimer } from '../hooks/useTimer';
import { usePuzzle, submitPuzzle } from '../hooks/usePuzzle';
import SudokuBoard from '../components/SudokuBoard';
import NumberPad from '../components/NumberPad';
import ThemeToggle from '../components/ThemeToggle';
import styles from './GameScreen.module.css';

const HINT_TOAST_KEY = 'sudoku-hint-toast-shown';

function getRemainingCounts(board) {
  const counts = { 1:9, 2:9, 3:9, 4:9, 5:9, 6:9, 7:9, 8:9, 9:9 };
  for (const row of board)
    for (const val of row)
      if (val > 0) counts[val]--;
  return counts;
}

const DIFF_COLORS = {
  easy: '#16a34a', medium: '#d97706', hard: '#dc2626', expert: '#7c3aed', insane: '#be123c',
};

export default function GameScreen({ difficulty, resumeFromSave, userId, onHome, onAbandon, onComplete, theme }) {
  const { puzzle: serverPuzzle, puzzleId, loading: puzzleLoading, error: puzzleError }
    = usePuzzle(resumeFromSave ? null : difficulty, resumeFromSave ? null : userId);

  const puzzleReady = resumeFromSave || (!puzzleLoading && !!serverPuzzle && !!puzzleId);

  const game  = useSudokuGame(difficulty, resumeFromSave, puzzleReady && !resumeFromSave ? serverPuzzle : null);
  const timer = useTimer();

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showHintToast, setShowHintToast]   = useState(false);
  const hintToastTimer = useRef(null);

  // Start timer once puzzle + game state are both ready
  useEffect(() => {
    if (!puzzleReady || !game?.board) return;
    if (game.elapsedAtSave > 0) timer.addSeconds(game.elapsedAtSave);
    timer.start();
  }, [puzzleReady, !!game?.board]);

  useEffect(() => {
    if (!game?.isComplete) return;
    timer.pause();
    deleteSavedGame(difficulty);
    const finish = async () => {
      if (puzzleId) {
        try {
          const result = await submitPuzzle(puzzleId, userId, game.board, timer.elapsed, game.hintsUsed);
          console.log('Submit result:', result);
        } catch (err) {
          console.error('Submit validation failed:', err.message);
        }
      }
      onComplete({ difficulty, time: timer.elapsed, hintsUsed: game.hintsUsed });
    };
    finish();
  }, [game?.isComplete]);

  useEffect(() => {
    const handleBlur = () => { if (timer.running) timer.pause(); };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [timer.running]);

  useEffect(() => {
    if (!timer.running && game?.canUndo && !game?.isComplete && game?.rawState) {
      saveGame(game.rawState, timer.elapsed);
    }
  }, [timer.running]);

  // ── Show loading until BOTH server puzzle AND game state are ready ──────────
  // rawState is null until the useEffect in useSudokuGame fires with the real puzzle
  // board is always truthy (fallback empty board) so we can't use it as the ready check
  const gameReady = game.rawState !== null;

  if (!resumeFromSave && (puzzleLoading || !gameReady)) {
    return (
      <div className={styles.screen}>
        <div className={styles.loadingWrap}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Generating your puzzle…</p>
        </div>
      </div>
    );
  }

  if (puzzleError) {
    return (
      <div className={styles.screen}>
        <div className={styles.loadingWrap}>
          <p className={styles.loadingText}>Failed to load puzzle. Please try again.</p>
          <button className={styles.iconBtn} onClick={onHome}>← Back</button>
        </div>
      </div>
    );
  }

  // ── From here down, game.board is guaranteed non-null ──────────────────────

  const hasSelectedCell = game.selectedCell !== null;
  const remainingCounts = getRemainingCounts(game.board);
  const hasProgress     = game.canUndo && !game.isComplete;
  const { hintsLeft, hintsAllowed } = game;

  const handleHomeClick = () => {
    if (hasProgress) { timer.pause(); setShowLeaveModal(true); }
    else onHome();
  };

  const handleSaveAndLeave = () => {
    if (game.rawState) saveGame(game.rawState, timer.elapsed);
    onHome();
  };

  const handleAbandon = () => {
    deleteSavedGame(difficulty);
    onAbandon(difficulty);
  };

  const handleResume = () => {
    setShowLeaveModal(false);
    timer.start();
  };

  const handleHint = () => {
    if (!hasSelectedCell && hintsLeft > 0) {
      if (!localStorage.getItem(HINT_TOAST_KEY)) {
        setShowHintToast(true);
        localStorage.setItem(HINT_TOAST_KEY, '1');
        clearTimeout(hintToastTimer.current);
        hintToastTimer.current = setTimeout(() => setShowHintToast(false), 4000);
      }
      return;
    }
    game.useHint();
  };

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
          {theme && <ThemeToggle theme={theme.theme} onToggle={theme.toggle} />}
          <button className={styles.iconBtn} onClick={timer.toggle} aria-label={timer.running ? 'Pause' : 'Resume'}>
            {timer.running
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
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
        onHint={handleHint}
        notesMode={game.notesMode}
        canUndo={game.canUndo}
        hintsLeft={hintsLeft}
        hintsAllowed={hintsAllowed}
        hasSelectedCell={hasSelectedCell}
        remainingCounts={remainingCounts}
      />

      {showHintToast && (
        <div className={styles.hintToast} onClick={() => setShowHintToast(false)}>
          👆 Select a cell first, then tap Hint to reveal it
        </div>
      )}

      {showLeaveModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Leave this puzzle?</h2>
            <p className={styles.modalBody}>You have a game in progress. What would you like to do?</p>
            <div className={styles.modalActions}>
              <button className={styles.modalBtnPrimary} onClick={handleSaveAndLeave}>Save &amp; leave</button>
              <button className={styles.modalBtnDanger} onClick={handleAbandon}>Abandon puzzle</button>
              <button className={styles.modalBtnSecondary} onClick={handleResume}>Keep playing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
