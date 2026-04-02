export const USER_ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
};

export const APP_ROUTES = {
  LOGIN: '/login',
  ROOT: '/',
  SELECTION: '/selection',
  ADMIN_DASHBOARD: '/admin/dashboard',
};

// Keep this tiny and intentional.
// This is only a bootstrap fallback when a valid admin account exists
// in auth but its profile row was not created yet.
export const BOOTSTRAP_ADMIN_EMAILS = new Set(['admin@denr.gov.ph']);

export const LEAVE_REQUEST_ORDER_COLUMNS = Object.freeze([
  'submitted_at',
  'updated_at',
  'admin_seen_at',
  'id',
  'status',
  'request_type',
]);

export const DEFAULT_LEAVE_REQUEST_ORDER_BY = 'submitted_at';
