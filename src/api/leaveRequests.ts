// TypeScript API Layer for Leave Requests
// Provides type-safe API calls with comprehensive error handling

import { supabase } from '../lib/supabaseClient';
import { normalizeLeaveRequestOrderBy, withTimestamp } from '../utils/leaveRequests';
import { errorHandlingService, handleApiCall } from '../services/errorHandlingService';
import type {
  LeaveRequest,
  CreateLeaveRequestData,
  UpdateLeaveRequestData,
  LeaveRequestFilters,
  ApiResponse,
  PaginatedResponse
} from '../types';

function handleResult<T>(result: any, context: string): ApiResponse<T> {
  if (result?.error) {
    const enhancedError = errorHandlingService.enhanceError(result.error, `leaveRequestsAPI.${context}`);
    errorHandlingService.logError(enhancedError, { context, result });
    throw enhancedError;
  }
  return result;
}

function mapFromDb(request: LeaveRequest): LeaveRequest {
  if (!request) return request;
  if (request.status === ('Pending' as any) && request.admin_approved && !request.cenro_approved) {
    return {
      ...request,
      status: 'Pending CENRO Approval'
    };
  }
  return request;
}

function mapListFromDb(requests: LeaveRequest[]): LeaveRequest[] {
  if (!requests) return [];
  return requests.map(mapFromDb);
}

function mapToDb(updates: UpdateLeaveRequestData): UpdateLeaveRequestData {
  if (!updates) return updates;
  const mapped = { ...updates };
  if (mapped.status === 'Pending CENRO Approval') {
    mapped.status = 'Pending' as any;
  }
  return mapped;
}

