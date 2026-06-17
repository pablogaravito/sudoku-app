// AuthScreen.jsx
// Two sign-in options: Google OAuth and Email OTP.
// OTP flow has two steps: enter email → enter 6-digit code.

import { useState } from "react";
import ThemeToggle from "../components/ThemeToggle";
import styles from "./AuthScreen.module.css";

export default function AuthScreen({
  onGoogleSignIn,
  onSendOtp,
  onVerifyOtp,
  theme,
}) {
  // 'home' | 'otp-email' | 'otp-code'
  const [step, setStep] = useState("home");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await onGoogleSignIn();
      // Page redirects to Google — no need to setLoading(false)
    } catch {
      setError("Sign in failed. Please try again.");
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      setLoading(true);
      setError(null);
      await onSendOtp(email.trim().toLowerCase());
      setStep("otp-code");
    } catch (err) {
      setError(err.message ?? "Could not send code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      setLoading(true);
      setError(null);
      await onVerifyOtp(email.trim().toLowerCase(), code.trim());
      // onAuthStateChange in useAuth will update user state automatically
    } catch (err) {
      setError("Invalid or expired code. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <ThemeToggle theme={theme.theme} onToggle={theme.toggle} />
      </div>

      <header className={styles.header}>
        <h1 className={styles.title}>Sudoku</h1>
        <p className={styles.subtitle}>A clean puzzle for a clear mind</p>
      </header>

      <div className={styles.card}>
        {/* ── Step 1: choose method ─────────────────────────────────────── */}
        {step === "home" && (
          <>
            <h2 className={styles.cardTitle}>Sign in to play</h2>
            <p className={styles.cardBody}>
              Your progress and stats are saved to your account and sync across
              devices.
            </p>

            {/* Google button */}
            <button
              className={styles.googleBtn}
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>{loading ? "Signing in…" : "Continue with Google"}</span>
            </button>

            <div className={styles.divider}>
              <span>or</span>
            </div>

            {/* Email button */}
            <button
              className={styles.emailBtn}
              onClick={() => {
                setStep("otp-email");
                setError(null);
              }}
              disabled={loading}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span>Continue with Email</span>
            </button>

            {error && <p className={styles.error}>{error}</p>}

            <p className={styles.fine}>
              By signing in you agree to play Sudoku and have a good time.
            </p>
          </>
        )}

        {/* ── Step 2: enter email ───────────────────────────────────────── */}
        {step === "otp-email" && (
          <>
            <button
              className={styles.backBtn}
              onClick={() => {
                setStep("home");
                setError(null);
              }}
            >
              ← Back
            </button>
            <h2 className={styles.cardTitle}>Enter your email</h2>
            <p className={styles.cardBody}>
              We'll send a 6-digit code to your inbox. No password needed.
            </p>
            <form onSubmit={handleSendOtp} className={styles.form}>
              <input
                className={styles.input}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
              <button
                className={styles.submitBtn}
                type="submit"
                disabled={loading || !email.trim()}
              >
                {loading ? "Sending…" : "Send code"}
              </button>
            </form>
            {error && <p className={styles.error}>{error}</p>}
          </>
        )}

        {/* ── Step 3: enter code ────────────────────────────────────────── */}
        {step === "otp-code" && (
          <>
            <button
              className={styles.backBtn}
              onClick={() => {
                setStep("otp-email");
                setError(null);
                setCode("");
              }}
            >
              ← Back
            </button>
            <h2 className={styles.cardTitle}>Check your email</h2>
            <p className={styles.cardBody}>
              We sent a 6-digit code to <strong>{email}</strong>. It expires in
              10 minutes.
            </p>
            <form onSubmit={handleVerifyOtp} className={styles.form}>
              <input
                className={`${styles.input} ${styles.codeInput}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
                required
              />
              <button
                className={styles.submitBtn}
                type="submit"
                disabled={loading || code.length < 6}
              >
                {loading ? "Verifying…" : "Verify code"}
              </button>
            </form>
            {error && <p className={styles.error}>{error}</p>}
            <button
              className={styles.resendBtn}
              onClick={handleSendOtp}
              disabled={loading}
            >
              Resend code
            </button>
          </>
        )}
        <p
          className="text-center text-muted mt-3"
          style={{ fontSize: "0.8rem" }}
        >
          Necesitas logearte para poder guardar tus resultados. Esta página usa
          Supabase como hosting y así aparecerá en el correo y en la
          autenticación de Google.
        </p>
      </div>
    </div>
  );
}
