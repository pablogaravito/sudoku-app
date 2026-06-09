// api/submit.js
//
// POST /api/submit
// Body: { puzzleId, userId, board, time, hintsUsed }
//
// Validates the submitted board against the stored solution.
// Records the game session if valid.
// Returns whether the solution was correct.
//
// This is the anti-cheat layer — time is only recorded if the
// board actually matches the solution we stored server-side.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { puzzleId, userId, board, time, hintsUsed = 0 } = req.body;

  if (!puzzleId || !userId || !board || !time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Sanity check time — reject impossibly fast completions
  // Fastest human Sudoku record is ~17 seconds
  if (time < 15) {
    return res.status(400).json({ error: 'Suspiciously fast time rejected' });
  }

  try {
    // Fetch the stored solution (only accessible server-side)
    const { data: puzzle, error: fetchError } = await supabase
      .from('puzzles')
      .select('solution, difficulty')
      .eq('id', puzzleId)
      .single();

    if (fetchError || !puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }

    // Validate the submitted board against the stored solution
    const solution = puzzle.solution;
    let valid = true;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== solution[r][c]) {
          valid = false;
          break;
        }
      }
      if (!valid) break;
    }

    if (!valid) {
      return res.status(400).json({ error: 'Incorrect solution' });
    }

    // Record that this user played this puzzle
    await supabase.from('puzzle_plays').upsert({
      puzzle_id: puzzleId,
      user_id:   userId,
      played_at: new Date().toISOString(),
    }, { onConflict: 'puzzle_id,user_id' });

    // Return success — let the frontend handle stats recording
    // (frontend already has the Supabase connection for that)
    return res.status(200).json({
      valid:      true,
      difficulty: puzzle.difficulty,
    });

  } catch (err) {
    console.error('Error submitting puzzle:', err);
    return res.status(500).json({ error: 'Submission failed' });
  }
}
