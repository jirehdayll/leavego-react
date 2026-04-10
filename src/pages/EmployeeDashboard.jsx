import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { leaveRequestsAPI } from '../api/leaveRequests';
import { useAuth } from '../hooks/useAuth';
import { 
  FileText, Plane, Calendar, Clock, CheckCircle2, 
  TrendingUp, User, Plus, Eye,
  AlertCircle, BarChart3, Activity
} from 'lucide-react';
import { 
  MONTHS, 
  REQUEST_STATUS, 
  STATUS_COLORS, 
  REQUEST_TYPES 
} from '../constants';

function StatCard({ icon: Icon, label, value, color, bg, trend, trendValue }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4 card-hover group">
      <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="flex-1">
        <p className="text-2xl font-black text-slate-800">{value ?? '0'}</p>
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
      className={`bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group ${
        isRecent ? 'border-l-4 border-l-blue-500' : ''
      }`}
      onClick={() => onView(request)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isLeave ? 'bg-blue-50' : 'bg-emerald-50'
          }`}>
            {isLeave ? (
              <FileText className="w-5 h-5 text-blue-600" />
            ) : (
              <Plane className="w-5 h-5 text-emerald-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-800 truncate">
              {isLeave ? 'Leave Application' : 'Travel Order'}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {isLeave ? request.details?.leave_type : request.details?.destination}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                STATUS_COLORS[request.status]?.bg || 'bg-slate-100'
              } ${
                STATUS_COLORS[request.status]?.text || 'text-slate-700'
              }`}>
                {request.status}
              </span>
              {isNewlyApproved && (
                <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                  request.status === REQUEST_STATUS.APPROVED 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : 'bg-red-100 text-red-600'
                }`}>
                  <span className={`w-2 h-2 rounded-full animate-pulse ${
                    request.status === REQUEST_STATUS.APPROVED ? 'bg-emerald-500' : 'bg-red-500'
                  }`}></span>
                  {request.status === REQUEST_STATUS.APPROVED ? 'Approved' : 'Declined'}
                </span>
              )}
              {isRecent && (
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-600">
                  Recent
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">
            {new Date(request.submitted_at).toLocaleDateString('en-PH', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <button 
              onClick={() => onView(request)}
              className="text-xs text-amber-600 hover:text-amber-800 font-medium"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
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
    setLoading(true);
    try {
      const result = await leaveRequestsAPI.getAll({
        user_email: user?.email
      });

      if (result.data) {
        setRequests(result.data);
        calculateStats(result.data);
        
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentStatusChanges = result.data.filter(req => 
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
  }, [user?.email, calculateStats]);

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
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf8] to-white p-8">
      <header className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <User className="w-2 h-2 text-emerald-600" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800">Employee Dashboard</h1>
              <p className="text-xs text-slate-500">Welcome back, {profile?.full_name || user?.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/forms/leave')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg transform hover:scale-105"
              >
                <FileText className="w-4 h-4" />
                Leave Form
              </button>
              <button
                onClick={() => navigate('/forms/travel')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg transform hover:scale-105"
              >
                <Plane className="w-4 h-4" />
                Travel Form
              </button>
            </div>
            
            {isAdmin && (
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg"
              >
                <Activity className="w-4 h-4" />
                Admin Panel
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <StatCard
          icon={Clock}
          label="Total Requests"
          value={stats.total}
          color="text-slate-600"
          bg="bg-slate-50"
        />
        <StatCard
          icon={Clock}
          label="Pending Applications"
          value={stats.pending}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <StatCard
          icon={CheckCircle2}
          label="Approved Applications"
          value={stats.approved}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          icon={Clock}
          label="Declined Applications"
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800">Recent Requests</h3>
                <p className="text-xs text-slate-400 mt-0.5">Your latest applications</p>
              </div>
            </div>
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              {recentRequests.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">No requests yet</p>
                  <p className="text-slate-400 text-xs mt-1">Create your first request to get started</p>
                </div>
              ) : (
                recentRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onView={handleViewRequest}
                    isRecent={true}
                    isNewlyApproved={newlyApproved.some(req => req.id === request.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/forms/leave')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg transform hover:scale-105"
              >
                <FileText className="w-4 h-4" />
                Leave Form
              </button>
              <button
                onClick={() => navigate('/forms/travel')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg transform hover:scale-105"
              >
                <Plane className="w-4 h-4" />
                Travel Form
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
