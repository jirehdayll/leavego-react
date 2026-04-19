import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { leaveRequestsAPI } from '../api/leaveRequests';
import { MONTHS, REQUEST_STATUS, REQUEST_TYPES } from '../constants';
import {
  Clock, CheckCircle2, Plane, FileText, TrendingUp,
  Eye, Check, X, Archive, Download, User, Calendar, Mail,
  Search, Filter, ChevronDown
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4 card-hover`}>
      <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
        {Icon && <Icon className={`w-6 h-6 ${color}`} />}
      </div>
      <div>
        <p className="text-2xl font-black text-slate-800">{value ?? '-'}</p>
        <p className="text-xs font-medium text-slate-500 mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  
  const now = new Date();
  const monthName = MONTHS[now.getMonth()];
  const year = now.getFullYear();

  const fetchRequests = useCallback(async () => {
    setLoading(true);

    try {
      // Fetch active requests using API
      const { data: activeData, error: activeErr } = await leaveRequestsAPI.getAll({
        is_archived: false,
        orderBy: 'submitted_at'
      });

      if (!activeErr) {
        console.log('Fetched requests:', activeData?.length || 0);
        setRequests(activeData || []);
      } else {
        console.error('Fetch requests error:', activeErr);
        setRequests([]);
      }

    } catch (error) {
      console.error('Fetch requests error:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('leave_requests_realtime')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'leave_requests' 
        }, 
        (payload) => {
          console.log('Real-time update received:', payload);
          fetchRequests();
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        setConnectionStatus(status);
      });

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  const updateStatus = async (id, status) => {
    try {
      const request = requests.find(r => r.id === id);
      if (request) {
        // Mark as seen if not already seen
        if (!request.seen_by_admin) {
          await leaveRequestsAPI.update(id, { 
            status, 
            seen_by_admin: true,
            admin_seen_at: new Date().toISOString()
          });
        } else {
          await leaveRequestsAPI.update(id, { status });
        }
      }
      fetchRequests();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const markAsSeen = async (id) => {
    const request = requests.find(r => r.id === id);
    if (request && !request.seen_by_admin) {
      await leaveRequestsAPI.update(id, {
        seen_by_admin: true,
        admin_seen_at: new Date().toISOString()
      });
      fetchRequests();
    }
  };

  const archiveRequest = async (id) => {
    await leaveRequestsAPI.archive(id);
    fetchRequests();
  };

  const restoreRequest = async (request) => {
    // Check if application has already been processed (approved/declined)
    if (request.status === REQUEST_STATUS.APPROVED || request.status === REQUEST_STATUS.DECLINED) {
      alert(`Application has already been ${request.status.toLowerCase()}.`);
      return;
    }
    
    // Confirm restoration for pending applications
    if (!window.confirm(`Are you sure you want to restore this pending application from ${request.user_name || request.user_email}?`)) {
      return;
    }
    
    // Restore the request by updating is_archived to false
    try {
      await leaveRequestsAPI.update(request.id, {
        is_archived: false
      });
      fetchRequests();
    } catch (error) {
      console.error('Error restoring request:', error);
      alert('Failed to restore application. Please try again.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  
  // Sort pending applications by newest first for notifications
  const pending = requests
    .filter(r => r.status === REQUEST_STATUS.PENDING)
    .sort((a, b) => {
      const dateA = new Date(a.submitted_at || a.created_at);
      const dateB = new Date(b.submitted_at || b.created_at);
      return dateB.getTime() - dateA.getTime(); // Newest first (descending order)
    });
  const unseenPending = pending.filter(r => !r.seen_by_admin).length;

  const monthStart = new Date(year, now.getMonth(), 1).toISOString();

  // All approved (non-archived)
  const allApproved = requests.filter(r => r.status === REQUEST_STATUS.APPROVED);
  const approvedLeaveCount = allApproved.filter(r => r.request_type === REQUEST_TYPES.LEAVE).length;
  const approvedTravelCount = allApproved.filter(r => r.request_type === REQUEST_TYPES.TRAVEL).length;

  // Specific monthly approved for trending stat
  const monthlyApproved = allApproved.filter(r => new Date(r.submitted_at || r.created_at) >= new Date(monthStart));

  const stats = [
    { icon: Clock, label: 'Pending Applications', value: pending.length, color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: Clock, label: 'Unseen Applications', value: unseenPending, color: 'text-red-600', bg: 'bg-red-50' },
    { icon: Plane, label: 'Approved Travel Orders', value: approvedTravelCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: FileText, label: 'Approved Leave Orders', value: approvedLeaveCount, color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: TrendingUp, label: 'Approved this month', value: monthlyApproved.length, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <AdminLayout>
      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Dashboard</h2>
            <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {monthName} {year} - Real-time overview
            </p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
            connectionStatus === 'SUBSCRIBED' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
              : connectionStatus === 'CHANNEL_ERROR'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-amber-50 border border-amber-200 text-amber-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              connectionStatus === 'SUBSCRIBED' 
                ? 'bg-emerald-500 animate-pulse' 
                : connectionStatus === 'CHANNEL_ERROR'
                ? 'bg-red-500'
                : 'bg-amber-500 animate-pulse'
            }`}></span>
            {connectionStatus === 'SUBSCRIBED' ? 'Live' : connectionStatus === 'CHANNEL_ERROR' ? 'Error' : 'Connecting...'}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
          {stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Pending Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col" style={{ height: '400px', minHeight: '400px' }}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">Pending Applications</h3>
              <p className="text-xs text-slate-400 mt-0.5">{pending.length} application{pending.length !== 1 ? 's' : ''} awaiting review ({unseenPending} unseen)</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16 flex-1">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
            </div>
          ) : pending.length === 0 ? (
            <div className="py-16 text-center flex-1">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-slate-500 font-medium">All caught up!</p>
              <p className="text-slate-400 text-xs mt-1">No pending applications at the moment.</p>
            </div>
          ) : (
            <div className="overflow-auto flex-1">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Applicant</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pending.map((req) => (
                    <tr
                      key={req.id}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        !req.seen_by_admin ? 'bg-blue-50/30 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => {
                        setSelectedRequest(req);
                        markAsSeen(req.id);
                      }}
                    >
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${req.request_type === REQUEST_TYPES.TRAVEL ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                              {req.request_type === REQUEST_TYPES.TRAVEL ? <Plane className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                              {req.request_type === REQUEST_TYPES.TRAVEL ? 'Travel Order' : 'Leave Application'}
                            </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{req.user_name || 'Unknown'}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" />{req.user_email || '-'}</p>
                            {!req.seen_by_admin && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                New
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(req.submitted_at || req.created_at).toLocaleDateString('en-PH')}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate">
                        {req.request_type === REQUEST_TYPES.TRAVEL ? (req.details?.destination || '-') : (req.details?.leave_type || '-')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateStatus(req.id, REQUEST_STATUS.APPROVED)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-all"
                            title="Approve"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => updateStatus(req.id, REQUEST_STATUS.DECLINED)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition-all"
                            title="Decline"
                          >
                            <X className="w-3.5 h-3.5" /> Decline
                          </button>
                          <button
                            onClick={() => archiveRequest(req.id)}
                            className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
