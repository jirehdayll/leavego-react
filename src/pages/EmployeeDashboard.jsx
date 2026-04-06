import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { leaveRequestsAPI } from '../api/leaveRequests';
import { useAuth } from '../hooks/useAuth';
import { 
  FileText, Plane, Calendar, Clock, CheckCircle2, 
  TrendingUp, User, LogOut, Plus, Eye,
  AlertCircle, BarChart3, Activity
} from 'lucide-react';
import { MONTHS } from '../constants';

function StatCard({ icon: Icon, label, value, color, bg, trend, trendValue }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4 card-hover group">
      <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="flex-1">
        <p className="text-2xl font-black text-slate-800">{value ?? '–'}</p>
        <p className="text-xs font-medium text-slate-500 mt-0.5 leading-tight">{label}</p>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${
            trendValue >= 0 ? 'text-emerald-600' : 'text-red-600'
          }`}>
            <TrendingUp className={`w-3 h-3 ${trendValue < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trendValue)}%
          </div>
        )}
      </div>
    </div>
  );
}

function RequestCard({ request, onView, isRecent = false }) {
  const isLeave = request.request_type === 'Leave';
  const statusColors = {
    'Pending': 'bg-amber-100 text-amber-700',
    'Approved': 'bg-emerald-100 text-emerald-700',
    'Declined': 'bg-red-100 text-red-700'
  };

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
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColors[request.status]}`}>
                {request.status}
              </span>
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
              year: 'numeric'
            })}
          </p>
          <button 
            className="mt-2 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
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

  const now = new Date();
  const monthName = MONTHS[now.getMonth()];
  const year = now.getFullYear();

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      // Fetch user's requests
      const { data: requestData, error: requestError } = await leaveRequestsAPI.getAll({
        // Filter by current user's email since user_id might not be available in all records
        user_email: user?.email
      });

      if (!requestError && requestData) {
        setRequests(requestData);
        calculateStats(requestData);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (requestData) => {
    const monthStart = new Date(year, now.getMonth(), 1).toISOString();
    const thisMonthRequests = requestData.filter(req => 
      new Date(req.submitted_at) >= new Date(monthStart)
    );

    setStats({
      total: requestData.length,
      pending: requestData.filter(r => r.status === 'Pending').length,
      approved: requestData.filter(r => r.status === 'Approved').length,
      declined: requestData.filter(r => r.status === 'Declined').length,
      thisMonth: thisMonthRequests.length
    });
  };

  const handleViewRequest = (request) => {
    // Navigate to form view with request data
    if (request.request_type === 'Leave') {
      navigate('/forms/leave', { state: { viewMode: true, requestData: request } });
    } else {
      navigate('/forms/travel', { state: { viewMode: true, requestData: request } });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0fdf8] to-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent"></div>
          <p className="text-slate-400 text-sm font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  const recentRequests = requests.slice(0, 3);
  const pendingRequests = requests.filter(r => r.status === 'Pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf8] via-white to-[#eff6ff]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-800">Employee Dashboard</h1>
                <p className="text-xs text-slate-500">Welcome back, {profile?.full_name || user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/selection')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                New Request
              </button>
              
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg"
                >
                  <Activity className="w-4 h-4" />
                  Admin Panel
                </button>
              )}
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 text-sm font-semibold rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">
                Welcome back, {profile?.full_name || 'Employee'}! 👋
              </h2>
              <p className="text-slate-600">
                {monthName} {year} • Here's your leave and travel request overview
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-emerald-600">
                {stats.thisMonth}
              </div>
              <div className="text-xs text-slate-500">Requests this month</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            icon={BarChart3}
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
            trend={true}
            trendValue={stats.pending > 0 ? 12 : -5}
          />
          <StatCard
            icon={CheckCircle2}
            label="Approved"
            value={stats.approved}
            color="text-emerald-600"
            bg="bg-emerald-50"
            trend={true}
            trendValue={stats.approved > 0 ? 8 : -2}
          />
          <StatCard
            icon={AlertCircle}
            label="Declined"
            value={stats.declined}
            color="text-red-600"
            bg="bg-red-50"
            trend={true}
            trendValue={stats.declined > 0 ? -3 : 0}
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

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Requests */}
          <div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Recent Requests</h3>
                <p className="text-xs text-slate-400 mt-0.5">Your latest applications</p>
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
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Pending */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/forms/leave')}
                  className="flex flex-col items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Leave Form</span>
                </button>
                <button
                  onClick={() => navigate('/forms/travel')}
                  className="flex flex-col items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all group"
                >
                  <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plane className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Travel Form</span>
                </button>
              </div>
            </div>

            {/* Pending Requests Alert */}
            {pendingRequests.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-800">Pending Requests</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      You have {pendingRequests.length} request{pendingRequests.length > 1 ? 's' : ''} awaiting review
                    </p>
                    <div className="mt-3 space-y-2">
                      {pendingRequests.slice(0, 2).map((request) => (
                        <div key={request.id} className="bg-white rounded-lg p-3 border border-amber-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">
                              {request.request_type === 'Leave' ? 'Leave' : 'Travel'}
                            </span>
                            <button
                              onClick={() => handleViewRequest(request)}
                              className="text-xs text-amber-600 hover:text-amber-800 font-medium"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
