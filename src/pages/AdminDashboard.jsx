import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import AdminLayout from '../components/AdminLayout';
import { generateTravelOrderPDF, generateLeaveApplicationPDF } from '../utils/pdfGenerator';
import {
  Clock, CheckCircle2, Plane, FileText, TrendingUp,
  Eye, Check, X, Archive, Download, User, Calendar, Mail
} from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4`}>
      <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-black text-slate-800">{value ?? '–'}</p>
        <p className="text-xs font-medium text-slate-500 mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}

function PDFModal({ request, onClose }) {
  const downloadPDF = async () => {
    const details = request.details || {};
    if (request.request_type === 'Travel') {
      await generateTravelOrderPDF({ ...details, full_name: request.user_name, start_date: details.departure_date, end_date: details.arrival_date });
    } else {
      await generateLeaveApplicationPDF({ ...details, full_name: request.user_name });
    }
  };

  const d = request.details || {};
  const isTravel = request.request_type === 'Travel';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-[slideUp_0.2s_ease-out]">
        <div className={`px-7 py-5 flex items-center justify-between flex-shrink-0 ${isTravel ? 'bg-gradient-to-r from-emerald-600 to-teal-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'}`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isTravel ? <Plane className="w-4 h-4 text-white/80" /> : <FileText className="w-4 h-4 text-white/80" />}
              <span className="text-white/80 text-xs font-semibold uppercase tracking-wide">{request.request_type === 'Travel' ? 'Travel Order' : 'Leave Application'}</span>
            </div>
            <h3 className="text-xl font-black text-white">{request.user_name || request.user_email}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadPDF} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all">
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-7">
          <div className="bg-slate-50 rounded-2xl p-5 mb-4">
            <div className="grid grid-cols-2 gap-y-3 gap-x-6">
              <div><p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Name</p><p className="text-sm font-semibold text-slate-800 mt-0.5">{request.user_name || '—'}</p></div>
              <div><p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Email</p><p className="text-sm font-semibold text-slate-800 mt-0.5">{request.user_email || '—'}</p></div>
              <div><p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Department</p><p className="text-sm font-semibold text-slate-800 mt-0.5">{request.department || d.office_department || '—'}</p></div>
              <div><p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Position</p><p className="text-sm font-semibold text-slate-800 mt-0.5">{d.position || '—'}</p></div>
              <div><p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Submitted</p><p className="text-sm font-semibold text-slate-800 mt-0.5">{new Date(request.submitted_at || request.created_at).toLocaleDateString('en-PH', { dateStyle: 'long' })}</p></div>
              <div><p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Status</p>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${request.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : request.status === 'Declined' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{request.status}</span>
              </div>
            </div>
          </div>

          {isTravel ? (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Travel Details</h4>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                <div><p className="text-xs text-slate-400">Destination</p><p className="text-sm font-medium text-slate-800">{d.destination || '—'}</p></div>
                <div><p className="text-xs text-slate-400">Departure → Arrival</p><p className="text-sm font-medium text-slate-800">{d.departure_date || '—'} → {d.arrival_date || '—'}</p></div>
                <div className="col-span-2"><p className="text-xs text-slate-400">Purpose</p><p className="text-sm font-medium text-slate-800">{d.purpose || '—'}</p></div>
                <div><p className="text-xs text-slate-400">Per Diems Allowed</p><p className="text-sm font-medium text-slate-800">{d.per_diems ? 'YES' : 'NO'}</p></div>
                <div><p className="text-xs text-slate-400">Appropriations</p><p className="text-sm font-medium text-slate-800">{d.appropriations || 'CDS'}</p></div>
                {d.remarks && <div className="col-span-2"><p className="text-xs text-slate-400">Remarks</p><p className="text-sm font-medium text-slate-800">{d.remarks}</p></div>}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Leave Details</h4>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                <div><p className="text-xs text-slate-400">Leave Type</p><p className="text-sm font-medium text-slate-800">{d.leave_type || '—'}</p></div>
                <div><p className="text-xs text-slate-400">Working Days</p><p className="text-sm font-medium text-slate-800">{d.num_days || '—'} days</p></div>
                <div><p className="text-xs text-slate-400">Inclusive Dates</p><p className="text-sm font-medium text-slate-800">{d.start_date || '—'} to {d.end_date || '—'}</p></div>
                <div><p className="text-xs text-slate-400">Filing Date</p><p className="text-sm font-medium text-slate-800">{d.date_of_filing || '—'}</p></div>
                {d.details_of_leave && <div className="col-span-2"><p className="text-xs text-slate-400">Details</p><p className="text-sm font-medium text-slate-800">{d.details_of_leave}</p></div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [archiveCount, setArchiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const now = new Date();
  const monthName = MONTHS[now.getMonth()];
  const year = now.getFullYear();

  const fetchRequests = useCallback(async () => {
    setLoading(true);

    // Fetch active requests (non-archived)
    const { data: activeData, error: activeErr } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('is_archived', false)
      .order('submitted_at', { ascending: false });

    if (!activeErr) setRequests(activeData || []);

    // Fetch archived count (matching Archive.jsx logic: is_archived OR status='Declined')
    const { count, error: countErr } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .or('is_archived.eq.true,status.eq.Declined');

    if (!countErr) setArchiveCount(count || 0);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('leave_requests_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, fetchRequests)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchRequests]);

  const updateStatus = async (id, status) => {
    await supabase.from('leave_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    fetchRequests();
  };

  const archiveRequest = async (id) => {
    await supabase.from('leave_requests').update({ is_archived: true, updated_at: new Date().toISOString() }).eq('id', id);
    fetchRequests();
  };

  const pending = requests.filter(r => r.status === 'Pending');
  const pendingLeave = pending.filter(r => r.request_type === 'Leave').length;
  const pendingTravel = pending.filter(r => r.request_type === 'Travel').length;

  const monthStart = new Date(year, now.getMonth(), 1).toISOString();

  // All approved (non-archived)
  const allApproved = requests.filter(r => r.status === 'Approved');
  const approvedLeaveCount = allApproved.filter(r => r.request_type === 'Leave').length;
  const approvedTravelCount = allApproved.filter(r => r.request_type === 'Travel').length;

  // Specific monthly approved for the trending stat
  const monthlyApproved = allApproved.filter(r => new Date(r.submitted_at || r.created_at) >= new Date(monthStart));

  const stats = [
    { icon: Clock, label: 'Pending Leave Orders', value: pendingLeave, color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: Clock, label: 'Pending Travel Orders', value: pendingTravel, color: 'text-orange-600', bg: 'bg-orange-50' },
    { icon: Plane, label: 'Approved Travel Orders', value: approvedTravelCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: FileText, label: 'Approved Leave Orders', value: approvedLeaveCount, color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: Archive, label: 'Total Archives', value: archiveCount, color: 'text-slate-600', bg: 'bg-slate-50' },
    { icon: TrendingUp, label: `Approved this month`, value: monthlyApproved.length, color: 'text-purple-600', bg: 'bg-purple-50' },
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
              {monthName} {year} — Real-time overview
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Live
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
          {stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Pending Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">Pending Applications</h3>
              <p className="text-xs text-slate-400 mt-0.5">{pending.length} application{pending.length !== 1 ? 's' : ''} awaiting review</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
            </div>
          ) : pending.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-slate-500 font-medium">All caught up!</p>
              <p className="text-slate-400 text-xs mt-1">No pending applications at the moment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => setSelectedRequest(req)}
                    >
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${req.request_type === 'Travel' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {req.request_type === 'Travel' ? <Plane className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          {req.request_type === 'Travel' ? 'Travel Order' : 'Sick Leave'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{req.user_name || 'Unknown'}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" />{req.user_email || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(req.submitted_at || req.created_at).toLocaleDateString('en-PH')}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate">
                        {req.request_type === 'Travel' ? (req.details?.destination || '—') : (req.details?.leave_type || '—')}
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
                            onClick={() => updateStatus(req.id, 'Approved')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-all"
                            title="Approve"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => updateStatus(req.id, 'Declined')}
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

      {selectedRequest && <PDFModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />}
    </AdminLayout>
  );
}