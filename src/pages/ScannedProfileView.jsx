import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { leaveRequestsAPI } from '../api/leaveRequests';
import AdminLayout from '../components/AdminLayout';
import { EmployeeRecordsPage } from '../components/EmployeeRecordsPanel';
import { isFormOfAccount } from '../utils/employeeMatching';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function ScannedProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAccounts } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employee, setEmployee] = useState(null);
  const [allForms, setAllForms] = useState([]);

  const fetchEmployeeRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const accounts = getAccounts() || [];
      let employeeRecord = accounts.find((a) => a.id === id) || null;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (profileError && !employeeRecord) {
        throw new Error('Employee profile not found');
      }

      if (profileData) {
        const localMatch = accounts.find(
          (a) =>
            a.id === id ||
            isFormOfAccount({ user_email: profileData.email || profileData.denr_email, user_name: profileData.full_name }, a)
        );
        employeeRecord = { ...profileData, ...(localMatch || {}), id: profileData.id || id };
      }

      if (!employeeRecord) {
        throw new Error('Employee profile not found');
      }

      const { data: requestsData, error: requestsError } = await leaveRequestsAPI.getAll({});

      if (requestsError) {
        console.error('Error fetching employee requests:', requestsError);
      }

      const formsForEmployee = (requestsData || []).filter(
        (f) => f.user_id === id || isFormOfAccount(f, employeeRecord)
      );

      setEmployee(employeeRecord);
      setAllForms(formsForEmployee);
    } catch (err) {
      setError(err.message || 'Failed to load employee records');
      setEmployee(null);
      setAllForms([]);
    } finally {
      setLoading(false);
    }
  }, [id, getAccounts]);

  useEffect(() => {
    fetchEmployeeRecords();
  }, [fetchEmployeeRecords]);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => navigate('/admin/records')}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800">Employee Records</h1>
            <p className="text-slate-500 text-xs sm:text-sm">Opened from QR scan — this employee only</p>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent" />
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Profile Not Found</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/admin/records')}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Back to Records
            </button>
          </div>
        )}

        {!loading && !error && employee && (
          <EmployeeRecordsPage employee={employee} allForms={allForms} />
        )}
      </div>
    </AdminLayout>
  );
}
