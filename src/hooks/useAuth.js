import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { canAccessAdmin, resolveRoleFromProfile } from '../utils/auth';
import { USER_ROLES } from '../constants/app';

const defaultAuthState = {
  role: null,
  isActive: true,
  profile: null,
};

export function useAuth() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(defaultAuthState.role);
  const [profile, setProfile] = useState(defaultAuthState.profile);
  const [isActive, setIsActive] = useState(defaultAuthState.isActive);
  const [loading, setLoading] = useState(true);

  const resetAuthState = useCallback(() => {
    setUser(null);
    setRole(defaultAuthState.role);
    setProfile(defaultAuthState.profile);
    setIsActive(defaultAuthState.isActive);
  }, []);

  const fetchProfile = useCallback(async (currentUser) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, email, denr_email, full_name, role, is_active')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.error('[useAuth.fetchProfile]', error);
      }

      const isProfileActive = profileData?.is_active !== false;
      const resolvedRole = resolveRoleFromProfile(profileData, currentUser?.email);

      return {
        profile: profileData,
        role: resolvedRole,
        isActive: isProfileActive,
      };
    } catch (err) {
      console.error('[useAuth.fetchProfile] unexpected error', err);
      return {
        profile: null,
        role: resolveRoleFromProfile(null, currentUser?.email),
        isActive: true,
      };
    }
  }, []);

  const applyUserState = useCallback(async (currentUser) => {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
