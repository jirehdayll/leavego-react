import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase env vars are missing');
}

// Regular client for normal operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with service role privileges for user management
// Fallback to regular client if service role key is not available
export const supabaseAdmin = supabaseServiceRoleKey && supabaseServiceRoleKey !== 'your_service_role_key_here'
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase; // Fallback to regular client
