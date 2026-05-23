import React, { useEffect, useState, useRef } from 'react';
import { MONTHS, REQUEST_STATUS, REQUEST_TYPES } from '../constants';
import { supabase } from '../lib/supabaseClient';
import AdminLayout from '../components/AdminLayout';
import { ChevronLeft, ChevronRight, Calendar, X, Download, FileSpreadsheet } from 'lucide-react';
import { generateMonthlySummaryPDF } from '../lib/monthlySummaryPDF';
import { generateMonthlySummaryExcel } from '../lib/excelGenerator';
import { useAuth } from '../hooks/useAuth';
import { getCalendarEventLabels } from '../utils/calendarLabels';

const TYPE_COLORS = {
  [REQUEST_TYPES.TRAVEL]: { bg: 'bg-yellow-500', text: 'text-black', border: 'border-amber-600', label: 'Travel Order' },
  [REQUEST_TYPES.LEAVE]: { bg: 'bg-rose-200', text: 'text-black', border: 'border-rose-600', label: 'Leave Application' },
  Maternity: { bg: 'bg-emerald-600', text: 'text-black', border: 'border-emerald-700', label: 'Maternity Leave' },
};

function getLeaveColor(req) {
  if (req.request_type === REQUEST_TYPES.TRAVEL) return TYPE_COLORS[REQUEST_TYPES.TRAVEL];
  const leavType = (req.details?.leave_type || '').toLowerCase();
  if (leavType.includes('maternity') || leavType.includes('paternity')) return TYPE_COLORS.Maternity;
  return TYPE_COLORS[REQUEST_TYPES.LEAVE];
}

const CALENDAR_FONT = "'Source Sans 3', 'Segoe UI', system-ui, sans-serif";

