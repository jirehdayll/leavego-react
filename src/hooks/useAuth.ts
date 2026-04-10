import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { canAccessAdmin, resolveRoleFromProfile } from '../utils/auth';
import { USER_ROLES, UserRole } from '../constants';

interface AuthState {
  user: any | null;
  role: UserRole | null;
  profile: any | null;
  isActive: boolean;
  loading: boolean;
}

const defaultAuthState: AuthState = {
  user: null,
  role: null,
  profile: null,
  isActive: true,
  loading: true,
};

export function useAuth() {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  const resetAuthState = useCallback(() => {
    setUser(null);
    setRole(null);
    setProfile(null);
    setIsActive(true);
  }, []);

  const fetchProfile = useCallback(async (currentUser: any) => {
    try {
      // Use a timeout to prevent hanging indefinitely due to RLS recursion
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );
      
      const queryPromise = supabase
        .from('profiles')
        .select('id, email, denr_email, full_name, role, is_active')
        .eq('id', currentUser.id)
        .maybeSingle();

      const { data: profileData, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) {
        console.error('[useAuth.fetchProfile]', error);
      }

      const isProfileActive = profileData?.is_active !== false;
      const resolvedRole = resolveRoleFromProfile(profileData, currentUser?.email) as UserRole;

      return {
        profile: profileData,
        role: resolvedRole,
        isActive: isProfileActive,
      };
    } catch (err) {
      console.error('[useAuth.fetchProfile] unexpected error', err);
      return {
        profile: null,
        role: resolveRoleFromProfile(null, currentUser?.email) as UserRole,
        isActive: true,
      };
    }
  }, []);

  const applyUserState = useCallback(async (currentUser: any) => {
    if (!currentUser) {
      resetAuthState();
      return;
    }

    setUser(currentUser);

    const profileState = await fetchProfile(currentUser);

    if (profileState.isActive === false) {
      await supabase.auth.signOut();
      resetAuthState();
      return;
    }

    setProfile(profileState.profile);
    setRole(profileState.role);
    setIsActive(profileState.isActive);
  }, [fetchProfile, resetAuthState]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        await applyUserState(session?.user ?? null);
      } catch (err) {
        console.error('[useAuth.initAuth]', err);
        if (mounted) {
          resetAuthState();
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      await applyUserState(session?.user ?? null);
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applyUserState, resetAuthState]);

  return {
    user,
    role,
    profile,
    isActive,
    isAdmin: canAccessAdmin(role, isActive),
    isEmployee: isActive && role === USER_ROLES.EMPLOYEE,
    loading,
  };
}
