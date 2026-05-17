#!/usr/bin/env node
/**
 * Create a Supabase Auth user + optional profile row (service role, local only).
 * Usage:
 *   npm run admin:create-user -- you@example.com 'YourPassword123' '{"full_name":"Pat Cruz","role":"employee"}'
 *
 * Env (in .env.admin, not Vite):
 *   SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 */
import './load-env-admin.mjs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const [, , email, password, metaJson = '{}'] = process.argv;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy scripts/env.admin.example to .env.admin and fill values.');
  process.exit(1);
}
if (!email || !password) {
  console.error('Usage: npm run admin:create-user -- <email> <password> [\'{"full_name":"..."}\']');
  process.exit(1);
}

let userMetadata = {};
try {
  userMetadata = JSON.parse(metaJson);
} catch {
  console.error('Third argument must be valid JSON for user_metadata.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: userMetadata,
});

if (error) {
  console.error('createUser failed:', error.message);
  process.exit(1);
}

console.log('Created user id:', data.user?.id);
console.log('Next: ensure public.profiles has a row for this id (app or SQL).');
