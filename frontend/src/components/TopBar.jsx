// TopBar.jsx
// Persistent top bar shown on all non-game screens.
// Contains only the profile menu (which includes theme toggle).
// Positioned absolute so it overlays screen content without affecting layout.

import ProfileMenu from './ProfileMenu';
import styles from './TopBar.module.css';

export default function TopBar({ user, username, theme, onSignOut, onChangeUsername, autoRemoveNotes, onToggleAutoRemoveNotes }) {
  return (
    <div className={styles.bar}>
      <ProfileMenu
        user={user}
        username={username}
        theme={theme}
        onSignOut={onSignOut}
        onChangeUsername={onChangeUsername}
        autoRemoveNotes={autoRemoveNotes}
        onToggleAutoRemoveNotes={onToggleAutoRemoveNotes}
      />
    </div>
  );
}
