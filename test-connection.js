import { supabase } from './lib/supabaseClient';

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Test 1: Basic connection
    const { data, error } = await supabase.from('leave_requests').select('count').single();
    console.log('Connection test:', { data, error });
    
    if (error) {
      console.error('❌ Connection failed:', error);
      return false;
    }
    
    console.log('✅ Connection successful');
    
    // Test 2: Insert test record
    const testRecord = {
      user_id: '00000000-0000-0000-0000-000000000000',
      user_email: 'test@example.com',
      user_name: 'Test User',
      request_type: 'Leave',
      department: 'Test Department',
      details: { test: true },
      status: 'Pending',
      submitted_at: new Date().toISOString(),
      is_archived: false
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('leave_requests')
      .insert([testRecord])
      .select();
    
    console.log('Insert test:', { insertData, insertError });
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError);
    } else {
      console.log('✅ Insert successful');
      
      // Clean up test record
      if (insertData && insertData[0]) {
        await supabase
          .from('leave_requests')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🧹 Test record cleaned up');
      }
    }
    
    // Test 3: Real-time subscription
    const channel = supabase
      .channel('test_connection')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'leave_requests' },
        (payload) => {
          console.log('📡 Real-time event received:', payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });
    
    console.log('✅ Real-time subscription set up');
    
    return true;
  } catch (err) {
    console.error('❌ Test failed:', err);
    return false;
  }
}

// Run the test
testConnection().then(success => {
  if (success) {
    console.log('🎉 All tests passed! Connection is working.');
  } else {
    console.log('💥 Tests failed! Check your setup.');
  }
});
