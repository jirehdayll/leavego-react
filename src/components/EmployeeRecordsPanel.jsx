import React, { useState } from 'react';
import { MONTHS, REQUEST_STATUS, REQUEST_TYPES } from '../constants';
import { isFormOfAccount, formatSalaryDisplay } from '../utils/employeeMatching';
import {
  Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';

function RecordsBody({ employee, allForms }) {
  const [period, setPeriod] = useState('monthly');
  const forms = allForms.filter((f) => isFormOfAccount(f, employee));

  const approved = forms.filter((f) => f.status === REQUEST_STATUS.APPROVED).length;
  const declined = forms.filter((f) => f.status === REQUEST_STATUS.DECLINED).length;
  const pending = forms.filter(
    (f) => f.status === REQUEST_STATUS.PENDING || f.status === REQUEST_STATUS.PENDING_CENRO
  ).length;
  const total = forms.length;

  const now = new Date();
  let chartData = [];

  if (period === 'monthly') {
    chartData = MONTHS.map((month, i) => {
      const monthForms = forms.filter((f) => {
        const d = new Date(f.submitted_at || f.created_at);
        return d.getMonth() === i && d.getFullYear() === now.getFullYear();
      });
      return {
        name: month,
        Approved: monthForms.filter((f) => f.status === REQUEST_STATUS.APPROVED).length,
        Declined: monthForms.filter((f) => f.status === REQUEST_STATUS.DECLINED).length,
      };
    });
  } else if (period === 'weekly') {
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (w + 1) * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - w * 7);
      const weekForms = forms.filter((f) => {
        const d = new Date(f.submitted_at || f.created_at);
        return d >= weekStart && d < weekEnd;
      });
      chartData.push({
        name: `Week ${4 - w}`,
        Approved: weekForms.filter((f) => f.status === REQUEST_STATUS.APPROVED).length,
        Declined: weekForms.filter((f) => f.status === REQUEST_STATUS.DECLINED).length,
      });
    }
  } else {
    for (let y = 2; y >= 0; y--) {
      const yr = now.getFullYear() - y;
      const yrForms = forms.filter((f) => new Date(f.submitted_at || f.created_at).getFullYear() === yr);
      chartData.push({
        name: String(yr),
        Approved: yrForms.filter((f) => f.status === REQUEST_STATUS.APPROVED).length,
        Declined: yrForms.filter((f) => f.status === REQUEST_STATUS.DECLINED).length,
      });
    }
  }

  const ratio = total > 0 ? approved / total : 0;
  let suggestion = { text: 'No applications yet.', icon: Minus, color: 'text-slate-500', bg: 'bg-slate-50' };
  if (total > 0) {
    if (approved >= 10) {
      suggestion = {
        text: 'Frequent applicant. Monitor leave usage carefully.',
        icon: TrendingUp,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
      };
    } else if (ratio >= 0.8) {
      suggestion = {
        text: 'Strong track record. Excellent compliance.',
        icon: TrendingUp,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
      };
    } else if (ratio < 0.5 && total > 2) {
      suggestion = {
        text: 'Multiple declined applications. Review required.',
        icon: TrendingDown,
        color: 'text-red-600',
        bg: 'bg-red-50',
      };
    } else {
      suggestion = {
        text: 'Regular attendance. Doing well.',
        icon: Minus,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
      };
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: total, color: 'text-slate-800', bg: 'bg-slate-100' },
          { label: 'Approved', value: approved, color: 'text-emerald-700', bg: 'bg-emerald-100' },
          { label: 'Declined', value: declined, color: 'text-red-700', bg: 'bg-red-100' },
          { label: 'Pending', value: pending, color: 'text-amber-700', bg: 'bg-amber-100' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      <div className={`${suggestion.bg} rounded-2xl p-4 flex items-center gap-3`}>
        <suggestion.icon className={`w-5 h-5 flex-shrink-0 ${suggestion.color}`} />
        <p className={`text-sm font-semibold ${suggestion.color}`}>{suggestion.text}</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-slate-800">Application History</h4>
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {['weekly', 'monthly', 'yearly'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${period === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Declined" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {forms.length > 0 && (
        <div>
          <h4 className="font-bold text-slate-800 mb-3">Recent Applications</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {forms.slice(0, 10).map((f) => (
              <div key={f.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
                <div>
                  <span
                    className={`text-xs font-bold ${f.request_type === REQUEST_TYPES.TRAVEL ? 'text-emerald-600' : 'text-blue-600'}`}
                  >
                    {f.request_type === REQUEST_TYPES.TRAVEL ? 'Travel Order' : 'Leave Application'}
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(f.submitted_at || f.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    f.status === REQUEST_STATUS.APPROVED
                      ? 'bg-emerald-100 text-emerald-700'
                      : f.status === REQUEST_STATUS.DECLINED
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {f.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeHeader({ employee, onClose, showClose = true }) {
  const displayName = employee.full_name || employee.fullName || employee.name || 'Employee';
  return (
    <div className="bg-gradient-to-r from-[#1a3530] to-[#0f211d] px-7 py-6 rounded-t-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0">
            {displayName[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h3 className="text-xl font-black text-white">{displayName}</h3>
            <p className="text-emerald-300/70 text-sm">
              {employee.position || 'DENR Employee'} · {employee.email || employee.denr_email}
            </p>
            {employee.department && (
              <p className="text-emerald-400/70 text-xs mt-0.5">{employee.department}</p>
            )}
          </div>
        </div>
        {showClose && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Records detail UI — modal overlay or embedded full page (QR scan). */
export function EmployeeRecordsModal({ employee, allForms, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden my-4 flex flex-col">
        <EmployeeHeader employee={employee} onClose={onClose} />
        <div className="p-7 overflow-y-auto flex-1">
          <RecordsBody employee={employee} allForms={allForms} />
        </div>
      </div>
    </div>
  );
}

export function EmployeeRecordsPage({ employee, allForms }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <EmployeeHeader employee={employee} showClose={false} />
      <div className="p-6 sm:p-8">
        <RecordsBody employee={employee} allForms={allForms} />
      </div>
    </div>
  );
}
