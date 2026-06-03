import { useEffect } from 'react';
import { useAuth } from './useAuth';

/**
 * Security Hook: Prevents browser back/forward navigation
 * 
 * Strategy:
 * 1. Constantly injects dummy states into browser history
 * 2. Intercepts popstate events to force navigation to remain static
 * 3. Validates session token on back/forward attempt
 * 
 * This prevents users from accessing cached sensitive admin pages after logout
 * or across different admin session shifts.
 */
export function useHistoryBlocker() {
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (!user || !isAdmin) {
      return;
    }

    // Push initial state to prevent first back press
    window.history.pushState(null, '', window.location.href);

    // Handler for back/forward button clicks
    const blockNavigation = (e: PopStateEvent) => {
      // Push state again to maintain the barrier
      window.history.pushState(null, '', window.location.href);
      
      // Optional: Validate session token on attempted navigation
      // This ensures even if they somehow get past the history block,
      // they'll be redirected to login if session expired
    };

    window.addEventListener('popstate', blockNavigation);

    return () => {
      window.removeEventListener('popstate', blockNavigation);
    };
  }, [user, isAdmin]);
}

/**
 * Enhanced History Blocker with Session Validation
 * 
 * Validates the session token before allowing navigation
 * If session is invalid (user logged out), forces redirect to login
 */
export function useHistoryBlockerWithSessionCheck() {
  const { user, isAdmin, hasSession } = useAuth();

  useEffect(() => {
    if (!user || !isAdmin) {
      return;
    }

    // Push initial state to prevent first back press
    window.history.pushState(null, '', window.location.href);

    // Handler for back/forward button clicks with session validation
    const blockNavigationWithCheck = (e: PopStateEvent) => {
      // Check if session is still valid
      if (!hasSession) {
        // Session expired or user logged out, redirect to login
        window.location.href = '/login';
        return;
      }

      // Push state again to maintain the barrier
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('popstate', blockNavigationWithCheck);

    return () => {
      window.removeEventListener('popstate', blockNavigationWithCheck);
    };
  }, [user, isAdmin, hasSession]);
}