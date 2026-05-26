// useTimer.js
//
// A self-contained hook for a pauseable stopwatch.
// This is a great example of a hook that encapsulates a side effect cleanly.
//
// The interesting bit: we store `startTime` rather than `elapsed` as the
// primary state. Each tick, we compute elapsed = now - startTime instead of
// incrementing a counter. This avoids drift from setInterval imprecision.

import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimer() {
  const [elapsed, setElapsed]   = useState(0);   // seconds
  const [running, setRunning]   = useState(false);
  const startTimeRef = useRef(null); // Date.now() when timer last started
  const intervalRef  = useRef(null);

  const tick = useCallback(() => {
    if (startTimeRef.current == null) return;
    const delta = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setElapsed(prev => prev + delta);
    startTimeRef.current = Date.now(); // reset anchor each tick
  }, []);

  useEffect(() => {
    if (running) {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, tick]);

  const start  = useCallback(() => setRunning(true),  []);
  const pause  = useCallback(() => setRunning(false), []);
  const reset  = useCallback(() => { setRunning(false); setElapsed(0); }, []);
  const toggle = useCallback(() => setRunning(r => !r), []);

  // Format as MM:SS
  const formatted = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  return { elapsed, formatted, running, start, pause, reset, toggle };
}
