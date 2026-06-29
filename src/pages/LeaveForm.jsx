import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  getUnifiedLeaveBalances,
  getAvailableBalanceForLeaveType,
  getInsufficientBalanceMessage,
  getLeaveBalancesFromDB,
  isCreditTrackedLeaveType,
  updateDailyLeaveAccumulation,
  recalculateLeaveBalancesFromApprovedRequests,
  LEAVE_BALANCES_UPDATED_EVENT,
} from '../lib/leaveBalanceManager';
import { LEAVE_TYPES, REQUEST_TYPES } from '../constants';
import { ArrowLeft, Send, ChevronDown, Edit, AlertCircle, Info } from 'lucide-react';
import { leaveRequestsAPI } from '../api/leaveRequests';
import { generateUUID, isValidUUID } from '../utils/uuid';
import { getAllDepartments, getAllPositions } from '../utils/departmentsPositions';
import { supabase } from '../lib/supabaseClient';

const InputField = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all shadow-sm";

export default function LeaveForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [startDateError, setStartDateError] = useState('');
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [departments, setDepartments] = useState(() => {
    const customDepts = JSON.parse(localStorage.getItem('customDepartments') || '[]');
    const allDepts = [...getAllDepartments(), ...customDepts];
    // Remove duplicates
    return [...new Set(allDepts)];
  });
  const [positions, setPositions] = useState(() => {
    const customPos = JSON.parse(localStorage.getItem('customPositions') || '[]');
    const allPos = [...getAllPositions(), ...customPos];
    // Remove duplicates
    return [...new Set(allPos)];
  });
  const [formData, setFormData] = useState({
    office_department: '',
    last_name: '',
    first_name: '',
    middle_name: '',
    date_of_filing: new Date().toISOString().split('T')[0],
    position: '',
    employee_type: '',
    leave_type: '',
    details_of_leave: '',
    num_days: '',
    start_date: '',
    end_date: '',
  });

  const [validationError, setValidationError] = useState('');
  const [insufficientBalanceError, setInsufficientBalanceError] = useState('');

  const getLeaveLimit = (type) => {
    if (type === 'Mandatory/Forced Leave') return { max: 5, unit: 'Working Days' };
    if (type === 'Special Privilege Leave') return { max: 3, unit: 'Working Days' };
    if (type === 'Wellness Leave') return { max: 5, unit: 'Working Days' };
    if (type === 'Maternity Leave') return { max: 105, unit: 'Calendar Days' };
    return null;
  };

  const calculateLeaveDuration = (startDateStr, endDateStr, leaveType) => {
    if (!startDateStr || !endDateStr) return '';
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (end < start) return '';

    if (leaveType === 'Maternity Leave') {
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays.toString();
    }

    const excludeWeekends = 
      leaveType === 'Mandatory/Forced Leave' || 
      leaveType === 'Special Privilege Leave' || 
      leaveType === 'Wellness Leave';

    if (excludeWeekends) {
      let count = 0;
      const curDate = new Date(start.getTime());
      while (curDate <= end) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++;
        }
        curDate.setDate(curDate.getDate() + 1);
      }
      return count.toString();
    }

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays.toString();
  };

  useEffect(() => {
    const { start_date, end_date, leave_type } = formData;
    if (start_date && end_date && leave_type) {
      const calculatedDaysStr = calculateLeaveDuration(start_date, end_date, leave_type);
      const calculatedDays = parseInt(calculatedDaysStr, 10) || 0;
      
      setFormData(prev => {
        if (prev.num_days !== calculatedDaysStr) {
          return { ...prev, num_days: calculatedDaysStr };
        }
        return prev;
      });

      const limit = getLeaveLimit(leave_type);
      if (limit && calculatedDays > limit.max) {
        setValidationError(`Calculated duration of ${calculatedDays} ${limit.unit} exceeds the maximum allowed limit of ${limit.max} ${limit.unit} for this leave type.`);
      } else {
        setValidationError('');
      }

      // Check leave credit balance immediately when values change
      if (leaveBalance && calculatedDays > 0 && isCreditTrackedLeaveType(leave_type)) {
        const availableBalance = getAvailableBalanceForLeaveType(leaveBalance, leave_type);
        if (calculatedDays > availableBalance) {
          setInsufficientBalanceError(
            getInsufficientBalanceMessage(leave_type, calculatedDays, availableBalance)
          );
        } else {
          setInsufficientBalanceError('');
        }
      } else {
        setInsufficientBalanceError('');
      }
    } else {
      setValidationError('');
      setInsufficientBalanceError('');
    }
  }, [formData.start_date, formData.end_date, formData.leave_type, leaveBalance]);

  useEffect(() => {
    // Auto-fill account data if not in view mode and user is available
    if (!location.state?.viewMode && user) {
      // Get account information from localStorage
      const accounts = JSON.parse(localStorage.getItem('userAccounts') || '[]');
      const currentAccount = accounts.find(acc => acc.email === user.email);
      
      if (currentAccount) {
        setFormData(prev => ({
          ...prev,
          first_name: currentAccount.first_name || '',
          last_name: currentAccount.surname || '',
          middle_name: currentAccount.middle_name || '',
          position: currentAccount.position || '',
          office_department: currentAccount.department || '',
          employee_type: currentAccount.employee_type || ''
        }));
      }
      
      // Load leave balances from account records (synced with approvals)
      fetchUserLeaveBalance();
      
      // Check for duplicate start dates
      const checkDuplicateStartDate = async () => {
        try {
          const { data } = await leaveRequestsAPI.getAll({ user_email: user.email });
          if (data && data.length > 0 && formData.start_date) {
            const hasDuplicate = data.some(req => 
              req.details?.start_date === formData.start_date &&
              (req.status === 'Pending' || req.status === 'Approved')
            );
            if (hasDuplicate) {
              setStartDateError('An application with this start date already exists.');
            } else {
              setStartDateError('');
            }
          }
        } catch (err) {
          console.error('Error checking duplicate start dates:', err);
        }
      };
      checkDuplicateStartDate();
    }
  }, [user, location.state?.viewMode]);

  // Fetch user's leave balance from database (synced with approvals)
  const fetchUserLeaveBalance = async () => {
    if (!user?.id) return;

    setBalanceLoading(true);
    try {
      // Supabase is the source of truth. Fetch through RPC/table helper,
      // then let the database process accrual and refresh again.
      const dbBalances = await getLeaveBalancesFromDB(user.id);
      const updatedBalances = await updateDailyLeaveAccumulation(user.id);
      setLeaveBalance(updatedBalances || dbBalances);
    } catch (err) {
      console.error('Error fetching leave balance:', err);
      // Fallback to localStorage if DB sync fails
      const accounts = JSON.parse(localStorage.getItem('userAccounts') || '[]');
      const currentAccount = accounts.find(acc => acc.id === user.id);
      setLeaveBalance(currentAccount?.leave_balances || null);
    } finally {
      setBalanceLoading(false);
    }
  };

  useEffect(() => {
    const handleBalancesUpdated = (event) => {
      if (event.detail?.accountId === user?.id) {
        getLeaveBalancesFromDB(user.id).then((freshBalances) => {
          setLeaveBalance(freshBalances);
        });
      }
    };
    window.addEventListener(LEAVE_BALANCES_UPDATED_EVENT, handleBalancesUpdated);
    return () => window.removeEventListener(LEAVE_BALANCES_UPDATED_EVENT, handleBalancesUpdated);
  }, [user?.id]);

  // Real-time subscription to user_leave_balances table changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-leave-balances-form-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_leave_balances',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('[LeaveForm Realtime] Change detected in user_leave_balances:', payload);
          // Sync database balances directly to UI state.
          const freshBalances = await getLeaveBalancesFromDB(user.id);
          setLeaveBalance(freshBalances);
        }
      )
      .subscribe((status) => {
        console.log('[LeaveForm Realtime] user_leave_balances subscription status:', status);
      });

    return () => {
      console.log('[LeaveForm Realtime] Cleaning up user_leave_balances subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Check if user has enough leave credit balance
  const checkLeaveCreditBalance = (leaveType, daysRequested) => {
    if (!user?.id || !isCreditTrackedLeaveType(leaveType)) {
      setInsufficientBalanceError('');
      return;
    }

    // Use the leaveBalance state instead of reading from localStorage
    const balances = leaveBalance;

    if (!balances) {
      setInsufficientBalanceError('');
      return;
    }

    const availableBalance = getAvailableBalanceForLeaveType(balances, leaveType);

    if (daysRequested > availableBalance) {
      setInsufficientBalanceError(
        getInsufficientBalanceMessage(leaveType, daysRequested, availableBalance)
      );
    } else {
      setInsufficientBalanceError('');
    }
  };

  useEffect(() => {
    if (location.state?.viewMode && location.state?.requestData) {
      setViewMode(true);
      const requestData = location.state.requestData.details;
      setFormData({
        office_department: requestData.office_department || '',
        last_name: requestData.last_name || '',
        first_name: requestData.first_name || '',
        middle_name: requestData.middle_name || '',
        date_of_filing: requestData.date_of_filing || new Date().toISOString().split('T')[0],
        position: requestData.position || '',
        leave_type: requestData.leave_type || '',
        details_of_leave: requestData.details_of_leave || '',
        num_days: requestData.num_days || '',
        start_date: requestData.start_date || '',
        end_date: requestData.end_date || ''
      });
    } else if (location.state?.defaultLeaveType) {
      setFormData(prev => ({ ...prev, leave_type: location.state.defaultLeaveType }));
    }
  }, [location.state]);

  // Listen for department/position updates from Account Management
  useEffect(() => {
    const handleDepartmentsUpdated = () => {
      const customDepts = JSON.parse(localStorage.getItem('customDepartments') || '[]');
      const allDepts = [...getAllDepartments(), ...customDepts];
      setDepartments([...new Set(allDepts)]);
    };

    const handlePositionsUpdated = () => {
      const customPos = JSON.parse(localStorage.getItem('customPositions') || '[]');
      const allPos = [...getAllPositions(), ...customPos];
      setPositions([...new Set(allPos)]);
    };

    window.addEventListener('departmentsUpdated', handleDepartmentsUpdated);
    window.addEventListener('positionsUpdated', handlePositionsUpdated);

    return () => {
      window.removeEventListener('departmentsUpdated', handleDepartmentsUpdated);
      window.removeEventListener('positionsUpdated', handlePositionsUpdated);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Validate start date when it changes
    if (name === 'start_date' && value && user) {
      checkDuplicateStartDate(value);
    }
  };

  const checkDuplicateStartDate = async (startDate) => {
    try {
      const { data } = await leaveRequestsAPI.getAll({ user_email: user.email });
      if (data && data.length > 0) {
        const hasDuplicate = data.some(req => 
          req.details?.start_date === startDate &&
          (req.status === 'Pending' || req.status === 'Approved')
        );
        if (hasDuplicate) {
          setStartDateError('An application with this start date already exists.');
        } else {
          setStartDateError('');
        }
      }
    } catch (err) {
      console.error('Error checking duplicate start dates:', err);
    }
  };

  const validateDates = () => {
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    
    if (endDate < startDate) {
      alert('End date cannot be before start date.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateDates()) {
      return;
    }

    if (validationError) {
      alert(validationError);
      return;
    }

    // Enhanced balance validation using current state
    const numDays = parseInt(formData.num_days, 10) || 0;
    if (isCreditTrackedLeaveType(formData.leave_type) && numDays > 0) {
      const availableBalance = getAvailableBalanceForLeaveType(leaveBalance, formData.leave_type);
      
      if (availableBalance < numDays) {
        const errorMsg = getInsufficientBalanceMessage(formData.leave_type, numDays, availableBalance);
        alert(errorMsg);
        return;
      }
    }
    
    setLoading(true);

    try {
      if (!user) {
        throw new Error('You must be logged in to submit a request.');
      }

      // Validate and ensure user_id is a proper UUID
      const userId = isValidUUID(user.id) ? user.id : generateUUID();
      
      // If the user.id was invalid, update the stored session with a valid UUID
      if (!isValidUUID(user.id)) {
        const updatedUser = { ...user, id: userId };
        sessionStorage.setItem('basicAuth', JSON.stringify(updatedUser));
        console.warn('[LeaveForm] Invalid user.id detected, regenerated valid UUID:', userId);
      }

      const fullName = `${formData.first_name} ${formData.middle_name} ${formData.last_name}`.trim();
      
      // Create leave request object for API
      const leaveRequest = {
        user_id: userId,
        user_email: user.email,
        user_name: fullName,
        request_type: REQUEST_TYPES.LEAVE,
        details: {
          office_department: formData.office_department,
          first_name: formData.first_name,
          last_name: formData.last_name,
          middle_name: formData.middle_name,
          position: formData.position,
          employee_type: formData.employee_type,
          salary: formData.salary,
          leave_type: formData.leave_type,
          details_of_leave: formData.details_of_leave,
          num_days: formData.num_days,
          start_date: formData.start_date,
          end_date: formData.end_date,
          date_of_filing: formData.date_of_filing
        }
      };
      
      console.log('Submitting leave request:', leaveRequest);

      // Save to Supabase via API
      const result = await leaveRequestsAPI.create(leaveRequest);

      console.log('Leave request submitted successfully:', result);

      // Note: Leave balance deduction is handled automatically by the database trigger
      // when the leave request is approved. No need to manually deduct here.

      navigate('/success', { state: { type: 'Leave', data: formData } });
    } catch (err) {
      console.error('Submit error:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      
      // Extract more specific error message
      let errorMessage = 'Error submitting form. Please try again.';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.originalError) {
        errorMessage = err.originalError.message || errorMessage;
      }
      
      // Check for specific Supabase error patterns
      const errorStr = JSON.stringify(err);
      if (errorStr.includes('duplicate')) {
        errorMessage = 'A similar request already exists. Please check your submission.';
      } else if (errorStr.includes('permission')) {
        errorMessage = 'You do not have permission to submit requests. Please contact support.';
      } else if (errorStr.includes('network') || errorStr.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      alert(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-slate-50 py-10 px-4 sm:px-6 fade-in-up">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden scale-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-7 flex items-start gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              {viewMode ? <Edit className="w-5 h-5 text-white" /> : <Send className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">
                {viewMode ? 'View Leave Application' : 'Leave Application'}
              </h2>
              <p className="text-blue-100/80 text-sm mt-1">
                {viewMode ? 'Viewing submitted application details.' : 'Civil Service Form No. 6 — Official Leave Application.'}
              </p>
            </div>
            <div className="ml-auto flex-shrink-0">
              <img src="/denr-logo.png" alt="DENR" className="w-12 h-12 object-contain opacity-100 rounded-full" />
            </div>
          </div>
          
          {startDateError && !viewMode && (
            <div className="bg-red-50 border-b border-red-200 px-8 py-4 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              <p className="text-red-700 font-bold text-sm">{startDateError}</p>
            </div>
          )}

          {/* Leave Credit Balance Display */}
          {!viewMode && leaveBalance && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-100 px-8 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-purple-600" />
                <p className="text-purple-800 font-bold text-sm">Your Leave Credits</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div className="bg-white rounded-lg p-2 border border-purple-100 text-center">
                  <p className="text-[9px] text-slate-500 uppercase font-semibold">Forced</p>
                  <p className="text-sm font-bold text-purple-700">{Math.round(leaveBalance.forced_leave ?? 5)}</p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-purple-100 text-center">
                  <p className="text-[9px] text-slate-500 uppercase font-semibold">Special</p>
                  <p className="text-sm font-bold text-purple-700">{Math.round(leaveBalance.special_leave_privileges ?? 3)}</p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-purple-100 text-center">
                  <p className="text-[9px] text-slate-500 uppercase font-semibold">Wellness</p>
                  <p className="text-sm font-bold text-purple-700">{Math.round(leaveBalance.wellness_leave ?? 5)}</p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-emerald-100 text-center">
                  <p className="text-[9px] text-slate-500 uppercase font-semibold">Vacation</p>
                  <p className="text-sm font-bold text-emerald-700">{Math.round(leaveBalance.accumulated_vacation ?? 0)}</p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-emerald-100 text-center">
                  <p className="text-[9px] text-slate-500 uppercase font-semibold">Sick</p>
                  <p className="text-sm font-bold text-emerald-700">{Math.round(leaveBalance.accumulated_sick ?? 0)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Admin comment (visible to applicant when viewing a declined/processed application) */}
          {viewMode && location.state?.requestData?.details?.admin_comment && (
            <div className="px-8 py-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-800 mb-1">Admin Comment</p>
                <p className="text-sm text-amber-900">{location.state.requestData.details.admin_comment}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-8">
            {/* Section 1: Personal Info */}
            <div>
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-black">1</span>
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Office / Department" required>
                  <div className="relative">
                    <select
                      name="office_department"
                      required
                      value={formData.office_department}
                      onChange={handleChange}
                      disabled={viewMode}
                      className={`${inputCls} appearance-none pr-10 ${viewMode ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="">Select Department...</option>
                      {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </InputField>
                <InputField label="Date of Filing" required>
                  <input 
                    type="date" 
                    name="date_of_filing" 
                    required 
                    value={formData.date_of_filing} 
                    readOnly
                    className={`${inputCls} bg-slate-50 cursor-not-allowed`} 
                  />
                </InputField>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <InputField label="Last Name" required>
                  <input type="text" name="last_name" required value={formData.last_name} onChange={handleChange} className={`${inputCls} ${viewMode ? 'bg-slate-50 cursor-not-allowed' : ''}`} placeholder="Dela Cruz" readOnly={viewMode} />
                </InputField>
                <InputField label="First Name" required>
                  <input type="text" name="first_name" required value={formData.first_name} onChange={handleChange} className={`${inputCls} ${viewMode ? 'bg-slate-50 cursor-not-allowed' : ''}`} placeholder="Juan" readOnly={viewMode} />
                </InputField>
                <InputField label="Middle Name">
                  <input type="text" name="middle_name" value={formData.middle_name} onChange={handleChange} className={`${inputCls} ${viewMode ? 'bg-slate-50 cursor-not-allowed' : ''}`} placeholder="Santos" readOnly={viewMode} />
                </InputField>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <InputField label="Position / Designation" required>
                  <div className="relative">
                    <select
                      name="position"
                      required
                      value={formData.position}
                      onChange={handleChange}
                      disabled={viewMode}
                      className={`${inputCls} appearance-none pr-10 ${viewMode ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="">Select Position...</option>
                      {positions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </InputField>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 2: Type of Leave */}
            <div>
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-black">2</span>
                Type of Leave to be Availed
              </h3>
              <div className="relative">
                <select
                  name="leave_type"
                  required
                  value={formData.leave_type}
                  onChange={handleChange}
                  disabled={viewMode}
                  className={`${inputCls} appearance-none pr-10 ${viewMode ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                >
                  <option value="">Select Leave Type...</option>
                  {LEAVE_TYPES.map(lt => <option key={lt} value={lt}>{lt}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              <InputField label="Details / Reason" required>
                <textarea
                  name="details_of_leave"
                  rows="3"
                  required
                  value={formData.details_of_leave}
                  onChange={handleChange}
                  className={`${inputCls} mt-3 resize-none ${viewMode ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                  placeholder="e.g. In Hospital – Appendicitis; Within Philippines – Batangas"
                  readOnly={viewMode}
                />
              </InputField>
            </div>

            <hr className="border-slate-100" />

            {/* Section 3: Dates */}
            <div>
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-black">3</span>
                  Leave Dates
                </div>
                {formData.leave_type && getLeaveLimit(formData.leave_type) && (
                  <span className="text-xs font-bold text-amber-600 normal-case bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-lg animate-pulse">
                    * Max Allowed: {getLeaveLimit(formData.leave_type).max} {getLeaveLimit(formData.leave_type).unit}
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField label="Start Date" required>
                  <input 
                    type="date" 
                    name="start_date" 
                    required 
                    value={formData.start_date} 
                    onChange={handleChange} 
                    className={`${inputCls} ${viewMode ? 'bg-slate-50 cursor-not-allowed' : ''} ${validationError || startDateError ? 'border-rose-400 focus:ring-rose-400' : ''}`} 
                    readOnly={viewMode}
                  />
                </InputField>
                <InputField label="End Date" required>
                  <input 
                    type="date" 
                    name="end_date" 
                    required 
                    value={formData.end_date} 
                    onChange={handleChange} 
                    min={formData.start_date}
                    className={`${inputCls} ${viewMode ? 'bg-slate-50 cursor-not-allowed' : ''} ${validationError ? 'border-rose-400 focus:ring-rose-400' : ''}`} 
                    readOnly={viewMode}
                  />
                </InputField>
                <InputField label="Number of Working Days" required>
                  <input type="number" name="num_days" required min="1" value={formData.num_days} onChange={handleChange} className={`${inputCls} bg-slate-50 cursor-not-allowed`} placeholder="e.g. 3" readOnly={true} />
                </InputField>
              </div>
              {validationError && (
                <div className="mt-4 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm font-semibold leading-relaxed">
                    {validationError}
                  </div>
                </div>
              )}
              {insufficientBalanceError && (
                <div className="mt-4 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm font-semibold leading-relaxed">
                    {insufficientBalanceError}
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            {!viewMode && (
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !!startDateError || !!validationError || !!insufficientBalanceError}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-blue-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed btn-bounce"
                >
                  {loading ? (
                    <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Submitting...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Submit Leave Application</>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
