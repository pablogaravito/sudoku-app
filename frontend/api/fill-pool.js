// api/fill-pool.js
//
// POST /api/fill-pool
// Body: { secret, difficulty?, count? }
//
// Pre-generates puzzles and stores them in the pool.
// Protected by a secret so only you can call it.
// Can be called manually or set up as a Vercel cron job.
//
// Usage:
//   curl -X POST https://yourapp.vercel.app/api/fill-pool \
//     -H "Content-Type: application/json" \
//     -d '{"secret":"your_fill_secret","difficulty":"hard","count":10}'

import { createClient } from '@supabase/supabase-js';
import { generatePuzzle } from '../src/logic/generator.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard', 'expert', 'insane'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple secret protection
  const { secret, difficulty, count = 5 } = req.body;
  if (secret !== process.env.FILL_POOL_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Fill all difficulties if none specified
  const difficulties = difficulty
    ? [difficulty]
    : VALID_DIFFICULTIES;

  const results = {};

  for (const diff of difficulties) {
    if (!VALID_DIFFICULTIES.includes(diff)) continue;
    results[diff] = { generated: 0, failed: 0 };

    for (let i = 0; i < count; i++) {
      try {
        const { puzzle, solution } = generatePuzzle(diff);
        await supabase.from('puzzles').insert({
          difficulty: diff,
          clues:      puzzle,
          solution:   solution.map(r => [...r]),
        });
        results[diff].generated++;
      } catch (err) {
        console.error(`Failed to generate ${diff}:`, err);
        results[diff].failed++;
      }
    }
  }

  return res.status(200).json({ success: true, results });
}
