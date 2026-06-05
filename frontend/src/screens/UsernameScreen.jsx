// UsernameScreen.jsx
// Shown once after first login when no username is set yet.
// Also used for changing username from the profile menu.

import { useState, useEffect, useRef } from 'react';
import ThemeToggle from '../components/ThemeToggle';
import { useUsername } from '../hooks/useUsername';
import styles from './UsernameScreen.module.css';

export default function UsernameScreen({ user, onComplete, theme, isChanging = false }) {
  const [input, setInput]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState(null);
  const debounceRef             = useRef(null);

  const { checking, available, error, checkAvailability, saveUsername } = useUsername();

  // Pre-fill with current username when changing
  useEffect(() => {
    if (isChanging && user?.username) {
      setInput(user.username);
    }
  }, [isChanging, user?.username]);

  const handleChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/\s/g, '_');
    setInput(val);
    setSaveError(null);

    // Debounce the availability check
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      checkAvailability(val, user?.id);
    }, 400);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input || !available) return;
    try {
      setSaving(true);
      setSaveError(null);
      await saveUsername(user.id, input);
      onComplete(input);
    } catch (err) {
      setSaveError(err.message);
      setSaving(false);
    }
  };

  // Status indicator
  const getStatus = () => {
    if (!input) return null;
    if (checking) return { icon: '⏳', text: 'Checking…', color: 'var(--color-text-muted)' };
    if (error)    return { icon: '✗', text: error,       color: '#dc2626' };
    if (available) return { icon: '✓', text: 'Available', color: '#16a34a' };
    return null;
  };
  const status = getStatus();

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <ThemeToggle theme={theme.theme} onToggle={theme.toggle} />
      </div>

      <header className={styles.header}>
        <h1 className={styles.title}>Sudoku</h1>
      </header>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>
          {isChanging ? 'Change username' : 'Choose your username'}
        </h2>
        <p className={styles.cardBody}>
          {isChanging
            ? 'Your username appears on the leaderboard. You can change it once every 30 days.'
            : 'This is how you\'ll appear on the leaderboard. Choose something you like — you can change it later.'}
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputWrap}>
            <input
              className={`${styles.input} ${
                error ? styles.inputError :
                available ? styles.inputOk : ''
              }`}
              type="text"
              value={input}
              onChange={handleChange}
              placeholder="your_username"
              maxLength={20}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
            {status && (
              <span className={styles.status} style={{ color: status.color }}>
                {status.icon} {status.text}
              </span>
            )}
          </div>
          <p className={styles.hint}>
            3–20 characters · letters, numbers, underscores
          </p>

          {saveError && <p className={styles.error}>{saveError}</p>}

          <button
            className={styles.submitBtn}
            type="submit"
            disabled={!available || saving || checking}
          >
            {saving ? 'Saving…' : isChanging ? 'Save changes' : 'Let\'s go!'}
          </button>
        </form>

        {!isChanging && (
          <button className={styles.skipBtn} onClick={() => onComplete(null)}>
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
