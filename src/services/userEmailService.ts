import { supabase } from '../lib/supabaseClient';

// User Email Service for LeaveGo
// This service manages user email registration in Supabase
export const userEmailService = {
  // Register user email in Supabase when account is created
  registerUserEmail: async (email: string, fullName: string, department: string, position: string, role: string) => {
    try {
      console.log('[UserEmailService] Registering user email:', email);
      
      const { data, error } = await supabase
        .from('user_emails')
        .upsert({
          email: email,
          full_name: fullName,
          department: department,
          position: position,
          role: role,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'email'
        });

      if (error) {
        console.error('[UserEmailService] Failed to register user email:', error);
        return { success: false, error };
      }

      console.log('[UserEmailService] User email registered successfully');
      return { success: true, data };
    } catch (error) {
      console.error('[UserEmailService] Error registering user email:', error);
      return { success: false, error };
    }
  },

  // Update user email information
  updateUserEmail: async (email: string, updates: any) => {
    try {
      console.log('[UserEmailService] Updating user email:', email);
      
      const { data, error } = await supabase
        .from('user_emails')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('email', email);

      if (error) {
        console.error('[UserEmailService] Failed to update user email:', error);
        return { success: false, error };
      }

      console.log('[UserEmailService] User email updated successfully');
      return { success: true, data };
    } catch (error) {
      console.error('[UserEmailService] Error updating user email:', error);
      return { success: false, error };
    }
  },

  // Deactivate user email
  deactivateUserEmail: async (email: string) => {
    try {
      console.log('[UserEmailService] Deactivating user email:', email);
      
      const { data, error } = await supabase
        .from('user_emails')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('email', email);

      if (error) {
        console.error('[UserEmailService] Failed to deactivate user email:', error);
        return { success: false, error };
      }

      console.log('[UserEmailService] User email deactivated successfully');
      return { success: true, data };
    } catch (error) {
      console.error('[UserEmailService] Error deactivating user email:', error);
      return { success: false, error };
    }
  },

  // Get user email by email address
  getUserEmail: async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('user_emails')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[UserEmailService] Failed to get user email:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('[UserEmailService] Error getting user email:', error);
      return { success: false, error };
    }
  }
};
