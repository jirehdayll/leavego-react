import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { leaveRequestsAPI } from '../api/leaveRequests';
import { useAuth } from '../hooks/useAuth';
import {
  getUnifiedLeaveBalances,
  updateDailyLeaveAccumulation,
  getLeaveBalancesFromDB,
  recalculateLeaveBalancesFromApprovedRequests,
  LEAVE_BALANCES_UPDATED_EVENT,
} from '../lib/leaveBalanceManager';
import {
  Clock, CheckCircle2, Plane, FileText,
  Eye, Check, X, LogOut, User, Calendar, MapPin, Search, ChevronDown, UserCircle,
  TrendingUp, AlertCircle, BarChart3, Activity, QrCode, KeyRound, Eye as EyeIcon, EyeOff, RefreshCw
} from 'lucide-react';
import { getAccountsSync, syncAccount } from '../lib/accountStore';
import { MONTHS, REQUEST_STATUS, STATUS_COLORS, REQUEST_TYPES } from '../constants';

import { QRCodeSVG } from 'qrcode.react';
import { getAllDepartments, getAllPositions } from '../utils/departmentsPositions';

function StatCard({ icon: Icon, label, value, color, bg, trend, trendValue }) {
  return (
    <div className="bg-white rounded-2xl p-3 sm:p-4 lg:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-3 sm:gap-4 card-hover group">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${bg} rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800">{value ?? '0'}</p>
        <p className="text-xs font-medium text-slate-500 mt-0.5 leading-tight">{label}</p>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${
            trendValue > 0 ? 'text-emerald-600' : 'text-red-600'
          }`}>
            <TrendingUp className={`w-3 h-3 ${trendValue < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trendValue)}%
          </div>
        )}
      </div>
    </div>
  );
}

