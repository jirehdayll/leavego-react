import { APP_ROUTES, USER_ROLES } from '../constants';
import { emailValidationService } from '../services/emailValidationService';

export function normalizeRole(role) {
  if (!role) return USER_ROLES.EMPLOYEE;
  const r = String(role).toLowerCase();
  if (r === USER_ROLES.SUPER_ADMIN) return USER_ROLES.SUPER_ADMIN;
  if (r === USER_ROLES.ADMIN) return USER_ROLES.ADMIN;
  if (r === USER_ROLES.CENRO) return USER_ROLES.CENRO;
  return USER_ROLES.EMPLOYEE;
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
  if (!isActive) return false;
  return (
    role === USER_ROLES.ADMIN ||
    role === USER_ROLES.CENRO ||
    role === USER_ROLES.SUPER_ADMIN
  );
}

export function getDefaultRouteForRole(role) {
  if (
    role === USER_ROLES.ADMIN ||
    role === USER_ROLES.CENRO ||
    role === USER_ROLES.SUPER_ADMIN
  ) {
    return APP_ROUTES.ADMIN_DASHBOARD;
  }
  return '/dashboard';
}
