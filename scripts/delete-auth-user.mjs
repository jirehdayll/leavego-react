#!/usr/bin/env node
/**
 * Delete an Auth user by UUID (service role, local only).
 * Usage:
 *   npm run admin:delete-user -- 123e4567-e89b-12d3-a456-426614174000
 */
import './load-env-admin.mjs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const [, , userId] = process.argv;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Use .env.admin (see scripts/env.admin.example).');
  process.exit(1);
}
if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
  console.error('Usage: npm run admin:delete-user -- <user-uuid>');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error } = await admin.auth.admin.deleteUser(userId);
if (error) {
  console.error('deleteUser failed:', error.message);
  process.exit(1);
}

console.log('Deleted auth user:', userId);
