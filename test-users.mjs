import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://srjithxfgpuaoqvtoyqr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaml0aHhmZ3B1YW9xdnRveXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5ODM1OTgsImV4cCI6MjA4OTU1OTU5OH0.cL4E_vG8RxGBmBk9i19dH9984E1oNJ0zy2x_Uz-7hGg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsers() {
  try {
    console.log('Checking existing users...');
    
    // Check if profiles table exists and has users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.error('Profiles table error:', profilesError);
    } else {
      console.log('✅ Profiles found:', profiles.length);
      profiles.forEach(profile => {
        console.log(`- ${profile.email} (${profile.role})`);
      });
    }
    
    // Test creating a test user
    console.log('\nCreating test user...');
    const { data, error } = await supabase.auth.signUp({
      email: 'test@denr.gov.ph',
      password: 'test123',
      options: {
        data: {
          full_name: 'Test User',
          role: 'admin'
        }
      }
    });
    
    if (error) {
      console.error('Signup error:', error);
    } else {
      console.log('✅ Test user created');
    }
    
  } catch (err) {
    console.error('Check failed:', err);
  }
}

checkUsers();
