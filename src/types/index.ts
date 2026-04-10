// TypeScript Type Definitions for LeaveGo Application

export interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  position?: string;
  department?: string;
}

export type UserRole = 'admin' | 'employee' | 'super_admin';

export type RequestStatus = 'Pending' | 'Approved' | 'Declined' | 'Archived';

export type RequestType = 'Leave' | 'Travel';

export interface LeaveRequestDetails {
  office_department: string;
  last_name: string;
  first_name: string;
  middle_name?: string;
  date_of_filing: string;
  position: string;
  salary?: string;
  leave_type: string;
  details_of_leave: string;
  num_days: string;
  start_date: string;
  end_date: string;
}

export interface TravelRequestDetails {
  full_name: string;
  position: string;
  salary?: string;
  office_department?: string;
  official_station: string;
  departure_date: string;
  arrival_date: string;
  destination: string;
  purpose: string;
  per_diems: boolean;
  assistants_allowed: boolean;
  appropriations: string;
  remarks?: string;
}

export type RequestDetails = LeaveRequestDetails | TravelRequestDetails;

export interface LeaveRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  request_type: RequestType;
  department?: string;
  status: RequestStatus;
  details: RequestDetails;
  submitted_at: string;
  created_at: string;
  updated_at?: string;
  is_archived: boolean;
  seen_by_admin: boolean;
  admin_seen_at?: string;
}

export interface CreateLeaveRequestData {
  user_id: string;
  user_email: string;
  user_name: string;
  request_type: RequestType;
  department?: string;
  details: RequestDetails;
}

export interface UpdateLeaveRequestData {
  status?: RequestStatus;
  seen_by_admin?: boolean;
  admin_seen_at?: string;
  is_archived?: boolean;
}

export interface LeaveRequestFilters {
  status?: RequestStatus;
  request_type?: RequestType;
  is_archived?: boolean;
  user_email?: string;
  user_id?: string;
  orderBy?: string;
}

export interface ApiResponse<T = any> {
  data: T | null;
  error: any | null;
  count?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  count: number;
  hasMore: boolean;
  page: number;
  totalPages: number;
}

export interface EmailValidationConfig {
  adminEmails: string[];
  domainWhitelist: string[];
  domainBlacklist: string[];
  emailPatterns: RegExp[];
}

export interface EmailValidationResult {
  valid: boolean;
  reason: string;
}

export interface ErrorInfo {
  message: string;
  type: string;
  context?: string;
  timestamp: string;
  stack?: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export interface NotificationConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  declined: number;
  thisMonth: number;
}

export interface AdminStats {
  pendingApplications: number;
  unseenApplications: number;
  approvedTravelOrders: number;
  approvedLeaveOrders: number;
  approvedThisMonth: number;
}

export interface FormValidationErrors {
  [key: string]: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User | null;
  session: any | null;
  error?: string;
}

export interface Permission {
  name: string;
  description?: string;
}

export interface RolePermissions {
  [role: string]: Permission[];
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
