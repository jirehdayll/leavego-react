import React, { useEffect, useState } from 'react';
import { MONTHS, REQUEST_STATUS, REQUEST_TYPES } from '../constants';
import { supabase } from '../lib/supabaseClient';
import AdminLayout from '../components/AdminLayout';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';


const TYPE_COLORS = {
  [REQUEST_TYPES.TRAVEL]: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', label: 'Travel Order' },
  [REQUEST_TYPES.LEAVE]: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', label: 'Leave Application' },
  Maternity: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', label: 'Maternity Leave' },
};

function getLeaveColor(req) {
  if (req.request_type === REQUEST_TYPES.TRAVEL) return TYPE_COLORS[REQUEST_TYPES.TRAVEL];
  const leavType = (req.details?.leave_type || '').toLowerCase();
  if (leavType.includes('maternity') || leavType.includes('paternity')) return TYPE_COLORS.Maternity;
  return TYPE_COLORS[REQUEST_TYPES.LEAVE];
}

export default function MonthlySummary() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('status', REQUEST_STATUS.APPROVED)
        .order('submitted_at', { ascending: true });
      setForms(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleMonthSelect = (month, year) => {
    setViewMonth(month);
    setViewYear(year);
    setShowCalendar(false);
  };

  const monthForms = forms.filter(f => {
    const d = new Date(f.submitted_at || f.created_at);
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  });

  // Group by employee
  const byEmployee = {};
  monthForms.forEach(f => {
    const key = f.user_name || f.user_email;
    if (!byEmployee[key]) byEmployee[key] = [];
    byEmployee[key].push(f);
  });

  const legend = [
    { color: 'bg-yellow-100 border-yellow-200 text-yellow-800', label: 'Travel Order / Official Business' },
    { color: 'bg-red-100 border-red-200 text-red-800', label: 'Sick Leave / Leave Application' },
    { color: 'bg-green-100 border-green-200 text-green-800', label: 'Maternity / Paternity Leave' },
    { color: 'bg-purple-100 border-purple-200 text-purple-800', label: 'Weekends / Holidays' },
  ];

  // Calendar grid for the month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();

  // Map of date → list of forms
  const dateMap = {};
  monthForms.forEach(f => {
    const d = f.details || {};
    const start = new Date(d.start_date || d.departure_date || f.submitted_at);
    const end = new Date(d.end_date || d.arrival_date || f.submitted_at);
    for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
      if (cur.getMonth() === viewMonth && cur.getFullYear() === viewYear) {
        const key = cur.getDate();
        if (!dateMap[key]) dateMap[key] = [];
        dateMap[key].push(f);
      }
    }
  });

  const isWeekend = (day) => {
    const dow = new Date(viewYear, viewMonth, day).getDay();
    return dow === 0 || dow === 6;
  };

  return (
    <AdminLayout>
      <div className="p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Monthly Summary</h2>
            <p className="text-slate-500 text-sm mt-0.5">Color-coded leave calendar for approved applications</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <button 
              onClick={() => setShowCalendar(true)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 min-w-[150px] text-center shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              {MONTHS[viewMonth]} {viewYear}
            </button>
            <button onClick={nextMonth} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-6">
          {legend.map(l => (
            <span key={l.label} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${l.color}`}>
              <span className={`w-2 h-2 rounded-full ${l.color.split(' ')[0]}`}></span>
              {l.label}
            </span>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div></div>
        ) : (
          <>
            {/* Calendar Grid */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                  <div key={d} className="px-2 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: firstDayOfMonth }, (_, i) => (
                  <div key={`empty-${i}`} className="h-24 border-b border-r border-slate-50 bg-slate-50/50" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const weekend = isWeekend(day);
                  const dayForms = dateMap[day] || [];
                  return (
                    <div key={day} className={`h-24 border-b border-r border-slate-100 p-1.5 overflow-hidden ${weekend ? 'bg-purple-50/60' : 'bg-white'}`}>
                      <span className={`text-xs font-bold block mb-1 ${weekend ? 'text-purple-500' : 'text-slate-600'} ${day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear() ? 'bg-emerald-500 text-white w-5 h-5 rounded-full flex items-center justify-center' : ''}`}>
                        {day}
                      </span>
                      {dayForms.slice(0, 2).map((f, fi) => {
                        const col = getLeaveColor(f);
                        return (
                          <div key={fi} className={`${col.bg} ${col.text} text-[9px] font-semibold px-1 py-0.5 rounded truncate mb-0.5`}>
                            {f.user_name?.split(' ')[0] || 'User'}
                          </div>
                        );
                      })}
                      {dayForms.length > 2 && <div className="text-[9px] text-slate-400 font-medium">+{dayForms.length - 2} more</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Employee Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Employee Summary — {MONTHS[viewMonth]} {viewYear}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{monthForms.length} application{monthForms.length !== 1 ? 's' : ''} approved this month</p>
              </div>
              {Object.keys(byEmployee).length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">No approved applications for this month.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Forms</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Types</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {Object.entries(byEmployee).map(([name, reqs]) => {
                      const totalDays = reqs.reduce((sum, r) => sum + parseInt(r.details?.num_days || 1), 0);
                      return (
                        <tr key={name} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-800">{name}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{reqs.length}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {reqs.map((r, i) => {
                                const col = getLeaveColor(r);
                                return (
                                  <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-bold border ${col.bg} ${col.text} ${col.border}`}>
                                    {col.label}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{totalDays} day{totalDays !== 1 ? 's' : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* Calendar Pop-up Modal */}
      {showCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCalendar(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Select Month</h3>
              <button 
                onClick={() => setShowCalendar(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Year Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Year</label>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setViewYear(viewYear - 1)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="flex-1 text-center font-bold text-slate-800">{viewYear}</span>
                  <button 
                    onClick={() => setViewYear(viewYear + 1)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>

              {/* Month Grid */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Month</label>
                <div className="grid grid-cols-3 gap-2">
                  {MONTHS.map((month, index) => (
                    <button
                      key={month}
                      onClick={() => handleMonthSelect(index, viewYear)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        index === viewMonth
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Navigation */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-3">Quick Navigation</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMonthSelect(now.getMonth(), now.getFullYear())}
                    className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold rounded-lg transition-all"
                  >
                    Current Month
                  </button>
                  <button
                    onClick={() => handleMonthSelect(0, viewYear)}
                    className="flex-1 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-semibold rounded-lg transition-all"
                  >
                    January {viewYear}
                  </button>
                  <button
                    onClick={() => handleMonthSelect(11, viewYear)}
                    className="flex-1 px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-semibold rounded-lg transition-all"
                  >
                    December {viewYear}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
