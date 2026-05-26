// NumberPad.jsx
// The 1–9 digit buttons + Erase, Undo, Notes toggle, Hint.

import styles from './NumberPad.module.css';

export default function NumberPad({
  onNumber,
  onErase,
  onUndo,
  onToggleNotes,
  onHint,
  notesMode,
  canUndo,
  remainingCounts, // { 1: 3, 2: 0, ... } how many of each digit are still needed
}) {
  return (
    <div className={styles.pad}>
      {/* Number buttons 1–9 */}
      <div className={styles.numbers}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => {
          const done = remainingCounts?.[n] === 0;
          return (
            <button
              key={n}
              className={`${styles.numBtn} ${done ? styles.done : ''}`}
              onClick={() => onNumber(n)}
              disabled={done}
              aria-label={`Place ${n}`}
            >
              <span className={styles.digit}>{n}</span>
              {remainingCounts && !done && (
                <span className={styles.remaining}>{remainingCounts[n]}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 7v6h6"/><path d="M3 13C5.5 6.5 14 3.5 20 7.5"/>
          </svg>
          <span>Undo</span>
        </button>

        <button className={styles.actionBtn} onClick={onErase} title="Erase (Backspace)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 20H7L3 16l10-10 7 7-3.5 3.5"/><path d="M6.5 17.5l5-5"/>
          </svg>
          <span>Erase</span>
        </button>

        <button
          className={`${styles.actionBtn} ${notesMode ? styles.activeAction : ''}`}
          onClick={onToggleNotes}
          title="Toggle notes mode"
          aria-pressed={notesMode}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>
          </svg>
          <span>Notes{notesMode ? ' ON' : ''}</span>
        </button>

        <button className={styles.actionBtn} onClick={onHint} title="Reveal this cell">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>
          </svg>
          <span>Hint</span>
        </button>
      </div>
    </div>
  );
}
