import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { 
  User, Mail, Building, Briefcase, Calendar, 
  FileText, Plane, ArrowLeft, CheckCircle, XCircle, 
  Clock, AlertCircle, Download, Eye
} from 'lucide-react';
import { REQUEST_STATUS, REQUEST_TYPES } from '../constants';

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
