import { supabase } from '../lib/supabaseClient';

export const leaveRequestsAPI = {
  // Get all requests
  getAll: async (filters = {}) => {
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
    
    return await query;
  },

  // Get by ID
  getById: async (id) => {
    return await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single();
  },

  // Create new request
  create: async (requestData) => {
    return await supabase
      .from('leave_requests')
      .insert([{
        ...requestData,
        submitted_at: new Date().toISOString(),
        is_archived: false,
        status: 'Pending'
      }])
      .select();
  },

  // Update request
  update: async (id, updates) => {
    return await supabase
      .from('leave_requests')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
  },

  // Archive request
  archive: async (id) => {
    return await supabase
      .from('leave_requests')
      .update({ 
        is_archived: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
  },

  // Delete request
  delete: async (id) => {
    return await supabase
      .from('leave_requests')
      .delete()
      .eq('id', id);
  },

  // Get count
  getCount: async (filters = {}) => {
    let query = supabase.from('leave_requests').select('*', { count: 'exact', head: true });
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.is_archived !== undefined) {
      query = query.eq('is_archived', filters.is_archived);
    }
    
    return await query;
  }
};