export default function MonthlySummary() {
  const { getAccounts } = useAuth();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [showCalendar, setShowCalendar] = useState(false);
  const summaryRef = useRef(null);

  const downloadPDF = async () => {
    console.log('PDF download triggered');
    setIsGeneratingPDF(true);

    try {
      console.log('Starting professional PDF generation...');

      // Generate PDF using the new professional format
      await generateMonthlySummaryPDF(monthForms, MONTHS[viewMonth], viewYear, forms);

      console.log('PDF generated successfully');

    } catch (error) {
      console.error('Error generating PDF:', error);
      console.error('Full error details:', error.stack);
      alert('Failed to generate PDF. Please try again.\n\nError: ' + error.message);
    } finally {
      setIsGeneratingPDF(false);
      console.log('PDF generation completed');
    }
  };

  const downloadExcel = async () => {
    console.log('Excel download triggered');
    setIsGeneratingExcel(true);

    try {
      console.log('Starting professional Excel generation...');
      await generateMonthlySummaryExcel(monthForms, MONTHS[viewMonth], viewYear, forms);
      console.log('Excel generated successfully');
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Failed to generate Excel. Please try again.\n\nError: ' + error.message);
    } finally {
      setIsGeneratingExcel(false);
      console.log('Excel generation completed');
    }
  };



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

  const accounts = getAccounts();
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
    { color: 'bg-yellow-500 border-amber-600 text-white', label: 'Travel Order / Official Business' },
    { color: 'bg-red-500 border-rose-400 text-white', label: 'Sick Leave / Leave Application' },
    { color: 'bg-green-700 border-emerald-700 text-white', label: 'Maternity / Paternity Leave' },
    { color: 'bg-purple-100 border-purple-200 text-purple-800', label: 'Weekends / Holidays' },
  ];

  // Calendar grid for the month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();

  // Group applications by their date ranges for continuous display
  const continuousApplications = monthForms.map(f => {
    const d = f.details || {};
    const start = new Date(d.start_date || d.departure_date || f.submitted_at);
    const end = new Date(d.end_date || d.arrival_date || f.submitted_at);

    // Calculate the days in current month that this application spans
    const daysInMonthSpan = [];
    for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
      if (cur.getMonth() === viewMonth && cur.getFullYear() === viewYear) {
        daysInMonthSpan.push(cur.getDate());
      }
    }

    return {
      ...f,
      start,
      end,
      daysInMonthSpan,
      color: getLeaveColor(f)
    };
  }).filter(app => app.daysInMonthSpan.length > 0);

  // Assign lanes to each application so they don't overlap vertically (greedy interval scheduling)
  // Sort applications by their first day so they are assigned lanes chronologically
  const sortedApps = [...continuousApplications].sort((a, b) => a.daysInMonthSpan[0] - b.daysInMonthSpan[0]);

  const lanes = []; // Array of Sets containing occupied days for each lane track
  sortedApps.forEach(app => {
    let assignedLane = 0;
    while (true) {
      if (!lanes[assignedLane]) {
        lanes[assignedLane] = new Set();
      }

      let hasOverlap = false;
      for (let d of app.daysInMonthSpan) {
        if (lanes[assignedLane].has(d)) {
          hasOverlap = true;
          break;
        }
      }

      if (!hasOverlap) {
        app.daysInMonthSpan.forEach(d => lanes[assignedLane].add(d));
        app.lane = assignedLane;
        break;
      }

      assignedLane++;
    }
  });

  const isWeekend = (day) => {
    const dow = new Date(viewYear, viewMonth, day).getDay();
    return dow === 0 || dow === 6;
  };

  return (
    <AdminLayout>
      <div className="p-2 sm:p-4 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
          <div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800">Monthly Summary</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Color-coded leave calendar for approved applications</p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">

            <button
              onClick={downloadPDF}
              disabled={isGeneratingPDF}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold rounded-xl transition-all shadow-sm ${isGeneratingPDF
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              title="Download as PDF"
            >
              {isGeneratingPDF ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="hidden sm:inline">Generating...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Download PDF</span>
                  <span className="sm:hidden">PDF</span>
                </>
              )}
            </button>
            <button
              onClick={downloadExcel}
              disabled={isGeneratingExcel}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold rounded-xl transition-all shadow-sm ${isGeneratingExcel
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-700 text-white'
                }`}
              title="Download as Excel"
            >
              {isGeneratingExcel ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="hidden sm:inline">Generating...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="hidden sm:inline">Download Excel</span>
                  <span className="sm:hidden">Excel</span>
                </>
              )}
            </button>
            <button onClick={prevMonth} className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <button
              onClick={() => setShowCalendar(true)}
              className="px-3 sm:px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 min-w-[120px] sm:min-w-[150px] text-center shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span className="truncate">{MONTHS[viewMonth]} {viewYear}</span>
            </button>
            <button onClick={nextMonth} className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
          {legend.map(l => (
            <span key={l.label} className={`inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold border ${l.color}`}>
              <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${l.color.split(' ')[0]}`}></span>
              <span className="hidden sm:inline">{l.label}</span>
              <span className="sm:hidden text-[10px]">{l.label.split(' ')[0]}</span>
            </span>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div></div>
        ) : (
          <div ref={summaryRef}>
            {/* Calendar Grid */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-4 sm:mb-6 mobile-compact-card">
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, index) => (
                  <div key={`${d}-${index}`} className="px-1 py-1 sm:px-1 sm:py-2 text-center text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 overflow-x-auto">
                {Array.from({ length: firstDayOfMonth }, (_, i) => (
                  <div key={`empty-${i}`} className="h-12 sm:h-16 lg:h-24 border-b border-r border-slate-50 bg-slate-50/50" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const weekend = isWeekend(day);

                  return (
                    <div key={day} className={`h-14 sm:h-20 lg:h-28 border-b border-r border-slate-50 ${weekend ? 'bg-slate-50/30' : 'bg-white'} relative group overflow-hidden`}>
                      <div className="text-[10px] sm:text-xs font-semibold text-slate-500 p-0.5 sm:p-1 flex justify-between items-center relative z-20">
                        <span>{day}</span>
                      </div>

                      {/* Google Calendar-Style Event Lanes */}
                      <div className="absolute inset-x-0 bottom-0.5 top-5 flex flex-col gap-0.5 sm:gap-1 px-0.5 pointer-events-none">
                        {Array.from({ length: Math.min(lanes.length, 3) }).map((_, laneIndex) => {
                          const app = sortedApps.find(a => a.lane === laneIndex && a.daysInMonthSpan.includes(day));

                          if (!app) {
                            return <div key={`empty-lane-${laneIndex}`} className="h-4 sm:h-5 lg:h-7" />;
                          }

                          const isStart = app.daysInMonthSpan[0] === day;
                          const isEnd = app.daysInMonthSpan[app.daysInMonthSpan.length - 1] === day;
                          const { displayName, controlNumber, typeLabel } = getCalendarEventLabels(app, accounts, forms);

                          let roundedClass = 'rounded-none';
                          if (isStart && isEnd) roundedClass = 'rounded-md';
                          else if (isStart) roundedClass = 'rounded-l-md';
                          else if (isEnd) roundedClass = 'rounded-r-md';

                          return (
                            <div
                              key={`app-${app.id}-lane-${laneIndex}`}
                              className={`h-4 sm:h-5 lg:h-7 min-h-[1rem] text-[5px] sm:text-[7px] lg:text-[8px] font-light leading-tight flex items-center px-1 border-y border-black/5 ${roundedClass} ${app.color.bg} ${app.color.text} ${app.color.border} pointer-events-auto cursor-pointer shadow-sm`}
                              title={`${displayName} · ${controlNumber} · ${typeLabel} (${app.daysInMonthSpan.length} day(s))`}
                              style={{
                                margin: '0 -2px',
                                zIndex: 10,
                                fontFamily: CALENDAR_FONT,
                              }}
                            >
                              {isStart ? (
                                <span className="w-full block overflow-hidden">
                                  <span className="block truncate font-normal">{displayName}</span>
                                  <span className="block truncate opacity-90 text-[4px] sm:text-[6px] lg:text-[7px]">
                                    {controlNumber} · {typeLabel}
                                  </span>
                                </span>
                              ) : (
                                <span className="opacity-0">—</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Employee Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mobile-compact-card">
              <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm sm:text-base lg:text-lg">Employee Summary — {MONTHS[viewMonth]} {viewYear}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{monthForms.length} application{monthForms.length !== 1 ? 's' : ''} approved this month</p>
              </div>
              {Object.keys(byEmployee).length === 0 ? (
                <div className="py-6 sm:py-8 lg:py-12 text-center text-slate-400 text-xs sm:text-sm">No approved applications for this month.</div>
              ) : (
                <div className="mobile-scroll-table">
                  <table className="w-full mobile-compact-table text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                        <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Forms</th>
                        <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Types</th>
                        <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Days</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {Object.entries(byEmployee).map(([name, reqs]) => {
                        const totalDays = reqs.reduce((sum, r) => sum + parseInt(r.details?.num_days || 1), 0);
                        return (
                          <tr key={name} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4 text-xs sm:text-sm font-semibold text-slate-800 truncate">
                              <span className="block lg:hidden truncate max-w-[100px]">{name.split(' ')[0]}</span>
                              <span className="hidden lg:inline">{name}</span>
                            </td>
                            <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4 text-xs sm:text-sm text-slate-600">{reqs.length}</td>
                            <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4">
                              <div className="flex flex-wrap gap-0.5 sm:gap-1">
                                {(() => {
                                  const typeGroups = {};
                                  reqs.forEach(r => {
                                    const col = getLeaveColor(r);
                                    const key = col.label;
                                    if (!typeGroups[key]) {
                                      typeGroups[key] = { count: 0, color: col };
                                    }
                                    typeGroups[key].count++;
                                  });

                                  return Object.entries(typeGroups).map(([label, { count, color }]) => (
                                    <span key={label} className={`px-1 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-bold border ${color.bg} ${color.text} ${color.border}`}>
                                      <span className="hidden sm:inline">{count > 1 ? `${count} ${label}` : label}</span>
                                      <span className="sm:hidden">{count > 1 ? `${count}` : label.split(' ')[0]}</span>
                                    </span>
                                  ));
                                })()}
                              </div>
                            </td>
                            <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4 text-xs sm:text-sm text-slate-600">{totalDays} day{totalDays !== 1 ? 's' : ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
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
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${index === viewMonth
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
