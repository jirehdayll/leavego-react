import { createClient } from '@supabase/supabase-js';

const dummyUrl = 'https://placeholder-url-for-leavego-build.supabase.co';
const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkwMDAwMDAwMH0.signature';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || dummyUrl;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || dummyKey;
const supabaseServiceRoleKey = (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string) || dummyKey;

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    '[LeaveGo] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Using fallback dummy credentials to prevent static build crash.'
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

/**
 * Service role client for admin operations that need to bypass RLS.
 * WARNING: This client has full database access and should only be used for
 * server-side or trusted admin operations.
 */
export const supabaseServiceRole = createClient(supabaseUrl, supabaseServiceRoleKey);

