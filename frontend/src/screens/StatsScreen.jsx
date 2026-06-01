import { useState, useEffect } from 'react';
import ThemeToggle from '../components/ThemeToggle';
import { encodeStats, decodeStats } from '../logic/statsCodec';
import styles from './StatsScreen.module.css';

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert', 'insane'];
const DIFF_COLORS  = {
  easy: '#16a34a', medium: '#d97706', hard: '#dc2626',
  expert: '#7c3aed', insane: '#be123c',
};
const STATS_KEY = 'sudoku-stats';

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function pct(a, b) {
  if (!b) return '—';
  return `${Math.round((a / b) * 100)}%`;
}

function StatRow({ label, value }) {
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value ?? '—'}</span>
    </div>
  );
}

function DiffStats({ d }) {
  const won  = d?.won ?? d?.played ?? 0;
  const lost = d?.lost ?? 0;

  if (!d || (won + lost) === 0) {
    return (
      <div className={styles.empty}>
        No completed games yet for this difficulty.
      </div>
    );
  }
  const played = won + lost; // total completed (finished or abandoned)

  return (
    <div className={styles.statsGrid}>
      <div className={styles.statsGroup}>
        <p className={styles.groupLabel}>Games</p>
        <StatRow label="Won"       value={won} />
        <StatRow label="Lost"      value={lost} />
        <StatRow label="Win rate"  value={pct(won, played)} />
      </div>
      <div className={styles.statsGroup}>
        <p className={styles.groupLabel}>Time</p>
        <StatRow label="Best time"    value={formatTime(d.best)} />
        <StatRow label="Average time" value={formatTime(Math.round(d.totalTime / won))} />
      </div>
      <div className={styles.statsGroup}>
        <p className={styles.groupLabel}>Streaks</p>
        <StatRow label="Current streak" value={d.currentStreak ?? 0} />
        <StatRow label="Longest streak" value={d.longestStreak ?? 0} />
      </div>
      <div className={styles.statsGroup}>
        <p className={styles.groupLabel}>Hints</p>
        <StatRow label="Total hints used" value={d.totalHints ?? 0} />
        <StatRow label="Clean wins"       value={`${d.winsNoHints ?? 0} of ${won}`} />
      </div>
    </div>
  );
}

export default function StatsScreen({ onBack, theme }) {
  const [stats, setStats]           = useState(null);
  const [activeTab, setActiveTab]   = useState('easy');
  const [exported, setExported]     = useState('');
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg]   = useState(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STATS_KEY);
    setStats(raw ? JSON.parse(raw) : {});
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
    const current = stats || {};
    const merged  = { ...decoded };
    for (const diff of DIFFICULTIES) {
      if (current[diff] && decoded[diff]) {
        const a = current[diff], b = decoded[diff];
        merged[diff] = {
          started:       (a.started       ?? 0) + (b.started       ?? 0),
          won:           (a.won           ?? 0) + (b.won           ?? 0),
          lost:          (a.lost          ?? 0) + (b.lost          ?? 0),
          totalTime:     (a.totalTime     ?? 0) + (b.totalTime     ?? 0),
          best:          Math.min(a.best  ?? Infinity, b.best ?? Infinity),
          winsNoHints:   (a.winsNoHints   ?? 0) + (b.winsNoHints   ?? 0),
          totalHints:    (a.totalHints    ?? 0) + (b.totalHints    ?? 0),
          currentStreak: Math.max(a.currentStreak ?? 0, b.currentStreak ?? 0),
          longestStreak: Math.max(a.longestStreak ?? 0, b.longestStreak ?? 0),
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
      setStats({});
      setExported('');
    }
  };

  const hasAnyStats = stats && Object.values(stats).some(d => ((d?.won ?? d?.played ?? 0) + (d?.lost ?? 0)) > 0);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>Stats</h1>
        <ThemeToggle theme={theme.theme} onToggle={theme.toggle} />
      </header>

      {/* Difficulty tabs */}
      <div className={styles.tabs} role="tablist">
        {DIFFICULTIES.map(diff => (
          <button
            key={diff}
            role="tab"
            aria-selected={activeTab === diff}
            className={`${styles.tab} ${activeTab === diff ? styles.tabActive : ''}`}
            style={{ '--tab-color': DIFF_COLORS[diff] }}
            onClick={() => setActiveTab(diff)}
          >
            {diff.charAt(0).toUpperCase() + diff.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats for active tab */}
      <div className={styles.content}>
        <DiffStats d={stats?.[activeTab]} />
      </div>

      {/* Backup section */}
      <div className={styles.transferSection}>
        <p className={styles.sectionLabel}>backup &amp; restore</p>
        <div className={styles.transferBtns}>
          <button className={styles.transferBtn} onClick={handleExport} disabled={!hasAnyStats}>
            Export stats
          </button>
          <button className={styles.transferBtn} onClick={() => { setShowImport(v => !v); setImportMsg(null); }}>
            Import stats
          </button>
        </div>

        {exported && (
          <div className={styles.exportBox}>
            <p className={styles.exportLabel}>Copy this code and save it somewhere safe:</p>
            <textarea className={styles.codeArea} readOnly value={exported} onClick={e => e.target.select()} />
            <button className={styles.copyBtn} onClick={() => navigator.clipboard.writeText(exported)}>
              Copy to clipboard
            </button>
          </div>
        )}

        {showImport && (
          <div className={styles.importBox}>
            <p className={styles.exportLabel}>Paste your export code below:</p>
            <textarea className={styles.codeArea} value={importText} onChange={e => setImportText(e.target.value)} placeholder="Paste code here..." />
            {importMsg && (
              <p className={`${styles.importMsg} ${importMsg.ok ? styles.ok : styles.err}`}>
                {importMsg.text}
              </p>
            )}
            <button className={styles.transferBtn} onClick={handleImport} disabled={!importText.trim()}>
              Import
            </button>
          </div>
        )}
      </div>

      {hasAnyStats && (
        <button className={styles.clearBtn} onClick={handleClear}>Clear all stats</button>
      )}
    </div>
  );
}
