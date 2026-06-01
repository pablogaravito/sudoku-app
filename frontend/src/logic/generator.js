// generator.js

import { isValidPlacement } from "./validator.js";
import { countSolutions } from "./solver.js";
import { isLogicSolvable } from "./logicSolver.js";

// ─── Difficulty configuration ─────────────────────────────────────────────────
//
// logicOnly: true  → reject puzzles that require advanced techniques
//            false → allow any valid unique puzzle (harder feel)
//
// maxAttempts: how many times to retry generation before giving up.
//   Logic-only puzzles are rarer, so we allow more retries for those.
//
// |  Level  | Clues removed | Clues left | Logic-only? | Feel                    |
// |---------|--------------|------------|-------------|-------------------------|
// | easy    |     36       |    ~45     |     yes     | naked/hidden singles    |
// | medium  |     46       |    ~35     |     yes     | needs more scanning     |
// | hard    |     52       |    ~29     |     yes     | requires careful logic  |
// | expert  |     52       |    ~29     |     no      | may need advanced tech  |
// | insane  |     58       |    ~23     |     no      | very few clues          |
//
// Note: expert has the same removal count as hard, but skips the logic check —
// so it may require techniques like X-wings or forcing chains. Insane removes
// even more clues, making it the hardest.

const DIFFICULTY_CONFIG = {
  easy: { removals: 36, logicOnly: true, maxAttempts: 50 },
  medium: { removals: 46, logicOnly: true, maxAttempts: 75 },
  hard: { removals: 52, logicOnly: true, maxAttempts: 100 },
  expert: { removals: 52, logicOnly: false, maxAttempts: 10 },
  insane: { removals: 58, logicOnly: false, maxAttempts: 10 },
};

// ─── Solved board generation ───────────────────────────────────────────────────

function generateSolvedBoard() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));

  function backtrack(pos) {
    if (pos === 81) return true;
    const r = Math.floor(pos / 9);
    const c = pos % 9;
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

// ─── Shuffle ───────────────────────────────────────────────────────────────────

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Clue removal ─────────────────────────────────────────────────────────────

function removeClues(solvedBoard, targetRemovals) {
  const puzzle = solvedBoard.map((row) => [...row]);
  let removed = 0;

  const positions = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) positions.push([r, c]);
  shuffle(positions);

  for (const [r, c] of positions) {
    if (removed >= targetRemovals) break;
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

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates a puzzle at the given difficulty, retrying if the logic-only
 * constraint isn't met (for easy/medium/hard).
 *
 * @param {'easy'|'medium'|'hard'|'expert'|'insane'} difficulty
 * @returns {{ puzzle: number[][], solution: number[][] }}
 */
export function generatePuzzle(difficulty = "medium") {
  const config = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.medium;
  const { removals, logicOnly, maxAttempts } = config;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solution = generateSolvedBoard();
    const puzzle = removeClues(solution, removals);

    // For logic-only difficulties, reject if it needs advanced techniques
    if (logicOnly && !isLogicSolvable(puzzle)) continue;

    const frozenSolution = Object.freeze(
      solution.map((row) => Object.freeze([...row])),
    );
    return { puzzle, solution: frozenSolution };
  }

  // Fallback: if we exhausted attempts (shouldn't happen for non-logicOnly,
  // very rare for logicOnly), return whatever we have last
  console.warn(
    `generatePuzzle: exhausted ${maxAttempts} attempts for ${difficulty}, using best effort`,
  );
  const solution = generateSolvedBoard();
  const puzzle = removeClues(solution, removals);
  const frozenSolution = Object.freeze(
    solution.map((row) => Object.freeze([...row])),
  );
  return { puzzle, solution: frozenSolution };
}

/**
 * Metadata for the difficulty picker UI.
 */
export function getDifficultyMeta(difficulty) {
  const meta = {
    easy: { label: "Easy", cluesRange: "~45 clues", color: "#16a34a" },
    medium: { label: "Medium", cluesRange: "~35 clues", color: "#d97706" },
    hard: { label: "Hard", cluesRange: "~29 clues", color: "#dc2626" },
    expert: { label: "Expert", cluesRange: "~29 clues", color: "#7c3aed" },
    insane: { label: "Insane", cluesRange: "~23 clues", color: "#be123c" },
  };
  return meta[difficulty] ?? meta.medium;
}
