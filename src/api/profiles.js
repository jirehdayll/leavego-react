import { supabase } from '../lib/supabaseClient';

export const profilesAPI = {
  // Get all profiles
  getAll: async () => {
    return await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
  },

  // Get by ID
  getById: async (id) => {
    return await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
  },

  // Create profile
  create: async (profileData) => {
    return await supabase
      .from('profiles')
      .insert([{
        ...profileData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();
  },

  // Update profile
  update: async (id, updates) => {
    return await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
  },

  // Toggle active status
  toggleActive: async (id, currentStatus) => {
    return await supabase
      .from('profiles')
      .update({ 
        is_active: !currentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
  },

  // Check for duplicates
  checkDuplicate: async (email, fullName) => {
    try {
      // Check profiles table first
      const { data: profileExists, error: profileError } = await supabase
        .from('profiles')
        .select('id, denr_email, full_name')
        .or(`denr_email.eq.${email},email.eq.${email},full_name.eq.${fullName}`)
        .maybeSingle();

      if (profileExists) {
        return { exists: true, type: 'profile', data: profileExists };
      }

      // Also check auth users (in case profile wasn't created yet)
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUserExists = authUsers.users.find(user => 
        user.email === email || 
        user.user_metadata?.full_name === fullName
      );

      if (authUserExists) {
        return { exists: true, type: 'auth', data: authUserExists };
      }

      return { exists: false, type: null, data: null };
    } catch (error) {
      console.error('Duplicate check error:', error);
      // If error occurs, allow creation but log it
      return { exists: false, type: null, data: null };
    }
  }
};
