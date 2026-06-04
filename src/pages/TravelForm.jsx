import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { OFFICES, APPROPRIATIONS, REQUEST_TYPES } from '../constants';
import SalaryRangeInput from '../components/SalaryRangeInput';
import { ArrowLeft, Send, ChevronDown, Edit } from 'lucide-react';
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

const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all shadow-sm";

export default function TravelForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [departments, setDepartments] = useState(getAllDepartments());
  const [positions, setPositions] = useState(getAllPositions());
  const [formData, setFormData] = useState({
    full_name: '',
    position: '',
    salary: '',
    office_department: '',
    official_station: 'Olongapo City',
    departure_date: '',
    arrival_date: '',
    destination: '',
    purpose: '',
    per_diems: true,
    assistants_allowed: false,
    appropriations: 'CDS',
    remarks: '',
  });

  useEffect(() => {
    // Auto-fill account data if not in view mode and user is available
    if (!location.state?.viewMode && user) {
      // Get account information from localStorage
      const accounts = JSON.parse(localStorage.getItem('userAccounts') || '[]');
      const currentAccount = accounts.find(acc => acc.email === user.email);
      
      if (currentAccount) {
        setFormData(prev => ({
          ...prev,
          full_name: currentAccount.full_name || `${currentAccount.first_name || ''} ${currentAccount.middle_name || ''} ${currentAccount.surname || ''}`.trim(),
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
        full_name: requestData.full_name || '',
        position: requestData.position || '',
        office_department: requestData.office_department || '',
        official_station: requestData.official_station || 'Olongapo City',
        departure_date: requestData.departure_date || '',
        arrival_date: requestData.arrival_date || '',
        destination: requestData.destination || '',
        purpose: requestData.purpose || '',
        per_diems: requestData.per_diems !== undefined ? requestData.per_diems : true,
        assistants_allowed: requestData.assistants_allowed !== undefined ? requestData.assistants_allowed : false,
        appropriations: requestData.appropriations || 'CDS',
        remarks: requestData.remarks || ''
      });
    }
  }, [location.state]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const validateDates = () => {
    const departureDate = new Date(formData.departure_date);
    const arrivalDate = new Date(formData.arrival_date);
    
    if (arrivalDate < departureDate) {
      alert('Arrival date cannot be before departure date.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateDates()) {
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
        localStorage.setItem('basicAuth', JSON.stringify(updatedUser));
        console.warn('[TravelForm] Invalid user.id detected, regenerated valid UUID:', userId);
      }

      // Create travel request object for API
      const travelRequest = {
        user_id: userId,
        user_email: user.email,
        user_name: formData.full_name,
        request_type: REQUEST_TYPES.TRAVEL,
        details: {
          full_name: formData.full_name,
          position: formData.position,
          salary: formData.salary,
          office_department: formData.office_department,
          official_station: formData.official_station,
          departure_date: formData.departure_date,
          arrival_date: formData.arrival_date,
          destination: formData.destination,
          purpose: formData.purpose,
          per_diems: formData.per_diems,
          assistants_allowed: formData.assistants_allowed,
          appropriations: formData.appropriations,
          remarks: formData.remarks
        }
      };
      
      console.log('Submitting travel request:', travelRequest);
      
      // Save to Supabase via API
      const result = await leaveRequestsAPI.create(travelRequest);
      
      console.log('Travel request submitted successfully:', result);
      navigate('/success', { state: { type: 'Travel', data: formData } });
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 py-10 px-4 sm:px-6 fade-in-up">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden scale-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-8 py-7 flex items-start gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              {viewMode ? <Edit className="w-5 h-5 text-white" /> : <Send className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">
                {viewMode ? 'View Travel Form' : 'Travel Form'}
              </h2>
              <p className="text-emerald-100/80 text-sm mt-1">
                {viewMode ? 'Viewing submitted travel order details.' : 'Official Travel Order — DENR CENRO Olongapo City.'}
              </p>
            </div>
            <div className="ml-auto flex-shrink-0 flex items-center gap-2">
              <img src="/denr-logo.png" alt="DENR" className="w-10 h-10 object-contain opacity-100 rounded-full " />
              <img src="/bagong-pilipinas.png" alt="Bagong Pilipinas" className="w-10 h-10 object-contain opacity-100" />
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
            {/* Section 1: Personnel Info */}
            <div>
              <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-black">1</span>
                Personnel Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Full Name" required>
                  <input type="text" name="full_name" required value={formData.full_name} onChange={handleChange} className={`${inputCls} ${viewMode ? 'bg-slate-50 cursor-not-allowed' : ''}`} placeholder="Juan S. Dela Cruz" readOnly={viewMode} />
                </InputField>
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
                <InputField label="Salary">
                  <SalaryRangeInput
                    value={formData.salary}
                    onChange={(value) => setFormData(prev => ({ ...prev, salary: value }))}
                    placeholder="Select or type salary range..."
                    disabled={viewMode}
                  />
                </InputField>
                <InputField label="Office / Department">
                  <div className="relative">
                    <select
                      name="office_department"
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
                <InputField label="Official Station">
                  <input type="text" name="official_station" value={formData.official_station} onChange={handleChange} className={`${inputCls} ${viewMode ? 'bg-slate-50 cursor-not-allowed' : ''}`} readOnly={viewMode} />
                </InputField>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 2: Travel Details */}
            <div>
              <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-black">2</span>
                Travel Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Departure Date" required>
                  <input 
                    type="date" 
                    name="departure_date" 
                    required 
                    value={formData.departure_date} 
                    onChange={handleChange} 
                    className={`${inputCls} ${viewMode ? 'bg-slate-50 cursor-not-allowed' : ''}`} 
                    readOnly={viewMode}
                  />
                </InputField>
                <InputField label="Arrival Date" required>
                  <input 
                    type="date" 
                    name="arrival_date" 
                    required 
                    value={formData.arrival_date} 
                    onChange={handleChange} 
                    min={formData.departure_date}
                    className={`${inputCls} ${viewMode ? 'bg-slate-50 cursor-not-allowed' : ''}`} 
                    readOnly={viewMode}
                  />
                </InputField>
                <div className="md:col-span-2">
                  <InputField label="Destination" required>
                    <input type="text" name="destination" required value={formData.destination} onChange={handleChange} className={`${inputCls} ${viewMode ? 'bg-slate-50 cursor-not-allowed' : ''}`} placeholder="e.g. Manila, Metro Manila" readOnly={viewMode} />
                  </InputField>
                </div>
                <div className="md:col-span-2">
                  <InputField label="Purpose" required>
                    <textarea name="purpose" rows="3" required value={formData.purpose} onChange={handleChange} className={`${inputCls} resize-none ${viewMode ? 'bg-slate-50 cursor-not-allowed' : ''}`} placeholder="e.g. Attend Regional Conference on Environmental Management" readOnly={viewMode} />
                  </InputField>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 3: Administrative */}
            <div>
              <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-black">3</span>
                Administrative Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Appropriations Charged To">
                  <input type="text" name="appropriations" value={formData.appropriations} onChange={handleChange} className={`${inputCls} ${viewMode ? 'bg-slate-50 cursor-not-allowed' : ''}`} readOnly={viewMode} />
                </InputField>
                <InputField label="Remarks / Special Instructions">
                  <input type="text" name="remarks" value={formData.remarks} onChange={handleChange} className={`${inputCls} ${viewMode ? 'bg-slate-50 cursor-not-allowed' : ''}`} placeholder="Optional remarks" readOnly={viewMode} />
                </InputField>
              </div>
              <div className="mt-4 flex flex-wrap gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" name="per_diems" checked={formData.per_diems} onChange={handleChange} className="w-4 h-4 rounded accent-emerald-600" disabled={viewMode} />
                  <span className="text-sm text-slate-700 font-medium">Per Diems / Expenses Allowed</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" name="assistants_allowed" checked={formData.assistants_allowed} onChange={handleChange} className="w-4 h-4 rounded accent-emerald-600" disabled={viewMode} />
                  <span className="text-sm text-slate-700 font-medium">Assistants / Laborers Allowed</span>
                </label>
              </div>
            </div>

            {/* Submit */}
            {!viewMode && (
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || hasSubmittedToday}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed btn-bounce"
                >
                  {loading ? (
                    <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Submitting...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Submit Travel Order</>
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
