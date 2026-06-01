// logicSolver.js
//
// A "human-style" solver that only uses logic techniques, no backtracking.
// Used during puzzle generation to classify difficulty and guarantee that
// easy/medium/hard puzzles don't require advanced techniques.
//
// TECHNIQUES IMPLEMENTED (in order of complexity):
//   1. Naked singles  — a cell has only one possible digit
//   2. Hidden singles — a digit can only go in one place in a row/col/box
//
// If the puzzle can be fully solved using only these two techniques,
// it's considered "logic-solvable" and suitable for easy/medium/hard.
// If we get stuck, it needs advanced techniques (expert/insane territory).
//
// WHY ONLY THESE TWO?
// These are the techniques a beginner-to-intermediate player actually uses.
// Adding more (naked pairs, X-wings etc.) would make the filter too loose —
// we want to guarantee the player can solve it with straightforward logic.

// ─── Candidate tracking ───────────────────────────────────────────────────────

/**
 * Build a 9x9 grid of candidate sets — for each empty cell, which digits
 * are still possible given the current board state?
 *
 * @param {number[][]} board
 * @returns {Set<number>[][]}  candidates[r][c] = Set of possible digits
 */
function buildCandidates(board) {
  const candidates = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])),
  );

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) continue;

      const val = board[r][c];
      // Remove this digit from all peers
      for (let i = 0; i < 9; i++) {
        candidates[r][i].delete(val); // same row
        candidates[i][c].delete(val); // same col
      }
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++) candidates[br + dr][bc + dc].delete(val); // same box

      // Filled cell has no candidates
      candidates[r][c] = new Set();
    }
  }

  return candidates;
}

// ─── Technique 1: Naked singles ───────────────────────────────────────────────

/**
 * Find all cells where only one digit is possible.
 * Returns true if any placement was made (so caller can loop).
 */
function applyNakedSingles(board, candidates) {
  let progress = false;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      if (candidates[r][c].size === 1) {
        const val = [...candidates[r][c]][0];
        board[r][c] = val;
        // Remove from peers
        for (let i = 0; i < 9; i++) {
          candidates[r][i].delete(val);
          candidates[i][c].delete(val);
        }
        const br = Math.floor(r / 3) * 3;
        const bc = Math.floor(c / 3) * 3;
        for (let dr = 0; dr < 3; dr++)
          for (let dc = 0; dc < 3; dc++)
            candidates[br + dr][bc + dc].delete(val);
        candidates[r][c] = new Set();
        progress = true;
      }
    }
  }
  return progress;
}

// ─── Technique 2: Hidden singles ─────────────────────────────────────────────

/**
 * Find digits that can only go in one cell within a row, column, or box.
 * Returns true if any placement was made.
 */
function applyHiddenSingles(board, candidates) {
  let progress = false;

  // Check rows
  for (let r = 0; r < 9; r++) {
    for (let digit = 1; digit <= 9; digit++) {
      const positions = [];
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0 && candidates[r][c].has(digit))
          positions.push([r, c]);
      }
      if (positions.length === 1) {
        const [pr, pc] = positions[0];
        board[pr][pc] = digit;
        for (let i = 0; i < 9; i++) {
          candidates[pr][i].delete(digit);
          candidates[i][pc].delete(digit);
        }
        const br = Math.floor(pr / 3) * 3;
        const bc = Math.floor(pc / 3) * 3;
        for (let dr = 0; dr < 3; dr++)
          for (let dc = 0; dc < 3; dc++)
            candidates[br + dr][bc + dc].delete(digit);
        candidates[pr][pc] = new Set();
        progress = true;
      }
    }
  }

  // Check columns
  for (let c = 0; c < 9; c++) {
    for (let digit = 1; digit <= 9; digit++) {
      const positions = [];
      for (let r = 0; r < 9; r++) {
        if (board[r][c] === 0 && candidates[r][c].has(digit))
          positions.push([r, c]);
      }
      if (positions.length === 1) {
        const [pr, pc] = positions[0];
        if (board[pr][pc] !== 0) continue; // already filled by row pass
        board[pr][pc] = digit;
        for (let i = 0; i < 9; i++) {
          candidates[pr][i].delete(digit);
          candidates[i][pc].delete(digit);
        }
        const br = Math.floor(pr / 3) * 3;
        const bc = Math.floor(pc / 3) * 3;
        for (let dr = 0; dr < 3; dr++)
          for (let dc = 0; dc < 3; dc++)
            candidates[br + dr][bc + dc].delete(digit);
        candidates[pr][pc] = new Set();
        progress = true;
      }
    }
  }

  // Check 3×3 boxes
  for (let boxR = 0; boxR < 3; boxR++) {
    for (let boxC = 0; boxC < 3; boxC++) {
      for (let digit = 1; digit <= 9; digit++) {
        const positions = [];
        for (let dr = 0; dr < 3; dr++) {
          for (let dc = 0; dc < 3; dc++) {
            const r = boxR * 3 + dr;
            const c = boxC * 3 + dc;
            if (board[r][c] === 0 && candidates[r][c].has(digit))
              positions.push([r, c]);
          }
        }
        if (positions.length === 1) {
          const [pr, pc] = positions[0];
          if (board[pr][pc] !== 0) continue;
          board[pr][pc] = digit;
          for (let i = 0; i < 9; i++) {
            candidates[pr][i].delete(digit);
            candidates[i][pc].delete(digit);
          }
          const br = Math.floor(pr / 3) * 3;
          const bc = Math.floor(pc / 3) * 3;
          for (let dr = 0; dr < 3; dr++)
            for (let dc = 0; dc < 3; dc++)
              candidates[br + dr][bc + dc].delete(digit);
          candidates[pr][pc] = new Set();
          progress = true;
        }
      }
    }
  }

  return progress;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Try to solve the puzzle using only naked singles and hidden singles.
 * Returns how many cells remain unsolved — 0 means fully solvable by logic.
 *
 * Does NOT mutate the input board.
 *
 * @param {number[][]} puzzle
 * @returns {number}  cells remaining (0 = logic-solvable)
 */
export function countUnsolvedByLogic(puzzle) {
  const board = puzzle.map((r) => [...r]); // work on a copy
  const candidates = buildCandidates(board);

  // Keep applying techniques until no more progress
  let progress = true;
  while (progress) {
    progress =
      applyNakedSingles(board, candidates) ||
      applyHiddenSingles(board, candidates);
  }

  // Count remaining empty cells
  return board.flat().filter((v) => v === 0).length;
}

/**
 * Returns true if the puzzle is fully solvable using only basic logic.
 * Use this to filter puzzles for easy/medium/hard difficulties.
 *
 * @param {number[][]} puzzle
 * @returns {boolean}
 */
export function isLogicSolvable(puzzle) {
  return countUnsolvedByLogic(puzzle) === 0;
}
