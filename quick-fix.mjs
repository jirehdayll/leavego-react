import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://srjithxfgpuaoqvtoyqr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaml0aHhmZ3B1YW9xdnRveXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5ODM1OTgsImV4cCI6MjA4OTU1OTU5OH0.cL4E_vG8RxGBmBk9i19dH9984E1oNJ0zy2x_Uz-7hGg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function quickFix() {
  try {
    console.log('Quick fix for admin access...');
    
    // Get existing user from leave_requests
    const { data: requests, error } = await supabase
      .from('leave_requests')
      .select('user_email')
      .limit(1);
    
    if (error) {
      console.error('Error getting user:', error);
      return;
    }
    
    if (requests && requests.length > 0) {
      const userEmail = requests[0].user_email;
      console.log(`Found existing user: ${userEmail}`);
      
      // Temporarily update App.jsx to use this user as admin
      console.log('Update App.jsx line 57 to:');
      console.log(`const isAdmin = isAuth && userEmail === '${userEmail}';`);
      console.log('Update Selection.jsx line 17 to:');
      console.log(`const isAdmin = userEmail === '${userEmail}';`);
      
      console.log('\nOr create a simple admin login:');
      console.log('Email: jdbjirehdb@gmail.com');
      console.log('Password: (check your email or create a new password)');
    }
    
  } catch (err) {
    console.error('Quick fix failed:', err);
  }
}

quickFix();
