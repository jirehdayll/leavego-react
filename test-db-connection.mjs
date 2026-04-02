import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://srjithxfgpuaoqvtoyqr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaml0aHhmZ3B1YW9xdnRveXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5ODM1OTgsImV4cCI6MjA4OTU1OTU5OH0.cL4E_vG8RxGBmBk9i19dH9984E1oNJ0zy2x_Uz-7hGg';

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
