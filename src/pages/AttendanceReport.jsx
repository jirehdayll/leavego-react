import React, { useEffect, useState } from 'react';
import { MONTHS, REQUEST_STATUS } from '../constants';
import { supabase } from '../lib/supabaseClient';
import AdminLayout from '../components/AdminLayout';
import { ChevronLeft, ChevronRight, Calendar, X, FileSpreadsheet } from 'lucide-react';
import { generateMonthlySummaryExcel } from '../lib/excelGenerator';

export default function AttendanceReport() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [showCalendar, setShowCalendar] = useState(false);

  const downloadExcel = () => {
    setIsGeneratingExcel(true);
    try {
      generateMonthlySummaryExcel(monthForms, MONTHS[viewMonth], viewYear);
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Failed to generate Excel. Please try again.\n\nError: ' + error.message);
    } finally {
      setIsGeneratingExcel(false);
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
    { color: 'bg-purple-100 border-purple-200 text-purple-800', label: 'Saturday/Sunday/Holiday' },
    { color: 'bg-red-100 border-red-200 text-red-800', label: 'Sick Leave' },
    { color: 'bg-green-100 border-green-200 text-green-800', label: 'Maternity Leave' },
    { color: 'bg-yellow-100 border-yellow-200 text-yellow-800', label: 'Official Business' },
    { color: 'bg-blue-100 border-blue-200 text-blue-800', label: 'Special Privilege Leave' },
    { color: 'bg-sky-100 border-sky-200 text-sky-800', label: 'Vacation Leave / Wellness Leave' },
  ];

  return (
    <AdminLayout>
      <div className="p-2 sm:p-4 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
          <div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800">Attendance Report</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Generate Excel attendance report with color coding</p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <button
              onClick={downloadExcel}
              disabled={isGeneratingExcel}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold rounded-xl transition-all shadow-sm ${
                isGeneratingExcel 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
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
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mobile-compact-card">
            <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm sm:text-base lg:text-lg">Report Preview — {MONTHS[viewMonth]} {viewYear}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{monthForms.length} approved application{monthForms.length !== 1 ? 's' : ''} for this month</p>
            </div>
            
            {Object.keys(byEmployee).length === 0 ? (
              <div className="py-6 sm:py-8 lg:py-12 text-center text-slate-400 text-xs sm:text-sm">No approved applications for this month.</div>
            ) : (
              <div className="mobile-scroll-table">
                <table className="w-full mobile-compact-table text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                      <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                      <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Leave Type</th>
                      <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date Range</th>
                      <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {Object.entries(byEmployee).map(([name, reqs]) => (
                      reqs.map((req, idx) => {
                        const totalDays = parseInt(req.details?.num_days || 1);
                        const leaveType = req.details?.leave_type || (req.request_type === 'travel' ? 'Official Business' : 'Leave');
                        const startDate = new Date(req.details?.start_date || req.details?.departure_date || req.submitted_at);
                        const endDate = new Date(req.details?.end_date || req.details?.arrival_date || req.submitted_at);
                        
                        return (
                          <tr key={`${name}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4 text-xs sm:text-sm text-slate-600">{idx + 1}</td>
                            <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4 text-xs sm:text-sm font-semibold text-slate-800 truncate">
                              <span className="block lg:hidden truncate max-w-[100px]">{name.split(' ')[0]}</span>
                              <span className="hidden lg:inline">{name}</span>
                            </td>
                            <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4 text-xs sm:text-sm text-slate-600">{leaveType}</td>
                            <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4 text-xs sm:text-sm text-slate-600">
                              {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                            </td>
                            <td className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 lg:py-4 text-xs sm:text-sm text-slate-600">{totalDays} day{totalDays !== 1 ? 's' : ''}</td>
                          </tr>
                        );
                      })
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
