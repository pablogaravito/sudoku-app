// logicSolver.js
//
// A human-technique solver that classifies puzzle difficulty by tracking
// WHICH techniques are needed to solve it.
//
// TECHNIQUE LADDER (each level includes all previous):
//   1. Naked singles   — cell has only one candidate
//   2. Hidden singles  — digit can only go in one cell in a unit
//   3. Naked pairs     — two cells in a unit share exactly the same two candidates
//   4. Hidden pairs    — two digits in a unit appear only in the same two cells
//   5. Naked triples   — three cells share a combined set of three candidates
//   6. Pointing pairs  — candidates in a box restricted to one row/col eliminates from that row/col
//   7. X-Wing          — a digit appearing in exactly 2 cells in 2 rows forms a rectangle
//   8. XY-Wing         — three cells forming a chain that eliminates candidates
//   9. Forcing chains  — bifurcation / trial and error (last resort)
//
// DIFFICULTY MAPPING:
//   Easy   → levels 1-2   (naked + hidden singles)
//   Medium → levels 1-4   (+ naked/hidden pairs)
//   Hard   → levels 1-6   (+ naked triples + pointing pairs)
//   Expert → levels 1-8   (+ X-Wing + XY-Wing)
//   Insane → level 9      (requires forcing chains)

// ─── Candidate grid management ───────────────────────────────────────────────

function buildCandidates(board) {
  const candidates = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set([1,2,3,4,5,6,7,8,9]))
  );
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) {
        const val = board[r][c];
        candidates[r][c] = new Set();
        _eliminateFromPeers(candidates, r, c, val);
      }
    }
  }
  return candidates;
}

function _eliminateFromPeers(candidates, r, c, val) {
  for (let i = 0; i < 9; i++) {
    candidates[r][i].delete(val);
    candidates[i][c].delete(val);
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++)
      candidates[br+dr][bc+dc].delete(val);
}

function placeDigit(board, candidates, r, c, val) {
  board[r][c] = val;
  candidates[r][c] = new Set();
  _eliminateFromPeers(candidates, r, c, val);
}

// ─── Unit helpers ─────────────────────────────────────────────────────────────

// Returns array of [r,c] pairs for each unit type
function getRowCells(r)    { return Array.from({length:9}, (_,c) => [r,c]); }
function getColCells(c)    { return Array.from({length:9}, (_,r) => [r,c]); }
function getBoxCells(r,c) {
  const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
  const cells = [];
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++)
      cells.push([br+dr, bc+dc]);
  return cells;
}
function getAllUnits() {
  const units = [];
  for (let i = 0; i < 9; i++) {
    units.push(getRowCells(i));
    units.push(getColCells(i));
  }
  for (let br = 0; br < 3; br++)
    for (let bc = 0; bc < 3; bc++)
      units.push(getBoxCells(br*3, bc*3));
  return units;
}

// ─── Technique 1: Naked singles ──────────────────────────────────────────────

function applyNakedSingles(board, candidates) {
  let progress = false;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0 && candidates[r][c].size === 1) {
        placeDigit(board, candidates, r, c, [...candidates[r][c]][0]);
        progress = true;
      }
    }
  }
  return progress;
}

// ─── Technique 2: Hidden singles ─────────────────────────────────────────────

function applyHiddenSingles(board, candidates) {
  let progress = false;
  for (const unit of getAllUnits()) {
    for (let digit = 1; digit <= 9; digit++) {
      const positions = unit.filter(([r,c]) =>
        board[r][c] === 0 && candidates[r][c].has(digit)
      );
      if (positions.length === 1) {
        const [r,c] = positions[0];
        if (board[r][c] === 0) {
          placeDigit(board, candidates, r, c, digit);
          progress = true;
        }
      }
    }
  }
  return progress;
}

// ─── Technique 3: Naked pairs ────────────────────────────────────────────────
// Two cells in a unit with identical 2-candidate sets → eliminate those
// candidates from all other cells in the unit.

