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
  }
};
