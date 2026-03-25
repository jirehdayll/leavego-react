    import { supabase } from '../services/supabaseClient';

    export async function loginWithRole(email, password) {

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (!data.user) return { user: null, role: null };

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      return {
        user: data.user,
        role: profile?.role || 'employee',
      };
    }