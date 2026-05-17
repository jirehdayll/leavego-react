import React, { useEffect, useState } from 'react';
import { REQUEST_STATUS, REQUEST_TYPES } from '../constants';
import { useAuth } from '../hooks/useAuth';
import AdminLayout from '../components/AdminLayout';
import { Plane, FileText, Eye, Download, RotateCcw, User, X, Search, Filter, Calendar } from 'lucide-react';

function PDFViewModal({ request, onClose }) {
  const d = request.details || {};
  const isTravel = request.request_type === REQUEST_TYPES.TRAVEL;
  
  const downloadPDF = async () => {
    // For now, just create a simple text download since PDF generation requires additional setup
    const content = isTravel 
      ? `Travel Order\nName: ${request.user_name}\nDestination: ${d.destination || 'N/A'}\nPurpose: ${d.purpose || 'N/A'}\nDeparture: ${d.departure_date || 'N/A'}\nArrival: ${d.arrival_date || 'N/A'}`
      : `Leave Application\nName: ${request.user_name}\nLeave Type: ${d.leave_type || 'N/A'}\nStart Date: ${d.start_date || 'N/A'}\nEnd Date: ${d.end_date || 'N/A'}\nDetails: ${d.details_of_leave || 'N/A'}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${isTravel ? 'Travel_Order' : 'Leave_Application'}_${request.user_name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className={`px-7 py-5 flex items-center justify-between flex-shrink-0 ${isTravel ? 'bg-gradient-to-r from-emerald-600 to-teal-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'}`}>
          <div>
            <p className="text-white/70 text-xs font-semibold mb-1">{isTravel ? 'Travel Order' : 'Leave Application'}</p>
            <h3 className="text-xl font-black text-white">{request.user_name || request.user_email}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadPDF} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all">
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-7 space-y-4">
          <div className="bg-slate-50 rounded-2xl p-5 grid grid-cols-2 gap-4">
            <div><p className="text-xs text-slate-400">Name</p><p className="text-sm font-semibold text-slate-800">{request.user_name}</p></div>
            <div><p className="text-xs text-slate-400">Email</p><p className="text-sm font-semibold text-slate-800">{request.user_email}</p></div>
            <div><p className="text-xs text-slate-400">Status</p>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{request.status}</span>
            </div>
            <div><p className="text-xs text-slate-400">Date</p><p className="text-sm font-semibold text-slate-800">{new Date(request.submitted_at || request.created_at).toLocaleDateString('en-PH')}</p></div>
          </div>
          <div>
            {isTravel ? (
              <div className="space-y-2">
                <div><p className="text-xs text-slate-400">Destination</p><p className="text-sm font-medium text-slate-800">{d.destination || '—'}</p></div>
                <div><p className="text-xs text-slate-400">Purpose</p><p className="text-sm font-medium text-slate-800">{d.purpose || '—'}</p></div>
              </div>
            ) : (
              <div className="space-y-2">
                <div><p className="text-xs text-slate-400">Leave Type</p><p className="text-sm font-medium text-slate-800">{d.leave_type || '—'}</p></div>
                <div><p className="text-xs text-slate-400">Dates</p><p className="text-sm font-medium text-slate-800">{d.start_date} to {d.end_date}</p></div>
                <div><p className="text-xs text-slate-400">Details</p><p className="text-sm font-medium text-slate-800">{d.details_of_leave || '—'}</p></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Archive() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [selectedMonth, setSelectedMonth] = useState('');

  const fetch = () => {
    setLoading(true);
    try {
      // Get forms from localStorage
      let allForms = JSON.parse(localStorage.getItem('leaveRequests') || '[]');
      
      // Create sample archived data if none exists
      if (allForms.length === 0) {
        const sampleArchivedForms = [
          {
            id: 'arch1',
            user_email: 'employee@denr.gov.ph',
            user_name: 'Employee User',
            request_type: REQUEST_TYPES.LEAVE,
            status: REQUEST_STATUS.DECLINED,
            is_archived: true,
            submitted_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            details: { leave_type: 'Vacation Leave', num_days: 5, details_of_leave: 'Family vacation' }
          },
          {
            id: 'arch2',
            user_email: 'employee@denr.gov.ph',
            user_name: 'Employee User',
            request_type: REQUEST_TYPES.TRAVEL,
            status: REQUEST_STATUS.APPROVED,
            is_archived: true,
            submitted_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
            details: { destination: 'Cebu City', purpose: 'Regional Conference', departure_date: '2024-03-15', arrival_date: '2024-03-17' }
          },
          {
            id: 'arch3',
            user_email: 'test@denr.gov.ph',
            user_name: 'Test User',
            request_type: REQUEST_TYPES.LEAVE,
            status: REQUEST_STATUS.DECLINED,
            is_archived: false, // Declined but not archived
            submitted_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            details: { leave_type: 'Sick Leave', num_days: 2, details_of_leave: 'Medical consultation' }
          }
        ];
        localStorage.setItem('leaveRequests', JSON.stringify(sampleArchivedForms));
        allForms = sampleArchivedForms;
      }
      
      // Filter for archived and declined forms
      const archivedForms = allForms.filter(f => f.is_archived === true || f.status === REQUEST_STATUS.DECLINED);
      setForms(archivedForms);
    } catch (error) {
      console.error('Error fetching archive data:', error);
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const restore = (id) => {
    if (!window.confirm('Are you sure you want to restore this application? It will be moved back to the pending applications list.')) {
      return;
    }
    
    try {
      // Get all forms from localStorage
      let allForms = JSON.parse(localStorage.getItem('leaveRequests') || '[]');
      const formToRestore = allForms.find(form => form.id === id);
      
      if (!formToRestore) {
        alert('Form not found.');
        return;
      }
      
      // Restore the form - allow restoring both archived pending and declined forms
      const updatedForms = allForms.map(form => {
        if (form.id === id) {
          return {
            ...form,
            is_archived: false,
            status: REQUEST_STATUS.PENDING,
            // Reset approval fields if they exist
            admin_approved: false,
            admin_approved_at: null,
            admin_approved_by: null,
            cenro_approved: false,
            cenro_approved_at: null,
            cenro_approved_by: null
          };
        }
        return form;
      });
      localStorage.setItem('leaveRequests', JSON.stringify(updatedForms));
      fetch(); // Refresh the archive list
      alert('Application restored successfully. It has been moved back to pending applications.');
    } catch (error) {
      console.error('Error restoring request:', error);
      alert('Failed to restore request. Please try again.');
    }
  };

  const downloadPDF = (req) => {
    const d = req.details || {};
    const content = req.request_type === REQUEST_TYPES.TRAVEL 
      ? `Travel Order\nName: ${req.user_name}\nDestination: ${d.destination || 'N/A'}\nPurpose: ${d.purpose || 'N/A'}\nDeparture: ${d.departure_date || 'N/A'}\nArrival: ${d.arrival_date || 'N/A'}`
      : `Leave Application\nName: ${req.user_name}\nLeave Type: ${d.leave_type || 'N/A'}\nStart Date: ${d.start_date || 'N/A'}\nEnd Date: ${d.end_date || 'N/A'}\nDetails: ${d.details_of_leave || 'N/A'}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${req.request_type === REQUEST_TYPES.TRAVEL ? 'Travel_Order' : 'Leave_Application'}_${req.user_name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateMonthlySummaryPDF = () => {
    try {
      // Get all forms from localStorage
      const allForms = JSON.parse(localStorage.getItem('leaveRequests') || '[]');
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      // Filter approved requests for current month
      const monthlyApproved = allForms.filter(req => {
        const reqDate = new Date(req.submitted_at || req.created_at);
        return req.status === REQUEST_STATUS.APPROVED && 
               reqDate.getMonth() === currentMonth && 
               reqDate.getFullYear() === currentYear;
      });
      
      console.log(`Found ${monthlyApproved.length} approved requests for ${currentDate.toLocaleString('default', { month: 'long' })} ${currentYear}`);
      
      // Generate detailed summary with account information
      const accounts = JSON.parse(localStorage.getItem('userAccounts') || '[]');
      const summary = `Monthly Leave/Travel Summary\nMonth: ${currentDate.toLocaleString('default', { month: 'long' })} ${currentYear}\nTotal Approved Requests: ${monthlyApproved.length}\n\nApproved Applications Details:\n${monthlyApproved.map(req => {
        const account = accounts.find(acc => acc.email === req.user_email);
        const salaryInfo = account ? ` (Salary: ₱${account.salary_range})` : '';
        return `- ${req.user_name}: ${req.request_type}${salaryInfo} (${new Date(req.submitted_at || req.created_at).toLocaleDateString()})`;
      }).join('\n')}\n\nDepartment Breakdown:\n${Object.entries(
        monthlyApproved.reduce((acc, req) => {
          const dept = req.details?.office_department || 'Unknown';
          acc[dept] = (acc[dept] || 0) + 1;
          return acc;
        }, {})
      ).map(([dept, count]) => `- ${dept}: ${count}`).join('\n')}`;
      
      const blob = new Blob([summary], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Monthly_Summary_${currentDate.toLocaleString('default', { month: 'long' })}_${currentYear}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generating attendance report:', error);
      alert('Failed to generate attendance report. Please try again.');
    }
  };

  // Apply filters and search
  let filtered = forms.filter(f => {
    const matchesSearch = !search || 
      (f.user_name || '').toLowerCase().includes(search.toLowerCase()) || 
      (f.user_email || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.details?.leave_type || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.details?.destination || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || f.status === filterStatus;
    const matchesType = filterType === 'all' || f.request_type === filterType;
    const matchesMonth = !selectedMonth || new Date(f.submitted_at || f.created_at).getMonth() === parseInt(selectedMonth);
    
    return matchesSearch && matchesStatus && matchesType && matchesMonth;
  });

  // Apply sorting
  if (sortBy === 'date-desc') filtered.sort((a, b) => new Date(b.submitted_at || b.created_at) - new Date(a.submitted_at || a.created_at));
  else if (sortBy === 'date-asc') filtered.sort((a, b) => new Date(a.submitted_at || a.created_at) - new Date(b.submitted_at || b.created_at));
  else if (sortBy === 'alphabetical') filtered.sort((a, b) => (a.user_name || '').localeCompare(b.user_name || ''));
  else if (sortBy === 'status') filtered.sort((a, b) => a.status.localeCompare(b.status));

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-800">Archive</h2>
              <p className="text-slate-500 text-sm mt-0.5">Declined or hidden forms - {forms.length} total</p>
            </div>
            <button
              onClick={() => generateMonthlySummaryPDF()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search by name, email, or details..." 
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-64" 
            />
          </div>
          
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="all">All Status</option>
            <option value={REQUEST_STATUS.APPROVED}>Approved</option>
            <option value={REQUEST_STATUS.DECLINED}>Declined</option>
            <option value={REQUEST_STATUS.PENDING}>Pending</option>
          </select>
          
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="all">All Types</option>
            <option value={REQUEST_TYPES.LEAVE}>Leave Application</option>
            <option value={REQUEST_TYPES.TRAVEL}>Travel Order</option>
          </select>
          
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="alphabetical">A-Z</option>
            <option value="status">By Status</option>
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mobile-compact-card">
          {loading ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-transparent"></div></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              {forms.length === 0 ? 'Archive is empty.' : 'No forms match your search criteria.'}
            </div>
          ) : (
            <div className="mobile-scroll-table">
              <table className="w-full mobile-compact-table">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Applicant</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(req => {
                  const isTravel = req.request_type === REQUEST_TYPES.TRAVEL;
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => setSelected(req)}>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${isTravel ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {isTravel ? <Plane className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          {isTravel ? 'Travel Order' : 'Sick Leave'}
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
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(req.submitted_at || req.created_at).toLocaleDateString('en-PH')}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-[180px] truncate">
                        {isTravel ? req.details?.destination : req.details?.leave_type}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${req.status === REQUEST_STATUS.DECLINED ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                          {req.is_archived && req.status !== REQUEST_STATUS.DECLINED ? 'Archived' : req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 mobile-action-buttons" onClick={e => e.stopPropagation()}>
                          <button onClick={e => { e.stopPropagation(); setSelected(req); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all mobile-compact-icon-btn"><Eye className="w-4 h-4" /></button>
                          <button onClick={e => { e.stopPropagation(); downloadPDF(req); }} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all mobile-compact-icon-btn"><Download className="w-4 h-4" /></button>
                          <button onClick={e => { e.stopPropagation(); restore(req.id); }} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all mobile-compact-icon-btn" title="Restore to Pending"><RotateCcw className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
                </table>
                </div>
          )}
        </div>
      </div>
      {selected && <PDFViewModal request={selected} onClose={() => setSelected(null)} />}
    </AdminLayout>
  );
}
