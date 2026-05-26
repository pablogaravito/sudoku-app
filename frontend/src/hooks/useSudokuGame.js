// useSudokuGame.js
//
// REACT CONCEPT: Custom Hooks
//
// A custom hook is just a plain JavaScript function whose name starts with
// "use" and which calls other React hooks (useState, useEffect, etc.).
//
// WHY EXTRACT LOGIC INTO A HOOK?
// We COULD put all this state and logic directly in GameScreen.jsx.
// But then GameScreen would be 300+ lines of mixed concerns: state, side
// effects, event handlers, AND layout JSX all tangled together.
//
// By extracting into useSudokuGame, we get:
//   - GameScreen stays clean: it just calls the hook and renders
//   - This hook is independently readable and testable
//   - Easy to reuse (e.g., if you add a "daily puzzle" screen later)
//
// RULE: If you find yourself writing more than ~3 useState calls in a
// component, it's a signal to consider a custom hook.

import { useState, useEffect, useCallback } from 'react';
import { generatePuzzle } from '../logic/generator';
import { isSolved } from '../logic/validator';

// ─── Initial state factory ────────────────────────────────────────────────────
// A function that returns a fresh game state object.
// We use a factory function (not a plain object) so every new game gets its
// own independent copy — no shared references between games.

function createInitialState(difficulty = 'medium') {
  const { puzzle, solution } = generatePuzzle(difficulty);
  return {
    puzzle,                         // original clues (never changes)
    solution,                       // full solution (for hints/reveal)
    board: puzzle.map(r => [...r]), // player's working board (mutable copy)
    notes: {},                      // { "r,c": [1,3,7] } pencil marks
    selectedCell: null,             // [row, col] or null
    notesMode: false,               // toggle: place number vs pencil mark
    difficulty,
    isComplete: false,
    moveHistory: [],                // stack of moves for undo
  };
}

// ─── The hook ─────────────────────────────────────────────────────────────────

