import React, { useEffect, useState } from 'react';
import { MONTHS, REQUEST_STATUS, REQUEST_TYPES } from '../constants';
import { supabase } from '../lib/supabaseClient';
import AdminLayout from '../components/AdminLayout';
import { generateTravelOrderPDF, generateLeaveApplicationPDF } from '../lib/pdfGenerator';
import {
  Grid3X3, List, Download, Eye, Plane, FileText,
  Search, SlidersHorizontal, X, User, Mail, Calendar, Filter
} from 'lucide-react';

function FileCard({ req, view, onClick, onDownload }) {
  const isTravel = req.request_type === REQUEST_TYPES.TRAVEL;
  const dateStr = new Date(req.submitted_at || req.created_at).toLocaleDateString('en-PH');

  if (view === 'grid') {
    return (
      <div
        onClick={onClick}
        className="group bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:border-slate-200 transition-all duration-200 cursor-pointer"
      >
        <div className={`w-12 h-12 ${isTravel ? 'bg-emerald-100' : 'bg-blue-100'} rounded-2xl flex items-center justify-center mb-4`}>
          {isTravel ? <Plane className="w-6 h-6 text-emerald-600" /> : <FileText className="w-6 h-6 text-blue-600" />}
        </div>
        <p className="font-bold text-slate-800 text-sm truncate">{req.user_name || req.user_email}</p>
        <p className={`text-xs mt-1 font-medium ${isTravel ? 'text-emerald-600' : 'text-blue-600'}`}>{isTravel ? 'Travel Order' : 'Sick Leave'}</p>
        <p className="text-xs text-slate-400 mt-2">{dateStr}</p>
        <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="flex-1 text-xs py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors flex items-center justify-center gap-1">
            <Eye className="w-3 h-3" /> View
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDownload(); }} className="flex-1 text-xs py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-medium transition-colors flex items-center justify-center gap-1">
            <Download className="w-3 h-3" /> PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <tr className="hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={onClick}>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${isTravel ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
          {isTravel ? <Plane className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
          {isTravel ? 'Travel Order' : 'Leave Application'}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{req.user_name || 'Unknown'}</p>
            <p className="text-xs text-slate-400">{req.user_email}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-slate-500">{dateStr}</td>
      <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate">
        {isTravel ? req.details?.destination : req.details?.leave_type}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Eye className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDownload(); }} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><Download className="w-4 h-4" /></button>
        </div>
      </td>
    </tr>
  );
}

function PDFViewModal({ request, onClose }) {
  const d = request.details || {};
  const isTravel = request.request_type === REQUEST_TYPES.TRAVEL;

  const downloadPDF = async () => {
    if (isTravel) await generateTravelOrderPDF({ ...d, full_name: request.user_name });
    else await generateLeaveApplicationPDF({ ...d, full_name: request.user_name });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className={`px-7 py-5 flex items-center justify-between flex-shrink-0 ${isTravel ? 'bg-gradient-to-r from-emerald-600 to-teal-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'}`}>
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-1">{isTravel ? 'Travel Order' : 'Leave Application'}</p>
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
          <div className="bg-slate-50 rounded-2xl p-5 mb-4 grid grid-cols-2 gap-4">
            <div><p className="text-xs text-slate-400">Name</p><p className="text-sm font-semibold text-slate-800">{request.user_name}</p></div>
            <div><p className="text-xs text-slate-400">Email</p><p className="text-sm font-semibold text-slate-800">{request.user_email}</p></div>
            <div><p className="text-xs text-slate-400">Department</p><p className="text-sm font-semibold text-slate-800">{request.department || d.office_department || '—'}</p></div>
            <div><p className="text-xs text-slate-400">Status</p>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">{REQUEST_STATUS.APPROVED}</span>
            </div>
          </div>
          {isTravel ? (
            <div className="space-y-2">
              <div><p className="text-xs text-slate-400">Destination</p><p className="text-sm font-medium text-slate-800">{d.destination || '—'}</p></div>
              <div><p className="text-xs text-slate-400">Travel Dates</p><p className="text-sm font-medium text-slate-800">{d.departure_date || '—'} → {d.arrival_date || '—'}</p></div>
              <div><p className="text-xs text-slate-400">Purpose</p><p className="text-sm font-medium text-slate-800">{d.purpose || '—'}</p></div>
            </div>
          ) : (
            <div className="space-y-2">
              <div><p className="text-xs text-slate-400">Leave Type</p><p className="text-sm font-medium text-slate-800">{d.leave_type || '—'}</p></div>
              <div><p className="text-xs text-slate-400">Inclusive Dates</p><p className="text-sm font-medium text-slate-800">{d.start_date} to {d.end_date}</p></div>
              <div><p className="text-xs text-slate-400">Working Days</p><p className="text-sm font-medium text-slate-800">{d.num_days} days</p></div>
              <div><p className="text-xs text-slate-400">Details</p><p className="text-sm font-medium text-slate-800">{d.details_of_leave || '—'}</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default function ApprovedForms() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selected, setSelected] = useState(null);

  const now = new Date();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from('leave_requests').select('*').eq('status', REQUEST_STATUS.APPROVED).eq('is_archived', false).order('submitted_at', { ascending: false });
      setForms(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const downloadPDF = async (req) => {
    const d = req.details || {};
    if (req.request_type === REQUEST_TYPES.TRAVEL) await generateTravelOrderPDF({ ...d, full_name: req.user_name });
    else await generateLeaveApplicationPDF({ ...d, full_name: req.user_name });
  };

  let filtered = forms.filter(f => {
    const matchesSearch = !search || (f.user_name || '').toLowerCase().includes(search.toLowerCase()) || (f.user_email || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'All' || f.request_type === filterType;
    const matchesMonth = !selectedMonth || MONTHS[new Date(f.submitted_at || f.created_at).getMonth()] === selectedMonth;
    return matchesSearch && matchesType && matchesMonth;
  });

  if (sortBy === 'date-desc') filtered.sort((a, b) => new Date(b.submitted_at || b.created_at) - new Date(a.submitted_at || a.created_at));
  else if (sortBy === 'date-asc') filtered.sort((a, b) => new Date(a.submitted_at || a.created_at) - new Date(b.submitted_at || b.created_at));
  else if (sortBy === 'az') filtered.sort((a, b) => (a.user_name || '').localeCompare(b.user_name || ''));
  else if (sortBy === 'za') filtered.sort((a, b) => (b.user_name || '').localeCompare(a.user_name || ''));

  return (
    <AdminLayout>
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Approved Forms</h2>
            <p className="text-slate-500 text-sm mt-0.5">{forms.length} approved application{forms.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1">
            <button onClick={() => setView('grid')} className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600'}`}>
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..." className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-52" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="All">All Types</option>
            <option value={REQUEST_TYPES.LEAVE}>Leave Application</option>
            <option value={REQUEST_TYPES.TRAVEL}>Travel Order</option>
          </select>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="">All Months</option>
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No approved forms found.</div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(req => (
              <FileCard key={req.id} req={req} view="grid" onClick={() => setSelected(req)} onDownload={() => downloadPDF(req)} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Applicant</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(req => (
                  <FileCard key={req.id} req={req} view="list" onClick={() => setSelected(req)} onDownload={() => downloadPDF(req)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && <PDFViewModal request={selected} onClose={() => setSelected(null)} />}
    </AdminLayout>
  );
}
