import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { leaveRequestsAPI } from '../api/leaveRequests';
import { EmployeeRecordsPage } from '../components/EmployeeRecordsPanel';
import { isFormOfAccount } from '../utils/employeeMatching';
import { getAccountByIdRemote, normalizeAccount, hydrateAccounts, getAccountsSync } from '../lib/accountStore';
import { AlertCircle, Home } from 'lucide-react';

export default function ScannedProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employee, setEmployee] = useState(null);
  const [allForms, setAllForms] = useState([]);

  const fetchEmployeeRecords = useCallback(async () => {
    if (!id) {
      setError('Invalid profile link');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Hydrate accounts so local store is populated regardless of auth state
      await hydrateAccounts();

      const accounts = getAccountsSync() || [];

      let employeeRecord =
        accounts.find((a) => a.id === id) ||
        accounts.find((a) => isFormOfAccount({ user_id: id }, a)) ||
        null;

      if (!employeeRecord) {
        const remoteAccount = await getAccountByIdRemote(id);
        if (remoteAccount) employeeRecord = remoteAccount;
      }

      // Also check profiles table in Supabase
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (profileData) {
        const localMatch = accounts.find(
          (a) =>
            a.id === id ||
            isFormOfAccount(
              {
                user_email: profileData.email || profileData.denr_email,
                user_name: profileData.full_name,
              },
              a
            )
        );
        employeeRecord = {
          ...profileData,
          ...(localMatch || employeeRecord || {}),
          id: profileData.id || employeeRecord?.id || id,
        };
      } else if (employeeRecord) {
        employeeRecord = normalizeAccount(employeeRecord);
      }

      if (!employeeRecord) {
        throw new Error('Employee profile not found. The QR code may be outdated.');
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
  }, [id]);

  useEffect(() => {
    fetchEmployeeRecords();
  }, [fetchEmployeeRecords]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0fdf8] to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm font-medium">Loading employee profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0fdf8] to-white p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Profile Not Found</h2>
          <p className="text-slate-500 mb-8 text-sm">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 px-8 rounded-2xl transition-all shadow-lg hover:shadow-xl"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!employee) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf8] to-white p-4 sm:p-6 lg:p-8">
      {/* Branding header */}
      <div className="max-w-3xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <span className="text-emerald-600 text-[8px] font-black">LG</span>
              </div>
            </div>
            <span className="font-black text-slate-800 text-lg">LeaveGo</span>
          </div>
          <span className="text-xs text-slate-400 font-medium bg-slate-100 px-3 py-1 rounded-full">QR Scan Result</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <EmployeeRecordsPage employee={employee} allForms={allForms} />
      </div>
    </div>
  );
}
