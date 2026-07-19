import { supabase } from '../lib/supabaseClient';
import { handleApiCall } from '../services/errorHandlingService';
import type { AuthResponse } from '@supabase/supabase-js';

export const authAPI = {
  getCurrentUser: async () => {
    return handleApiCall(async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    }, 'authAPI.getCurrentUser');
  },

  signIn: async (email: string, password: string): Promise<AuthResponse> => {
    return handleApiCall(async () => {
      const response = await supabase.auth.signInWithPassword({ email, password });
      if (response.error) throw response.error;
      return response;
    }, 'authAPI.signIn');
  },

  signUp: async (email: string, password: string, options: Record<string, unknown> = {}) => {
    return handleApiCall(async () => {
      const response = await supabase.auth.signUp({
        email,
        password,
        options: options as { data?: Record<string, unknown> },
      });
      if (response.error) throw response.error;
      return response;
    }, 'authAPI.signUp');
  },

  signOut: async () => {
    return handleApiCall(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }, 'authAPI.signOut');
  },

  resetPassword: async (email: string) => {
    return handleApiCall(async () => {
      const baseUrl = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/password-reset`,
      });
      if (error) throw error;
    }, 'authAPI.resetPassword');
  },

  /**
   * Creates the auth user via public sign-up (anon key). Requires email confirmations
   * / SMTP to be configured in Supabase if your project enforces confirmation.
   * For guaranteed server-side creation, use `npm run admin:create-user` (scripts/).
   */
  createUser: async (email: string, password: string, userMetadata: Record<string, unknown> = {}) => {
    return handleApiCall(async () => {
      const result = await supabase.auth.signUp({
        email,
        password,
        options: { data: userMetadata },
      });
      if (result.error) throw result.error;
      return result.data;
    }, 'authAPI.createUser');
  },

  /** Sends Supabase password recovery email (anon key; rate-limited). */
  sendPasswordRecoveryEmail: async (email: string) => {
    return handleApiCall(async () => {
      const baseUrl = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/password-reset`,
      });
      if (error) throw error;
    }, 'authAPI.sendPasswordRecoveryEmail');
  },
};
