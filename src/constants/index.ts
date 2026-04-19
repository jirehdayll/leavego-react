// Centralized Constants for LeaveGo Application

export const USER_ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
  SUPER_ADMIN: 'super_admin'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.EMPLOYEE]: 'Employee',
  [USER_ROLES.SUPER_ADMIN]: 'Super Administrator'
};

export const APP_ROUTES = {
  LOGIN: '/login',
  ROOT: '/',
  SELECTION: '/selection',
  DASHBOARD: '/dashboard',
  ADMIN_DASHBOARD: '/admin/dashboard',
  FORMS_LEAVE: '/forms/leave',
  FORMS_TRAVEL: '/forms/travel',
  SUCCESS: '/success',
  ADMIN_APPROVED: '/admin/approved',
  ADMIN_ARCHIVE: '/admin/archive',
  ADMIN_MONTHLY_SUMMARY: '/admin/monthly-summary',
  ADMIN_ACCOUNT_MANAGEMENT: '/admin/account-management',
  ADMIN_RECORDS: '/admin/records',
  PROFILE_VIEW: '/profile/view/:id'
} as const;

export const REQUEST_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  DECLINED: 'Declined',
  ARCHIVED: 'Archived'
} as const;

export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS];

export const REQUEST_TYPES = {
  LEAVE: 'Leave',
  TRAVEL: 'Travel'
} as const;

export type RequestType = typeof REQUEST_TYPES[keyof typeof REQUEST_TYPES];

export const STATUS_COLORS: Record<RequestStatus, { bg: string; text: string; border: string }> = {
  [REQUEST_STATUS.PENDING]: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200'
  },
  [REQUEST_STATUS.APPROVED]: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200'
  },
  [REQUEST_STATUS.DECLINED]: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200'
  },
  [REQUEST_STATUS.ARCHIVED]: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200'
  }
};

export const LEAVE_TYPES = [
  'Vacation Leave',
  'Mandatory/Forced Leave',
  'Sick Leave',
  'Maternity Leave',
  'Paternity Leave',
  'Special Privilege Leave',
  'Solo Parent Leave',
  'Study Leave',
  '10-Day VAWC Leave',
  'Rehabilitation Privilege',
  'Special Leave Benefits for Women',
  'Special Emergency (Calamity) Leave',
  'Adoption Leave',
] as const;

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

export const APPROPRIATIONS = {
  CDS: 'CDS',
  MOOE: 'MOOE',
  PS: 'PS'
} as const;

export const OFFICES = {
  CENRO_OLONGAPO: 'CENRO Olongapo',
  PENRO_ZAMBALES: 'PENRO Zambales',
  CENRO_SUBIC: 'CENRO Subic',
  CENRO_CASTILLEJOS: 'CENRO Castillejos'
} as const;

export const DEPARTMENTS = [
  'Forest Management',
  'Land Management', 
  'Biodiversity & Wildlife Conservation',
  'Coastal & Marine Resources Management',
  'Administrative Section',
  'Human Resource Management Unit',
  'Finance/Accounting',
  'Records Management',
  'Public Assistance and Complaint Desk',
  'IT Management'
] as const;

export const POSITIONS = [
  'Administrative Officer',
  'HR Management Officer',
  'Records Officer / Custodian',
  'Environmental Management Specialist',
  'Forest Rangers / Forest Technicians',
  'Land Management Officer',
  'IT Specialist'
] as const;

export const SALARY_RANGES = [
  '₱ 1,000 - 5,000',
  '₱ 5,001 - 10,000',
  '₱ 10,001 - 15,000',
  '₱ 15,001 - 20,000',
  '₱ 20,001 - 25,000',
  '₱ 25,001 - 30,000',
  '₱ 30,001 - 35,000',
  '₱ 35,001 - 40,000',
  '₱ 40,001 - 45,000',
  '₱ 45,001 - 50,000',
  '₱ 50,001 and above'
] as const;

export const BOOTSTRAP_ADMIN_EMAILS = new Set(['admin@denr.gov.ph']);

export const LEAVE_REQUEST_ORDER_COLUMNS = Object.freeze([
  'submitted_at',
  'updated_at',
  'admin_seen_at',
  'id',
  'status',
  'request_type',
] as const);

export const DEFAULT_LEAVE_REQUEST_ORDER_BY = 'submitted_at';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [USER_ROLES.ADMIN]: [
    'view_dashboard',
    'approve_requests',
    'decline_requests',
    'archive_requests',
    'manage_accounts',
    'view_reports'
  ],
  [USER_ROLES.EMPLOYEE]: [
    'submit_requests',
    'view_own_requests',
    'edit_own_requests'
  ],
  [USER_ROLES.SUPER_ADMIN]: [
    'view_dashboard',
    'approve_requests',
    'decline_requests',
    'archive_requests',
    'manage_accounts',
    'manage_admins',
    'view_reports',
    'system_settings'
  ]
};
