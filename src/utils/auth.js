import { APP_ROUTES, BOOTSTRAP_ADMIN_EMAILS, USER_ROLES } from '../constants/app';

export function normalizeRole(role) {
  return role === USER_ROLES.ADMIN ? USER_ROLES.ADMIN : USER_ROLES.EMPLOYEE;
}

export function isBootstrapAdminEmail(email) {
  return BOOTSTRAP_ADMIN_EMAILS.has(email || '');
}

export function resolveRoleFromProfile(profile, userEmail) {
  if (profile?.role) {
    return normalizeRole(profile.role);
  }

  if (isBootstrapAdminEmail(userEmail)) {
    return USER_ROLES.ADMIN;
  }

  return USER_ROLES.EMPLOYEE;
}

export function canAccessAdmin(role, isActive = true) {
  return isActive && role === USER_ROLES.ADMIN;
}

export function getDefaultRouteForRole(role) {
  return role === USER_ROLES.ADMIN
    ? APP_ROUTES.ADMIN_DASHBOARD
    : APP_ROUTES.SELECTION;
}
