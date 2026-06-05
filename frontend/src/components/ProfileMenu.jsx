// ProfileMenu.jsx
// Avatar button that opens a dropdown with profile options.
// Replaces the awkward top-left name + sign out.

import { useState, useEffect, useRef } from 'react';
import styles from './ProfileMenu.module.css';

function getInitials(username, email) {
  if (username) {
    // Take first two chars of username
    return username.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return '?';
}

// Simple hash to pick a consistent avatar color per user
function getAvatarColor(str) {
  const colors = [
    '#2563eb', '#16a34a', '#d97706', '#dc2626',
    '#7c3aed', '#0891b2', '#be123c', '#15803d',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function ProfileMenu({ user, username, onSignOut, onChangeUsername }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const initials    = getInitials(username, user?.email);
  const avatarColor = getAvatarColor(user?.id ?? '');
  const displayName = username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Player';

  return (
    <div className={styles.wrap} ref={ref}>
      {/* Avatar button */}
      <button
        className={styles.avatar}
        style={{ background: avatarColor }}
        onClick={() => setOpen(v => !v)}
        aria-label="Profile menu"
        aria-expanded={open}
      >
        {initials}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={styles.menu}>
          {/* User info */}
          <div className={styles.menuHeader}>
            <div className={styles.menuAvatar} style={{ background: avatarColor }}>
              {initials}
            </div>
            <div className={styles.menuInfo}>
              <span className={styles.menuName}>{displayName}</span>
              <span className={styles.menuEmail}>{user?.email}</span>
            </div>
          </div>

          <div className={styles.divider} />

          {/* Actions */}
          <button
            className={styles.menuItem}
            onClick={() => { setOpen(false); onChangeUsername(); }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>
            </svg>
            {username ? 'Change username' : 'Set username'}
          </button>

          <div className={styles.divider} />

          <button
            className={`${styles.menuItem} ${styles.menuItemDanger}`}
            onClick={() => { setOpen(false); onSignOut(); }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
