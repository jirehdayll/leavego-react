const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('Testing database access...');
    
    // Test basic connection
    const { data, error } = await supabase.from('leave_requests').select('count');
    
    if (error) {
      console.error('Database error:', error);
      return;
    }
    
    console.log('✅ Database connection successful');
    console.log('Current count:', data);
    
    // Test table structure
    const { data: tableData, error: tableError } = await supabase
      .from('leave_requests')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('Table structure error:', tableError);
    } else {
      console.log('✅ Table accessible');
      console.log('Sample data:', tableData);
    }
    
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

testConnection();
