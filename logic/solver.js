// solver.js
// A backtracking solver — the engine behind both puzzle generation and
// uniqueness checking. Understanding this algorithm is key to the whole app.
//
// HOW BACKTRACKING WORKS (think of it like a depth-first search):
//   1. Find the next empty cell
//   2. Try digits 1–9 in that cell
//   3. If a digit is valid, move to the next empty cell (recurse)
//   4. If we reach a dead end (no valid digit), "backtrack" — undo the last
//      placement and try the next digit in the previous cell
//   5. If we fill all 81 cells successfully, we found a solution
//
// Time complexity: worst case O(9^81), but Sudoku's constraints prune the
// search space dramatically — in practice it's very fast.

import { isValidPlacement } from './validator.js';

// ─── Core solver ───────────────────────────────────────────────────────────────

/**
 * Solves a Sudoku board IN PLACE using backtracking.
 * Returns true if a solution was found, false if the puzzle is unsolvable.
 *
 * We mutate the board directly (rather than copying) for performance.
 * The generator always passes a copy, so this is safe.
 *
 * @param {number[][]} board  - 9×9 grid, 0 = empty. MUTATED in place.
 * @returns {boolean}
 */
export function solve(board) {
  // Find the next empty cell (scanning left→right, top→bottom)
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue; // skip filled cells

      // Try each digit
      for (let num = 1; num <= 9; num++) {
        if (isValidPlacement(board, r, c, num)) {
          board[r][c] = num;           // tentative placement

          if (solve(board)) return true; // recurse — if this path leads to a
                                         // solution, bubble up true

          board[r][c] = 0;             // backtrack — this digit didn't work
        }
      }

      // No digit worked for this cell → the path is unsolvable, backtrack further
      return false;
    }
  }

  // We scanned all 81 cells without finding an empty one → fully solved!
  return true;
}

// ─── Uniqueness check ──────────────────────────────────────────────────────────

/**
 * Counts how many solutions a puzzle has, up to `limit`.
 * We stop early once we hit the limit — no need to find ALL solutions.
 *
 * Used by the generator with limit=2:
 *   - countSolutions(board) === 1  → unique solution, safe to use as puzzle
 *   - countSolutions(board) === 2  → multiple solutions, don't remove that clue
 *
 * Why not just call solve() twice? Because solve() mutates the board and stops
 * at the first solution — we'd need more bookkeeping. This function is cleaner.
 *
 * @param {number[][]} board  - 9×9 grid (not mutated — we work on a copy internally)
 * @param {number}     limit  - stop counting after this many solutions (default 2)
 * @returns {number}          - number of solutions found (capped at `limit`)
 */
export function countSolutions(board, limit = 2) {
  // Work on a deep copy so we don't mutate the caller's board
  const copy = board.map(row => [...row]);
  let count = 0;

  function backtrack(pos) {
    // Early exit — no need to keep searching once we hit the limit
    if (count >= limit) return;

    // pos encodes row and col as a single number (0–80)
    // pos = row * 9 + col  →  row = floor(pos/9), col = pos%9
    if (pos === 81) {
      count++;
      return;
    }

    const r = Math.floor(pos / 9);
    const c = pos % 9;

    if (copy[r][c] !== 0) {
      backtrack(pos + 1); // cell already filled, skip to the next
      return;
    }

    for (let num = 1; num <= 9; num++) {
      if (isValidPlacement(copy, r, c, num)) {
        copy[r][c] = num;
        backtrack(pos + 1);
        copy[r][c] = 0;
      }
    }
  }

  backtrack(0);
  return count;
}

/**
 * Returns a solved copy of the given board, or null if unsolvable.
 * Non-mutating wrapper around solve() for convenience.
 *
 * @param {number[][]} board
 * @returns {number[][]|null}
 */
export function getSolution(board) {
  const copy = board.map(row => [...row]);
  return solve(copy) ? copy : null;
}
