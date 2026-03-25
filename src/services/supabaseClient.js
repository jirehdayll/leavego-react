import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://srjithxfgpuaoqvtoyqr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaml0aHhmZ3B1YW9xdnRveXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2MDQwNzEsImV4cCI6MjA1NzE4MDA3MX0.XVQ8lJoBb0PJZF8Y6l-ORMBr8_i7ybnnbKMq5jKj8fg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