export function useSudokuGame(difficulty = 'medium') {
  const [state, setState] = useState(() => createInitialState(difficulty));

  // Destructure for convenience — these are what components will use
  const {
    puzzle, solution, board, notes,
    selectedCell, notesMode, isComplete, moveHistory,
  } = state;

  // ── Start a new game ───────────────────────────────────────────────────────
  // useCallback memoizes the function reference.
  // Without it, `newGame` would be a new function object on every render,
  // causing any component that receives it as a prop to re-render needlessly.
  const newGame = useCallback((diff = difficulty) => {
    setState(createInitialState(diff));
  }, [difficulty]);

  // ── Select a cell ──────────────────────────────────────────────────────────
  const selectCell = useCallback((row, col) => {
    setState(prev => ({
      ...prev,
      // Clicking the already-selected cell deselects it
      selectedCell: prev.selectedCell?.[0] === row && prev.selectedCell?.[1] === col
        ? null
        : [row, col],
    }));
  }, []);

  // ── Place a number ─────────────────────────────────────────────────────────
  const placeNumber = useCallback((num) => {
    setState(prev => {
      if (!prev.selectedCell || prev.isComplete) return prev;
      const [r, c] = prev.selectedCell;

      // Can't modify given (locked) cells
      if (prev.puzzle[r][c] !== 0) return prev;

      // ── Notes mode: toggle a pencil mark ────────────────────────────────
      if (prev.notesMode) {
        const key = `${r},${c}`;
        const existing = prev.notes[key] ?? [];
        const newNotes = existing.includes(num)
          ? existing.filter(n => n !== num)   // already there → remove
          : [...existing, num].sort();          // not there → add (keep sorted)
        return {
          ...prev,
          notes: { ...prev.notes, [key]: newNotes },
        };
      }

      // ── Normal mode: place the number ───────────────────────────────────
      const newBoard = prev.board.map(row => [...row]);
      newBoard[r][c] = num;

      // Clear any notes from this cell when a number is placed
      const newNotes = { ...prev.notes };
      delete newNotes[`${r},${c}`];

      // Push to undo history
      // We store enough info to reverse the move
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

  // ── Erase a cell ───────────────────────────────────────────────────────────
  const eraseCell = useCallback(() => {
    setState(prev => {
      if (!prev.selectedCell || prev.isComplete) return prev;
      const [r, c] = prev.selectedCell;
      if (prev.puzzle[r][c] !== 0) return prev; // can't erase givens

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

  // ── Undo ───────────────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    setState(prev => {
      if (prev.moveHistory.length === 0) return prev;

      const history = [...prev.moveHistory];
      const lastMove = history.pop(); // take the most recent move off the stack
      const { r, c, prevValue, prevNotes } = lastMove;

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
        isComplete: false, // can't be complete if we just undid a move
        selectedCell: [r, c], // jump back to the undone cell
      };
    });
  }, []);

  // ── Toggle notes mode ──────────────────────────────────────────────────────
  const toggleNotesMode = useCallback(() => {
    setState(prev => ({ ...prev, notesMode: !prev.notesMode }));
  }, []);

  // ── Hint: reveal one cell ──────────────────────────────────────────────────
  const useHint = useCallback(() => {
    setState(prev => {
      if (!prev.selectedCell || prev.isComplete) return prev;
      const [r, c] = prev.selectedCell;
      if (prev.puzzle[r][c] !== 0) return prev; // already a given

      const newBoard = prev.board.map(row => [...row]);
      newBoard[r][c] = prev.solution[r][c]; // reveal from solution

      const newNotes = { ...prev.notes };
      delete newNotes[`${r},${c}`];

      return {
        ...prev,
        board: newBoard,
        notes: newNotes,
        isComplete: isSolved(newBoard),
        // Mark this cell as "given" so it can't be edited
        // We do this by adding it to the puzzle grid
        puzzle: prev.puzzle.map((row, ri) =>
          ri === r ? row.map((v, ci) => (ci === c ? prev.solution[r][c] : v)) : row
        ),
      };
    });
  }, []);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  // REACT CONCEPT: useEffect for side effects
  //
  // Attaching a keydown listener is a "side effect" — it reaches outside React's
  // render cycle and touches the DOM directly. useEffect is the right place for
  // this. The cleanup function (return () => ...) removes the listener when the
  // component unmounts, preventing memory leaks.
  //
  // The dependency array [state.selectedCell, notesMode, isComplete] means this
  // effect re-runs only when those values change. Without the dependency array,
  // it would re-run on every render (wasteful). With [], it would only run once
  // on mount (and the handler would "capture" stale state via closure).

  useEffect(() => {
    function handleKeyDown(e) {
      if (isComplete) return;

      // Number keys 1–9
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        placeNumber(parseInt(e.key));
        return;
      }

      // Erase
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        eraseCell();
        return;
      }

      // Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        undo();
        return;
      }

      // Arrow key navigation between cells
      if (!state.selectedCell) return;
      const [r, c] = state.selectedCell;
      const moves = {
        ArrowUp:    [r - 1, c],
        ArrowDown:  [r + 1, c],
        ArrowLeft:  [r, c - 1],
        ArrowRight: [r, c + 1],
      };
      if (moves[e.key]) {
        e.preventDefault();
        const [nr, nc] = moves[e.key];
        if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
          selectCell(nr, nc);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedCell, notesMode, isComplete, placeNumber, eraseCell, undo, selectCell]);

  // ── Return everything the UI needs ────────────────────────────────────────
  // We expose state values + action functions as a flat object.
  // Components destructure only what they need.
  return {
    // State
    board,
    puzzle,
    solution,
    notes,
    selectedCell,
    notesMode,
    isComplete,
    difficulty: state.difficulty,
    canUndo: moveHistory.length > 0,
    // Actions
    newGame,
    selectCell,
    placeNumber,
    eraseCell,
    undo,
    toggleNotesMode,
    useHint,
  };
}
