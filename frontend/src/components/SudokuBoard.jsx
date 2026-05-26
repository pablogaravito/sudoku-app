// SudokuBoard.jsx
//
// REACT CONCEPT: "Container" component + useMemo
//
// SudokuBoard sits between GameScreen (which owns state) and SudokuCell
// (which just renders). Its job is to:
//   1. Receive the raw game data from its parent
//   2. Compute DERIVED data (which cells are peers, errors, same-number)
//   3. Pass the right props down to each SudokuCell
//
// This is the "lifting state up + passing down" pattern in action.
// GameScreen owns: board, selectedCell, notes
// SudokuBoard derives: isPeer, isSameNum, isError for each cell
// SudokuCell renders: whatever it's told
//
// ABOUT useMemo:
// Every time the parent re-renders, SudokuBoard re-renders too. If we computed
// "which cells are peers" inside the render function directly, we'd recompute it
// on EVERY render — even if selectedCell didn't change.
// useMemo(() => ..., [deps]) caches the result and only recomputes when [deps]
// changes. For a 9×9 grid this isn't critical, but it's good habit.

import { useMemo } from "react";
import SudokuCell from "./SudokuCell";
import { getAllConflicts } from "../logic/validator";
import styles from "./SudokuBoard.module.css";

/**
 * @param {object}     props
 * @param {number[][]} props.board         - 9×9 grid, 0 = empty
 * @param {number[][]} props.givenBoard    - original puzzle (to know which are locked)
 * @param {number[]|null} props.selectedCell - [row, col] or null
 * @param {object}     props.notes         - { "r,c": number[] } pencil marks
 * @param {function}   props.onCellClick   - (row, col) => void
 */
export default function SudokuBoard({
  board,
  givenBoard,
  selectedCell,
  notes = {},
  onCellClick,
}) {
  const [selRow, selCol] = selectedCell ?? [-1, -1];

  // ── Derived: which cells conflict with each other? ─────────────────────────
  // We recompute this only when `board` changes (not on every click).
  const conflictSet = useMemo(() => getAllConflicts(board), [board]);

  // ── Derived: which cells are "peers" of the selected cell? ────────────────
  // A peer is any cell in the same row, column, or 3×3 box.
  // We recompute only when selectedCell changes.
  const peerSet = useMemo(() => {
    if (selRow === -1) return new Set();
    const peers = new Set();
    const boxRow = Math.floor(selRow / 3) * 3;
    const boxCol = Math.floor(selCol / 3) * 3;
    for (let i = 0; i < 9; i++) {
      peers.add(`${selRow},${i}`); // same row
      peers.add(`${i},${selCol}`); // same column
    }
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        peers.add(`${r},${c}`); // same box
      }
    }
    peers.delete(`${selRow},${selCol}`); // the selected cell itself isn't a peer
    return peers;
  }, [selRow, selCol]);

  // ── Derived: the value of the selected cell (for "same number" highlight) ──
  const selectedValue = selRow !== -1 ? board[selRow][selCol] : 0;

  return (
    <div className={styles.board} role="grid" aria-label="Sudoku board">
      <div className={styles.boardInner} aria-hidden="true" />
      {board.map((row, r) =>
        row.map((value, c) => {
          const key = `${r},${c}`;
          return (
            <SudokuCell
              key={key}
              row={r}
              col={c}
              value={value}
              isGiven={givenBoard[r][c] !== 0}
              isSelected={r === selRow && c === selCol}
              isPeer={peerSet.has(key)}
              isSameNum={
                selectedValue !== 0 &&
                value === selectedValue &&
                !(r === selRow && c === selCol)
              }
              isError={conflictSet.has(key)}
              notes={notes[key] ?? []}
              onClick={() => onCellClick(r, c)}
            />
          );
        }),
      )}
    </div>
  );
}
