// SudokuCell.jsx
//
// REACT CONCEPT: "Presentational" component (also called a "dumb" component)
//
// This component has NO logic of its own — it just receives props and renders.
// It doesn't know about the board, the game state, or localStorage.
// It only knows: "here's what I look like, here's what to do when clicked."
//
// WHY THIS MATTERS: Because SudokuCell is pure props-in → UI-out, it is:
//   - Easy to test: just render it with different props and assert the output
//   - Easy to reason about: no hidden state surprises
//   - Reusable: could drop it into any board-like UI
//
// The parent (SudokuBoard → GameScreen) owns ALL the state and passes it down.
// This is "lifting state up" — one of the most important React patterns.

import styles from './SudokuCell.module.css';

/**
 * @param {object}   props
 * @param {number}   props.value       - 0 = empty, 1–9 = filled
 * @param {boolean}  props.isGiven     - true if this is a starting clue (locked)
 * @param {boolean}  props.isSelected  - true if the player clicked this cell
 * @param {boolean}  props.isPeer      - same row, col, or box as selected cell
 * @param {boolean}  props.isSameNum   - same number as selected cell
 * @param {boolean}  props.isError     - conflicts with another cell
 * @param {number[]} props.notes       - pencil marks (array of digits, e.g. [1,3,7])
 * @param {function} props.onClick     - called when the cell is clicked
 * @param {number}   props.row         - 0–8, used for box-border styling
 * @param {number}   props.col         - 0–8, used for box-border styling
 */
export default function SudokuCell({
  value,
  isGiven,
  isSelected,
  isPeer,
  isSameNum,
  isError,
  notes = [],
  onClick,
  row,
  col,
}) {
  // ── Build the CSS class string ─────────────────────────────────────────────
  // We compose class names conditionally rather than using inline styles.
  // This keeps styling in CSS (easier to read, easier to override) and keeps
  // JSX clean. The CSS Module gives us locally-scoped class names automatically
  // (no naming collisions across components).

  const classNames = [
    styles.cell,
    isGiven    && styles.given,
    isSelected && styles.selected,
    isPeer     && !isSelected && styles.peer,
    isSameNum  && !isSelected && styles.sameNum,
    isError    && styles.error,
    // Box border classes — thicker borders between each 3×3 box
    col % 3 === 2 && col !== 8 && styles.boxRight,
    row % 3 === 2 && row !== 8 && styles.boxBottom,
  ]
    .filter(Boolean)  // removes false/undefined entries
    .join(' ');

  // ── Notes mode vs value mode ───────────────────────────────────────────────
  // If there are pencil-mark notes AND no confirmed value, render a 3×3
  // mini-grid of small digits instead of a big center number.
  const showNotes = notes.length > 0 && value === 0;

  return (
    <div
      className={classNames}
      onClick={onClick}
      // Accessibility: make cells keyboard-navigable and screen-reader friendly
      role="button"
      tabIndex={isGiven ? -1 : 0}
      aria-label={
        isGiven
          ? `Given: ${value}`
          : value
          ? `Filled: ${value}${isError ? ', conflict' : ''}`
          : 'Empty cell'
      }
    >
      {showNotes ? (
        // Notes grid: 3×3 layout of digits 1–9
        // We always render all 9 slots and just show the digit if it's in notes
        <div className={styles.notes}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <span key={n} className={styles.noteDigit}>
              {notes.includes(n) ? n : ''}
            </span>
          ))}
        </div>
      ) : (
        // Single big digit (or blank if empty)
        <span className={styles.value}>{value || ''}</span>
      )}
    </div>
  );
}