function applyNakedPairs(board, candidates) {
  let progress = false;
  for (const unit of getAllUnits()) {
    const emptyCells = unit.filter(([r,c]) => board[r][c] === 0);
    for (let i = 0; i < emptyCells.length; i++) {
      const [r1,c1] = emptyCells[i];
      if (candidates[r1][c1].size !== 2) continue;
      for (let j = i+1; j < emptyCells.length; j++) {
        const [r2,c2] = emptyCells[j];
        if (candidates[r2][c2].size !== 2) continue;
        // Check if they're identical
        const s1 = [...candidates[r1][c1]].sort().join();
        const s2 = [...candidates[r2][c2]].sort().join();
        if (s1 !== s2) continue;
        // Eliminate these two digits from other cells in the unit
        const pairDigits = candidates[r1][c1];
        for (const [r,c] of emptyCells) {
          if ((r === r1 && c === c1) || (r === r2 && c === c2)) continue;
          for (const d of pairDigits) {
            if (candidates[r][c].delete(d)) progress = true;
          }
        }
      }
    }
  }
  return progress;
}

// ─── Technique 4: Hidden pairs ───────────────────────────────────────────────
// Two digits in a unit that appear only in the same two cells → remove all
// other candidates from those two cells.

function applyHiddenPairs(board, candidates) {
  let progress = false;
  for (const unit of getAllUnits()) {
    const emptyCells = unit.filter(([r,c]) => board[r][c] === 0);
    // For each pair of digits, find which cells contain them
    for (let d1 = 1; d1 <= 8; d1++) {
      for (let d2 = d1+1; d2 <= 9; d2++) {
        const cells1 = emptyCells.filter(([r,c]) => candidates[r][c].has(d1));
        const cells2 = emptyCells.filter(([r,c]) => candidates[r][c].has(d2));
        if (cells1.length !== 2 || cells2.length !== 2) continue;
        // Same two cells?
        const key1 = cells1.map(([r,c]) => `${r},${c}`).sort().join('|');
        const key2 = cells2.map(([r,c]) => `${r},${c}`).sort().join('|');
        if (key1 !== key2) continue;
        // Remove all other candidates from these two cells
        for (const [r,c] of cells1) {
          for (const d of [...candidates[r][c]]) {
            if (d !== d1 && d !== d2) {
              candidates[r][c].delete(d);
              progress = true;
            }
          }
        }
      }
    }
  }
  return progress;
}

// ─── Technique 5: Naked triples ──────────────────────────────────────────────
// Three cells in a unit whose combined candidates form a set of exactly 3
// digits → eliminate those 3 digits from all other cells in the unit.

function applyNakedTriples(board, candidates) {
  let progress = false;
  for (const unit of getAllUnits()) {
    const emptyCells = unit.filter(([r,c]) =>
      board[r][c] === 0 && candidates[r][c].size >= 2 && candidates[r][c].size <= 3
    );
    for (let i = 0; i < emptyCells.length - 2; i++) {
      for (let j = i+1; j < emptyCells.length - 1; j++) {
        for (let k = j+1; k < emptyCells.length; k++) {
          const [r1,c1] = emptyCells[i];
          const [r2,c2] = emptyCells[j];
          const [r3,c3] = emptyCells[k];
          const combined = new Set([
            ...candidates[r1][c1],
            ...candidates[r2][c2],
            ...candidates[r3][c3],
          ]);
          if (combined.size !== 3) continue;
          // Eliminate these digits from all other cells in the unit
          const allEmpty = unit.filter(([r,c]) => board[r][c] === 0);
          for (const [r,c] of allEmpty) {
            if ((r===r1&&c===c1)||(r===r2&&c===c2)||(r===r3&&c===c3)) continue;
            for (const d of combined) {
              if (candidates[r][c].delete(d)) progress = true;
            }
          }
        }
      }
    }
  }
  return progress;
}

// ─── Technique 6: Pointing pairs/triples ─────────────────────────────────────
// If all candidates for a digit in a box lie in one row or column, eliminate
// that digit from the rest of that row or column outside the box.

