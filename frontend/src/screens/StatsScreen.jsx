import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getUserPercentile, getRecentSessions, getDayOfWeekStats } from '../lib/statsService';
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

// ── Progression chart ─────────────────────────────────────────────────────────
// A simple SVG sparkline showing time per game, newest on the right.
// The best time is highlighted, and a trend line shows improvement.

function ProgressionChart({ sessions, color }) {
  if (!sessions?.length) return null;

  const W = 300, H = 80, PAD = 8;
  const times = sessions.map(s => s.time);
  const minT  = Math.min(...times);
  const maxT  = Math.max(...times);
  const range = maxT - minT || 1;

  // Map time → y coordinate (lower time = higher on chart = smaller y)
  const y = t => PAD + ((t - minT) / range) * (H - PAD * 2);
  // Map index → x coordinate
  const x = i => PAD + (i / Math.max(sessions.length - 1, 1)) * (W - PAD * 2);

  const points = times.map((t, i) => `${x(i)},${y(t)}`).join(' ');
  const bestIdx = times.indexOf(minT);

  return (
    <div className={styles.chartWrap}>
      <p className={styles.chartLabel}>Last {sessions.length} games</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.chart}
        aria-label="Progression chart"
      >
        {/* Area fill */}
        <polyline
          points={`${x(0)},${H} ${points} ${x(times.length-1)},${H}`}
          fill={`${color}18`}
          stroke="none"
        />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Best time dot */}
        <circle
          cx={x(bestIdx)}
          cy={y(minT)}
          r="3.5"
          fill={color}
        />
        {/* Best time label */}
        <text
          x={x(bestIdx)}
          y={y(minT) - 6}
          textAnchor="middle"
          fontSize="9"
          fill={color}
          fontFamily="var(--font-mono)"
        >
          {formatTime(minT)}
        </text>
      </svg>
    </div>
  );
}

// ── Day of week chart ─────────────────────────────────────────────────────────
// Bar chart showing average time per day of week.

function DayChart({ dayStats, color }) {
  const active = dayStats.filter(d => d.count > 0);
  if (active.length < 2) return null;

  const maxAvg = Math.max(...active.map(d => d.avg));

  return (
    <div className={styles.dayChartWrap}>
      <p className={styles.chartLabel}>Average time by day</p>
      <div className={styles.dayChart}>
        {dayStats.map(d => (
          <div key={d.day} className={styles.dayBar}>
            <div className={styles.dayBarTrack}>
              <div
                className={styles.dayBarFill}
                style={{
                  height: d.avg ? `${(d.avg / maxAvg) * 100}%` : '0%',
                  background: color,
                  opacity: d.count ? 1 : 0.15,
                }}
              />
            </div>
            <span className={styles.dayLabel}>{d.label}</span>
            {d.avg && (
              <span className={styles.dayTime}>{formatTime(d.avg)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main stats component ──────────────────────────────────────────────────────

function DiffStats({ d, percentile, sessions, dayStats, color }) {
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
    <div className={styles.diffContent}>
      {/* Stats grid */}
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

      {/* Progression chart */}
      {sessions?.length >= 2 && (
        <ProgressionChart sessions={sessions} color={color} />
      )}

      {/* Day of week chart */}
      {dayStats && <DayChart dayStats={dayStats} color={color} />}
    </div>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function StatsScreen({ onBack, getStats, userId }) {
  const [stats, setStats]         = useState(null);
  const [activeTab, setActiveTab] = useState('easy');
  const [percentiles, setPercentiles] = useState({});
  const [sessions, setSessions]   = useState({});
  const [dayStats, setDayStats]   = useState({});

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
      if (p !== null) setPercentiles(prev => ({ ...prev, [diff]: p }));
    });
  }, [userId]);

  // Fetch sessions + day stats when tab changes
  // We check against null (not yet fetched) vs [] (fetched but empty)
  useEffect(() => {
    if (!userId) return;
    if (sessions[activeTab] !== undefined) return; // already fetched

    Promise.all([
      getRecentSessions(userId, activeTab, 20),
      getDayOfWeekStats(userId, activeTab),
    ]).then(([sess, days]) => {
      setSessions(prev => ({ ...prev, [activeTab]: sess }));
      setDayStats(prev  => ({ ...prev, [activeTab]: days }));
    }).catch(() => {});
  }, [userId, activeTab, sessions]);

  const handleClear = async () => {
    if (!window.confirm('Clear all stats? This cannot be undone.')) return;
    await Promise.all([
      supabase.from('stats').delete().eq('user_id', userId),
      supabase.from('game_sessions').delete().eq('user_id', userId),
    ]);
    setStats({});
    setSessions({});  // reset to empty — undefined keys = needs refetch
    setDayStats({});
  };

  const hasAnyStats = stats && Object.values(stats).some(
    d => ((d?.won ?? d?.played ?? 0) + (d?.lost ?? 0)) > 0
  );

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>My Stats</h1>
        <div />
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
        <DiffStats
          d={stats?.[activeTab]}
          percentile={percentiles[activeTab]}
          sessions={sessions[activeTab]}
          dayStats={dayStats[activeTab]}
          color={DIFF_COLORS[activeTab]}
        />
      </div>

      {hasAnyStats && (
        <button className={styles.clearBtn} onClick={handleClear}>
          Clear all stats
        </button>
      )}
    </div>
  );
}
