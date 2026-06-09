// usePuzzle.js
// Fetches a puzzle from the Vercel API instead of generating locally.
// Returns { puzzle, puzzleId, loading, error }

import { useState, useEffect } from 'react';

export function usePuzzle(difficulty, userId) {
  const [puzzle, setPuzzle]     = useState(null);
  const [puzzleId, setPuzzleId] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!difficulty || !userId) return;
    setLoading(true);
    setError(null);
    setPuzzle(null);
    setPuzzleId(null);

    fetch(`/api/puzzle?difficulty=${difficulty}&userId=${userId}`)
      .then(res => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setPuzzle(data.clues);
        setPuzzleId(data.puzzleId);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch puzzle:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [difficulty, userId]);

  return { puzzle, puzzleId, loading, error };
}

/**
 * Submit a completed board for validation.
 * Returns { valid, difficulty } or throws on error.
 */
export async function submitPuzzle(puzzleId, userId, board, time, hintsUsed) {
  const res = await fetch('/api/submit', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ puzzleId, userId, board, time, hintsUsed }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? 'Submission failed');
  }

  return res.json();
}
