// generator.js
// Builds a random, valid Sudoku puzzle with a unique solution.
//
// THE THREE-STEP PROCESS:
//   Step 1 — Generate a fully solved board (all 81 cells filled, valid)
//   Step 2 — Shuffle it so every game looks different
//   Step 3 — Remove clues one by one, checking uniqueness after each removal
//
// The "uniqueness check" is what makes this correct but slightly slow —
// for each candidate removal we run a full solver. In practice it's fast
// enough for a browser (< 100ms), but this is why Sudoku apps often
// pre-generate puzzles on a server and cache them.

import { isValidPlacement } from './validator.js';
import { countSolutions } from './solver.js';

// ─── Difficulty settings ───────────────────────────────────────────────────────

// How many clues to REMOVE per difficulty.
// More removals = fewer given numbers = harder puzzle.
// These ranges are approximate — the uniqueness constraint sometimes means
// we can't remove as many as we'd like.
const DIFFICULTY_REMOVALS = {
  easy:   36, // ~45 clues remaining
  medium: 46, // ~35 clues remaining
  hard:   52, // ~29 clues remaining
  expert: 58, // ~23 clues remaining — very challenging
};

// ─── Step 1: Generate a fully solved board ────────────────────────────────────

/**
 * Creates a randomly filled, valid 9×9 Sudoku board.
 *
 * Strategy: use the backtracking solver, but shuffle the digit order
 * before trying each cell. This gives us a different valid board every time.
 *
 * @returns {number[][]}  A fully solved 9×9 board
 */
function generateSolvedBoard() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));

  function backtrack(pos) {
    if (pos === 81) return true;

    const r = Math.floor(pos / 9);
    const c = pos % 9;

    // Shuffle digits 1–9 so the board is different each time.
    // Without shuffling, the solver would always try 1 first and produce
    // the same "canonical" board.
    const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    for (const num of digits) {
      if (isValidPlacement(board, r, c, num)) {
        board[r][c] = num;
        if (backtrack(pos + 1)) return true;
        board[r][c] = 0;
      }
    }

    return false;
  }

  backtrack(0);
  return board;
}

// ─── Step 2: Shuffle helpers ──────────────────────────────────────────────────

/**
 * Fisher-Yates shuffle — mutates and returns the array.
 * This is the correct way to shuffle in JS (Math.random() sort is biased).
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Step 3: Remove clues ─────────────────────────────────────────────────────

/**
 * Takes a solved board and removes `targetRemovals` cells while guaranteeing
 * the puzzle still has exactly one solution.
 *
 * Algorithm:
 *   1. Build a shuffled list of all 81 positions
 *   2. For each position: remove the number, then count solutions
 *      - If still 1 solution → keep it removed ✓
 *      - If 0 or 2+ solutions → put the number back ✗
 *   3. Stop when we've removed `targetRemovals` cells OR exhausted all positions
 *
 * @param {number[][]} solvedBoard  - fully filled board (not mutated)
 * @param {number}     targetRemovals
 * @returns {number[][]}  puzzle board (0 = empty cell)
 */
function removeClues(solvedBoard, targetRemovals) {
  const puzzle = solvedBoard.map(row => [...row]); // deep copy
  let removed = 0;

  // Shuffle all positions so removals are random, not top-left to bottom-right
  const positions = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }
  shuffle(positions);

  for (const [r, c] of positions) {
    if (removed >= targetRemovals) break;

    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    // countSolutions stops at 2, so this is not as slow as it sounds
    if (countSolutions(puzzle) === 1) {
      removed++; // good — uniqueness preserved
    } else {
      puzzle[r][c] = backup; // revert — this removal breaks uniqueness
    }
  }

  return puzzle;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates a new Sudoku puzzle at the given difficulty.
 *
 * Returns both the puzzle (with empty cells) AND the solution (fully filled),
 * so the UI can show hints or reveal the answer without re-solving.
 *
 * @param {'easy'|'medium'|'hard'|'expert'} difficulty
 * @returns {{ puzzle: number[][], solution: number[][] }}
 */
export function generatePuzzle(difficulty = 'medium') {
  const targetRemovals = DIFFICULTY_REMOVALS[difficulty] ?? DIFFICULTY_REMOVALS.medium;

  const solution = generateSolvedBoard();          // Step 1 + 2
  const puzzle   = removeClues(solution, targetRemovals); // Step 3

  // Deep-freeze the solution so no component accidentally mutates it
  // (Object.freeze is shallow, so we freeze each row too)
  const frozenSolution = Object.freeze(solution.map(row => Object.freeze([...row])));

  return { puzzle, solution: frozenSolution };
}

/**
 * Returns the display name and clue-count range for a difficulty level.
 * Useful for the difficulty picker UI.
 *
 * @param {'easy'|'medium'|'hard'|'expert'} difficulty
 * @returns {{ label: string, cluesRange: string }}
 */
export function getDifficultyMeta(difficulty) {
  const meta = {
    easy:   { label: 'Easy',   cluesRange: '~45 clues' },
    medium: { label: 'Medium', cluesRange: '~35 clues' },
    hard:   { label: 'Hard',   cluesRange: '~29 clues' },
    expert: { label: 'Expert', cluesRange: '~23 clues' },
  };
  return meta[difficulty] ?? meta.medium;
}
