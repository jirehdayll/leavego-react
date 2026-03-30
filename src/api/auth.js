import { supabase, supabaseAdmin } from '../lib/supabaseClient';

export const authAPI = {
  // Get current user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // Sign in
  signIn: async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password });
  },

  // Sign up
  signUp: async (email, password, options = {}) => {
    return await supabase.auth.signUp({ 
      email, 
      password, 
      options 
    });
  },

  // Sign out
  signOut: async () => {
    return await supabase.auth.signOut();
  },

  // Reset password
  resetPassword: async (email) => {
    return await supabase.auth.resetPasswordForEmail(email);
  },

  // Get all users (admin only)
  getAllUsers: async () => {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    return { users, error };
  },

  // Create user (admin only) - using regular signup with admin metadata
  createUser: async (email, password, userMetadata = {}) => {
    try {
      // First try with admin client if available
      if (supabaseAdmin !== supabase) {
        return await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: userMetadata
        });
      }
      
      // Fallback: Use regular signup with metadata and let trigger handle profile creation
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userMetadata
        }
      });
      
      if (error) throw error;
      
      // For regular signup, we need to manually create the profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: email,
            denr_email: email,
            full_name: userMetadata.full_name || '',
            position: userMetadata.position || '',
            role: userMetadata.role || 'employee',
            is_active: true
          });
          
        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't fail the whole process
        }
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Update user (admin only)
  updateUser: async (userId, updates) => {
    try {
      // First try with admin client if available
      if (supabaseAdmin !== supabase) {
        return await supabaseAdmin.auth.admin.updateUserById(userId, updates);
      }
      
      // Fallback: Update profile metadata only
      if (updates.user_metadata) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: updates.user_metadata.full_name,
            position: updates.user_metadata.position,
            role: updates.user_metadata.role,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
          
        return { data: null, error: profileError };
      }
      
      return { data: null, error: new Error('Cannot update auth user without admin privileges') };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Delete user (admin only)
  deleteUser: async (userId) => {
    return await supabaseAdmin.auth.admin.deleteUser(userId);
  }
};