function RequestCard({ request, onView, isRecent = false, isNewlyApproved = false }) {
  const isLeave = request.request_type === REQUEST_TYPES.LEAVE;

  return (
    <div 
      className={`bg-white rounded-2xl p-3 sm:p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group ${
        isRecent ? 'border-l-4 border-l-blue-500' : ''
      }`}
      onClick={() => onView(request)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${
            isLeave ? 'bg-blue-50' : 'bg-emerald-50'
          }`}>
            {isLeave ? (
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            ) : (
              <Plane className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-800 truncate text-sm sm:text-base">
              {isLeave ? 'Leave Application' : 'Travel Order'}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {isLeave ? request.details?.leave_type : request.details?.destination}
            </p>
            <div className="flex items-center gap-1 sm:gap-2 mt-2 flex-wrap">
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${
                STATUS_COLORS[request.status]?.bg || 'bg-slate-100'
              } ${
                STATUS_COLORS[request.status]?.text || 'text-slate-700'
              }`}>
                {request.status}
              </span>
              {isNewlyApproved && (
                <span className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${
                  request.status === REQUEST_STATUS.APPROVED 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : 'bg-red-100 text-red-600'
                }`}>
                  <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse ${
                    request.status === REQUEST_STATUS.APPROVED ? 'bg-emerald-500' : 'bg-red-500'
                  }`}></span>
                  <span className="hidden sm:inline">{request.status === REQUEST_STATUS.APPROVED ? 'Approved' : 'Declined'}</span>
                  <span className="sm:hidden">{request.status === REQUEST_STATUS.APPROVED ? '✓' : '✗'}</span>
                </span>
              )}
              {isRecent && (
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-blue-100 text-blue-600">
                  Recent
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] sm:text-xs text-slate-400">
            {new Date(request.submitted_at).toLocaleDateString('en-PH', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLeaveBalanceModal, setShowLeaveBalanceModal] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    declined: 0,
    thisMonth: 0
  });
  const [newlyApproved, setNewlyApproved] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [monthlySummary, setMonthlySummary] = useState({});

  const calculateStats = useCallback((requestData) => {
    const now = new Date();
    const year = now.getFullYear();
    const monthStart = new Date(year, now.getMonth(), 1).toISOString();
    const thisMonthRequests = requestData.filter(req => 
      new Date(req.submitted_at) >= new Date(monthStart)
    );

    setStats({
      total: requestData.length,
      pending: requestData.filter(r => r.status === REQUEST_STATUS.PENDING).length,
      approved: requestData.filter(r => r.status === REQUEST_STATUS.APPROVED).length,
      declined: requestData.filter(r => r.status === REQUEST_STATUS.DECLINED).length,
      thisMonth: thisMonthRequests.length
    });
  }, []);

  const fetchEmployeeData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await leaveRequestsAPI.getAll({
        user_id: user.id,
        user_email: user.email
      });

      if (error) {
        console.error('Error fetching employee requests:', error);
        setRequests([]);
      } else {
        setRequests(data || []);
        calculateStats(data || []);

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentStatusChanges = (data || []).filter(req =>
          (req.status === REQUEST_STATUS.APPROVED || req.status === REQUEST_STATUS.DECLINED) &&
          new Date(req.updated_at || req.submitted_at) > oneDayAgo
        );
        setNewlyApproved(recentStatusChanges);
      }

      // Supabase is the source of truth. Fetch from the SECURITY DEFINER RPC first.
      // Then run DB accrual and fetch again. Do not fall back to default localStorage
      // unless the database is truly unavailable.
      console.log('[EmployeeDashboard] Starting balance sync for user:', user.id);
      const dbBalances = await getLeaveBalancesFromDB(user.id);
      console.log('[EmployeeDashboard] Database balances loaded:', dbBalances);
      const updatedBalances = await updateDailyLeaveAccumulation(user.id);
      console.log('[EmployeeDashboard] Updated balances after accrual:', updatedBalances);
      setLeaveBalances(updatedBalances || dbBalances);
    } catch (error) {
      console.error('Fetch employee data error:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email, calculateStats]);

  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

  useEffect(() => {
    const handleBalancesUpdated = async (event) => {
      if (event.detail?.accountId === user?.id) {
        console.log('[EmployeeDashboard] Balances updated event received for user:', user.id);
        const freshBalances = await getLeaveBalancesFromDB(user.id);
        console.log('[EmployeeDashboard] Fresh balances from DB:', freshBalances);
        setLeaveBalances(freshBalances);
      }
    };
    window.addEventListener(LEAVE_BALANCES_UPDATED_EVENT, handleBalancesUpdated);

    // Also refresh when an account is updated
    const handleAccountUpdated = async (event) => {
      if (event.detail?.accountId === user?.id) {
        console.log('[EmployeeDashboard] Account updated event received for user:', user.id);
        const freshBalances = await getLeaveBalancesFromDB(user.id);
        console.log('[EmployeeDashboard] Fresh balances from DB:', freshBalances);
        setLeaveBalances(freshBalances);
      }
    };
    window.addEventListener('accountUpdated', handleAccountUpdated);

    // Handle storage events (for cross-tab sync)
    const handleStorageChange = async (event) => {
      if (event.key === 'accounts' && event.newValue) {
        console.log('[EmployeeDashboard] Storage changed event received for user:', user.id);
        const freshBalances = await getLeaveBalancesFromDB(user.id);
        console.log('[EmployeeDashboard] Fresh balances from DB:', freshBalances);
        setLeaveBalances(freshBalances);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(LEAVE_BALANCES_UPDATED_EVENT, handleBalancesUpdated);
      window.removeEventListener('accountUpdated', handleAccountUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user?.id]);

  // Real-time subscription to app_accounts table changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('app-accounts-realtime-employee')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_accounts',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('[EmployeeDashboard Realtime] Change detected in app_accounts:', payload);
          // Refresh profile data when current user's account is updated
          const updatedProfile = payload.new;
          // Update local state with new profile data
          if (updatedProfile) {
            // Trigger a re-render by updating a dummy state or calling a refresh function
            // The useAuth hook should handle this automatically
            window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { profile: updatedProfile } }));
          }
        }
      )
      .subscribe((status) => {
        console.log('[EmployeeDashboard Realtime] Subscription status:', status);
        setConnectionStatus(status === 'SUBSCRIBED' ? 'connected' : 'connecting');
      });

    return () => {
      console.log('[EmployeeDashboard Realtime] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Real-time subscription to user_leave_balances table changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-leave-balances-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_leave_balances',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('[EmployeeDashboard Realtime] Change detected in user_leave_balances:', payload);
          // Sync database balances to UI state.
          const freshBalances = await getLeaveBalancesFromDB(user.id);
          console.log('[EmployeeDashboard Realtime] Updated balances:', freshBalances);
          setLeaveBalances(freshBalances);
        }
      )
      .subscribe((status) => {
        console.log('[EmployeeDashboard Realtime] user_leave_balances subscription status:', status);
      });

    return () => {
      console.log('[EmployeeDashboard Realtime] Cleaning up user_leave_balances subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleViewRequest = (request) => {
    if (request.request_type === REQUEST_TYPES.LEAVE) {
      navigate('/forms/leave', { state: { viewMode: true, requestData: request } });
    } else {
      navigate('/forms/travel', { state: { viewMode: true, requestData: request } });
    }
    
    if (request.status === REQUEST_STATUS.APPROVED || request.status === REQUEST_STATUS.DECLINED) {
      setNewlyApproved(prev => prev.filter(req => req.id !== request.id));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleRefreshBalances = async () => {
    if (!user?.id) return;
    console.log('[EmployeeDashboard] Manual balance refresh triggered');
    try {
      await getLeaveBalancesFromDB(user.id);
      await updateDailyLeaveAccumulation(user.id);
      const accounts = getAccountsSync();
      const account = accounts.find(a => a.id === user.id);
      const newBalances = account?.leave_balances || null;
      console.log('[EmployeeDashboard] Manual refresh completed:', newBalances);
      setLeaveBalances(newBalances);
    } catch (error) {
      console.error('[EmployeeDashboard] Manual refresh failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const recentRequests = requests.slice(0, 5);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-[#f0fdf8] to-white p-4 sm:p-6 lg:p-8">
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <User className="w-2 h-2 text-emerald-600" />
              </div>
            </div>
            <div>
              <h1 className="text-base sm:text-lg lg:text-xl font-black text-slate-800">Employee Dashboard</h1>
              <p className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-none">Welcome back, {profile?.full_name || user?.email || 'User'}</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => navigate('/forms/leave')}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all hover:shadow-lg transform hover:scale-105 w-full sm:w-auto justify-center"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Leave Form</span>
                <span className="sm:hidden">Leave</span>
              </button>
              <button
                onClick={() => navigate('/forms/travel')}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all hover:shadow-lg transform hover:scale-105 w-full sm:w-auto justify-center"
              >
                <Plane className="w-4 h-4" />
                <span className="hidden sm:inline">Travel Form</span>
                <span className="sm:hidden">Travel</span>
              </button>
              <button
                onClick={() => {
                  console.log('[EmployeeDashboard] Leave Balances button clicked, current balances:', leaveBalances);
                  setShowLeaveBalanceModal(true);
                }}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all hover:shadow-lg transform hover:scale-105 w-full sm:w-auto justify-center"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Leave Balances</span>
                <span className="sm:hidden">Balances</span>
              </button>
            </div>
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-all hover:shadow-lg w-full sm:w-auto"
                title="My Profile"
              >
                <UserCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> 
                <span className="sm:hidden">My Profile</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-xs sm:text-sm font-semibold rounded-xl transition-all hover:shadow-lg w-full sm:w-auto justify-center"
              ><LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">Exit</span>
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard
          icon={Clock}
          label="Total Requests"
          value={stats.total}
          color="text-slate-600"
          bg="bg-slate-50"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats.pending}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <StatCard
          icon={CheckCircle2}
          label="Approved"
          value={stats.approved}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          icon={Clock}
          label="Declined"
          value={stats.declined}
          color="text-red-600"
          bg="bg-red-50"
        />
        <StatCard
          icon={Calendar}
          label="This Month"
          value={stats.thisMonth}
          color="text-purple-600"
          bg="bg-purple-50"
          trend={true}
          trendValue={15}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
        <div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base lg:text-lg">Recent Requests</h3>
                <p className="text-xs text-slate-400 mt-0.5">Your latest applications</p>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 max-h-96 sm:max-h-[500px] overflow-y-auto">
              {recentRequests.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium text-sm sm:text-base">No requests yet</p>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">Create your first request to get started</p>
                </div>
              ) : (
                recentRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onView={handleViewRequest}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* QR Code Display */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 flex flex-col min-h-[400px] sm:min-h-[500px] lg:min-h-[643px]">
            <div className="text-center h-full flex flex-col">
              <div className="mb-3 sm:mb-4">
                <h3 className="font-bold text-slate-800 text-sm sm:text-base lg:text-lg">Your ID Pass</h3>
                <p className="text-xs sm:text-sm text-slate-500">Scan at the security desk or present to admin</p>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 bg-gradient-to-br from-emerald-50 to-blue-50/50 rounded-2xl border border-emerald-100 mb-3 sm:mb-4">
                <div className="bg-white p-2 sm:p-4 rounded-xl shadow-sm border border-emerald-200 inline-block transition-transform hover:scale-105 duration-300">
                  <QRCodeSVG 
                    value={`${window.location.origin}/profile/view/${user?.id}`}
                    size={window.innerWidth < 640 ? 200 : window.innerWidth < 1024 ? 280 : 380}
                    level="H"
                    includeMargin={false}
                    fgColor="#022720"
                  />
                </div>
              </div>
              
              <div>
                <p className="font-bold text-slate-800 text-sm sm:text-base lg:text-lg truncate max-w-full">{profile?.full_name || 'Employee'}</p>
                <p className="text-xs sm:text-sm font-medium text-emerald-600 truncate max-w-full">
                  {profile?.department || 'LeaveGo Organization'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    {/* Profile Modal */}
    {showProfileModal && (
      <ProfileModal
        user={user}
        onClose={() => setShowProfileModal(false)}
      />
    )}

    {/* Leave Balance Modal */}
    {showLeaveBalanceModal && (
      <LeaveBalanceModal
        leaveBalances={leaveBalances}
        onClose={() => setShowLeaveBalanceModal(false)}
        onRefresh={handleRefreshBalances}
      />
    )}
    </>
  );
}

// Leave Balance Modal Component
function LeaveBalanceModal({ leaveBalances, onClose, onRefresh }) {
  // Handle the raw LeaveBalances format
  const formatBalances = (balances) => {
    console.log('[LeaveBalanceModal] formatBalances called with:', balances);
    if (!balances) {
      console.log('[LeaveBalanceModal] No balances provided, returning null');
      return null;
    }
    
    // If it's already in the correct format (numbers), return as is
    if (typeof balances.forced_leave === 'number') {
      console.log('[LeaveBalanceModal] Balances already in correct format');
      return balances;
    }
    
    // If it's in display format (objects with balance property), convert
    if (balances.forced_leave && typeof balances.forced_leave === 'object') {
      console.log('[LeaveBalanceModal] Converting from display format');
      return {
        forced_leave: balances.forced_leave?.balance ?? 5,
        special_leave_privileges: balances.special_leave?.balance ?? 3,
        wellness_leave: balances.wellness_leave?.balance ?? 5,
        accumulated_sick: balances.sick_leave?.balance ?? 10,
        accumulated_vacation: balances.vacation_leave?.balance ?? 10
      };
    }
    
    // Default fallback
    console.log('[LeaveBalanceModal] Using default fallback values');
    return {
      forced_leave: 5,
      special_leave_privileges: 3,
      wellness_leave: 5,
      accumulated_sick: 10,
      accumulated_vacation: 10
    };
  };

  const formattedBalances = formatBalances(leaveBalances);

  console.log('[LeaveBalanceModal] Rendered with formattedBalances:', formattedBalances);

  if (!formattedBalances) return null;

  const formatDays = (val) => val !== undefined && val !== null ? Number(Number(val).toFixed(2)).toString() : '0';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[95vh] flex flex-col animate-[fadeIn_0.2s_ease-out]">
        {/* Header */}
        <div className="px-7 py-5 bg-gradient-to-r from-purple-600 to-purple-700 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-400/30 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Leave Balances</h3>
              <p className="text-purple-300/70 text-xs">Your available leave credits</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-7 overflow-y-auto flex-1 space-y-4">
          {/* Special Leave Types */}
          <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100">
            <h4 className="font-bold text-purple-800 text-sm mb-3">Special Leave Credits</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-700">Forced Leave</span>
                <span className="text-sm font-bold text-purple-700">{formatDays(formattedBalances.forced_leave)} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-700">Special Leave Privileges</span>
                <span className="text-sm font-bold text-purple-700">{formatDays(formattedBalances.special_leave_privileges)} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-700">Wellness Leave</span>
                <span className="text-sm font-bold text-purple-700">{formatDays(formattedBalances.wellness_leave)} days</span>
              </div>
            </div>
          </div>

          {/* Accumulated Leave */}
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
            <h4 className="font-bold text-emerald-800 text-sm mb-2">Accumulated Leave</h4>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-xs text-slate-600">Sick</p>
                <p className="text-sm font-bold text-emerald-700">{formatDays(formattedBalances.accumulated_sick)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-600">Vacation</p>
                <p className="text-sm font-bold text-emerald-700">{formatDays(formattedBalances.accumulated_vacation)}</p>
              </div>
            </div>
          </div>

          {/* Info Note */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs text-blue-700 leading-relaxed">
              <strong>Note:</strong> Special leave credits are fixed annual allocations. Forced, Special, and Wellness Leave use separate fixed balances. Vacation and Sick Leave start at 10 days each, accrue separately, and are deducted only when Vacation or Sick Leave is approved.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 rounded-b-3xl flex justify-between">
          <button
            onClick={onRefresh}
            className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-300 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Profile Modal Component
function ProfileModal({ user, onClose }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    // Load from accountStore (localStorage + Supabase cache)
    const accounts = getAccountsSync();
    const current = accounts.find(a => a.id === user.id || a.email === user.email);
    if (current) {
      setAccount({ ...current });
    } else {
      // Fallback: build minimal record from session user
      setAccount({
        id: user.id,
        email: user.email,
        first_name: '',
        middle_name: '',
        surname: '',
        full_name: user.full_name || user.email?.split('@')[0] || '',
        position: '',
        department: '',
        salary_range: '',
        role: user.role || 'employee',
      });
    }
    setLoading(false);
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAccount(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      // Only update organizational metadata (department, position) - names are read-only
      const updatedAccount = {
        ...account,
        // Only update department and position
        department: account.department,
        position: account.position,
        ...(showPasswordSection && newPassword ? { password: newPassword } : {})
      };

      // Update database directly with atomic operation
      // Note: Only updating columns that exist in the database schema
      const { error: dbError } = await supabase
        .from('app_accounts')
        .update({
          department: updatedAccount.department,
          position: updatedAccount.position,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (dbError) {
        console.error('Database update error:', dbError);
        throw dbError;
      }

      // Update localStorage as well
      await syncAccount(updatedAccount);

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('accountUpdated', { detail: { accountId: user.id } }));

      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); onClose(); }, 1200);
    } catch (err) {
      console.error(err);
      setSaveError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-12 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
          <p className="text-slate-400 text-sm font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!account) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col animate-[fadeIn_0.2s_ease-out]">
        {/* Header */}
        <div className="px-7 py-5 bg-gradient-to-r from-[#1a3530] to-[#0f211d] rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-400/30 rounded-xl flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">My Profile</h3>
              <p className="text-emerald-300/70 text-xs">{account.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-7 overflow-y-auto flex-1">
          {/* Success / Error banners */}
          {saveSuccess && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm mb-4">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Profile updated successfully!
            </div>
          )}
          {saveError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {saveError}
            </div>
          )}

          <form id="profile-form" onSubmit={handleSave} className="space-y-5" autoComplete="on">
            {/* Personal Identity Fields - Read Only */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Personal Identity (Read-Only)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={account.first_name || ''}
                    onChange={handleChange}
                    autoComplete="given-name"
                    placeholder="Juan"
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Middle Name</label>
                  <input
                    type="text"
                    name="middle_name"
                    value={account.middle_name || ''}
                    onChange={handleChange}
                    autoComplete="additional-name"
                    placeholder="Santos"
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Last Name</label>
                  <input
                    type="text"
                    name="surname"
                    value={account.surname || ''}
                    onChange={handleChange}
                    autoComplete="family-name"
                    placeholder="Dela Cruz"
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={account.email}
                  onChange={handleChange}
                  autoComplete="email"
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
                />
              </div>
            </div>

            {/* Organizational Metadata - Editable */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-3">Organizational Metadata</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Office/Department</label>
                  <select
                    name="department"
                    value={account.department || ''}
                    onChange={handleChange}
                    autoComplete="organization"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none transition"
                  >
                    <option value="">Select Department...</option>
                    {getAllDepartments().map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Position</label>
                  <select
                    name="position"
                    value={account.position || ''}
                    onChange={handleChange}
                    autoComplete="organization-title"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none transition"
                  >
                    <option value="">Select Position...</option>
                    {getAllPositions().map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Salary Range removed from profile (kept as hidden field) */}
            <div style={{display:'none'}}>
              <input type="hidden" name="salary_range" value={account.salary_range || ''} />
            </div>

            {/* Password Reset Section */}
            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => { setShowPasswordSection(v => !v); setNewPassword(''); }}
                className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors mb-3"
              >
                <KeyRound className="w-4 h-4" />
                {showPasswordSection ? 'Cancel Password Change' : 'Change Password'}
              </button>
              {showPasswordSection && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Min. 6 characters"
                      minLength={6}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none pr-12 bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">Leave blank to keep your current password.</p>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 rounded-b-3xl flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="profile-form"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Saving...</>
            ) : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
