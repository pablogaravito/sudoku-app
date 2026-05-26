import { useState, useEffect } from 'react';
import ThemeToggle from '../components/ThemeToggle';
import { encodeStats, decodeStats } from '../logic/statsCodec';
import styles from './StatsScreen.module.css';

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];
const DIFF_COLORS  = { easy: '#16a34a', medium: '#d97706', hard: '#dc2626', expert: '#7c3aed' };
const STATS_KEY    = 'sudoku-stats';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function StatsScreen({ onBack, theme }) {
  const [stats, setStats]           = useState(null);
  const [exported, setExported]     = useState('');
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg]   = useState(null); // { ok: bool, text: string }
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STATS_KEY);
    setStats(raw ? JSON.parse(raw) : null);
  }, []);

  const handleExport = () => {
    if (!stats) return;
    setExported(encodeStats(stats));
  };

  const handleImport = () => {
    const decoded = decodeStats(importText);
    if (!decoded) {
      setImportMsg({ ok: false, text: 'Invalid code — make sure you copied it fully.' });
      return;
    }
    // Merge: keep the better record for each difficulty
    const current = stats || {};
    const merged  = { ...decoded };
    for (const diff of DIFFICULTIES) {
      if (current[diff] && decoded[diff]) {
        merged[diff] = {
          played:    current[diff].played    + decoded[diff].played,
          totalTime: current[diff].totalTime + decoded[diff].totalTime,
          best:      Math.min(current[diff].best, decoded[diff].best),
        };
      } else {
        merged[diff] = current[diff] || decoded[diff];
      }
    }
    localStorage.setItem(STATS_KEY, JSON.stringify(merged));
    setStats(merged);
    setImportMsg({ ok: true, text: 'Stats imported and merged successfully!' });
    setImportText('');
    setShowImport(false);
  };

  const handleClear = () => {
    if (window.confirm('Clear all stats? This cannot be undone.')) {
      localStorage.removeItem(STATS_KEY);
      setStats(null);
      setExported('');
    }
  };

  const hasStats = stats && Object.values(stats).some(d => d?.played > 0);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>Stats</h1>
        <ThemeToggle theme={theme.theme} onToggle={theme.toggle} />
      </header>

      {!hasStats ? (
        <div className={styles.empty}>
          <p>No games completed yet.</p>
          <p>Finish your first puzzle to see stats here!</p>
        </div>
      ) : (
        <div className={styles.content}>
          {DIFFICULTIES.map(diff => {
            const d = stats?.[diff];
            if (!d || d.played === 0) return null;
            return (
              <div key={diff} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.diffName} style={{ color: DIFF_COLORS[diff] }}>
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </span>
                  <span className={styles.played}>{d.played} game{d.played !== 1 ? 's' : ''}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Best time</span>
                  <span className={styles.statValue}>{formatTime(d.best)}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Average time</span>
                  <span className={styles.statValue}>{formatTime(Math.round(d.totalTime / d.played))}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Export / Import */}
      <div className={styles.transferSection}>
        <p className={styles.sectionLabel}>backup & restore</p>
        <div className={styles.transferBtns}>
          <button
            className={styles.transferBtn}
            onClick={handleExport}
            disabled={!hasStats}
          >
            Export stats
          </button>
          <button
            className={styles.transferBtn}
            onClick={() => { setShowImport(v => !v); setImportMsg(null); }}
          >
            Import stats
          </button>
        </div>

        {exported && (
          <div className={styles.exportBox}>
            <p className={styles.exportLabel}>Copy this code and save it somewhere safe:</p>
            <textarea
              className={styles.codeArea}
              readOnly
              value={exported}
              onClick={e => e.target.select()}
            />
            <button className={styles.copyBtn} onClick={() => {
              navigator.clipboard.writeText(exported);
            }}>
              Copy to clipboard
            </button>
          </div>
        )}

        {showImport && (
          <div className={styles.importBox}>
            <p className={styles.exportLabel}>Paste your export code below:</p>
            <textarea
              className={styles.codeArea}
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder="Paste code here..."
            />
            {importMsg && (
              <p className={`${styles.importMsg} ${importMsg.ok ? styles.ok : styles.err}`}>
                {importMsg.text}
              </p>
            )}
            <button
              className={styles.transferBtn}
              onClick={handleImport}
              disabled={!importText.trim()}
            >
              Import
            </button>
          </div>
        )}
      </div>

      {hasStats && (
        <button className={styles.clearBtn} onClick={handleClear}>
          Clear all stats
        </button>
      )}
    </div>
  );
}