function applyPointingPairs(board, candidates) {
  let progress = false;
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const boxCells = getBoxCells(br*3, bc*3);
      for (let digit = 1; digit <= 9; digit++) {
        const positions = boxCells.filter(([r,c]) =>
          board[r][c] === 0 && candidates[r][c].has(digit)
        );
        if (positions.length < 2 || positions.length > 3) continue;
        // Check if all in same row
        const rows = [...new Set(positions.map(([r]) => r))];
        if (rows.length === 1) {
          const row = rows[0];
          for (let c = 0; c < 9; c++) {
            if (Math.floor(c/3) === bc) continue; // same box, skip
            if (candidates[row][c].delete(digit)) progress = true;
          }
        }
        // Check if all in same col
        const cols = [...new Set(positions.map(([,c]) => c))];
        if (cols.length === 1) {
          const col = cols[0];
          for (let r = 0; r < 9; r++) {
            if (Math.floor(r/3) === br) continue; // same box, skip
            if (candidates[r][col].delete(digit)) progress = true;
          }
        }
      }
    }
  }
  return progress;
}

// ─── Technique 7: X-Wing ─────────────────────────────────────────────────────
// If a digit appears in exactly 2 cells in each of 2 rows, and those cells
// share the same 2 columns → eliminate that digit from all other cells in
// those 2 columns (and vice versa for columns).

function applyXWing(board, candidates) {
  let progress = false;
  for (let digit = 1; digit <= 9; digit++) {
    // Check rows
    const rowPositions = [];
    for (let r = 0; r < 9; r++) {
      const cols = [];
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0 && candidates[r][c].has(digit)) cols.push(c);
      }
      if (cols.length === 2) rowPositions.push({ r, cols });
    }
    for (let i = 0; i < rowPositions.length - 1; i++) {
      for (let j = i+1; j < rowPositions.length; j++) {
        const a = rowPositions[i], b = rowPositions[j];
        if (a.cols[0] !== b.cols[0] || a.cols[1] !== b.cols[1]) continue;
        // X-Wing found — eliminate from columns
        for (const col of a.cols) {
          for (let r = 0; r < 9; r++) {
            if (r === a.r || r === b.r) continue;
            if (candidates[r][col].delete(digit)) progress = true;
          }
        }
      }
    }
    // Check columns
    const colPositions = [];
    for (let c = 0; c < 9; c++) {
      const rows = [];
      for (let r = 0; r < 9; r++) {
        if (board[r][c] === 0 && candidates[r][c].has(digit)) rows.push(r);
      }
      if (rows.length === 2) colPositions.push({ c, rows });
    }
    for (let i = 0; i < colPositions.length - 1; i++) {
      for (let j = i+1; j < colPositions.length; j++) {
        const a = colPositions[i], b = colPositions[j];
        if (a.rows[0] !== b.rows[0] || a.rows[1] !== b.rows[1]) continue;
        for (const row of a.rows) {
          for (let c = 0; c < 9; c++) {
            if (c === a.c || c === b.c) continue;
            if (candidates[row][c].delete(digit)) progress = true;
          }
        }
      }
    }
  }
  return progress;
}

// ─── Technique 8: XY-Wing ────────────────────────────────────────────────────
// Three cells: pivot (has candidates XY), pincer1 (XZ), pincer2 (YZ).
// Pivot sees both pincers. Any cell that sees BOTH pincers cannot contain Z.

function _sharesPeer(r1, c1, r2, c2) {
  return r1 === r2 || c1 === c2 ||
    (Math.floor(r1/3) === Math.floor(r2/3) && Math.floor(c1/3) === Math.floor(c2/3));
}

