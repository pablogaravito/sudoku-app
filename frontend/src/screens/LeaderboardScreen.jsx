// LeaderboardScreen.jsx
// Shows top 10 times per difficulty globally.
// The current user's row is highlighted even if outside top 10.

import { useState, useEffect } from 'react';
import { getLeaderboard, getRankForTime } from '../lib/statsService';
import { supabase } from '../lib/supabase';
import styles from './LeaderboardScreen.module.css';

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert', 'insane'];
const DIFF_COLORS  = {
  easy: '#16a34a', medium: '#d97706', hard: '#dc2626',
  expert: '#7c3aed', insane: '#be123c',
};
const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function formatTime(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function LeaderboardScreen({ onBack, userId }) {
  const [activeTab, setActiveTab]   = useState('easy');
  const [entries, setEntries]       = useState([]);
  const [myEntry, setMyEntry]       = useState(null);
  const [myRank, setMyRank]         = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    setMyEntry(null);
    setMyRank(null);

    const fetchData = async () => {
      try {
        // Get top 10 for this difficulty
        const top10 = await getLeaderboard(activeTab, 10);
        setEntries(top10);

        // Check if current user is in top 10
        const inTop10 = top10.some(e => e.user_id === userId);

        if (!inTop10 && userId) {
          // Fetch user's own entry to show below the top 10
          const { data } = await supabase
            .from('leaderboard')
            .select('username, best_time, won, user_id')
            .eq('difficulty', activeTab)
            .eq('user_id', userId)
            .single();

          if (data?.best_time) {
            setMyEntry(data);
            const rank = await getRankForTime(userId, activeTab, data.best_time);
            setMyRank(rank);
          }
        }
      } catch (err) {
        console.error('Leaderboard fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, userId]);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>Leaderboard</h1>
        <div />
      </header>

      {/* Difficulty tabs */}
      <div className={styles.tabs}>
        {DIFFICULTIES.map(diff => (
          <button
            key={diff}
            className={`${styles.tab} ${activeTab === diff ? styles.tabActive : ''}`}
            style={{ '--tab-color': DIFF_COLORS[diff] }}
            onClick={() => setActiveTab(diff)}
          >
            {diff.charAt(0).toUpperCase() + diff.slice(1)}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.empty}>Loading…</div>
        ) : entries.length === 0 ? (
          <div className={styles.empty}>
            No times recorded yet for this difficulty. Be the first!
          </div>
        ) : (
          <>
            {/* Top 10 table */}
            <div className={styles.table}>
              <div className={styles.tableHeader}>
                <span className={styles.colRank}>#</span>
                <span className={styles.colName}>Player</span>
                <span className={styles.colTime}>Best time</span>
                <span className={styles.colWins}>Wins</span>
              </div>

              {entries.map((entry, i) => {
                const rank = i + 1;
                const isMe = entry.user_id === userId;
                return (
                  <div
                    key={entry.user_id}
                    className={`${styles.row} ${isMe ? styles.rowMe : ''}`}
                  >
                    <span className={styles.colRank}>
                      {MEDALS[rank] ?? rank}
                    </span>
                    <span className={styles.colName}>
                      {entry.username}
                      {isMe && <span className={styles.youBadge}>you</span>}
                    </span>
                    <span className={styles.colTime}>
                      {formatTime(entry.best_time)}
                    </span>
                    <span className={styles.colWins}>{entry.won}</span>
                  </div>
                );
              })}
            </div>

            {/* User's own row if outside top 10 */}
            {myEntry && myRank && (
              <>
                <div className={styles.separator}>···</div>
                <div className={`${styles.row} ${styles.rowMe}`}>
                  <span className={styles.colRank}>{myRank}</span>
                  <span className={styles.colName}>
                    {myEntry.username}
                    <span className={styles.youBadge}>you</span>
                  </span>
                  <span className={styles.colTime}>
                    {formatTime(myEntry.best_time)}
                  </span>
                  <span className={styles.colWins}>{myEntry.won}</span>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
