import React, { useEffect, useState, useCallback } from 'react';
import { REQUEST_STATUS, USER_ROLES } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { leaveRequestsAPI } from '../api/leaveRequests';
import AdminLayout from '../components/AdminLayout';
import { EmployeeRecordsModal } from '../components/EmployeeRecordsPanel';
import { isFormOfAccount, formatSalaryDisplay } from '../utils/employeeMatching';
import { X, User, RefreshCw } from 'lucide-react';

export default function Records() {
  const { getAccounts, accountsReady } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [allForms, setAllForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('az');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);
    setError(null);
    
    try {
      // Get accounts from localStorage
      const userAccounts = getAccounts();
      console.log('Fetched accounts from localStorage:', userAccounts?.length || 0);
      
      // Get forms from Supabase API
      const { data: formsData, error: formsError } = await leaveRequestsAPI.getAll({});
      
      if (formsError) {
        console.error('Error fetching forms from Supabase:', formsError);
        setError('Failed to load forms from database. Please try again.');
        setAllForms([]);
      } else {
        setAllForms(formsData || []);
        console.log('Fetched forms from Supabase:', formsData?.length || 0);
      }
      
      setAccounts(userAccounts || []);
    } catch (err) {
      console.error('Fetch data error:', err);
      setError('Failed to load data. Please try again.');
      setAllForms([]);
      setAccounts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAccounts, accountsReady]);

  useEffect(() => {
    if (accountsReady) fetchData();
  }, [fetchData, accountsReady]);

  // Filter out admin accounts to show only employees
  let filtered = accounts.filter(a =>
    !search || (a.full_name || a.fullName || a.name || '').toLowerCase().includes(search.toLowerCase()) || (a.email || a.denr_email || '').toLowerCase().includes(search.toLowerCase())
  ).filter(a => 
    a.role !== USER_ROLES.ADMIN && 
    a.role !== USER_ROLES.SUPER_ADMIN && 
    a.role !== USER_ROLES.CENRO
  );
  if (sortOrder === 'az') filtered.sort((a, b) => (a.full_name || a.fullName || a.name || '').localeCompare(b.full_name || b.fullName || b.name || ''));
  else filtered.sort((a, b) => (b.full_name || b.fullName || b.name || '').localeCompare(a.full_name || a.fullName || a.name || ''));

  return (
    <AdminLayout>
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Records</h2>
            <p className="text-slate-500 text-sm mt-0.5">Click any employee to view detailed statistics</p>
          </div>
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Could not load records</p>
              <p className="text-red-600/80">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No employee records found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(acc => {
              const empForms = allForms.filter(f => isFormOfAccount(f, acc));
              const approved = empForms.filter(f => f.status === REQUEST_STATUS.APPROVED).length;
              return (
                <button
                  key={acc.id}
                  onClick={() => setSelectedEmployee(acc)}
                  className="bg-white border border-slate-100 rounded-2xl p-5 text-left hover:shadow-lg hover:border-emerald-200 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                      {(acc.full_name || acc.fullName || acc.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{acc.full_name || acc.fullName || acc.name || 'No Name'}</p>
                      <p className="text-xs text-slate-400 truncate">{acc.position || '—'}</p>
                      {acc.salary_range && (
                        <p className="text-xs text-emerald-600 font-semibold truncate mt-1">Salary: ₱{formatSalaryDisplay(acc.salary_range)}</p>
                      )}
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
                      <p className="text-lg font-black text-red-700">{empForms.filter(f => f.status === REQUEST_STATUS.DECLINED).length}</p>
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
        <EmployeeRecordsModal
          employee={selectedEmployee}
          allForms={allForms}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </AdminLayout>
  );
}
