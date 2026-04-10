import { supabase, supabaseAdmin } from '../lib/supabaseClient';
import { handleApiCall } from '../services/errorHandlingService';
import { AuthResponse, User, SignUpWithPasswordCredentials, SignInWithPasswordCredentials } from '@supabase/supabase-js';

export const authAPI = {
  // Get current user
  getCurrentUser: async () => {
    return handleApiCall(async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    }, 'authAPI.getCurrentUser');
  },

  // Sign in
  signIn: async (email: string, password: string): Promise<AuthResponse> => {
    return handleApiCall(async () => {
      const response = await supabase.auth.signInWithPassword({ email, password });
      if (response.error) throw response.error;
      return response;
    }, 'authAPI.signIn');
  },

  // Sign up
  signUp: async (email: string, password: string, options: any = {}): Promise<AuthResponse> => {
    return handleApiCall(async () => {
      const response = await supabase.auth.signUp({ 
        email, 
        password, 
        options 
      });
      if (response.error) throw response.error;
      return response;
    }, 'authAPI.signUp');
  },

  // Sign out
  signOut: async () => {
    return handleApiCall(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }, 'authAPI.signOut');
  },

  // Reset password
  resetPassword: async (email: string) => {
    return handleApiCall(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    }, 'authAPI.resetPassword');
  },

  // Get all users (admin only)
  getAllUsers: async () => {
    return handleApiCall(async () => {
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      return users;
    }, 'authAPI.getAllUsers');
  },

  // Create user (admin only)
  createUser: async (email: string, password: string, userMetadata: Record<string, any> = {}) => {
    return handleApiCall(async () => {
      // First try with admin client if available
      if (supabaseAdmin !== supabase) {
        const { data, error } = await (supabaseAdmin as any).auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: userMetadata
        });
        if (error) throw error;
        return data;
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
        }
      }
      
      return data;
    }, 'authAPI.createUser');
  },

  // Update user (admin only)
  updateUser: async (userId: string, updates: any) => {
    return handleApiCall(async () => {
      // First try with admin client if available
      if (supabaseAdmin !== supabase) {
        const { data, error } = await (supabaseAdmin as any).auth.admin.updateUserById(userId, updates);
        if (error) throw error;
        return data;
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
          
        if (profileError) throw profileError;
        return null;
      }
      
      throw new Error('Cannot update auth user without admin privileges');
    }, 'authAPI.updateUser');
  },

  // Delete user (admin only)
  deleteUser: async (userId: string) => {
    return handleApiCall(async () => {
      const { error } = await (supabaseAdmin as any).auth.admin.deleteUser(userId);
      if (error) throw error;
    }, 'authAPI.deleteUser');
  }
};
