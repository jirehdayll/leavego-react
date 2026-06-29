import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const LeaveBalanceContext = createContext(null);

export const useLeaveBalance = () => {
  const context = useContext(LeaveBalanceContext);
  if (!context) {
    throw new Error('useLeaveBalance must be used within LeaveBalanceProvider');
  }
  return context;
};

export const LeaveBalanceProvider = ({ children }) => {
  const [balances, setBalances] = useState({});
  const [transactions, setTransactions] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);

  // Initialize leave balance for a user
  const initializeBalance = useCallback(async (userId) => {
    try {
      setLoading(prev => ({ ...prev, [userId]: true }));
      setError(null);

      const { data, error } = await supabase.rpc('initialize_user_leave_balance', {
        p_user_id: userId
      });

      if (error) throw error;

      // Refresh balances after initialization
      await fetchUserBalance(userId);

      return data;
    } catch (err) {
      console.error('Error initializing leave balance:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }));
    }
  }, []);

  // Fetch user leave balance summary
  const fetchUserBalance = useCallback(async (userId) => {
    try {
      setLoading(prev => ({ ...prev, [userId]: true }));
      setError(null);

      const { data, error } = await supabase.rpc('get_user_leave_balance_summary', {
        p_user_id: userId
      });

      if (error) throw error;

      setBalances(prev => ({
        ...prev,
        [userId]: data
      }));

      return data;
    } catch (err) {
      console.warn('Balance function not available (database may not be set up yet):', err.message);
      // Return null instead of throwing - allows app to work without balance system
      return null;
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }));
    }
  }, []);

  // Manual balance adjustment (admin function)
  const adjustBalance = useCallback(async (userId, leaveType, amount, reason, adminEmail) => {
    try {
      setLoading(prev => ({ ...prev, [userId]: true }));
      setError(null);

      const { data, error } = await supabase.rpc('adjust_leave_balance', {
        p_user_id: userId,
        p_leave_type: leaveType,
        p_amount: amount,
        p_reason: reason,
        p_admin_email: adminEmail
      });

      if (error) throw error;

      // Refresh balances after adjustment
      await fetchUserBalance(userId);

      return data;
    } catch (err) {
      console.error('Error adjusting leave balance:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }));
    }
  }, [fetchUserBalance]);

  // Fetch user transaction history
  const fetchUserTransactions = useCallback(async (userId, limit = 50) => {
    try {
      setLoading(prev => ({ ...prev, [userId]: true }));
      setError(null);

      const { data, error } = await supabase
        .from('leave_balance_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setTransactions(prev => ({
        ...prev,
        [userId]: data
      }));

      return data;
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }));
    }
  }, []);

  // Fetch all balances (for admin dashboard)
  const fetchAllBalances = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, all: true }));
      setError(null);

      const { data, error } = await supabase
        .from('user_leave_balances')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Convert to user_id keyed object
      const balancesMap = {};
      data.forEach(balance => {
        balancesMap[balance.user_id] = balance;
      });

      setBalances(balancesMap);
      return data;
    } catch (err) {
      console.error('Error fetching all balances:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, all: false }));
    }
  }, []);

  // Batch fetch balances for multiple users
  const fetchBatchBalances = useCallback(async (userIds) => {
    try {
      setLoading(prev => ({ ...prev, batch: true }));
      setError(null);

      const { data, error } = await supabase
        .from('user_leave_balances')
        .select('*')
        .in('user_id', userIds);

      if (error) throw error;

      // Convert to user_id keyed object
      const balancesMap = {};
      data.forEach(balance => {
        balancesMap[balance.user_id] = balance;
      });

      setBalances(prev => ({ ...prev, ...balancesMap }));
      return data;
    } catch (err) {
      console.warn('Batch balance fetch failed (database may not be set up yet):', err.message);
      // Return empty array instead of throwing - allows app to work without balance system
      return [];
    } finally {
      setLoading(prev => ({ ...prev, batch: false }));
    }
  }, []);

  // Real-time subscription to balance changes
  const subscribeToBalanceChanges = useCallback((userId, callback) => {
    const subscription = supabase
      .channel(`leave_balance_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_leave_balances',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('Balance change received:', payload);
          if (callback) callback(payload);
          await fetchUserBalance(userId);
          // Also trigger the custom event for components that depend on it
          window.dispatchEvent(new CustomEvent('leaveBalancesUpdated', { 
            detail: { accountId: userId } 
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchUserBalance]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    balances,
    transactions,
    loading,
    error,
    initializeBalance,
    fetchUserBalance,
    adjustBalance,
    fetchUserTransactions,
    fetchAllBalances,
    fetchBatchBalances,
    subscribeToBalanceChanges,
    clearError
  };

  return (
    <LeaveBalanceContext.Provider value={value}>
      {children}
    </LeaveBalanceContext.Provider>
  );
};
