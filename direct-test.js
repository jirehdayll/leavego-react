import { createClient } from '@supabase/supabase-js';

// Direct test with the exact credentials from .env
const supabaseUrl = 'https://srjithxfgpuaoqvtoyqr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaml0aHhmZ3B1YW9xdnRveXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5ODM1OTgsImV4cCI6MjA4OTU1OTU5OH0.cL4E_vG8RxGBmBk9i19dH9984E1oNJ0zy2x_Uz-7hGg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectConnection() {
  console.log('🔍 Testing direct Supabase connection...');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseKey.substring(0, 20) + '...');
  
  try {
    // Test 1: Basic connection - check if table exists
    console.log('\n📋 Test 1: Checking if leave_requests table exists...');
    const { data, error } = await supabase.from('leave_requests').select('count').single();
    
    if (error) {
      console.error('❌ Table check failed:', error);
      
      // If table doesn't exist, try to create it
      if (error.code === 'PGRST116') {
        console.log('🔧 Table does not exist. Attempting to create...');
        await createTable();
      }
    } else {
      console.log('✅ Table exists, current count:', data);
    }
    
    // Test 2: Try to insert a test record
    console.log('\n📝 Test 2: Inserting test record...');
    const testRecord = {
      user_id: '00000000-0000-0000-0000-000000000000',
      user_email: 'test@example.com',
      user_name: 'Direct Test User',
      request_type: 'Leave',
      department: 'Test Department',
      details: { test: true, timestamp: new Date().toISOString() },
      status: 'Pending'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('leave_requests')
      .insert([testRecord])
      .select();
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError);
      
      // Try to fix common issues
      if (insertError.message.includes('column') || insertError.message.includes('field')) {
        console.log('🔧 Column issue detected. Checking table structure...');
        await checkTableStructure();
      }
    } else {
      console.log('✅ Insert successful:', insertData);
      
      // Test 3: Try to fetch the record
      console.log('\n📖 Test 3: Fetching records...');
      const { data: fetchData, error: fetchError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_email', 'test@example.com');
      
      if (fetchError) {
        console.error('❌ Fetch failed:', fetchError);
      } else {
        console.log('✅ Fetch successful, found:', fetchData?.length, 'records');
        fetchData?.forEach(record => {
          console.log('  -', record.user_name, '-', record.request_type, '-', record.status);
        });
      }
      
      // Clean up
      await supabase.from('leave_requests').delete().eq('user_email', 'test@example.com');
      console.log('🧹 Test record cleaned up');
    }
    
  } catch (err) {
    console.error('❌ Connection test failed:', err);
  }
}

async function createTable() {
  console.log('🔨 Creating leave_requests table...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS leave_requests (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      user_email TEXT NOT NULL,
      user_name TEXT NOT NULL,
      request_type TEXT NOT NULL CHECK (request_type IN ('Leave', 'Travel')),
      department TEXT,
      details JSONB NOT NULL,
      status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Declined')),
      submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      is_archived BOOLEAN DEFAULT FALSE,
      seen_by_admin BOOLEAN DEFAULT FALSE,
      admin_seen_at TIMESTAMP WITH TIME ZONE
    );
    
    ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Enable all operations" ON leave_requests FOR ALL USING (true) WITH CHECK (true);
    
    GRANT ALL ON leave_requests TO authenticated;
    GRANT ALL ON leave_requests TO anon;
  `;
  
  // Note: This would need to be run in Supabase SQL Editor, not via client
  console.log('⚠️  Please run this SQL in Supabase SQL Editor:');
  console.log(createTableSQL);
}

async function checkTableStructure() {
  console.log('🔍 Checking table structure...');
  
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Structure check failed:', error);
    } else if (data && data.length > 0) {
      console.log('✅ Table structure found. Columns:', Object.keys(data[0]));
    } else {
      console.log('ℹ️  Table is empty but exists');
    }
  } catch (err) {
    console.error('❌ Structure check error:', err);
  }
}

// Run the test
testDirectConnection().then(() => {
  console.log('\n🏁 Direct connection test completed');
});