function applyXYWing(board, candidates) {
  let progress = false;
  const bivalue = []; // cells with exactly 2 candidates
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (board[r][c] === 0 && candidates[r][c].size === 2)
        bivalue.push([r,c]);

  for (const [pr, pc] of bivalue) {
    const [x, y] = [...candidates[pr][pc]];
    // Find pincers: one with XZ, one with YZ (Z is the digit to eliminate)
    const peers = bivalue.filter(([r,c]) =>
      !(r===pr && c===pc) && _sharesPeer(pr, pc, r, c)
    );
    for (const [r1, c1] of peers) {
      if (!candidates[r1][c1].has(x)) continue;
      const cands1 = [...candidates[r1][c1]];
      const z = cands1.find(d => d !== x);
      if (!z) continue;
      // Look for second pincer with Y and Z
      for (const [r2, c2] of peers) {
        if (r2 === r1 && c2 === c1) continue;
        if (!candidates[r2][c2].has(y) || !candidates[r2][c2].has(z)) continue;
        if (candidates[r2][c2].size !== 2) continue;
        // Found XY-Wing — eliminate Z from cells that see both pincers
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (board[r][c] !== 0) continue;
            if (r===r1&&c===c1 || r===r2&&c===c2 || r===pr&&c===pc) continue;
            if (_sharesPeer(r,c,r1,c1) && _sharesPeer(r,c,r2,c2)) {
              if (candidates[r][c].delete(z)) progress = true;
            }
          }
        }
      }
    }
  }
  return progress;
}

// ─── Technique 9: Forcing chains (bifurcation) ───────────────────────────────
// Pick a cell with 2 candidates, try each one, see if either leads to
// a contradiction. If one does, the other must be correct.
// This is the "last resort" technique that makes puzzles feel like guessing.

function applyForcingChain(board, candidates) {
  // Find the cell with fewest candidates (ideally 2)
  let bestR = -1, bestC = -1, bestSize = Infinity;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0 && candidates[r][c].size < bestSize) {
        bestSize = candidates[r][c].size;
        bestR = r; bestC = c;
      }
    }
  }
  if (bestR === -1) return false;

  for (const digit of candidates[bestR][bestC]) {
    // Try placing this digit and see if it leads to a contradiction
    const boardCopy = board.map(row => [...row]);
    const candCopy  = candidates.map(row => row.map(s => new Set(s)));
    placeDigit(boardCopy, candCopy, bestR, bestC, digit);

    // Run basic logic to propagate
    let changed = true;
    while (changed) {
      changed = applyNakedSingles(boardCopy, candCopy)
             || applyHiddenSingles(boardCopy, candCopy);
    }

    // Check for contradiction (empty candidate set on an unfilled cell)
    const hasContradiction = boardCopy.some((row, r) =>
      row.some((val, c) => val === 0 && candCopy[r][c].size === 0)
    );

    if (hasContradiction) {
      // This digit leads to contradiction — the OTHER digit must be correct
      // Remove the contradicting digit from the real candidates
      candidates[bestR][bestC].delete(digit);
      if (candidates[bestR][bestC].size === 1) {
        placeDigit(board, candidates, bestR, bestC, [...candidates[bestR][bestC]][0]);
      }
      return true;
    }
  }
  return false;
}

// ─── Main solver + classifier ─────────────────────────────────────────────────

// Technique level constants — what each difficulty allows
export const TECHNIQUE_LEVELS = {
  NAKED_SINGLES:   1,
  HIDDEN_SINGLES:  2,
  NAKED_PAIRS:     3,
  HIDDEN_PAIRS:    4,
  NAKED_TRIPLES:   5,
  POINTING_PAIRS:  6,
  XWING:           7,
  XYWING:          8,
  FORCING_CHAINS:  9,
};

// Max technique level allowed per difficulty
export const DIFFICULTY_MAX_LEVEL = {
  easy:   2,
  medium: 4,
  hard:   6,
  expert: 8,
  insane: 9,
};

/**
 * Solve a puzzle using human techniques up to maxLevel.
 * Returns { solved, highestTechnique } where:
 *   solved           — true if all cells filled
 *   highestTechnique — the highest technique level that was needed
 *
 * Does NOT mutate the input board.
 *
 * @param {number[][]} puzzle
 * @param {number}     maxLevel — stop if we'd need a technique above this
 * @returns {{ solved: boolean, highestTechnique: number }}
 */
