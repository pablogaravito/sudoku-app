// src/lib/supabase.js
//
// A single Supabase client instance shared across the whole app.
// We create it once here and import it wherever we need database/auth access.
//
// The VITE_ prefix is required for Vite to expose env variables to the browser.
// Without it, import.meta.env.VITE_SUPABASE_URL would be undefined.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
