import { APP_ROUTES, USER_ROLES } from '../constants';
import { emailValidationService } from '../services/emailValidationService';

export function normalizeRole(role) {
  return role === USER_ROLES.ADMIN ? USER_ROLES.ADMIN : USER_ROLES.EMPLOYEE;
}

export function isBootstrapAdminEmail(email) {
  // Use dynamic email validation service instead of static set
  return emailValidationService.isAdminEmail(email);
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
    : '/dashboard';
}
