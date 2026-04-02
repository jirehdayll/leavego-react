import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://srjithxfgpuaoqvtoyqr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaml0aHhmZ3B1YW9xdnRveXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5ODM1OTgsImV4cCI6MjA4OTU1OTU5OH0.cL4E_vG8RxGBmBk9i19dH9984E1oNJ0zy2x_Uz-7hGg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestAdmin() {
  try {
    console.log('Creating test admin user...');
    
    // Create or sign in test user
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@denr.gov.ph',
      password: 'test123'
    });
    
    if (error && error.message !== 'Invalid login credentials') {
      console.error('Auth error:', error);
      return;
    }
    
    if (error) {
      // User doesn't exist, create it
      console.log('Creating new test user...');
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: 'test@denr.gov.ph',
        password: 'test123',
        options: {
          data: {
            full_name: 'Test Admin',
            role: 'admin'
          }
        }
      });
      
      if (signupError) {
        console.error('Signup error:', signupError);
        return;
      }
      
      console.log('✅ Test user created');
      return;
    }
    
    console.log('✅ Test admin logged in');
    console.log('User:', data.user?.email);
    
    // Try to create profile manually (bypass RLS for testing)
    if (data.user) {
      console.log('Creating admin profile...');
      const { error: profileError } = await supabase.rpc('create_admin_profile', {
        user_id: data.user.id,
        email: 'test@denr.gov.ph',
        full_name: 'Test Admin'
      });
      
      if (profileError) {
        console.log('RPC not available, trying direct insert...');
        // Try direct insert
        const { error: insertError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: 'test@denr.gov.ph',
            denr_email: 'test@denr.gov.ph',
            full_name: 'Test Admin',
            position: 'Test Administrator',
            role: 'admin',
            is_active: true
          }, {
            onConflict: 'id'
          });
        
        if (insertError) {
          console.error('Profile creation failed:', insertError);
        } else {
          console.log('✅ Admin profile created');
        }
      } else {
        console.log('✅ Admin profile created via RPC');
      }
    }
    
  } catch (err) {
    console.error('Setup failed:', err);
  }
}

createTestAdmin();
