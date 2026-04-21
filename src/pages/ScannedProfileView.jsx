import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { 
  User, Mail, Building, Briefcase, Calendar, 
  FileText, Plane, ArrowLeft, CheckCircle, XCircle, 
  Clock, AlertCircle, Download, Eye, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import { REQUEST_STATUS, REQUEST_TYPES } from '../constants';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ScannedProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: adminUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employeeData, setEmployeeData] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [travelOrders, setTravelOrders] = useState([]);

  useEffect(() => {
    fetchEmployeeProfile();
  }, [id]);

  const fetchEmployeeProfile = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (userError) {
        throw new Error('Employee profile not found');
      }

      // Fetch leave requests
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', id)
        .eq('request_type', REQUEST_TYPES.LEAVE)
        .order('submitted_at', { ascending: false });

      if (leaveError) {
        console.error('Error fetching leave requests:', leaveError);
      }

      // Fetch travel orders
      const { data: travelData, error: travelError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', id)
        .eq('request_type', REQUEST_TYPES.TRAVEL)
        .order('submitted_at', { ascending: false });

      if (travelError) {
        console.error('Error fetching travel orders:', travelError);
      }

      setEmployeeData(userData);
      setLeaveRequests(leaveData || []);
      setTravelOrders(travelData || []);

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
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Calculate statistics
  const allRequests = [...leaveRequests, ...travelOrders];
  const stats = {
    total: allRequests.length,
    approved: allRequests.filter(r => r.status === REQUEST_STATUS.APPROVED).length,
    declined: allRequests.filter(r => r.status === REQUEST_STATUS.DECLINED).length,
    pending: allRequests.filter(r => r.status === REQUEST_STATUS.PENDING).length,
    leave: leaveRequests.length,
    travel: travelOrders.length
  };

  // Prepare data for charts
  const statusData = [
    { name: 'Approved', value: stats.approved, color: '#10b981' },
    { name: 'Declined', value: stats.declined, color: '#ef4444' },
    { name: 'Pending', value: stats.pending, color: '#f59e0b' }
  ];

  const typeData = [
    { name: 'Leave', count: stats.leave, color: '#3b82f6' },
    { name: 'Travel', count: stats.travel, color: '#10b981' }
  ];

  // Monthly data (last 6 months)
  const monthlyData = (() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const monthRequests = allRequests.filter(r => {
        const reqDate = new Date(r.submitted_at || r.created_at);
        return reqDate.getMonth() === month.getMonth() && reqDate.getFullYear() === month.getFullYear();
      });
      months.push({
        month: monthName,
        leave: monthRequests.filter(r => r.request_type === REQUEST_TYPES.LEAVE).length,
        travel: monthRequests.filter(r => r.request_type === REQUEST_TYPES.TRAVEL).length
      });
    }
    return months;
  })();

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
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf8] to-white">
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
              <h1 className="text-xl font-semibold text-slate-800">Employee Profile</h1>
            </div>
            <div className="text-sm text-slate-500">
              Scanned by: {adminUser?.email}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Employee Information Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-10 h-10 text-emerald-700" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                {employeeData?.full_name || 'Unknown Employee'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600">{employeeData?.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600">{employeeData?.department || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600">{employeeData?.position || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistical Records */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Application Statistics</h3>
              <p className="text-sm text-slate-500">Overview of all applications and their status</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
              <div className="text-xs text-slate-500 mt-1">Total Applications</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-emerald-700">{stats.approved}</div>
              <div className="text-xs text-emerald-600 mt-1">Approved</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-700">{stats.declined}</div>
              <div className="text-xs text-red-600 mt-1">Declined</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-700">{stats.pending}</div>
              <div className="text-xs text-amber-600 mt-1">Pending</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Status Distribution Pie Chart */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-4">Status Distribution</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Type Distribution Bar Chart */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-4">Application Types</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6">
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="mt-8">
            <h4 className="text-sm font-semibold text-slate-700 mb-4">6-Month Application Trend</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="leave" fill="#3b82f6" name="Leave Applications" />
                <Bar dataKey="travel" fill="#10b981" name="Travel Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Leave History */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Leave History</h3>
                  <p className="text-sm text-slate-500">{leaveRequests.length} request(s)</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {leaveRequests.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No leave requests found</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {leaveRequests.map((request) => (
                    <div key={request.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-slate-800">
                            {request.details?.leave_type || 'Unknown Leave Type'}
                          </p>
                          <p className="text-sm text-slate-500">
                            {new Date(request.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          {request.status}
                        </span>
                      </div>
                      {request.details?.start_date && request.details?.end_date && (
                        <p className="text-sm text-slate-600">
                          {new Date(request.details.start_date).toLocaleDateString()} - {new Date(request.details.end_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Travel Order History */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Plane className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Travel Order History</h3>
                  <p className="text-sm text-slate-500">{travelOrders.length} order(s)</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {travelOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Plane className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No travel orders found</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {travelOrders.map((order) => (
                    <div key={order.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-slate-800">
                            {order.details?.destination || 'Unknown Destination'}
                          </p>
                          <p className="text-sm text-slate-500">
                            {new Date(order.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </span>
                      </div>
                      {order.details?.start_date && order.details?.end_date && (
                        <p className="text-sm text-slate-600">
                          {new Date(order.details.start_date).toLocaleDateString()} - {new Date(order.details.end_date).toLocaleDateString()}
                        </p>
                      )}
                      {order.details?.purpose && (
                        <p className="text-sm text-slate-600 mt-1">
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
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              This profile was accessed via QR code scan. Only authorized administrators can view this information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
