import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://srjithxfgpuaoqvtoyqr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaml0aHhmZ3B1YW9xdnRveXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5ODM1OTgsImV4cCI6MjA4OTU1OTU5OH0.cL4E_vG8RxGBmBk9i19dH9984E1oNJ0zy2x_Uz-7hGg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    // Create admin user
    const { data, error } = await supabase.auth.signUp({
      email: 'admin@denr.gov.ph',
      password: 'admin123',
      options: {
        data: {
          full_name: 'System Administrator',
          role: 'admin'
        }
      }
    });
    
    if (error) {
      console.error('Admin creation error:', error);
      return;
    }
    
    console.log('✅ Admin user created');
    
    // Create corresponding profile
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: 'admin@denr.gov.ph',
          denr_email: 'admin@denr.gov.ph',
          full_name: 'System Administrator',
          position: 'System Administrator',
          role: 'admin',
          is_active: true
        });
      
      if (profileError) {
        console.error('Profile creation error:', profileError);
      } else {
        console.log('✅ Admin profile created');
      }
    }
    
    // Test admin login
    console.log('\nTesting admin login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'admin@denr.gov.ph',
      password: 'admin123'
    });
    
    if (loginError) {
      console.error('Login test failed:', loginError);
    } else {
      console.log('✅ Admin login successful');
      console.log('User:', loginData.user?.email);
    }
    
  } catch (err) {
    console.error('Setup failed:', err);
  }
}

createAdminUser();
