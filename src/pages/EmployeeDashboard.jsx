import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { leaveRequestsAPI } from '../api/leaveRequests';
import { useAuth } from '../hooks/useAuth';
import { 
  Clock, CheckCircle2, Plane, FileText, 
  Eye, Check, X, LogOut, User, Calendar, MapPin, Search, ChevronDown, UserCircle,
  TrendingUp, AlertCircle, BarChart3, Activity, QrCode
} from 'lucide-react';
import { getAccountsSync, syncAccount } from '../lib/accountStore';
import { DEPARTMENTS, POSITIONS, MONTHS, REQUEST_STATUS, STATUS_COLORS, REQUEST_TYPES } from '../constants';
import SalaryRangeInput from '../components/SalaryRangeInput';
import { QRCodeSVG } from 'qrcode.react';

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
    } catch (error) {
      console.error('Fetch employee data error:', error);
      setRequests([]);
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

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
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
    </>
  );
}

// Profile Modal Component
function ProfileModal({ user, onClose }) {
  const React = require('react');
  const [account, setAccount] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const accounts = getAccountsSync();
    const current = accounts.find(a => a.email === user.email);
    if (current) {
      setAccount({ ...current });
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
    try {
      // Re-build full_name
      const full_name = `${account.first_name || ''} ${account.middle_name || ''} ${account.surname || ''}`.trim();
      const updatedAccount = { ...account, full_name, fullName: full_name };
      await syncAccount(updatedAccount);
      alert('Profile updated successfully!');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !account) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col animate-[fadeIn_0.2s_ease-out]">
        <div className="px-7 py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-t-3xl flex items-center justify-between">
          <h3 className="text-xl font-black text-white">My Profile</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-7 overflow-y-auto">
          <form id="profile-form" onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">First Name</label>
                <input type="text" name="first_name" value={account.first_name || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Middle Name</label>
                <input type="text" name="middle_name" value={account.middle_name || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Last Name</label>
                <input type="text" name="surname" value={account.surname || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Email</label>
              <input type="email" value={account.email} disabled className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 cursor-not-allowed" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Office/Department</label>
                <select name="department" value={account.department || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none">
                  <option value="">Select...</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Position</label>
                <select name="position" value={account.position || ''} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none">
                  <option value="">Select...</option>
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Salary Range</label>
              <SalaryRangeInput value={account.salary_range || ''} onChange={(val) => setAccount(prev => ({ ...prev, salary_range: val }))} />
            </div>
            
            <hr className="border-slate-100" />
            
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Change Password</label>
              <input type="text" name="password" value={account.password || ''} onChange={handleChange} placeholder="Enter new password" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
              <p className="text-xs text-slate-500 mt-1">Leave as is if you don't want to change it.</p>
            </div>
          </form>
        </div>
        
        <div className="p-5 bg-slate-50 border-t border-slate-100 rounded-b-3xl flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors">Cancel</button>
          <button type="submit" form="profile-form" disabled={saving} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
