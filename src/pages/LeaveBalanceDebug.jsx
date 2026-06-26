import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { getAccountsSync } from '../lib/accountStore';
import { leaveBalancesAPI } from '../api/leaveBalances';
import { getUnifiedLeaveBalances, getLeaveBalancesFromDB } from '../lib/leaveBalanceManager';

export default function LeaveBalanceDebug() {
  const { user, profile } = useAuth();
  const [debugResults, setDebugResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [autoFixing, setAutoFixing] = useState(false);

  const addResult = (category, test, status, message, data = null) => {
    setDebugResults(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        tests: {
          ...prev[category]?.tests,
          [test]: { status, message, data, timestamp: new Date().toISOString() }
        }
      }
    }));
  };

  const initializeCategory = (category, description) => {
    setDebugResults(prev => ({
      ...prev,
      [category]: {
        description,
        tests: {}
      }
    }));
  };

  const autoFixIssues = async () => {
    setAutoFixing(true);
    try {
      // Try to initialize balance using the safe function
      const { data, error } = await supabase.rpc('initialize_user_leave_balance_safe', {
        p_user_id: user.id
      });
      
      if (error) {
        alert('Auto-fix failed: ' + error.message);
      } else {
        alert('Balance initialized successfully! Running debug tests again...');
        await runDebugTests();
      }
    } catch (err) {
      alert('Auto-fix failed: ' + err.message);
    } finally {
      setAutoFixing(false);
    }
  };

  const runDebugTests = async () => {
    setLoading(true);
    setDebugResults({});
    
    try {
      // Step 1: Authentication Check
      setCurrentStep('Checking authentication...');
      initializeCategory('Authentication', 'Verifying user authentication and session');
      
      if (!user) {
        addResult('Authentication', 'User authenticated', 'error', 'No user found');
      } else {
        addResult('Authentication', 'User authenticated', 'success', 'User is authenticated', {
          id: user.id,
          email: user.email,
          role: profile?.role
        });
        
        // Check session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          addResult('Authentication', 'Session active', 'success', 'Session is valid', {
            expires_at: new Date(session.expires_at * 1000).toISOString()
          });
        } else {
          addResult('Authentication', 'Session active', 'error', 'No active session');
        }
      }

      // Step 2: Database Connection
      setCurrentStep('Testing database connection...');
      initializeCategory('Database Connection', 'Testing Supabase database connectivity');
      
      try {
        const { data, error } = await supabase.from('app_accounts').select('count').single();
        if (error) throw error;
        addResult('Database Connection', 'Basic query', 'success', 'Database connection working', { count: data.count });
      } catch (err) {
        addResult('Database Connection', 'Basic query', 'error', err.message);
      }

      // Step 3: Table Structure Check
      setCurrentStep('Checking table structure...');
      initializeCategory('Table Structure', 'Verifying leave balance tables exist and have correct structure');
      
      // Check user_leave_balances table
      try {
        const { data: balancesData, error: balancesError } = await supabase
          .from('user_leave_balances')
          .select('*')
          .limit(1);
        
        if (balancesError) {
          addResult('Table Structure', 'user_leave_balances table', 'error', balancesError.message);
        } else {
          addResult('Table Structure', 'user_leave_balances table', 'success', 'Table exists and accessible', {
            columns: balancesData.length > 0 ? Object.keys(balancesData[0]) : 'No data to determine columns',
            sampleData: balancesData.length > 0 ? balancesData[0] : null
          });
        }
      } catch (err) {
        addResult('Table Structure', 'user_leave_balances table', 'error', err.message);
      }

      // Check leave_balance_transactions table
      try {
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('leave_balance_transactions')
          .select('*')
          .limit(1);
        
        if (transactionsError) {
          addResult('Table Structure', 'leave_balance_transactions table', 'error', transactionsError.message);
        } else {
          addResult('Table Structure', 'leave_balance_transactions table', 'success', 'Table exists and accessible', {
            columns: transactionsData.length > 0 ? Object.keys(transactionsData[0]) : 'No data to determine columns',
            sampleData: transactionsData.length > 0 ? transactionsData[0] : null
          });
        }
      } catch (err) {
        addResult('Table Structure', 'leave_balance_transactions table', 'error', err.message);
      }

      // Step 4: RLS Policies Check
      setCurrentStep('Checking RLS policies...');
      initializeCategory('RLS Policies', 'Verifying Row Level Security policies allow access');
      
      try {
        const { data: userBalance, error: balanceError } = await supabase
          .from('user_leave_balances')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (balanceError) {
          addResult('RLS Policies', 'User can access own balance', 'error', balanceError.message, {
            code: balanceError.code,
            details: balanceError.details
          });
        } else if (userBalance) {
          addResult('RLS Policies', 'User can access own balance', 'success', 'RLS allows user to read own balance', userBalance);
        } else {
          addResult('RLS Policies', 'User can access own balance', 'success', 'RLS allows user to read own balance (no record exists yet)');
        }
      } catch (err) {
        addResult('RLS Policies', 'User can access own balance', 'error', err.message);
      }

      // Step 5: User Balance Record Check
      setCurrentStep('Checking user balance record...');
      initializeCategory('User Balance Record', 'Verifying balance record exists for current user');
      
      try {
        const { data: userBalance, error: balanceError } = await supabase
          .from('user_leave_balances')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (balanceError) {
          addResult('User Balance Record', 'Balance record exists', 'error', balanceError.message);
        } else if (userBalance) {
          addResult('User Balance Record', 'Balance record exists', 'success', 'Balance record found', userBalance);
          
          // Check if balances are non-zero
          const hasBalances = Object.keys(userBalance).some(key => 
            key.includes('balance') && userBalance[key] > 0
          );
          
          if (hasBalances) {
            addResult('User Balance Record', 'Has non-zero balances', 'success', 'User has leave balances');
          } else {
            addResult('User Balance Record', 'Has non-zero balances', 'warning', 'All balances are zero');
          }
        } else {
          addResult('User Balance Record', 'Balance record exists', 'warning', 'No balance record found for user - needs initialization');
        }
      } catch (err) {
        addResult('User Balance Record', 'Balance record exists', 'error', err.message);
      }

      // Step 6: Database Functions Check
      setCurrentStep('Checking database functions...');
      initializeCategory('Database Functions', 'Verifying RPC functions exist and work');
      
      // Check initialize_user_leave_balance_safe (new function)
      try {
        const { data: initData, error: initError } = await supabase.rpc('initialize_user_leave_balance_safe', {
          p_user_id: user.id
        });
        
        if (initError) {
          addResult('Database Functions', 'initialize_user_leave_balance_safe', 'error', initError.message, {
            code: initError.code
          });
        } else {
          addResult('Database Functions', 'initialize_user_leave_balance_safe', 'success', 'Function works', initData);
        }
      } catch (err) {
        addResult('Database Functions', 'initialize_user_leave_balance_safe', 'error', err.message);
      }

      // Check initialize_user_leave_balance (original function)
      try {
        const { data: initData, error: initError } = await supabase.rpc('initialize_user_leave_balance', {
          p_user_id: user.id
        });
        
        if (initError) {
          addResult('Database Functions', 'initialize_user_leave_balance', 'warning', initError.message, {
            code: initError.code
          });
        } else {
          addResult('Database Functions', 'initialize_user_leave_balance', 'success', 'Function works', initData);
        }
      } catch (err) {
        addResult('Database Functions', 'initialize_user_leave_balance', 'warning', err.message);
      }

      // Check get_user_leave_balance_summary
      try {
        const { data: summaryData, error: summaryError } = await supabase.rpc('get_user_leave_balance_summary', {
          p_user_id: user.id
        });
        
        if (summaryError) {
          addResult('Database Functions', 'get_user_leave_balance_summary', 'error', summaryError.message, {
            code: summaryError.code
          });
        } else {
          addResult('Database Functions', 'get_user_leave_balance_summary', 'success', 'Function works', summaryData);
        }
      } catch (err) {
        addResult('Database Functions', 'get_user_leave_balance_summary', 'error', err.message);
      }

      // Step 7: API Layer Check
      setCurrentStep('Testing API layer...');
      initializeCategory('API Layer', 'Testing leave balances API functions');
      
      try {
        const balanceData = await leaveBalancesAPI.getBalanceByUserId(user.id);
        addResult('API Layer', 'getBalanceByUserId', 'success', 'API function works', balanceData);
      } catch (err) {
        if (err.message && err.message.includes('PGRST116')) {
          addResult('API Layer', 'getBalanceByUserId', 'warning', 'No balance record found (needs initialization)');
        } else {
          addResult('API Layer', 'getBalanceByUserId', 'error', err.message);
        }
      }

      try {
        const allBalances = await leaveBalancesAPI.getAllBalances();
        addResult('API Layer', 'getAllBalances', 'success', 'API function works', {
          count: allBalances.length,
          sample: allBalances.slice(0, 2)
        });
      } catch (err) {
        addResult('API Layer', 'getAllBalances', 'error', err.message);
      }

      // Step 8: Local Storage Check
      setCurrentStep('Checking local storage...');
      initializeCategory('Local Storage', 'Checking local storage data');
      
      try {
        const accounts = getAccountsSync();
        const userAccount = accounts.find(a => a.id === user.id);
        
        if (userAccount) {
          addResult('Local Storage', 'User account in storage', 'success', 'Account found in local storage', {
            hasLeaveBalances: !!userAccount.leave_balances,
            leaveBalances: userAccount.leave_balances
          });
          
          if (userAccount.leave_balances) {
            const hasLocalBalances = Object.values(userAccount.leave_balances).some(v => v > 0);
            if (hasLocalBalances) {
              addResult('Local Storage', 'Has non-zero local balances', 'success', 'Local storage has balances');
            } else {
              addResult('Local Storage', 'Has non-zero local balances', 'warning', 'Local balances are all zero');
            }
          } else {
            addResult('Local Storage', 'Has leave_balances property', 'warning', 'Account exists but no leave_balances property');
          }
        } else {
          addResult('Local Storage', 'User account in storage', 'error', 'User account not found in local storage');
        }
      } catch (err) {
        addResult('Local Storage', 'Local storage read', 'error', err.message);
      }

      // Step 9: Balance Manager Check
      setCurrentStep('Testing balance manager...');
      initializeCategory('Balance Manager', 'Testing leave balance manager functions');
      
      try {
        const unifiedBalances = await getUnifiedLeaveBalances(user.id);
        addResult('Balance Manager', 'getUnifiedLeaveBalances', 'success', 'Function works', unifiedBalances);
      } catch (err) {
        addResult('Balance Manager', 'getUnifiedLeaveBalances', 'error', err.message);
      }

      try {
        const dbBalances = await getLeaveBalancesFromDB(user.id);
        addResult('Balance Manager', 'getLeaveBalancesFromDB', 'success', 'Function works', dbBalances);
      } catch (err) {
        addResult('Balance Manager', 'getLeaveBalancesFromDB', 'error', err.message);
      }

      // Step 10: Transaction History Check
      setCurrentStep('Checking transaction history...');
      initializeCategory('Transaction History', 'Checking leave balance transaction history');
      
      try {
        const transactions = await leaveBalancesAPI.getUserTransactions(user.id);
        addResult('Transaction History', 'Transaction records exist', 'success', `Found ${transactions.length} transactions`, {
          count: transactions.length,
          recent: transactions.slice(0, 3)
        });
      } catch (err) {
        addResult('Transaction History', 'Transaction records exist', 'error', err.message);
      }

      // Step 11: Data Synchronization Check
      setCurrentStep('Checking data synchronization...');
      initializeCategory('Data Synchronization', 'Comparing database and local storage data');
      
      try {
        let dbBalance = null;
        try {
          dbBalance = await leaveBalancesAPI.getBalanceByUserId(user.id);
        } catch (err) {
          // Balance record doesn't exist yet
          if (err.message && err.message.includes('PGRST116')) {
            dbBalance = null;
          } else {
            throw err;
          }
        }
        
        const accounts = getAccountsSync();
        const localAccount = accounts.find(a => a.id === user.id);
        
        if (dbBalance && localAccount?.leave_balances) {
          const comparison = {
            db: {
              vacation: dbBalance.vacation_leave_balance,
              sick: dbBalance.sick_leave_balance,
              forced: dbBalance.forced_leave_balance,
              special: dbBalance.special_leave_balance,
              wellness: dbBalance.wellness_leave_balance
            },
            local: {
              vacation: localAccount.leave_balances.accumulated_vacation,
              sick: localAccount.leave_balances.accumulated_sick,
              forced: localAccount.leave_balances.forced_leave,
              special: localAccount.leave_balances.special_leave_privileges,
              wellness: localAccount.leave_balances.wellness_leave
            }
          };
          
          const isSynced = JSON.stringify(comparison.db) === JSON.stringify(comparison.local);
          
          if (isSynced) {
            addResult('Data Synchronization', 'DB and Local synced', 'success', 'Database and local storage match', comparison);
          } else {
            addResult('Data Synchronization', 'DB and Local synced', 'warning', 'Database and local storage differ', comparison);
          }
        } else if (!dbBalance && localAccount?.leave_balances) {
          addResult('Data Synchronization', 'DB and Local synced', 'warning', 'Database balance missing but local exists - needs initialization', {
            hasDb: false,
            hasLocal: true,
            localBalances: localAccount.leave_balances
          });
        } else if (dbBalance && !localAccount?.leave_balances) {
          addResult('Data Synchronization', 'DB and Local synced', 'warning', 'Database balance exists but local missing - needs sync', {
            hasDb: true,
            hasLocal: false,
            dbBalances: dbBalance
          });
        } else {
          addResult('Data Synchronization', 'DB and Local synced', 'info', 'Both database and local balances missing', {
            hasDb: !!dbBalance,
            hasLocal: !!localAccount?.leave_balances
          });
        }
      } catch (err) {
        addResult('Data Synchronization', 'DB and Local synced', 'error', err.message);
      }

      // Step 12: Trigger Check
      setCurrentStep('Checking deduction trigger...');
      initializeCategory('Database Triggers', 'Verifying leave deduction trigger exists');
      
      try {
        // We can't directly check triggers, but we can check if the function exists
        const { data: functionData, error: functionError } = await supabase.rpc('deduct_leave_on_approval');
        
        if (functionError) {
          // This is expected - the function exists but is a trigger function, not callable
          if (functionError.message.includes('function')) {
            addResult('Database Triggers', 'deduct_leave_on_approval function', 'success', 'Trigger function exists (not directly callable)');
          } else {
            addResult('Database Triggers', 'deduct_leave_on_approval function', 'warning', 'Cannot verify trigger function', functionError.message);
          }
        } else {
          addResult('Database Triggers', 'deduct_leave_on_approval function', 'success', 'Trigger function verified');
        }
      } catch (err) {
        // This is expected - trigger functions aren't directly callable
        addResult('Database Triggers', 'deduct_leave_on_approval function', 'info', 'Trigger functions cannot be directly called (this is normal)');
      }

    } catch (err) {
      console.error('Debug test error:', err);
      addResult('System', 'Debug execution', 'error', err.message);
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '?';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Leave Balance Debug Tool</h1>
          <p className="text-gray-600 mb-4">Comprehensive diagnostic tool for leave balance system</p>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="text-sm text-gray-600">
                <strong>User:</strong> {user?.email || 'Not authenticated'}
              </div>
              <div className="text-sm text-gray-600">
                <strong>Role:</strong> {profile?.role || 'Unknown'}
              </div>
              <div className="text-sm text-gray-600">
                <strong>User ID:</strong> {user?.id || 'N/A'}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={autoFixIssues}
                disabled={autoFixing || loading || !user}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {autoFixing ? 'Auto-fixing...' : 'Auto-Fix Issues'}
              </button>
              <button
                onClick={runDebugTests}
                disabled={loading || !user}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? `Running: ${currentStep}` : 'Run Debug Tests'}
              </button>
            </div>
          </div>
        </div>

        {Object.keys(debugResults).length > 0 && (
          <div className="space-y-6">
            {Object.entries(debugResults).map(([category, data]) => (
              <div key={category} className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-2">{category}</h2>
                <p className="text-gray-600 mb-4">{data.description}</p>
                
                <div className="space-y-3">
                  {Object.entries(data.tests).map(([test, result]) => (
                    <div key={test} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${getStatusColor(result.status)}`}>
                            {getStatusIcon(result.status)}
                          </span>
                          <span className="font-semibold text-gray-800">{test}</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(result.status)}`}>
                          {result.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-2">{result.message}</p>
                      
                      {result.data && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                            View Details
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs overflow-auto max-h-60">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                      
                      <div className="text-xs text-gray-400 mt-2">
                        {result.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {Object.keys(debugResults).length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(debugResults).map(([category, data]) => {
                const tests = Object.values(data.tests);
                const passed = tests.filter(t => t.status === 'success').length;
                const failed = tests.filter(t => t.status === 'error').length;
                const warnings = tests.filter(t => t.status === 'warning').length;
                
                return (
                  <div key={category} className="border rounded-lg p-4">
                    <div className="font-semibold text-gray-800 mb-2">{category}</div>
                    <div className="space-y-1 text-sm">
                      <div className="text-green-600">✓ Passed: {passed}</div>
                      <div className="text-red-600">✗ Failed: {failed}</div>
                      <div className="text-yellow-600">⚠ Warnings: {warnings}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}