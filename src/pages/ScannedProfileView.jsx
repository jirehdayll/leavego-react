import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { 
  User, Mail, Building, Briefcase, Calendar, 
  FileText, Plane, ArrowLeft, CheckCircle, XCircle, 
  Clock, AlertCircle, TrendingUp, TrendingDown, Minus, Info
} from 'lucide-react';
import { REQUEST_STATUS, REQUEST_TYPES } from '../constants';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Helper function to format salary with commas
const formatSalary = (salary) => {
  if (!salary) return salary;
  if (salary.includes(',')) return salary;
  
  const numericValue = salary.replace(/[^\d]/g, '');
  if (numericValue.length > 3 && /^\d+$/.test(salary)) {
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return salary;
};

// Casing-agnostic key matching helper
const isFormOfAccount = (fEmail, fName, acc) => {
  if (!acc) return false;
  
  const accEmail = (acc.email || acc.denr_email || '').toLowerCase().trim();
  if (fEmail && accEmail && fEmail === accEmail) return true;
  
  const accName = (acc.full_name || acc.fullName || acc.name || '').toLowerCase().trim();
  if (fName && accName && fName === accName) return true;
  
  return false;
};

export default function ScannedProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: adminUser, getAccounts } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employeeData, setEmployeeData] = useState(null);
  const [allRequests, setAllRequests] = useState([]);
  const [period, setPeriod] = useState('monthly');

  useEffect(() => {
    fetchEmployeeProfile();
  }, [id]);

  const fetchEmployeeProfile = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch user profile from Supabase
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (userError) {
        throw new Error('Employee profile not found');
      }

      // Fetch all leave requests and travel orders for this user
      const { data: requestsData, error: requestsError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', id)
        .order('submitted_at', { ascending: false });

      if (requestsError) {
        console.error('Error fetching employee requests:', requestsError);
      }

      // Retrieve accounts from local storage to pull in any custom fields (salary_range, etc.)
      const accounts = getAccounts() || [];
      const localAcc = accounts.find(a => a.id === id || isFormOfAccount(userData.email, userData.full_name, a));
      
      if (localAcc) {
        setEmployeeData({ ...userData, ...localAcc });
      } else {
        setEmployeeData(userData);
      }

      setAllRequests(requestsData || []);

    } catch (err) {
      setError(err.message || 'Failed to load employee profile');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case REQUEST_STATUS.APPROVED:
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case REQUEST_STATUS.DECLINED:
        return <XCircle className="w-4 h-4 text-red-600" />;
      case REQUEST_STATUS.PENDING:
      case REQUEST_STATUS.PENDING_CENRO:
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case REQUEST_STATUS.APPROVED:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case REQUEST_STATUS.DECLINED:
        return 'bg-red-100 text-red-700 border-red-200';
      case REQUEST_STATUS.PENDING:
      case REQUEST_STATUS.PENDING_CENRO:
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Calculate statistics
  const approved = allRequests.filter(r => r.status === REQUEST_STATUS.APPROVED).length;
  const declined = allRequests.filter(r => r.status === REQUEST_STATUS.DECLINED).length;
  const pending = allRequests.filter(r => r.status === REQUEST_STATUS.PENDING || r.status === REQUEST_STATUS.PENDING_CENRO).length;
  const total = allRequests.length;

  // Build recommendation block
  const ratio = total > 0 ? approved / total : 0;
  let suggestion = { text: 'No applications yet.', icon: Minus, color: 'text-slate-500', bg: 'bg-slate-50' };
  if (total > 0) {
    if (approved >= 10) suggestion = { text: 'Frequent applicant. Monitor leave usage carefully.', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' };
    else if (ratio >= 0.8) suggestion = { text: 'Strong track record. Excellent compliance.', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' };
    else if (ratio < 0.5 && total > 2) suggestion = { text: 'Multiple declined applications. Review required.', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' };
    else suggestion = { text: 'Regular attendance. Doing well.', icon: Minus, color: 'text-blue-600', bg: 'bg-blue-50' };
  }

  // Build chart data
  const now = new Date();
  let chartData = [];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (period === 'monthly') {
    chartData = MONTHS.map((month, i) => {
      const monthForms = allRequests.filter(f => new Date(f.submitted_at || f.created_at).getMonth() === i && new Date(f.submitted_at || f.created_at).getFullYear() === now.getFullYear());
      return { name: month, Approved: monthForms.filter(f => f.status === REQUEST_STATUS.APPROVED).length, Declined: monthForms.filter(f => f.status === REQUEST_STATUS.DECLINED).length };
    });
  } else if (period === 'weekly') {
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - (w + 1) * 7);
      const weekEnd = new Date(now); weekEnd.setDate(now.getDate() - w * 7);
      const weekForms = allRequests.filter(f => { const d = new Date(f.submitted_at || f.created_at); return d >= weekStart && d < weekEnd; });
      chartData.push({ name: `Week ${4 - w}`, Approved: weekForms.filter(f => f.status === REQUEST_STATUS.APPROVED).length, Declined: weekForms.filter(f => f.status === REQUEST_STATUS.DECLINED).length });
    }
  } else {
    for (let y = 2; y >= 0; y--) {
      const yr = now.getFullYear() - y;
      const yrForms = allRequests.filter(f => new Date(f.submitted_at || f.created_at).getFullYear() === yr);
      chartData.push({ name: String(yr), Approved: yrForms.filter(f => f.status === REQUEST_STATUS.APPROVED).length, Declined: yrForms.filter(f => f.status === REQUEST_STATUS.DECLINED).length });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0fdf8] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm font-medium">Loading employee profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0fdf8] to-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Profile Not Found</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf8] to-white pb-12">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-black text-slate-800">Scanned Records & Analytics</h1>
            </div>
            <div className="text-xs sm:text-sm text-slate-500 font-semibold">
              Scanned by: {adminUser?.email}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Employee Profile Header Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0">
            {(employeeData?.full_name || employeeData?.fullName || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-800">
              {employeeData?.full_name || employeeData?.fullName || employeeData?.name || 'Unknown Employee'}
            </h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-slate-500 text-xs sm:text-sm font-semibold">
              <div className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-400" />{employeeData?.email || employeeData?.denr_email}</div>
              <div className="flex items-center gap-1.5"><Building className="w-4 h-4 text-slate-400" />{employeeData?.department || 'DENR'}</div>
              <div className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-slate-400" />{employeeData?.position || 'DENR Officer'}</div>
            </div>
            {employeeData?.salary_range && (
              <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-bold">
                Salary: ₱{formatSalary(employeeData.salary_range)}
              </div>
            )}
          </div>
        </div>

        {/* Analytics Section */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 space-y-6">
          {/* Summary counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total', value: total, color: 'text-slate-800', bg: 'bg-slate-100' },
              { label: 'Approved', value: approved, color: 'text-emerald-700', bg: 'bg-emerald-100' },
              { label: 'Declined', value: declined, color: 'text-red-700', bg: 'bg-red-100' },
              { label: 'Pending', value: pending, color: 'text-amber-700', bg: 'bg-amber-100' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
                <p className={`text-2xl sm:text-3xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Compliance Suggestion Box */}
          <div className={`${suggestion.bg} rounded-2xl p-4 flex items-center gap-3 border border-black/5`}>
            <suggestion.icon className={`w-5 h-5 flex-shrink-0 ${suggestion.color}`} />
            <p className={`text-xs sm:text-sm font-bold ${suggestion.color}`}>{suggestion.text}</p>
          </div>

          {/* Period-based interactive chart */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <h3 className="font-extrabold text-slate-800 text-sm sm:text-base flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600" />
                Application Trend Analysis
              </h3>
              <div className="flex bg-slate-100 rounded-xl p-1 gap-1 self-start sm:self-auto">
                {['weekly','monthly','yearly'].map(p => (
                  <button 
                    key={p} 
                    onClick={() => setPeriod(p)} 
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${period === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }} />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                  <Bar dataKey="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Declined" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* History split layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Leave History */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800">Leave History</h3>
                  <p className="text-xs text-slate-400 font-medium">{allRequests.filter(r => r.request_type === REQUEST_TYPES.LEAVE).length} request(s)</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {allRequests.filter(r => r.request_type === REQUEST_TYPES.LEAVE).length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400 text-xs font-semibold">No leave requests found</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {allRequests.filter(r => r.request_type === REQUEST_TYPES.LEAVE).map((request) => (
                    <div key={request.id} className="border border-slate-100 bg-slate-50/30 rounded-2xl p-4 transition-all hover:bg-slate-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">
                            {request.details?.leave_type || 'Unknown Leave Type'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            Submitted: {new Date(request.submitted_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          {request.status}
                        </span>
                      </div>
                      {request.details?.start_date && request.details?.end_date && (
                        <p className="text-xs text-slate-600 font-semibold">
                          Span: {new Date(request.details.start_date).toLocaleDateString('en-PH')} to {new Date(request.details.end_date).toLocaleDateString('en-PH')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Travel History */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Plane className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800">Travel History</h3>
                  <p className="text-xs text-slate-400 font-medium">{allRequests.filter(r => r.request_type === REQUEST_TYPES.TRAVEL).length} order(s)</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {allRequests.filter(r => r.request_type === REQUEST_TYPES.TRAVEL).length === 0 ? (
                <div className="text-center py-8">
                  <Plane className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400 text-xs font-semibold">No travel orders found</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {allRequests.filter(r => r.request_type === REQUEST_TYPES.TRAVEL).map((order) => (
                    <div key={order.id} className="border border-slate-100 bg-slate-50/30 rounded-2xl p-4 transition-all hover:bg-slate-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">
                            {order.details?.destination || 'Unknown Destination'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            Submitted: {new Date(order.submitted_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </span>
                      </div>
                      {(order.details?.start_date || order.details?.departure_date) && (
                        <p className="text-xs text-slate-600 font-semibold">
                          Dates: {new Date(order.details.start_date || order.details.departure_date).toLocaleDateString('en-PH')} to {new Date(order.details.end_date || order.details.arrival_date).toLocaleDateString('en-PH')}
                        </p>
                      )}
                      {order.details?.purpose && (
                        <p className="text-xs text-slate-500 font-medium mt-1 italic">
                          Purpose: {order.details.purpose}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-800 font-semibold leading-relaxed">
            This profile was accessed via QR code scan. Only authorized administrators can view this interactive analytics interface.
          </p>
        </div>
      </div>
    </div>
  );
}
