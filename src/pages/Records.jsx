import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import AdminLayout from '../components/AdminLayout';
import {
  Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { X, TrendingUp, TrendingDown, Minus, ChevronDown, User } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function EmployeeModal({ employee, allForms, onClose }) {
  const [period, setPeriod] = useState('monthly');
  const forms = allForms.filter(f => f.user_email === employee.denr_email || f.user_name === employee.full_name);

  const approved = forms.filter(f => f.status === 'Approved').length;
  const declined = forms.filter(f => f.status === 'Declined').length;
  const pending = forms.filter(f => f.status === 'Pending').length;
  const total = forms.length;

  // Build chart data
  const now = new Date();
  let chartData = [];

  if (period === 'monthly') {
    chartData = MONTHS.map((month, i) => {
      const monthForms = forms.filter(f => new Date(f.submitted_at || f.created_at).getMonth() === i && new Date(f.submitted_at || f.created_at).getFullYear() === now.getFullYear());
      return { name: month, Approved: monthForms.filter(f => f.status === 'Approved').length, Declined: monthForms.filter(f => f.status === 'Declined').length };
    });
  } else if (period === 'weekly') {
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - (w + 1) * 7);
      const weekEnd = new Date(now); weekEnd.setDate(now.getDate() - w * 7);
      const weekForms = forms.filter(f => { const d = new Date(f.submitted_at || f.created_at); return d >= weekStart && d < weekEnd; });
      chartData.push({ name: `Week ${4 - w}`, Approved: weekForms.filter(f => f.status === 'Approved').length, Declined: weekForms.filter(f => f.status === 'Declined').length });
    }
  } else {
    for (let y = 2; y >= 0; y--) {
      const yr = now.getFullYear() - y;
      const yrForms = forms.filter(f => new Date(f.submitted_at || f.created_at).getFullYear() === yr);
      chartData.push({ name: String(yr), Approved: yrForms.filter(f => f.status === 'Approved').length, Declined: yrForms.filter(f => f.status === 'Declined').length });
    }
  }

  // Suggestion
  const ratio = total > 0 ? approved / total : 0;
  let suggestion = { text: 'No applications yet.', icon: Minus, color: 'text-slate-500', bg: 'bg-slate-50' };
  if (total > 0) {
    if (approved >= 10) suggestion = { text: 'Frequent applicant. Monitor leave usage carefully.', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' };
    else if (ratio >= 0.8) suggestion = { text: 'Strong track record. Excellent compliance.', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' };
    else if (ratio < 0.5 && total > 2) suggestion = { text: 'Multiple declined applications. Review required.', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' };
    else suggestion = { text: 'Regular attendance. Doing well.', icon: Minus, color: 'text-blue-600', bg: 'bg-blue-50' };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden my-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a3530] to-[#0f211d] px-7 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0">
                {(employee.full_name || '?')[0].toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{employee.full_name || 'Employee'}</h3>
                <p className="text-emerald-300/70 text-sm">{employee.position || 'DENR Employee'} · {employee.denr_email}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-7 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total', value: total, color: 'text-slate-800', bg: 'bg-slate-100' },
              { label: 'Approved', value: approved, color: 'text-emerald-700', bg: 'bg-emerald-100' },
              { label: 'Declined', value: declined, color: 'text-red-700', bg: 'bg-red-100' },
              { label: 'Pending', value: pending, color: 'text-amber-700', bg: 'bg-amber-100' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Suggestion */}
          <div className={`${suggestion.bg} rounded-2xl p-4 flex items-center gap-3`}>
            <suggestion.icon className={`w-5 h-5 flex-shrink-0 ${suggestion.color}`} />
            <p className={`text-sm font-semibold ${suggestion.color}`}>{suggestion.text}</p>
          </div>

          {/* Period Selector */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800">Application History</h4>
              <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                {['weekly','monthly','yearly'].map(p => (
                  <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${period === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
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

          {/* Recent Applications */}
          {forms.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-800 mb-3">Recent Applications</h4>
              <div className="space-y-2">
                {forms.slice(0, 5).map(f => (
                  <div key={f.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
                    <div>
                      <span className={`text-xs font-bold ${f.request_type === 'Travel' ? 'text-emerald-600' : 'text-blue-600'}`}>{f.request_type === 'Travel' ? 'Travel Order' : 'Sick Leave'}</span>
                      <p className="text-xs text-slate-500 mt-0.5">{new Date(f.submitted_at || f.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${f.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : f.status === 'Declined' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{f.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Records() {
  const [accounts, setAccounts] = useState([]);
  const [allForms, setAllForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('az');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [{ data: profiles }, { data: forms }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('leave_requests').select('*'),
      ]);
      setAccounts(profiles || []);
      setAllForms(forms || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  let filtered = accounts.filter(a =>
    !search || (a.full_name || '').toLowerCase().includes(search.toLowerCase()) || (a.denr_email || '').toLowerCase().includes(search.toLowerCase())
  );
  if (sortOrder === 'az') filtered.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  else filtered.sort((a, b) => (b.full_name || '').localeCompare(a.full_name || ''));

  return (
    <AdminLayout>
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Records</h2>
            <p className="text-slate-500 text-sm mt-0.5">Click any employee to view detailed statistics</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-56" />
          </div>
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No employee records found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(acc => {
              const empForms = allForms.filter(f => f.user_email === acc.denr_email || f.user_name === acc.full_name);
              const approved = empForms.filter(f => f.status === 'Approved').length;
              return (
                <button
                  key={acc.id}
                  onClick={() => setSelectedEmployee(acc)}
                  className="bg-white border border-slate-100 rounded-2xl p-5 text-left hover:shadow-lg hover:border-emerald-200 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                      {(acc.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{acc.full_name || 'No Name'}</p>
                      <p className="text-xs text-slate-400 truncate">{acc.position || '—'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 rounded-xl p-2">
                      <p className="text-lg font-black text-slate-700">{empForms.length}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Total</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-2">
                      <p className="text-lg font-black text-emerald-700">{approved}</p>
                      <p className="text-[10px] text-emerald-500 font-medium">Approved</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-2">
                      <p className="text-lg font-black text-red-700">{empForms.filter(f => f.status === 'Declined').length}</p>
                      <p className="text-[10px] text-red-400 font-medium">Declined</p>
                    </div>
                  </div>
                  <div className={`mt-3 text-center text-xs font-semibold py-1.5 rounded-xl ${acc.is_active !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {acc.is_active !== false ? '● Active' : '● Inactive'}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedEmployee && (
        <EmployeeModal employee={selectedEmployee} allForms={allForms} onClose={() => setSelectedEmployee(null)} />
      )}
    </AdminLayout>
  );
}
