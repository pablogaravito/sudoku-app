import { useState, useEffect, useCallback } from 'react';
import { isSolved } from '../logic/validator';
import { getSolution } from '../logic/solver';

const HINTS_ALLOWED = { easy: 5, medium: 3, hard: 2, expert: 1, insane: 1 };
const SAVE_KEY = (diff) => `sudoku-saved-${diff}`;

// Always takes an external puzzle from the server.
// Falls back to resume from localStorage if resuming a saved game.
function createInitialState(difficulty = 'medium', externalPuzzle = null) {
  if (!externalPuzzle) {
    // Shouldn't happen — GameScreen waits for puzzle before calling this
    console.error('createInitialState called without a puzzle!');
    return null;
  }

  // Solve the puzzle client-side to support hints
  // This is safe — the server validates the final submission independently
  const solution = getSolution(externalPuzzle);
  const frozenSolution = solution
    ? Object.freeze(solution.map(r => Object.freeze([...r])))
    : null;

  return {
    puzzle:       externalPuzzle,
    solution:     frozenSolution,
    board:        externalPuzzle.map(r => [...r]),
    notes:        {},
    selectedCell: null,
    notesMode:    false,
    difficulty,
    isComplete:   false,
    moveHistory:  [],
    hintsUsed:    0,
    hintsAllowed: HINTS_ALLOWED[difficulty] ?? 3,
    elapsedAtSave: 0,
  };
}

// ─── Save / load helpers ──────────────────────────────────────────────────────

export function saveGame(state, elapsedSeconds) {
  try {
    const payload = {
      puzzle:       state.puzzle,
      solution:     state.solution.map(r => [...r]), // unfreeze for JSON
      board:        state.board,
      notes:        state.notes,
      difficulty:   state.difficulty,
      moveHistory:  state.moveHistory,
      hintsUsed:    state.hintsUsed,
      hintsAllowed: state.hintsAllowed,
      elapsed:      elapsedSeconds,
      savedAt:      Date.now(),
    };
    localStorage.setItem(SAVE_KEY(state.difficulty), JSON.stringify(payload));
  } catch {
    console.warn('Could not save game');
  }
}

