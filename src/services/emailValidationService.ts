import { BOOTSTRAP_ADMIN_EMAILS } from '../constants';

export const emailValidationService = {
  isAdminEmail: (email: string | null | undefined): boolean => {
    if (!email) return false;
    return BOOTSTRAP_ADMIN_EMAILS.has(email.toLowerCase());
  },

  isValidDomain: (email: string | null | undefined): boolean => {
    if (!email) return false;
    // Basic domain check
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    
    // You can add white-listed domains here
    // return domains.includes(parts[1]);
    return true;
  }
};
