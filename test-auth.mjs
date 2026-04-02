import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://srjithxfgpuaoqvtoyqr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaml0aHhmZ3B1YW9xdnRveXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5ODM1OTgsImV4cCI6MjA4OTU1OTU5OH0.cL4E_vG8RxGBmBk9i19dH9984E1oNJ0zy2x_Uz-7hGg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  try {
    console.log('Testing authentication...');
    
    // Test sign in with known credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@denr.gov.ph',
      password: 'admin123'
    });
    
    if (error) {
      console.error('Auth error:', error);
      return;
    }
    
    console.log('✅ Authentication successful');
    console.log('User:', data.user?.email);
    console.log('Session exists:', !!data.session);
    
    // Test getting current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Get user error:', userError);
    } else {
      console.log('✅ Current user retrieved:', user?.email);
    }
    
  } catch (err) {
    console.error('Auth test failed:', err);
  }
}

testAuth();