export function solveWithTechniques(puzzle, maxLevel = 9) {
  const board      = puzzle.map(r => [...r]);
  const candidates = buildCandidates(board);
  let highestTechnique = 0;

  function emptyCells() {
    return board.flat().filter(v => v === 0).length;
  }

  // Ordered technique list with their level numbers
  const techniques = [
    { fn: applyNakedSingles,  level: TECHNIQUE_LEVELS.NAKED_SINGLES  },
    { fn: applyHiddenSingles, level: TECHNIQUE_LEVELS.HIDDEN_SINGLES  },
    { fn: applyNakedPairs,    level: TECHNIQUE_LEVELS.NAKED_PAIRS     },
    { fn: applyHiddenPairs,   level: TECHNIQUE_LEVELS.HIDDEN_PAIRS    },
    { fn: applyNakedTriples,  level: TECHNIQUE_LEVELS.NAKED_TRIPLES   },
    { fn: applyPointingPairs, level: TECHNIQUE_LEVELS.POINTING_PAIRS  },
    { fn: applyXWing,         level: TECHNIQUE_LEVELS.XWING           },
    { fn: applyXYWing,        level: TECHNIQUE_LEVELS.XYWING          },
    { fn: applyForcingChain,  level: TECHNIQUE_LEVELS.FORCING_CHAINS  },
  ];

  let stuck = false;
  while (emptyCells() > 0 && !stuck) {
    stuck = true;
    for (const { fn, level } of techniques) {
      if (level > maxLevel) break; // don't use techniques above our limit
      if (fn(board, candidates)) {
        if (level > highestTechnique) highestTechnique = level;
        stuck = false;
        break; // restart from lowest technique after any progress
      }
    }
    // Check for invalid state
    if (board.some((row, r) => row.some((v, c) => v === 0 && candidates[r][c].size === 0))) {
      return { solved: false, highestTechnique };
    }
  }

  return {
    solved:           emptyCells() === 0,
    highestTechnique,
  };
}

/**
 * Classify a puzzle's difficulty based on which techniques are needed.
 * Returns 'easy' | 'medium' | 'hard' | 'expert' | 'insane' | 'unsolvable'
 *
 * @param {number[][]} puzzle
 * @returns {string}
 */
export function classifyDifficulty(puzzle) {
  const { solved, highestTechnique } = solveWithTechniques(puzzle, 9);
  if (!solved) return 'unsolvable';
  if (highestTechnique <= TECHNIQUE_LEVELS.HIDDEN_SINGLES)  return 'easy';
  if (highestTechnique <= TECHNIQUE_LEVELS.HIDDEN_PAIRS)    return 'medium';
  if (highestTechnique <= TECHNIQUE_LEVELS.POINTING_PAIRS)  return 'hard';
  if (highestTechnique <= TECHNIQUE_LEVELS.XYWING)          return 'expert';
  return 'insane';
}

/**
 * Returns true if the puzzle can be solved using ONLY techniques up to maxLevel.
 * Used by the generator to validate puzzles for each difficulty.
 *
 * @param {number[][]} puzzle
 * @param {number}     maxLevel
 * @returns {boolean}
 */
export function isSolvableWithLevel(puzzle, maxLevel) {
  const { solved } = solveWithTechniques(puzzle, maxLevel);
  return solved;
}

// Keep the old export for backward compatibility
export function isLogicSolvable(puzzle) {
  return isSolvableWithLevel(puzzle, TECHNIQUE_LEVELS.HIDDEN_SINGLES);
}

export function countUnsolvedByLogic(puzzle) {
  const board      = puzzle.map(r => [...r]);
  const candidates = buildCandidates(board);
  let progress = true;
  while (progress) {
    progress = applyNakedSingles(board, candidates)
            || applyHiddenSingles(board, candidates);
  }
  return board.flat().filter(v => v === 0).length;
}
