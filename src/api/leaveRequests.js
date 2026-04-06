import { supabase } from '../lib/supabaseClient';
import { normalizeLeaveRequestOrderBy, withTimestamp } from '../utils/leaveRequests';

function handleResult(result, context) {
  if (result?.error) {
    console.error(`[leaveRequestsAPI.${context}]`, result.error);
  }
  return result;
}

export const leaveRequestsAPI = {
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

      if (filters.user_email) {
        query = query.eq('user_email', filters.user_email);
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      const orderBy = normalizeLeaveRequestOrderBy(filters.orderBy);
      const result = await query.order(orderBy, { ascending: false });

      return handleResult(result, 'getAll');
    } catch (error) {
      console.error('[leaveRequestsAPI.getAll] unexpected error', error);
      return { data: null, error };
    }
  },

  getById: async (id) => {
    try {
      const result = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', id)
        .single();

      return handleResult(result, 'getById');
    } catch (error) {
      console.error('[leaveRequestsAPI.getById] unexpected error', error);
      return { data: null, error };
    }
  },

  create: async (requestData) => {
    try {
      const result = await supabase
        .from('leave_requests')
        .insert([{
          ...requestData,
          submitted_at: new Date().toISOString(),
          is_archived: false,
          status: 'Pending',
          seen_by_admin: false,
        }])
        .select()
        .single();

      if (result.error) {
        throw new Error(result.error.message || 'Failed to create request');
      }

      if (!result.data) {
        throw new Error('No data returned from database');
      }

      return result;
    } catch (error) {
      console.error('[leaveRequestsAPI.create] unexpected error', error);
      return { data: null, error };
    }
  },

  update: async (id, updates) => {
    try {
      const result = await supabase
        .from('leave_requests')
        .update(withTimestamp(updates))
        .eq('id', id);

      return handleResult(result, 'update');
    } catch (error) {
      console.error('[leaveRequestsAPI.update] unexpected error', error);
      return { data: null, error };
    }
  },

  archive: async (id) => {
    try {
      const result = await supabase
        .from('leave_requests')
        .update(withTimestamp({ is_archived: true }))
        .eq('id', id);

      return handleResult(result, 'archive');
    } catch (error) {
      console.error('[leaveRequestsAPI.archive] unexpected error', error);
      return { data: null, error };
    }
  },

  delete: async (id) => {
    try {
      const result = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', id);

      return handleResult(result, 'delete');
    } catch (error) {
      console.error('[leaveRequestsAPI.delete] unexpected error', error);
      return { data: null, error };
    }
  },

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
      if (result?.error) {
        console.error('[leaveRequestsAPI.getCount]', result.error);
      }
      return result;
    } catch (error) {
      console.error('[leaveRequestsAPI.getCount] unexpected error', error);
      return { count: 0, error };
    }
  },
};
