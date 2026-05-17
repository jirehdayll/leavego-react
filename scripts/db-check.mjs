import './load-env-admin.mjs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('Testing leave_requests status check constraint...');

// Step 1: Create a mock request
const uuid = '66666666-6666-4666-a666-666666666666';
const mockRequest = {
  id: uuid,
  user_id: '550e8400-e29b-41d4-a716-446655440000',
  user_email: 'test@example.com',
  user_name: 'Test User',
  request_type: 'Leave',
  department: 'Forest Management',
  status: 'Pending',
  details: { leave_type: 'Sick Leave', num_days: 1 },
  submitted_at: new Date().toISOString(),
  is_archived: false,
  seen_by_admin: false,
};

// Clean up first if it exists
await supabase.from('leave_requests').delete().eq('id', uuid);

console.log('Inserting mock request...');
const insertRes = await supabase.from('leave_requests').insert([mockRequest]).select();
if (insertRes.error) {
  console.error('Insert failed:', insertRes.error);
  process.exit(1);
}
console.log('Insert succeeded.');

// Step 2: Try to update status to 'Pending CENRO Approval'
console.log("Updating status to 'Pending CENRO Approval'...");
const updateRes = await supabase
  .from('leave_requests')
  .update({ status: 'Pending CENRO Approval' })
  .eq('id', uuid)
  .select();

if (updateRes.error) {
  console.error('Update failed with error:', updateRes.error);
} else {
  console.log('Update succeeded! Response:', updateRes.data);
}

// Clean up
await supabase.from('leave_requests').delete().eq('id', uuid);
console.log('Cleaned up.');
