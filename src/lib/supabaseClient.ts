import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase env vars are missing');
}

// Regular client for normal operations
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with service role privileges for user management
// Fallback to regular client if service role key is not available
export const supabaseAdmin: SupabaseClient = supabaseServiceRoleKey && supabaseServiceRoleKey !== 'your_service_role_key_here'
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase; // Fallback to regular client
