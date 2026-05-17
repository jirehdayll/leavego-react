import './load-env-admin.mjs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

const commonRpcs = [
  'exec_sql',
  'run_sql',
  'execute_sql',
  'exec',
  'query',
  'run_query'
];

for (const rpc of commonRpcs) {
  try {
    console.log(`Testing RPC: ${rpc}...`);
    const { data, error } = await supabase.rpc(rpc, { sql: 'SELECT 1 as result;' });
    if (!error) {
      console.log(`✅ Found working RPC: ${rpc}! Data:`, data);
      process.exit(0);
    } else {
      console.log(`❌ RPC ${rpc} failed with error code:`, error.code, 'message:', error.message);
    }
  } catch (err) {
    console.log(`❌ RPC ${rpc} threw:`, err.message);
  }
}

console.log('No common SQL RPCs found.');
