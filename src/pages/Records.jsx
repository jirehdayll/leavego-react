import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { REQUEST_STATUS, USER_ROLES, DEPARTMENTS, POSITIONS } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { leaveRequestsAPI } from '../api/leaveRequests';
import AdminLayout from '../components/AdminLayout';
import { EmployeeRecordsModal } from '../components/EmployeeRecordsPanel';
import { isFormOfAccount, formatSalaryDisplay } from '../utils/employeeMatching';
import { X, User, RefreshCw, Filter, ChevronDown, Calendar } from 'lucide-react';

export default function Records() {
  const { getAccounts, accountsReady } = useAuth();
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [allForms, setAllForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('az');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateRange, setFilterDateRange] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

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

  // Auto-select employee from URL query parameter
  useEffect(() => {
    const userId = searchParams.get('userId');
    if (userId && accounts.length > 0 && !selectedEmployee) {
      const employee = accounts.find(a => a.id === userId);
      if (employee) {
        setSelectedEmployee(employee);
      }
    }
  }, [searchParams, accounts, selectedEmployee]);

  // Get dynamic departments and positions from localStorage
  const allDepartments = [...DEPARTMENTS, ...JSON.parse(localStorage.getItem('customDepartments') || '[]')];
  const allPositions = [...POSITIONS, ...JSON.parse(localStorage.getItem('customPositions') || '[]')];

  // Filter out admin accounts to show only employees
  let filtered = accounts.filter(a =>
    !search || (a.full_name || a.fullName || a.name || '').toLowerCase().includes(search.toLowerCase()) || (a.email || a.denr_email || '').toLowerCase().includes(search.toLowerCase())
  ).filter(a => 
    a.role !== USER_ROLES.ADMIN && 
    a.role !== USER_ROLES.SUPER_ADMIN && 
    a.role !== USER_ROLES.CENRO
  );

  // Apply additional filters
  if (filterDepartment) {
    filtered = filtered.filter(a => a.department === filterDepartment);
  }
  if (filterPosition) {
    filtered = filtered.filter(a => a.position === filterPosition);
  }
  if (filterStatus) {
    filtered = filtered.filter(a => {
      const empForms = allForms.filter(f => isFormOfAccount(f, a));
      return empForms.some(f => f.status === filterStatus);
    });
  }
  if (filterStartDate && filterEndDate) {
    filtered = filtered.filter(a => {
      const empForms = allForms.filter(f => isFormOfAccount(f, a));
      return empForms.some(f => {
        const formDate = new Date(f.submitted_at || f.created_at);
        return formDate >= new Date(filterStartDate) && formDate <= new Date(filterEndDate);
      });
    });
  }

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
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${showFilters ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'}`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters && <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showFilters && (
          <div className="bg-slate-50 rounded-2xl p-5 mb-5 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Department</label>
                <select
                  value={filterDepartment}
                  onChange={e => setFilterDepartment(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">All Departments</option>
                  {allDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Position</label>
                <select
                  value={filterPosition}
                  onChange={e => setFilterPosition(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">All Positions</option>
                  {allPositions.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Status</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">All Statuses</option>
                  <option value={REQUEST_STATUS.PENDING}>Pending</option>
                  <option value={REQUEST_STATUS.PENDING_CENRO}>Pending CENRO</option>
                  <option value={REQUEST_STATUS.APPROVED}>Approved</option>
                  <option value={REQUEST_STATUS.DECLINED}>Declined</option>
                  <option value={REQUEST_STATUS.ARCHIVED}>Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Date Range</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={e => setFilterStartDate(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={e => setFilterEndDate(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setFilterDepartment('');
                  setFilterPosition('');
                  setFilterStatus('');
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}

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
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {(acc.full_name || acc.fullName || acc.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm truncate">{acc.full_name || acc.fullName || acc.name}</p>
                      <p className="text-xs text-slate-500 truncate">{acc.email || acc.denr_email}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total:</span>
                      <span className="font-semibold text-slate-800">{empForms.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Approved:</span>
                      <span className="font-semibold text-emerald-600">{approved}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedEmployee && (
        <EmployeeRecordsModal
          isOpen={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          employee={selectedEmployee}
          allForms={allForms}
        />
      )}
    </AdminLayout>
  );
}