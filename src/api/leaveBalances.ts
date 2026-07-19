import { supabase } from '../lib/supabaseClient';

export const leaveBalancesAPI = {
  // Initialize leave balance for a user
  async initializeBalance(userId: string) {
    const { data, error } = await supabase.rpc('initialize_user_leave_balance', {
      p_user_id: userId
    });
    if (error) throw error;
    return data;
  },

  // Get user leave balance summary
  async getUserBalance(userId: string) {
    const { data, error } = await supabase.rpc('get_user_leave_balance_summary', {
      p_user_id: userId
    });
    if (error) throw error;
    return data;
  },

  // Manual balance adjustment (admin function)
  async adjustBalance(
    userId: string,
    leaveType: string,
    amount: number,
    reason: string,
    adminEmail: string
  ) {
    const { data, error } = await supabase.rpc('adjust_leave_balance', {
      p_user_id: userId,
      p_leave_type: leaveType,
      p_amount: amount,
      p_reason: reason,
      p_admin_email: adminEmail
    });
    if (error) throw error;
    return data;
  },

  // Get all balances (for admin dashboard)
  async getAllBalances() {
    const { data, error } = await supabase
      .from('user_leave_balances')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Get balance by user ID
  async getBalanceByUserId(userId: string) {
    console.log('[leaveBalancesAPI] Getting balance for user:', userId);
    const { data, error } = await supabase
      .from('user_leave_balances')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('[leaveBalancesAPI] Error getting balance:', error);
      throw error;
    }
    
    console.log('[leaveBalancesAPI] Balance data retrieved:', data);
    return data;
  },

  // Get user transaction history
  async getUserTransactions(userId: string, limit = 50) {
    const { data, error } = await supabase
      .from('leave_balance_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  // Get all transactions (for admin)
  async getAllTransactions(limit = 100) {
    const { data, error } = await supabase
      .from('leave_balance_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  // Process daily accrual (admin function)
  async processDailyAccrual(targetDate?: string) {
    const { data, error } = await supabase.rpc('process_daily_accrual', {
      p_target_date: targetDate || new Date().toISOString().split('T')[0]
    });
    if (error) throw error;
    return data;
  },

  // Reset fixed-cap leaves (admin function)
  async resetFixedCapLeaves() {
    const { data, error } = await supabase.rpc('reset_fixed_cap_leaves');
    if (error) throw error;
    return data;
  },

  // Trigger yearly rollover of unused leaves to vacation/sick leave
  async triggerYearlyRollover() {
    const { data, error } = await supabase.rpc('yearly_leave_rollover');
    if (error) throw error;
    return data;
  },

  // Ensure all auth users have balance records (helper for new accounts)
  async ensureAllUsersHaveBalances() {
    const { data, error } = await supabase.rpc('ensure_all_users_have_balances');
    if (error) throw error;
    return data;
  },

  // Subscribe to balance changes for a user
  subscribeToBalanceChanges(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`leave_balance_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_leave_balances',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to transaction changes for a user
  subscribeToTransactionChanges(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`leave_transactions_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_balance_transactions',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }
};