export function loadSavedGame(difficulty) {
  try {
    const raw = localStorage.getItem(SAVE_KEY(difficulty));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function deleteSavedGame(difficulty) {
  localStorage.removeItem(SAVE_KEY(difficulty));
}

export function hasSavedGame(difficulty) {
  return !!localStorage.getItem(SAVE_KEY(difficulty));
}

function stateFromSave(save) {
  return {
    puzzle:       save.puzzle,
    solution:     Object.freeze(save.solution.map(r => Object.freeze([...r]))),
    board:        save.board,
    notes:        save.notes,
    selectedCell: null,
    notesMode:    false,
    difficulty:   save.difficulty,
    isComplete:   false,
    moveHistory:  save.moveHistory,
    hintsUsed:    save.hintsUsed,
    hintsAllowed: save.hintsAllowed,
    elapsedAtSave: save.elapsed,
  };
}

// ─── The hook ─────────────────────────────────────────────────────────────────

export function useSudokuGame(difficulty = 'medium', resumeFromSave = false, externalPuzzle = null) {
  const [state, setState] = useState(() => {
    if (resumeFromSave) {
      const save = loadSavedGame(difficulty);
      if (save) return stateFromSave(save);
    }
    // If no puzzle yet (still loading from server), return null
    // GameScreen will show loading spinner until puzzle arrives
    if (!resumeFromSave && !externalPuzzle) return null;
    return createInitialState(difficulty, externalPuzzle);
  });

  // When external puzzle arrives (after async fetch), initialise state
  useEffect(() => {
    if (externalPuzzle && !resumeFromSave && !state) {
      setState(createInitialState(difficulty, externalPuzzle));
    }
  }, [externalPuzzle]);

  const {
    puzzle, solution, board, notes,
    selectedCell, notesMode, isComplete, moveHistory,
    hintsUsed, hintsAllowed,
  } = state ?? {
    puzzle: null, solution: null, board: Array(9).fill(null).map(() => Array(9).fill(0)),
    notes: {}, selectedCell: null, notesMode: false, isComplete: false,
    moveHistory: [], hintsUsed: 0, hintsAllowed: 3,
  };

  // Safe difficulty/elapsedAtSave with fallbacks for null state
  const stateDifficulty   = state?.difficulty   ?? difficulty;
  const stateElapsedAtSave = state?.elapsedAtSave ?? 0;

  const newGame = useCallback((diff = difficulty, newPuzzle = null) => {
    deleteSavedGame(diff);
    if (newPuzzle) {
      setState(createInitialState(diff, newPuzzle));
    } else {
      // Reset state to null — GameScreen will fetch a new puzzle
      setState(null);
    }
  }, [difficulty]);

  const selectCell = useCallback((row, col) => {
    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        selectedCell: prev.selectedCell?.[0] === row && prev.selectedCell?.[1] === col
          ? null : [row, col],
      };
    });
  }, []);

  const placeNumber = useCallback((num) => {
    setState(prev => {
      if (!prev || !prev.selectedCell || prev.isComplete) return prev;
      const [r, c] = prev.selectedCell;
      if (prev.puzzle[r][c] !== 0) return prev;

      if (prev.notesMode) {
        const key = `${r},${c}`;
        const existing = prev.notes[key] ?? [];
        const newNotes = existing.includes(num)
          ? existing.filter(n => n !== num)
          : [...existing, num].sort();
        return { ...prev, notes: { ...prev.notes, [key]: newNotes } };
      }

      const newBoard = prev.board.map(row => [...row]);
      newBoard[r][c] = num;
      const newNotes = { ...prev.notes };
      delete newNotes[`${r},${c}`];
      const newHistory = [
        ...prev.moveHistory,
        { r, c, prevValue: prev.board[r][c], prevNotes: prev.notes[`${r},${c}`] ?? [] },
      ];
      return {
        ...prev,
        board: newBoard,
        notes: newNotes,
        moveHistory: newHistory,
        isComplete: isSolved(newBoard),
      };
    });
  }, []);

  const eraseCell = useCallback(() => {
    setState(prev => {
      if (!prev || !prev.selectedCell || prev.isComplete) return prev;
      const [r, c] = prev.selectedCell;
      if (prev.puzzle[r][c] !== 0) return prev;
      const newBoard = prev.board.map(row => [...row]);
      newBoard[r][c] = 0;
      const newNotes = { ...prev.notes };
      delete newNotes[`${r},${c}`];
      const newHistory = [
        ...prev.moveHistory,
        { r, c, prevValue: prev.board[r][c], prevNotes: prev.notes[`${r},${c}`] ?? [] },
      ];
      return { ...prev, board: newBoard, notes: newNotes, moveHistory: newHistory };
    });
  }, []);

  const undo = useCallback(() => {
    setState(prev => {
      if (!prev || prev.moveHistory.length === 0) return prev;
      const history = [...prev.moveHistory];
      const { r, c, prevValue, prevNotes } = history.pop();
      const newBoard = prev.board.map(row => [...row]);
      newBoard[r][c] = prevValue;
      const newNotes = { ...prev.notes };
      if (prevNotes.length > 0) newNotes[`${r},${c}`] = prevNotes;
      else delete newNotes[`${r},${c}`];
      return {
        ...prev,
        board: newBoard,
        notes: newNotes,
        moveHistory: history,
        isComplete: false,
        selectedCell: [r, c],
      };
    });
  }, []);

  const toggleNotesMode = useCallback(() => {
    setState(prev => prev ? { ...prev, notesMode: !prev.notesMode } : prev);
  }, []);

  const useHint = useCallback(() => {
    setState(prev => {
      if (!prev || !prev.selectedCell || prev.isComplete) return prev;
      if (prev.hintsUsed >= prev.hintsAllowed) return prev; // no hints left
      const [r, c] = prev.selectedCell;
      if (prev.puzzle[r][c] !== 0) return prev;
      // Don't use a hint if the cell already has the correct value
      if (prev.board[r][c] === prev.solution[r][c]) return prev;

      const newBoard = prev.board.map(row => [...row]);
      newBoard[r][c] = prev.solution[r][c];
      const newNotes = { ...prev.notes };
      delete newNotes[`${r},${c}`];

      return {
        ...prev,
        board: newBoard,
        notes: newNotes,
        hintsUsed: prev.hintsUsed + 1,
        isComplete: isSolved(newBoard),
        puzzle: prev.puzzle.map((row, ri) =>
          ri === r ? row.map((v, ci) => (ci === c ? prev.solution[r][c] : v)) : row
        ),
      };
    });
  }, []);

  // Keyboard handler
  useEffect(() => {
    function handleKeyDown(e) {
      if (isComplete) return;
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault(); placeNumber(parseInt(e.key)); return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault(); eraseCell(); return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault(); undo(); return;
      }
      if (!state?.selectedCell) return;
      const [r, c] = state.selectedCell;
      const moves = { ArrowUp:[r-1,c], ArrowDown:[r+1,c], ArrowLeft:[r,c-1], ArrowRight:[r,c+1] };
      if (moves[e.key]) {
        e.preventDefault();
        const [nr, nc] = moves[e.key];
        if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) selectCell(nr, nc);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state?.selectedCell, notesMode, isComplete, placeNumber, eraseCell, undo, selectCell]);

  return {
    board, puzzle, solution, notes, selectedCell,
    notesMode, isComplete, difficulty: stateDifficulty,
    canUndo: moveHistory.length > 0,
    hintsUsed, hintsAllowed,
    hintsLeft: hintsAllowed - hintsUsed,
    elapsedAtSave: stateElapsedAtSave,
    rawState: state,
    newGame, selectCell, placeNumber, eraseCell, undo, toggleNotesMode, useHint,
  };
}
