import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { leaveRequestsAPI } from '../api/leaveRequests';
import { useAuth } from '../hooks/useAuth';
import { 
  FileText, Plane, Calendar, Clock, CheckCircle2, 
  TrendingUp, User, LogOut, Plus, Eye,
  AlertCircle, BarChart3, Activity, X, QrCode, ChevronDown
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  MONTHS, 
  REQUEST_STATUS, 
  STATUS_COLORS, 
  REQUEST_TYPES 
} from '../constants';

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
  const { user, profile, isAdmin } = useAuth();
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
  
  // Monthly summary states
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
    if (!user?.id) return;
    setLoading(true);
    try {
      const baseFilter = { user_id: user.id };
      const [result, totalRes, pendingRes, approvedRes, declinedRes] = await Promise.all([
        leaveRequestsAPI.getAll(baseFilter),
        leaveRequestsAPI.getCount(baseFilter),
        leaveRequestsAPI.getCount({ ...baseFilter, status: REQUEST_STATUS.PENDING }),
        leaveRequestsAPI.getCount({ ...baseFilter, status: REQUEST_STATUS.APPROVED }),
        leaveRequestsAPI.getCount({ ...baseFilter, status: REQUEST_STATUS.DECLINED })
      ]);

      if (result.data) {
        // Sort all requests by newest first (submitted_at or created_at)
        const sortedRequests = result.data.sort((a, b) => {
          const dateA = new Date(a.submitted_at || a.created_at);
          const dateB = new Date(b.submitted_at || b.created_at);
          return dateB.getTime() - dateA.getTime();
        });
        
        setRequests(sortedRequests);
        
        // Calculate this month requests from the local filtered data
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const thisMonthCount = sortedRequests.filter(req => 
          new Date(req.submitted_at) >= new Date(monthStart)
        ).length;

        setStats({
          total: totalRes.count || 0,
          pending: pendingRes.count || 0,
          approved: approvedRes.count || 0,
          declined: declinedRes.count || 0,
          thisMonth: thisMonthCount
        });
        
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentStatusChanges = sortedRequests.filter(req => 
          (req.status === REQUEST_STATUS.APPROVED || req.status === REQUEST_STATUS.DECLINED) && 
          new Date(req.updated_at || req.submitted_at) > oneDayAgo
        ).sort((a, b) => {
          const dateA = new Date(a.updated_at || a.submitted_at);
          const dateB = new Date(b.updated_at || b.submitted_at);
          return dateB.getTime() - dateA.getTime();
        });
        setNewlyApproved(recentStatusChanges);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      setRequests([]);
      setStats({
        total: 0,
        pending: 0,
        approved: 0,
        declined: 0,
        thisMonth: 0
      });
      setNewlyApproved([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, calculateStats]);

  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);



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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };



  const handleMonthSelect = (month) => {
    setSelectedMonth(month);
    setShowCalendar(false);
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
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf8] to-white p-4 sm:p-6 lg:p-8">
      {/* Static Header with Fixed Logout Button */}
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
              <p className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-none">Welcome back, {profile?.full_name || user?.email}</p>
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
            </div>
            
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 border border-red-600 text-red-600 hover:bg-red-50 text-xs sm:text-sm font-semibold rounded-xl transition-all hover:shadow-lg w-full sm:w-auto justify-center">
              <LogOut className="w-4 h-4" />
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
  );
}
