import { supabase } from '../lib/supabaseClient';

export const leaveRequestsAPI = {
  // Get all requests
  getAll: async (filters = {}) => {
    try {
      let query = supabase.from('leave_requests').select('*');
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.request_type) {
        query = query.eq('request_type', filters.request_type);
      }
      
      if (filters.is_archived !== undefined) {
        query = query.eq('is_archived', filters.is_archived);
      }
      
      if (filters.orderBy) {
        query = query.order(filters.orderBy, { ascending: false });
      }
      
      const result = await query;
      console.log('getAll result:', result);
      return result;
    } catch (error) {
      console.error('getAll error:', error);
      return { data: null, error };
    }
  },

  // Get by ID
  getById: async (id) => {
    try {
      const result = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', id)
        .single();
      console.log('getById result:', result);
      return result;
    } catch (error) {
      console.error('getById error:', error);
      return { data: null, error };
    }
  },

  // Create new request
  create: async (requestData) => {
    try {
      const result = await supabase
        .from('leave_requests')
        .insert([{
          ...requestData,
          submitted_at: new Date().toISOString(),
          is_archived: false,
          status: 'Pending',
          seen_by_admin: false
        }])
        .select()
        .single();
      
      console.log('create result:', result);
      
      // Validate the result
      if (result.error) {
        console.error('Database error during create:', result.error);
        throw new Error(result.error.message || 'Failed to create request');
      }
      
      if (!result.data) {
        throw new Error('No data returned from database');
      }
      
      return result;
    } catch (error) {
      console.error('create error:', error);
      return { data: null, error };
    }
  },

  // Update request
  update: async (id, updates) => {
    try {
      const result = await supabase
        .from('leave_requests')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      console.log('update result:', result);
      return result;
    } catch (error) {
      console.error('update error:', error);
      return { data: null, error };
    }
  },

  // Archive request
  archive: async (id) => {
    try {
      const result = await supabase
        .from('leave_requests')
        .update({ 
          is_archived: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      console.log('archive result:', result);
      return result;
    } catch (error) {
      console.error('archive error:', error);
      return { data: null, error };
    }
  },

  // Delete request
  delete: async (id) => {
    try {
      const result = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', id);
      console.log('delete result:', result);
      return result;
    } catch (error) {
      console.error('delete error:', error);
      return { data: null, error };
    }
  },

  // Get count
  getCount: async (filters = {}) => {
    try {
      let query = supabase.from('leave_requests').select('*', { count: 'exact', head: true });
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.is_archived !== undefined) {
        query = query.eq('is_archived', filters.is_archived);
      }
      
      const result = await query;
      console.log('getCount result:', result);
      return result;
    } catch (error) {
      console.error('getCount error:', error);
      return { count: 0, error };
    }
  }
};
