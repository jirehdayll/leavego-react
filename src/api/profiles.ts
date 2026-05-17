import { supabase } from '../lib/supabaseClient';
import { handleApiCall } from '../services/errorHandlingService';

export const profilesAPI = {
  // Get profile by ID
  getById: async (id: string) => {
    return handleApiCall(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }, 'profilesAPI.getById');
  },

  // Get current user's profile
  getCurrent: async () => {
    return handleApiCall(async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }, 'profilesAPI.getCurrent');
  },

  // Update profile
  update: async (id: string, updates: any) => {
    return handleApiCall(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }, 'profilesAPI.update');
  },

  // List all profiles (admin only)
  list: async () => {
    return handleApiCall(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      return data;
    }, 'profilesAPI.list');
  },

  // Check for duplicate email only (full names can be duplicate)
  checkDuplicate: async (email: string, fullName: string) => {
    return handleApiCall(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`denr_email.eq.${email},email.eq.${email}`);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const duplicate = data[0];
        if (duplicate.denr_email === email || duplicate.email === email) {
          return { exists: true, type: 'profile', field: 'email', data: duplicate };
        }
      }
      
      return { exists: false };
    }, 'profilesAPI.checkDuplicate');
  },

  // Create profile
  create: async (profileData: any) => {
    return handleApiCall(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }, 'profilesAPI.create');
  },

  // Toggle active status
  toggleActive: async (id: string, currentStatus: boolean) => {
    return handleApiCall(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }, 'profilesAPI.toggleActive');
  },

  // Delete profile
  delete: async (id: string) => {
    return handleApiCall(async () => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    }, 'profilesAPI.delete');
  }
};
