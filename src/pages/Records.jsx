import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { REQUEST_STATUS, USER_ROLES, DEPARTMENTS, POSITIONS } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { leaveRequestsAPI } from '../api/leaveRequests';
import { LeaveBalanceProvider, useLeaveBalance } from '../contexts/LeaveBalanceContext';
import AdminLayout from '../components/AdminLayout';
import { EmployeeRecordsModal } from '../components/EmployeeRecordsPanel';
import { getUnifiedLeaveBalances, LEAVE_BALANCES_UPDATED_EVENT, recalculateLeaveBalancesFromApprovedRequests } from '../lib/leaveBalanceManager';
import { isFormOfAccount, formatSalaryDisplay } from '../utils/employeeMatching';
import { supabase } from '../lib/supabaseClient';
import { X, User, RefreshCw, Filter, ChevronDown, Edit3 } from 'lucide-react';

// ─── Email Masking Utility ─────────────────────────────────────────────────────
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '—';
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;
  
  // Show first 3 characters, mask the rest with asterisks
  const visibleChars = Math.min(3, localPart.length);
  const maskedPart = localPart.slice(0, visibleChars) + '*'.repeat(Math.max(3, localPart.length - visibleChars));
  return `${maskedPart}@${domain}`;
}

function RecordsContent() {
  const { getAccounts, accountsReady } = useAuth();
  const { fetchBatchBalances, balances } = useLeaveBalance();
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [allForms, setAllForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('az');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateRange, setFilterDateRange] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [editCountModal, setEditCountModal] = useState({ isOpen: false, employee: null, currentCount: 0, newCount: 0 });
  const [editAppNumberModal, setEditAppNumberModal] = useState({ isOpen: false, currentYear: new Date().getFullYear(), currentSequence: 0, newSequence: 0, currentApprovedCount: 0 });
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);
    setError(null);
    
    try {
      const userAccounts = getAccounts();
      console.log('Fetched accounts from localStorage:', userAccounts?.length || 0);
      
      const { data: formsData, error: formsError } = await leaveRequestsAPI.getAll({});
      
      if (formsError) {
        console.error('Error fetching forms from Supabase:', formsError);
        setError('Failed to load forms from database. Please try again.');
        setAllForms([]);
      } else {
        setAllForms(formsData || []);
        console.log('Fetched forms from Supabase:', formsData?.length || 0);
      }
      
      // Ensure leave balances are initialized for all accounts (in memory only, don't save)
      const accountsWithBalances = userAccounts?.map(acc => {
        if (!acc.leave_balances) {
          return {
            ...acc,
            leave_balances: {
              forced_leave: 5,
              special_leave_privileges: 3,
              wellness_leave: 5,
              accumulated_sick: 10,
              accumulated_vacation: 10,
              last_accumulation_date: new Date().toISOString()
            }
          };
        }
        return acc;
      }) || [];
      
      // Recalculate balances for every employee from the approved requests currently loaded.
      // This keeps Admin Records aligned with User Leave Balance.
      const employeeIds = userAccounts
        ?.filter(a => a.role !== USER_ROLES.ADMIN && a.role !== USER_ROLES.SUPER_ADMIN)
        .map(a => a.id) || [];

      await Promise.all(
        employeeIds.map((employeeId) =>
          recalculateLeaveBalancesFromApprovedRequests(employeeId, formsData || [])
        )
      );

      const refreshedAccounts = getAccounts()?.map(acc => {
        const recalculated = JSON.parse(localStorage.getItem('userAccounts') || '[]')
          .find(a => a.id === acc.id);
        return recalculated || acc;
      }) || accountsWithBalances;

      setAccounts(refreshedAccounts);
      
      // Fetch leave balances for all employees after recalculation.
      try {
        if (employeeIds.length > 0) {
          await fetchBatchBalances(employeeIds);
        }
      } catch (balanceError) {
        console.warn('Balance fetching failed (balance system may not be set up yet):', balanceError);
      }
    } catch (err) {
      console.error('Fetch data error:', err);
      setError('Failed to load data. Please try again.');
      setAllForms([]);
      setAccounts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAccounts, accountsReady, fetchBatchBalances]);

  useEffect(() => {
    if (accountsReady) fetchData();
  }, [fetchData, accountsReady]);

  useEffect(() => {
    const handleBalancesUpdated = async () => {
      // Refresh balances from database for all displayed accounts
      const { getLeaveBalancesFromDB } = await import('../lib/leaveBalanceManager');
      for (const account of accounts) {
        await getLeaveBalancesFromDB(account.id);
      }
      setBalanceRefreshKey((k) => k + 1);
    };
    window.addEventListener(LEAVE_BALANCES_UPDATED_EVENT, handleBalancesUpdated);
    
    // Also refresh when an account is updated
    const handleAccountUpdated = () => {
      fetchData();
    };
    window.addEventListener('accountUpdated', handleAccountUpdated);
    
    return () => {
      window.removeEventListener(LEAVE_BALANCES_UPDATED_EVENT, handleBalancesUpdated);
      window.removeEventListener('accountUpdated', handleAccountUpdated);
    };
  }, [fetchData, accounts]);

  // Real-time subscription to app_accounts table changes
  useEffect(() => {
    const channel = supabase
      .channel('app-accounts-realtime-records')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'app_accounts'
        },
        (payload) => {
          console.log('[Records Realtime] Change detected in app_accounts:', payload);
          // Silent fetch to update page records without disruptive loading spinner
          fetchData();
        }
      )
      .subscribe((status) => {
        console.log('[Records Realtime] Subscription status:', status);
        setConnectionStatus(status === 'SUBSCRIBED' ? 'connected' : 'connecting');
      });

    return () => {
      console.log('[Records Realtime] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Real-time subscription to user_leave_balances table changes
  useEffect(() => {
    const channel = supabase
      .channel('user-leave-balances-realtime-records')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_leave_balances'
        },
        async (payload) => {
          console.log('[Records Realtime] Change detected in user_leave_balances:', payload);
          // Refresh balances from database for the affected user
          const { getLeaveBalancesFromDB } = await import('../lib/leaveBalanceManager');
          if (payload.new?.user_id) {
            await getLeaveBalancesFromDB(payload.new.user_id);
          }
          // Silent fetch to update page records without disruptive loading spinner
          fetchData();
        }
      )
      .subscribe((status) => {
        console.log('[Records Realtime] user_leave_balances subscription status:', status);
      });

    return () => {
      console.log('[Records Realtime] Cleaning up user_leave_balances subscription');
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Auto-select employee from URL query parameter
  useEffect(() => {
    const userId = searchParams.get('userId');
    if (userId && accounts.length > 0 && !selectedEmployee) {
      const employee = accounts.find(a => a.id === userId);
      if (employee) {
        setSelectedEmployee(employee);
      }
    }
  }, [searchParams, accounts, selectedEmployee]);

  // Get dynamic departments and positions from localStorage
  const allDepartments = [...DEPARTMENTS, ...JSON.parse(localStorage.getItem('customDepartments') || '[]')];
  const allPositions = [...POSITIONS, ...JSON.parse(localStorage.getItem('customPositions') || '[]')];

  // Handle edit approved count
  const handleEditCountClick = (acc, currentCount) => {
    setEditCountModal({
      isOpen: true,
      employee: acc,
      currentCount: acc.approved_count_override !== undefined ? acc.approved_count_override : currentCount,
      newCount: acc.approved_count_override !== undefined ? acc.approved_count_override : currentCount
    });
  };

  const handleSaveApprovedCount = () => {
    const updatedAccounts = accounts.map(a => {
      if (a.id === editCountModal.employee.id) {
        return { ...a, approved_count_override: parseInt(editCountModal.newCount) };
      }
      return a;
    });
    
    // Save to localStorage
    const { updateAccounts } = useAuth();
    const existingAccounts = JSON.parse(localStorage.getItem('userAccounts') || '[]');
    const updatedExistingAccounts = existingAccounts.map(a => {
      if (a.id === editCountModal.employee.id) {
        return { ...a, approved_count_override: parseInt(editCountModal.newCount) };
      }
      return a;
    });
    localStorage.setItem('userAccounts', JSON.stringify(updatedExistingAccounts));
    
    setAccounts(updatedAccounts);
    setEditCountModal({ isOpen: false, employee: null, currentCount: 0, newCount: 0 });
  };

  const handleEditAppNumberClick = () => {
    const currentYear = new Date().getFullYear();
    const yy = String(currentYear).slice(-2);
    let maxSeq = 0;

    // Get current max sequence from approved forms
    const approvedForms = allForms.filter(f => f.status === 'approved');
    approvedForms.forEach((r) => {
      const num = r.details?.control_number || r.details?.travel_no;
      if (!num) return;
      const match = String(num).match(new RegExp(`^${yy}-(\\d{5})$`));
      if (match) maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
    });

    // Get current approved count for the year
    const currentYearApprovedCount = approvedForms.filter(f => {
      const date = new Date(f.submitted_at || f.created_at);
      return date.getFullYear() === currentYear;
    }).length;

    setEditAppNumberModal({
      isOpen: true,
      currentYear,
      currentSequence: maxSeq,
      newSequence: maxSeq > 0 ? maxSeq + 1 : 1,
      currentApprovedCount: currentYearApprovedCount
    });
  };

  const handleSaveAppNumber = () => {
    const yy = String(editAppNumberModal.currentYear).slice(-2);
    const newAppNumber = `${yy}-${String(editAppNumberModal.newSequence).padStart(5, '0')}`;
    
    // Save to localStorage as the next application number
    localStorage.setItem('nextApplicationNumber', newAppNumber);
    
    setEditAppNumberModal({ isOpen: false, currentYear: new Date().getFullYear(), currentSequence: 0, newSequence: 0 });
  };

  // Filter out admin accounts to show only employees
  let filtered = accounts.filter(a =>
    !search || (a.full_name || a.fullName || a.name || '').toLowerCase().includes(search.toLowerCase()) || (a.email || a.denr_email || '').toLowerCase().includes(search.toLowerCase())
  ).filter(a => 
    a.role !== USER_ROLES.ADMIN && 
    a.role !== USER_ROLES.SUPER_ADMIN
  );

  // Apply additional filters
  if (filterDepartment) {
    filtered = filtered.filter(a => a.department === filterDepartment);
  }
  if (filterPosition) {
    filtered = filtered.filter(a => a.position === filterPosition);
  }
  if (filterStatus) {
    filtered = filtered.filter(a => {
      const empForms = allForms.filter(f => isFormOfAccount(f, a));
      return empForms.some(f => f.status === filterStatus);
    });
  }
  if (filterStartDate && filterEndDate) {
    filtered = filtered.filter(a => {
      const empForms = allForms.filter(f => isFormOfAccount(f, a));
      return empForms.some(f => {
        const formDate = new Date(f.submitted_at || f.created_at);
        return formDate >= new Date(filterStartDate) && formDate <= new Date(filterEndDate);
      });
    });
  }

  if (sortOrder === 'az') filtered.sort((a, b) => (a.full_name || a.fullName || a.name || '').localeCompare(b.full_name || b.fullName || b.name || ''));
  else filtered.sort((a, b) => (b.full_name || b.fullName || b.name || '').localeCompare(a.full_name || a.fullName || a.name || ''));

  return (
    <AdminLayout>
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Records</h2>
            <p className="text-slate-500 text-sm mt-0.5">Click any employee to view detailed statistics</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEditAppNumberClick}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold rounded-xl transition-all"
              title="Edit application number sequence"
            >
              <Edit3 className="w-4 h-4" />
              Edit App Number
            </button>
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-56" />
          </div>
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${showFilters ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'}`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters && <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showFilters && (
          <div className="bg-slate-50 rounded-2xl p-5 mb-5 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Department</label>
                <select
                  value={filterDepartment}
                  onChange={e => setFilterDepartment(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">All Departments</option>
                  {allDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Position</label>
                <select
                  value={filterPosition}
                  onChange={e => setFilterPosition(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">All Positions</option>
                  {allPositions.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Status</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">All Statuses</option>
                  <option value={REQUEST_STATUS.PENDING}>Pending</option>
                  <option value={REQUEST_STATUS.APPROVED}>Approved</option>
                  <option value={REQUEST_STATUS.DECLINED}>Declined</option>
                  <option value={REQUEST_STATUS.ARCHIVED}>Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Date Range</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={e => setFilterStartDate(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={e => setFilterEndDate(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setFilterDepartment('');
                  setFilterPosition('');
                  setFilterStatus('');
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Could not load records</p>
              <p className="text-red-600/80">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No employee records found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(acc => {
              const empForms = allForms.filter(f => isFormOfAccount(f, acc));
              const actualApproved = empForms.filter(f => f.status === REQUEST_STATUS.APPROVED).length;
              const approved = acc.approved_count_override !== undefined ? acc.approved_count_override : actualApproved;
              const isOverride = acc.approved_count_override !== undefined;
              const balance = getUnifiedLeaveBalances(acc.id, balances[acc.id]);
              void balanceRefreshKey;
              return (
                <button
                  key={acc.id}
                  onClick={() => setSelectedEmployee(acc)}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {(acc.full_name || acc.fullName || acc.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm truncate">{acc.full_name || acc.fullName || acc.name}</p>
                      <p className="text-xs text-slate-500 truncate">{maskEmail(acc.email || acc.denr_email)}</p>
                      {acc.employee_type && (
                        <p className="text-[10px] text-slate-400 truncate">{acc.employee_type}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{approved} approved</span>
                    <span>{empForms.length} total</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedEmployee && (
        <EmployeeRecordsModal
          isOpen={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          employee={selectedEmployee}
          allForms={allForms}
          onUpdateForms={fetchData}
        />
      )}

      {/* Edit Approved Count Modal */}
      {editCountModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditCountModal({ isOpen: false, employee: null, currentCount: 0, newCount: 0 })} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-7 py-5 flex items-center justify-between text-white">
              <div>
                <h3 className="text-lg font-black">Edit Approved Count</h3>
                <p className="text-blue-100 text-xs">{editCountModal.employee?.full_name || editCountModal.employee?.name}</p>
              </div>
              <button onClick={() => setEditCountModal({ isOpen: false, employee: null, currentCount: 0, newCount: 0 })} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-7 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Actual Approved Count</label>
                <p className="text-sm font-medium text-slate-800">{editCountModal.currentCount}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Override Count</label>
                <input
                  type="number"
                  min="0"
                  value={editCountModal.newCount}
                  onChange={(e) => setEditCountModal({ ...editCountModal, newCount: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">Leave empty to use actual count</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditCountModal({ isOpen: false, employee: null, currentCount: 0, newCount: 0 });
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveApprovedCount}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Application Number Modal */}
      {editAppNumberModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditAppNumberModal({ isOpen: false, currentYear: new Date().getFullYear(), currentSequence: 0, newSequence: 0, currentApprovedCount: 0 })} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-7 py-5 flex items-center justify-between text-white">
              <div>
                <h3 className="text-lg font-black">Application Number</h3>
                <p className="text-purple-100 text-xs">PDF Control Number Sequence</p>
              </div>
              <button onClick={() => setEditAppNumberModal({ isOpen: false, currentYear: new Date().getFullYear(), currentSequence: 0, newSequence: 0, currentApprovedCount: 0 })} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-7 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Edit Sequence Number</label>
                <input
                  type="number"
                  min="1"
                  value={editAppNumberModal.newSequence}
                  onChange={(e) => setEditAppNumberModal({ ...editAppNumberModal, newSequence: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">This will generate format: {String(editAppNumberModal.currentYear).slice(-2)}-{String(editAppNumberModal.newSequence).padStart(5, '0')}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditAppNumberModal({ isOpen: false, currentYear: new Date().getFullYear(), currentSequence: 0, newSequence: 0, currentApprovedCount: 0 });
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAppNumber}
                  className="flex-1 px-4 py-3 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function Records() {
  return (
    <LeaveBalanceProvider>
      <RecordsContent />
    </LeaveBalanceProvider>
  );
}