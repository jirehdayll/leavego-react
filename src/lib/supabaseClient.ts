import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl?.trim() || !supabaseAnonKey?.trim()) {
  console.error(
    '[LeaveGo] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and set values from the Supabase dashboard.'
  );
}

/**
 * Browser-only Supabase client (anon key). Never put the service role key in Vite —
 * it is embedded in the JS bundle and is a full database bypass.
 *
 * Admin auth operations: Supabase Dashboard → Authentication, or use the Node scripts
 * in /scripts with a local-only env file (see scripts/README.txt).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
