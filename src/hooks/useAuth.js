import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching role:', error);
      }
      return profile?.role || 'employee';
    } catch (err) {
      console.error('Role fetch crash:', err);
      return 'employee';
    }
  };

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const r = await fetchRole(session.user.id);
        setRole(r);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const r = await fetchRole(session.user.id);
        setRole(r);
      } else {
        setUser(null);
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    role,
    isAdmin: role === 'admin',
    isEmployee: role === 'employee',
    loading,
  };
}