export const leaveRequestsAPI = {
  // Get all leave requests with optional filtering
  getAll: async (filters: LeaveRequestFilters = {}): Promise<ApiResponse<LeaveRequest[]>> => {
    return handleApiCall(async () => {
      let query = supabase.from('leave_requests').select('*');

      // Apply filters
      if (filters.status) {
        if (filters.status === 'Pending CENRO Approval') {
          query = query.eq('status', 'Pending').eq('admin_approved', true);
        } else if (filters.status === 'Pending') {
          query = query.eq('status', 'Pending').eq('admin_approved', false);
        } else {
          query = query.eq('status', filters.status);
        }
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

      // Apply ordering
      const orderBy = normalizeLeaveRequestOrderBy(filters.orderBy);
      const result = await query.order(orderBy, { ascending: false });

      const mappedResult = {
        ...result,
        data: result.data ? mapListFromDb(result.data) : null
      };

      return handleResult<LeaveRequest[]>(mappedResult, 'getAll');
    }, 'Fetching leave requests');
  },

  // Get a single leave request by ID
  getById: async (id: string): Promise<ApiResponse<LeaveRequest>> => {
    return handleApiCall(async () => {
      const result = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', id)
        .single();

      const mappedResult = {
        ...result,
        data: result.data ? mapFromDb(result.data) : null
      };

      return handleResult<LeaveRequest>(mappedResult, 'getById');
    }, 'Fetching leave request');
  },

  // Create a new leave request
  create: async (requestData: CreateLeaveRequestData): Promise<ApiResponse<LeaveRequest>> => {
    return handleApiCall(async () => {
      const result = await supabase
        .from('leave_requests')
        .insert([{
          ...requestData,
          submitted_at: new Date().toISOString(),
          is_archived: false,
          status: 'Pending' as const,
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

      const mappedResult = {
        ...result,
        data: mapFromDb(result.data)
      };

      return mappedResult as ApiResponse<LeaveRequest>;
    }, 'Creating leave request');
  },

  // Update an existing leave request
  update: async (id: string, updates: UpdateLeaveRequestData): Promise<ApiResponse<LeaveRequest[]>> => {
    return handleApiCall(async () => {
      const result = await supabase
        .from('leave_requests')
        .update(withTimestamp(mapToDb(updates)))
        .eq('id', id);

      const mappedResult = {
        ...result,
        data: result.data ? mapListFromDb(result.data) : null
      };

      return handleResult<LeaveRequest[]>(mappedResult, 'update');
    }, 'Updating leave request');
  },

  // Archive a leave request
  archive: async (id: string): Promise<ApiResponse<LeaveRequest[]>> => {
    return handleApiCall(async () => {
      const result = await supabase
        .from('leave_requests')
        .update(withTimestamp({ is_archived: true }))
        .eq('id', id);

      const mappedResult = {
        ...result,
        data: result.data ? mapListFromDb(result.data) : null
      };

      return handleResult<LeaveRequest[]>(mappedResult, 'archive');
    }, 'Archiving leave request');
  },

  // Delete a leave request (soft delete by archiving)
  delete: async (id: string): Promise<ApiResponse<LeaveRequest[]>> => {
    return handleApiCall(async () => {
      const result = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', id);

      const mappedResult = {
        ...result,
        data: result.data ? mapListFromDb(result.data) : null
      };

      return handleResult<LeaveRequest[]>(mappedResult, 'delete');
    }, 'Deleting leave request');
  },

  // Get count of leave requests with optional filters
  getCount: async (filters: Omit<LeaveRequestFilters, 'orderBy'> = {}): Promise<{ count: number | null; error: any }> => {
    return handleApiCall(async () => {
      let query = supabase.from('leave_requests').select('*', { count: 'exact', head: true });

      if (filters.status) {
        if (filters.status === 'Pending CENRO Approval') {
          query = query.eq('status', 'Pending').eq('admin_approved', true);
        } else if (filters.status === 'Pending') {
          query = query.eq('status', 'Pending').eq('admin_approved', false);
        } else {
          query = query.eq('status', filters.status);
        }
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

      const result = await query;
      if (result?.error) {
        console.error('[leaveRequestsAPI.getCount]', result.error);
      }
      return result;
    }, 'Getting leave request count');
  },

  // Get paginated leave requests
  getPaginated: async (
    page: number = 1,
    limit: number = 10,
    filters: LeaveRequestFilters = {}
  ): Promise<PaginatedResponse<LeaveRequest>> => {
    return handleApiCall(async () => {
      const offset = (page - 1) * limit;
      
      // Get total count first
      const countResult = await leaveRequestsAPI.getCount(filters);
      const totalCount = countResult.count || 0;
      
      // Get paginated data
      let query = supabase
        .from('leave_requests')
        .select('*')
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters.status) {
        if (filters.status === 'Pending CENRO Approval') {
          query = query.eq('status', 'Pending').eq('admin_approved', true);
        } else if (filters.status === 'Pending') {
          query = query.eq('status', 'Pending').eq('admin_approved', false);
        } else {
          query = query.eq('status', filters.status);
        }
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

      // Apply ordering
      const orderBy = normalizeLeaveRequestOrderBy(filters.orderBy);
      const result = await query.order(orderBy, { ascending: false });

      const data = result.data ? mapListFromDb(result.data) : [];
      const hasMore = offset + data.length < totalCount;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        data,
        error: result.error,
        count: totalCount,
        hasMore,
        page,
        totalPages
      };
    }, 'Fetching paginated leave requests');
  },

  // Bulk update multiple requests
  bulkUpdate: async (updates: Array<{ id: string; data: UpdateLeaveRequestData }>): Promise<ApiResponse<LeaveRequest[]>> => {
    return handleApiCall(async () => {
      const promises = updates.map(({ id, data }) => 
        leaveRequestsAPI.update(id, data)
      );
      
      const results = await Promise.allSettled(promises);
      const errors = results.filter(result => result.status === 'rejected');
      
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} requests`);
      }

      // Refetch all updated requests
      const ids = updates.map(u => u.id);
      const { data } = await supabase
        .from('leave_requests')
        .select('*')
        .in('id', ids);

      return { data: data ? mapListFromDb(data) : null, error: null };
    }, 'Bulk updating leave requests');
  },

  // Search leave requests
  search: async (searchTerm: string, filters: LeaveRequestFilters = {}): Promise<ApiResponse<LeaveRequest[]>> => {
    return handleApiCall(async () => {
      let query = supabase
        .from('leave_requests')
        .select('*')
        .or(`user_name.ilike.%${searchTerm}%,user_email.ilike.%${searchTerm}%`);

      // Apply additional filters
      if (filters.status) {
        if (filters.status === 'Pending CENRO Approval') {
          query = query.eq('status', 'Pending').eq('admin_approved', true);
        } else if (filters.status === 'Pending') {
          query = query.eq('status', 'Pending').eq('admin_approved', false);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters.request_type) {
        query = query.eq('request_type', filters.request_type);
      }

      if (filters.is_archived !== undefined) {
        query = query.eq('is_archived', filters.is_archived);
      }

      const result = await query.order('submitted_at', { ascending: false });
      
      const mappedResult = {
        ...result,
        data: result.data ? mapListFromDb(result.data) : null
      };

      return handleResult<LeaveRequest[]>(mappedResult, 'searching leave requests');
    }, 'Searching leave requests');
  },

  // Dual approval functions
  // Admin approval - first stage
  adminApprove: async (id: string, adminEmail: string): Promise<ApiResponse<LeaveRequest[]>> => {
    return handleApiCall(async () => {
      const result = await supabase
        .from('leave_requests')
        .update({
          admin_approved: true,
          admin_approved_at: new Date().toISOString(),
          admin_approved_by: adminEmail,
          status: 'Pending'
        })
        .eq('id', id);

      const mappedResult = {
        ...result,
        data: result.data ? mapListFromDb(result.data) : null
      };

      return handleResult<LeaveRequest[]>(mappedResult, 'admin approval');
    }, 'Admin approving request');
  },

  // CENRO approval - second stage
  cenroApprove: async (id: string, cenroEmail: string): Promise<ApiResponse<LeaveRequest[]>> => {
    return handleApiCall(async () => {
      // First check if admin has approved
      const { data: request } = await supabase
        .from('leave_requests')
        .select('admin_approved')
        .eq('id', id)
        .single();

      if (!request?.admin_approved) {
        throw new Error('Admin approval required before CENRO approval');
      }

      const result = await supabase
        .from('leave_requests')
        .update({
          cenro_approved: true,
          cenro_approved_at: new Date().toISOString(),
          cenro_approved_by: cenroEmail,
          status: 'Approved'
        })
        .eq('id', id);

      const mappedResult = {
        ...result,
        data: result.data ? mapListFromDb(result.data) : null
      };

      return handleResult<LeaveRequest[]>(mappedResult, 'CENRO approval');
    }, 'CENRO approving request');
  },

  // Get pending requests for specific approver
  getPendingForApprover: async (approverEmail: string): Promise<ApiResponse<LeaveRequest[]>> => {
    return handleApiCall(async () => {
      let query = supabase.from('leave_requests').select('*');

      if (approverEmail === 'admin@denr.gov.ph') {
        // Admin sees pending requests that haven't been admin approved yet
        query = query.eq('status', 'Pending').eq('admin_approved', false);
      } else if (approverEmail === 'cenro@denr.gov.ph') {
        // CENRO sees requests that are pending CENRO approval
        query = query.eq('status', 'Pending').eq('admin_approved', true).eq('cenro_approved', false);
      }

      const result = await query.order('submitted_at', { ascending: false });

      const mappedResult = {
        ...result,
        data: result.data ? mapListFromDb(result.data) : null
      };

      return handleResult<LeaveRequest[]>(mappedResult, 'fetching pending requests for approver');
    }, 'Fetching pending requests for approver');
  },

  // Get travel order number for a request
  getTravelOrderNumber: async (id: string): Promise<{ data: string | null; error: any }> => {
    return handleApiCall(async () => {
      const result = await supabase
        .from('leave_requests')
        .select('travel_order_number')
        .eq('id', id)
        .single();

      return {
        data: result.data?.travel_order_number || null,
        error: result.error
      };
    }, 'Getting travel order number');
  }
};

// Export types for external use
export type LeaveRequestsAPI = typeof leaveRequestsAPI;
