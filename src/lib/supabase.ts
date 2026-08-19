import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values.'
  )
}

// Table types are hand-maintained in each feature's hooks.ts rather than
// generated, so the client is untyped here — see supabase/schema.sql for
// the source of truth.
export const supabase = createClient(url, anonKey)
