import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return { role: 'employee', isActive: true };
      }
      
      // If no profile found, check if main admin
      if (!profile) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser?.email === 'admin@denr.gov.ph') {
          return { role: 'admin', isActive: true };
        }
        return { role: 'employee', isActive: true }; // Default to employee for safety
      }
      
      const profileData = {
        role: profile?.role || 'employee',
        isActive: profile?.is_active !== false
      };

      if (profileData.isActive === false) {
        console.log('User is deactivated, signing out...');
        await supabase.auth.signOut();
        return { role: null, isActive: false };
      }

      return profileData;
    } catch (err) {
      console.error('Profile fetch error:', err);
      return { role: 'employee', isActive: true };
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          const profileData = await fetchProfile(session.user.id);
          setRole(profileData.role);
          setIsActive(profileData.isActive);
          
          if (!profileData.isActive) {
            setUser(null);
            setRole(null);
          }
        } else {
          setUser(null);
          setRole(null);
          setIsActive(true);
        }
      } catch (err) {
        console.error('Auth init error:', err);
        if (mounted) {
          setUser(null);
          setRole(null);
          setIsActive(true);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      if (session?.user) {
        setUser(session.user);
        const profileData = await fetchProfile(session.user.id);
        setRole(profileData.role);
        setIsActive(profileData.isActive);
        
        if (!profileData.isActive) {
          setUser(null);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
        setIsActive(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    role,
    isActive,
    isAdmin: role === 'admin' && isActive,
    isEmployee: role === 'employee' && isActive,
    loading,
  };
}
