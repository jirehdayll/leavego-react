import { supabase } from '../lib/supabaseClient';
import { normalizeAccount, type AppAccount } from '../lib/accountStore';

export const appAccountsAPI = {
  list: async (): Promise<{ data: AppAccount[] | null; error: Error | null }> => {
    const { data, error } = await supabase
      .from('app_accounts')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) return { data: null, error };
    return {
      data: (data || []).map((row) => normalizeAccount(row as Record<string, unknown>)),
      error: null,
    };
  },

  getById: async (id: string): Promise<{ data: AppAccount | null; error: Error | null }> => {
    const { data, error } = await supabase.from('app_accounts').select('*').eq('id', id).maybeSingle();
    if (error) return { data: null, error };
    if (!data) return { data: null, error: null };
    return { data: normalizeAccount(data as Record<string, unknown>), error: null };
  },
};
