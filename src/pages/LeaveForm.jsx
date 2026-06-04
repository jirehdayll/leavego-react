import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LEAVE_TYPES, REQUEST_TYPES } from '../constants';
import SalaryRangeInput from '../components/SalaryRangeInput';
import { ArrowLeft, Send, ChevronDown, Edit, AlertCircle } from 'lucide-react';
import { leaveRequestsAPI } from '../api/leaveRequests';
import { generateUUID, isValidUUID } from '../utils/uuid';
import { getAllDepartments, getAllPositions } from '../utils/departmentsPositions';

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
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [departments, setDepartments] = useState(getAllDepartments());
  const [positions, setPositions] = useState(getAllPositions());
  const [formData, setFormData] = useState({
    office_department: '',
    last_name: '',
    first_name: '',
    middle_name: '',
    date_of_filing: new Date().toISOString().split('T')[0],
    position: '',
    salary: '',
    leave_type: '',
    details_of_leave: '',
    num_days: '',
    start_date: '',
    end_date: '',
  });

  const [validationError, setValidationError] = useState('');

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
    } else {
      setValidationError('');
    }
  }, [formData.start_date, formData.end_date, formData.leave_type]);

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
          salary: currentAccount.salary_range || '',
          office_department: currentAccount.department || ''
        }));
      }
      
      // Check for same day submissions
      const checkSameDaySubmission = async () => {
        try {
          const { data } = await leaveRequestsAPI.getAll({ user_email: user.email });
          if (data && data.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const submittedToday = data.some(req => 
              new Date(req.submitted_at || req.created_at).toISOString().split('T')[0] === today
            );
            setHasSubmittedToday(submittedToday);
          }
        } catch (err) {
          console.error('Error checking same day submissions:', err);
        }
      };
      checkSameDaySubmission();
    }
  }, [user, location.state?.viewMode]);

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
        salary: requestData.salary || '',
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
          
          {hasSubmittedToday && !viewMode && (
            <div className="bg-red-50 border-b border-red-200 px-8 py-4 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              <p className="text-red-700 font-bold text-sm">You already submitted a form today.</p>
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
                <InputField label="Salary (Monthly)">
                  <SalaryRangeInput
                    value={formData.salary}
                    onChange={(value) => setFormData(prev => ({ ...prev, salary: value }))}
                    placeholder="Select or type salary range..."
                    disabled={viewMode}
                  />
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
                    className={`${inputCls} ${viewMode ? 'bg-slate-50 cursor-not-allowed' : ''} ${validationError ? 'border-rose-400 focus:ring-rose-400' : ''}`} 
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
            </div>

            {/* Submit */}
            {!viewMode && (
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || hasSubmittedToday || !!validationError}
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
