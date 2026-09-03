import { createClient } from '@supabase/supabase-js';

// These come from Cloudflare Pages' environment variables (set in the Pages
// project dashboard → Settings → Environment variables), and from your local
// .env file when running `npm run dev`. Both are prefixed VITE_ so Vite
// exposes them to the browser — this is safe: the anon key is meant to be
// public, since Row Level Security (see supabase/schema.sql) is what actually
// protects the data, not secrecy of this key.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly at build/run time rather than silently misbehaving later —
  // easier to debug than a mysterious blank dashboard.
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set them in .env (local) or in Cloudflare Pages → Settings → Environment variables (deployed).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
