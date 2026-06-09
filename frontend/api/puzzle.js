// api/puzzle.js
//
// GET /api/puzzle?difficulty=hard&userId=xxx
//
// Returns a puzzle the user hasn't played yet.
// If the pool is running low, triggers background generation.
// Solution is NEVER sent to the client.
//
// Uses service_role key — runs server-side only.

import { createClient } from '@supabase/supabase-js';
import { generatePuzzle } from '../src/logic/generator.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // server-only, never sent to client
);

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard', 'expert', 'insane'];
const POOL_MINIMUM = 5; // trigger refill when pool drops below this

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { difficulty = 'medium', userId } = req.query;

  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    return res.status(400).json({ error: 'Invalid difficulty' });
  }
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    // Find a puzzle this user hasn't played yet
    const { data: puzzle, error } = await supabase
      .from('puzzles')
      .select('id, difficulty, clues')  // deliberately exclude solution
      .eq('difficulty', difficulty)
      .not('id', 'in', `(
        select puzzle_id from puzzle_plays where user_id = '${userId}'
      )`)
      .limit(1)
      .single();

    if (error || !puzzle) {
      // No unplayed puzzles in pool — generate one on the spot
      console.log(`No pooled puzzle for ${difficulty}, generating on demand`);
      const { puzzle: clues, solution } = generatePuzzle(difficulty);

      // Store it in the pool for future users
      const { data: stored, error: insertError } = await supabase
        .from('puzzles')
        .insert({
          difficulty,
          clues:    clues,
          solution: solution.map(r => [...r]), // unfreeze for JSON storage
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      return res.status(200).json({
        puzzleId:   stored.id,
        difficulty,
        clues,
      });
    }

    // Check if pool is running low — trigger background refill
    const { count } = await supabase
      .from('puzzles')
      .select('*', { count: 'exact', head: true })
      .eq('difficulty', difficulty)
      .not('id', 'in', `(
        select puzzle_id from puzzle_plays where user_id = '${userId}'
      )`);

    if ((count ?? 0) < POOL_MINIMUM) {
      // Fire and forget — don't wait for this
      refillPool(difficulty).catch(err =>
        console.error('Background refill failed:', err)
      );
    }

    return res.status(200).json({
      puzzleId:   puzzle.id,
      difficulty: puzzle.difficulty,
      clues:      puzzle.clues,
    });

  } catch (err) {
    console.error('Error serving puzzle:', err);
    return res.status(500).json({ error: 'Failed to get puzzle' });
  }
}

// Generate and store a batch of puzzles in the background
async function refillPool(difficulty, count = 3) {
  console.log(`Refilling pool for ${difficulty} (${count} puzzles)`);
  for (let i = 0; i < count; i++) {
    try {
      const { puzzle, solution } = generatePuzzle(difficulty);
      await supabase.from('puzzles').insert({
        difficulty,
        clues:    puzzle,
        solution: solution.map(r => [...r]),
      });
    } catch (err) {
      console.error(`Failed to generate ${difficulty} puzzle:`, err);
    }
  }
}
