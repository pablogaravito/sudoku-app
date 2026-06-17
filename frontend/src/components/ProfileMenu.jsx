// ProfileMenu.jsx
// Avatar button with dropdown — includes theme toggle inside.
// Lives in App.jsx's persistent top bar, shown on all non-game screens.

import { useState, useEffect, useRef } from 'react';
import styles from './ProfileMenu.module.css';

function getInitials(username, email) {
  if (username) return username.slice(0, 2).toUpperCase();
  if (email)    return email.slice(0, 2).toUpperCase();
  return '?';
}

function getAvatarColor(str) {
  const colors = [
    '#2563eb', '#16a34a', '#d97706', '#dc2626',
    '#7c3aed', '#0891b2', '#be123c', '#15803d',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function ProfileMenu({
  user, username, theme,
  onSignOut, onChangeUsername,
  autoRemoveNotes, onToggleAutoRemoveNotes,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const initials    = getInitials(username, user?.email);
  const avatarColor = getAvatarColor(user?.id ?? '');
  const displayName = username
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'Player';
  const isDark = theme.theme === 'dark';

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        className={styles.avatar}
        style={{ background: avatarColor }}
        onClick={() => setOpen(v => !v)}
        aria-label="Profile menu"
        aria-expanded={open}
      >
        {initials}
      </button>

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

          {/* Theme toggle — inside the menu */}
          <button
            className={styles.menuItem}
            onClick={() => { theme.toggle(); }}
          >
            {isDark
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            }
            Switch to {isDark ? 'light' : 'dark'} mode
          </button>

          {/* Auto-remove notes toggle */}
          <button
            className={styles.menuItem}
            onClick={onToggleAutoRemoveNotes}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M3 3l18 18"/><path d="M6.5 6.5L3 10l4 4 1.5-1.5"/>
              <path d="M9 3h9v9"/>
            </svg>
            Auto-remove notes
            <span className={`${styles.toggle} ${autoRemoveNotes ? styles.toggleOn : ''}`} />
          </button>

          <div className={styles.divider} />
          <button
            className={styles.menuItem}
            onClick={() => { setOpen(false); onChangeUsername(); }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>
            </svg>
            {username ? 'Change username' : 'Set username'}
          </button>

          <div className={styles.divider} />

          {/* Sign out */}
          <button
            className={`${styles.menuItem} ${styles.menuItemDanger}`}
            onClick={() => { setOpen(false); onSignOut(); }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
