import { useState, useEffect } from 'react';
import ThemeToggle from '../components/ThemeToggle';
import { supabase } from '../lib/supabase';
import { getUserPercentile } from '../lib/statsService';
import styles from './StatsScreen.module.css';

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert', 'insane'];
const DIFF_COLORS  = {
  easy: '#16a34a', medium: '#d97706', hard: '#dc2626',
  expert: '#7c3aed', insane: '#be123c',
};

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

function DiffStats({ d, percentile }) {
  const won  = d?.won ?? d?.played ?? 0;
  const lost = d?.lost ?? 0;

  if (!d || (won + lost) === 0) {
    return (
      <div className={styles.empty}>
        No completed games yet for this difficulty.
      </div>
    );
  }

  const played = won + lost;

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
        {percentile !== undefined && (
          <StatRow label="Global rank" value={`Top ${percentile}%`} />
        )}
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

export default function StatsScreen({ onBack, theme, getStats, userId }) {
  const [stats, setStats]             = useState(null);
  const [activeTab, setActiveTab]     = useState('easy');
  const [percentiles, setPercentiles] = useState({});

  useEffect(() => {
    getStats()
      .then(data => setStats(data ?? {}))
      .catch(() => setStats({}));
  }, [getStats]);

  // Fetch percentiles for all difficulties
  useEffect(() => {
    if (!userId) return;
    DIFFICULTIES.forEach(async (diff) => {
      const p = await getUserPercentile(userId, diff).catch(() => null);
      if (p !== null) {
        setPercentiles(prev => ({ ...prev, [diff]: p }));
      }
    });
  }, [userId]);

  const handleClear = async () => {
    if (!window.confirm('Clear all stats? This cannot be undone.')) return;
    await supabase.from('stats').delete().eq('user_id', userId);
    setStats({});
  };

  const hasAnyStats = stats && Object.values(stats).some(
    d => ((d?.won ?? d?.played ?? 0) + (d?.lost ?? 0)) > 0
  );

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>My Stats</h1>
        <ThemeToggle theme={theme.theme} onToggle={theme.toggle} />
      </header>

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

      <div className={styles.content}>
        <DiffStats d={stats?.[activeTab]} percentile={percentiles[activeTab]} />
      </div>

      {hasAnyStats && (
        <button className={styles.clearBtn} onClick={handleClear}>
          Clear all stats
        </button>
      )}
    </div>
  );
}
