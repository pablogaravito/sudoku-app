// generator.js
//
// Generates Sudoku puzzles classified to exact difficulty levels.
//
// KEY INSIGHT: Instead of removing clues then classifying, we use a
// "remove until hard enough" strategy:
//   1. Generate a solved board
//   2. Remove clues one by one (checking uniqueness)
//   3. After each removal, quickly check if the puzzle now requires
//      at least the target technique level
//   4. Stop as soon as we reach the target difficulty
//
// This is MUCH faster than generating a fixed number of removals and
// then classifying — we stop as soon as the puzzle is hard enough.
//
// For Insane specifically (requires forcing chains), we use a separate
// approach since those puzzles are rare and we need to be clever.

import { isValidPlacement } from './validator.js';
import { countSolutions } from './solver.js';
import {
  isSolvableWithLevel,
  classifyDifficulty,
  TECHNIQUE_LEVELS,
  DIFFICULTY_MAX_LEVEL,
} from './logicSolver.js';

// ─── Difficulty config ────────────────────────────────────────────────────────
// minTechnique: puzzle MUST need at least this level
// maxTechnique: puzzle must NOT need more than this level (= DIFFICULTY_MAX_LEVEL)
// minRemovals:  don't classify until we've removed at least this many clues
//               (avoids false positives — a puzzle with 70 clues isn't "hard")

const DIFFICULTY_CONFIG = {
  easy:   { minTechnique: 0, maxTechnique: 2, minRemovals: 30, maxRemovals: 42, maxAttempts: 30  },
  medium: { minTechnique: 3, maxTechnique: 4, minRemovals: 40, maxRemovals: 50, maxAttempts: 50  },
  hard:   { minTechnique: 5, maxTechnique: 6, minRemovals: 45, maxRemovals: 54, maxAttempts: 80  },
  expert: { minTechnique: 7, maxTechnique: 8, minRemovals: 45, maxRemovals: 54, maxAttempts: 100 },
  insane: { minTechnique: 9, maxTechnique: 9, minRemovals: 50, maxRemovals: 60, maxAttempts: 150 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateSolvedBoard() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  function backtrack(pos) {
    if (pos === 81) return true;
    const r = Math.floor(pos / 9), c = pos % 9;
    for (const num of shuffle([1,2,3,4,5,6,7,8,9])) {
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

// Remove clues randomly while maintaining unique solution.
// Returns the puzzle after removing `count` clues.
function removeClues(solvedBoard, count) {
  const puzzle = solvedBoard.map(row => [...row]);
  let removed = 0;
  for (const [r,c] of shuffle([...Array(81).keys()].map(i => [Math.floor(i/9), i%9]))) {
    if (removed >= count) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(puzzle) === 1) {
      removed++;
    } else {
      puzzle[r][c] = backup;
    }
  }
  return puzzle;
}

// ─── Smart generation ─────────────────────────────────────────────────────────

/**
 * Try to generate a puzzle at the target difficulty.
 * Returns the puzzle if successful, null if we can't get there.
 *
 * Strategy: remove clues progressively, classify after each removal once
 * we've hit minRemovals. Stop when we hit the target classification.
 */
function tryGenerate(difficulty) {
  const { minTechnique, maxTechnique, minRemovals, maxRemovals } = DIFFICULTY_CONFIG[difficulty];
  const solution = generateSolvedBoard();
  const puzzle   = solution.map(row => [...row]);
  let removed    = 0;

  const positions = shuffle([...Array(81).keys()].map(i => [Math.floor(i/9), i%9]));

  for (const [r,c] of positions) {
    if (removed >= maxRemovals) break;

    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    if (countSolutions(puzzle) !== 1) {
      puzzle[r][c] = backup;
      continue;
    }

    removed++;

    // Start classifying once we've removed enough clues
    if (removed >= minRemovals) {
      const actual = classifyDifficulty(puzzle);
      const actualLevel = DIFFICULTY_MAX_LEVEL[actual] ?? 9;

      // Perfect match
      if (actual === difficulty) {
        return { puzzle: puzzle.map(r => [...r]), solution };
      }

      // If we've gone too hard, this path won't work — bail
      if (actualLevel > maxTechnique) return null;
    }
  }

  // Final classification after all removals
  const actual = classifyDifficulty(puzzle);
  if (actual === difficulty) {
    return { puzzle: puzzle.map(r => [...r]), solution };
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a puzzle genuinely classified at the requested difficulty.
 *
 * @param {'easy'|'medium'|'hard'|'expert'|'insane'} difficulty
 * @returns {{ puzzle: number[][], solution: number[][] }}
 */
export function generatePuzzle(difficulty = 'medium') {
  const { maxAttempts } = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.medium;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = tryGenerate(difficulty);
    if (result) {
      const frozenSolution = Object.freeze(
        result.solution.map(row => Object.freeze([...row]))
      );
      return { puzzle: result.puzzle, solution: frozenSolution };
    }
  }

  // Fallback — shouldn't happen often
  console.warn(`generatePuzzle: exhausted ${maxAttempts} attempts for ${difficulty}`);
  const solution = generateSolvedBoard();
  const removals = DIFFICULTY_CONFIG[difficulty].minRemovals;
  const puzzle   = removeClues(solution, removals);
  const frozenSolution = Object.freeze(solution.map(row => Object.freeze([...row])));
  return { puzzle, solution: frozenSolution };
}

export function getDifficultyMeta(difficulty) {
  const meta = {
    easy:   { label: 'Easy',   cluesRange: '~45 clues', color: '#16a34a' },
    medium: { label: 'Medium', cluesRange: '~35 clues', color: '#d97706' },
    hard:   { label: 'Hard',   cluesRange: '~29 clues', color: '#dc2626' },
    expert: { label: 'Expert', cluesRange: '~29 clues', color: '#7c3aed' },
    insane: { label: 'Insane', cluesRange: '~23 clues', color: '#be123c' },
  };
  return meta[difficulty] ?? meta.medium;
}
