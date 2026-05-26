// validator.js
// Pure functions — no React, no side effects, easy to unit test.
// Every function takes a board (9x9 array of numbers, 0 = empty) and
// returns information about whether the current state is valid.

// ─── Core check ────────────────────────────────────────────────────────────────

/**
 * Can we place `num` at board[row][col]?
 * Checks the three Sudoku constraints: row, column, and 3×3 box.
 *
 * @param {number[][]} board  - 9x9 grid, 0 means empty
 * @param {number}     row    - 0–8
 * @param {number}     col    - 0–8
 * @param {number}     num    - 1–9
 * @returns {boolean}
 */
export function isValidPlacement(board, row, col, num) {
  // Check row — no other cell in this row already has `num`
  for (let c = 0; c < 9; c++) {
    if (c !== col && board[row][c] === num) return false;
  }

  // Check column — no other cell in this column already has `num`
  for (let r = 0; r < 9; r++) {
    if (r !== row && board[r][col] === num) return false;
  }

  // Check 3×3 box — find the top-left corner of our box, then scan it
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if ((r !== row || c !== col) && board[r][c] === num) return false;
    }
  }

  return true;
}

// ─── Conflict detection (for highlighting the UI) ──────────────────────────────

/**
 * Returns a Set of "r,c" strings for every cell that conflicts with board[row][col].
 * Used by the UI to highlight cells red when the player makes an invalid move.
 *
 * Note: we return a Set of strings instead of arrays because checking
 * `conflictSet.has("3,5")` in a render loop is O(1) — fast.
 *
 * @param {number[][]} board
 * @param {number}     row
 * @param {number}     col
 * @returns {Set<string>}  e.g. Set { "0,2", "4,2" }
 */
export function getConflictingCells(board, row, col) {
  const num = board[row][col];
  const conflicts = new Set();

  if (num === 0) return conflicts; // empty cell, nothing to conflict with

  // Scan row
  for (let c = 0; c < 9; c++) {
    if (c !== col && board[row][c] === num) {
      conflicts.add(`${row},${c}`);
    }
  }

  // Scan column
  for (let r = 0; r < 9; r++) {
    if (r !== row && board[r][col] === num) {
      conflicts.add(`${r},${col}`);
    }
  }

  // Scan 3×3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if ((r !== row || c !== col) && board[r][c] === num) {
        conflicts.add(`${r},${c}`);
      }
    }
  }

  return conflicts;
}

/**
 * Scans the full board and returns ALL conflicting cell pairs.
 * Useful for validating a board state after loading from localStorage.
 *
 * @param {number[][]} board
 * @returns {Set<string>}  Set of "r,c" strings for every cell in a conflict
 */
export function getAllConflicts(board) {
  const allConflicts = new Set();

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) {
        // Temporarily get conflicts for this cell and merge into allConflicts
        const cellConflicts = getConflictingCells(board, r, c);
        if (cellConflicts.size > 0) {
          allConflicts.add(`${r},${c}`);
          cellConflicts.forEach(k => allConflicts.add(k));
        }
      }
    }
  }

  return allConflicts;
}

// ─── Win detection ─────────────────────────────────────────────────────────────

/**
 * Is the puzzle completely and correctly solved?
 * A board is solved when: every cell is filled AND there are no conflicts.
 *
 * @param {number[][]} board
 * @returns {boolean}
 */
export function isSolved(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) return false;               // still empty cells
      if (!isValidPlacement(board, r, c, board[r][c])) return false; // conflict
    }
  }
  return true;
}

// ─── Utility ───────────────────────────────────────────────────────────────────

/**
 * Returns the index (0–8) of the 3×3 box that cell (row, col) belongs to.
 * Box layout:
 *   0 1 2
 *   3 4 5
 *   6 7 8
 *
 * Useful in components for visual box-border styling.
 *
 * @param {number} row
 * @param {number} col
 * @returns {number}
 */
export function getBoxIndex(row, col) {
  return Math.floor(row / 3) * 3 + Math.floor(col / 3);
}
