import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { leaveRequestsAPI } from '../api/leaveRequests';
import { OFFICES, APPROPRIATIONS, DEPARTMENTS, POSITIONS, SALARY_RANGES } from '../constants';
import { ArrowLeft, Send, ChevronDown, Edit } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState(false);
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
    if (location.state?.viewMode && location.state?.requestData) {
      setViewMode(true);
      const requestData = location.state.requestData.details;
      setFormData({
        full_name: requestData.full_name || '',
        position: requestData.position || '',
        salary: requestData.salary || '',
        office_department: requestData.office_department || '',
        official_station: requestData.official_station || 'Olongapo City',
        departure_date: requestData.departure_date || '',
        arrival_date: requestData.arrival_date || '',
        destination: requestData.destination || '',
        purpose: requestData.purpose || '',
        per_diems: requestData.per_diems || false,
        assistants_allowed: requestData.assistants_allowed || false,
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const departureDate = new Date(formData.departure_date);
    const arrivalDate = new Date(formData.arrival_date);
    
    if (departureDate < today) {
      alert('Departure date cannot be in the past.');
      return false;
    }
    
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
      // Get current session more reliably
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        console.error('Session error:', sessionError);
        throw new Error('You must be logged in to submit a request.');
      }
      
      console.log('Submitting travel request:', {
        user_id: session.user.id,
        user_email: session.user.email,
        user_name: formData.full_name,
        request_type: 'Travel',
        department: formData.office_department,
        details: formData
      });

      const { data, error } = await leaveRequestsAPI.create({
        user_id: session.user.id,
        user_email: session.user.email,
        user_name: formData.full_name,
        request_type: 'Travel',
        department: formData.office_department,
        details: formData,
      });

      console.log('Create response:', { data, error });

      if (error) {
        console.error('Create error:', error);
        throw error;
      }
      
      console.log('Travel request submitted successfully');
      navigate('/success', { state: { type: 'Travel', data: formData } });
    } catch (err) {
      console.error('Submit error:', err);
      alert(err.message || 'Error submitting form. Please try again.');
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

          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-8">
            {/* Section 1: Personnel Info */}
            <div>
              <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-black">1</span>
                Personnel Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Full Name" required>
                  <input type="text" name="full_name" required value={formData.full_name} onChange={handleChange} className={inputCls} placeholder="Juan S. Dela Cruz" />
                </InputField>
                <InputField label="Position / Designation" required>
                  <div className="relative">
                    <select
                      name="position"
                      required
                      value={formData.position}
                      onChange={handleChange}
                      className={`${inputCls} appearance-none pr-10`}
                    >
                      <option value="">Select Position...</option>
                      {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </InputField>
                <InputField label="Salary">
                  <div className="relative">
                    <select
                      name="salary"
                      value={formData.salary}
                      onChange={handleChange}
                      className={`${inputCls} appearance-none pr-10`}
                    >
                      <option value="">Select Salary Range...</option>
                      {SALARY_RANGES.map(range => <option key={range} value={range}>{range}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </InputField>
                <InputField label="Office / Department">
                  <div className="relative">
                    <select
                      name="office_department"
                      value={formData.office_department}
                      onChange={handleChange}
                      className={`${inputCls} appearance-none pr-10`}
                    >
                      <option value="">Select Department...</option>
                      {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </InputField>
                <InputField label="Official Station">
                  <input type="text" name="official_station" value={formData.official_station} onChange={handleChange} className={inputCls} />
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
                    min={new Date().toISOString().split('T')[0]}
                    className={inputCls} 
                  />
                </InputField>
                <InputField label="Arrival Date" required>
                  <input 
                    type="date" 
                    name="arrival_date" 
                    required 
                    value={formData.arrival_date} 
                    onChange={handleChange} 
                    min={formData.departure_date || new Date().toISOString().split('T')[0]}
                    className={inputCls} 
                  />
                </InputField>
                <div className="md:col-span-2">
                  <InputField label="Destination" required>
                    <input type="text" name="destination" required value={formData.destination} onChange={handleChange} className={inputCls} placeholder="e.g. Manila, Metro Manila" />
                  </InputField>
                </div>
                <div className="md:col-span-2">
                  <InputField label="Purpose" required>
                    <textarea name="purpose" rows="3" required value={formData.purpose} onChange={handleChange} className={`${inputCls} resize-none`} placeholder="e.g. Attend Regional Conference on Environmental Management" />
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
                  <input type="text" name="appropriations" value={formData.appropriations} onChange={handleChange} className={inputCls} />
                </InputField>
                <InputField label="Remarks / Special Instructions">
                  <input type="text" name="remarks" value={formData.remarks} onChange={handleChange} className={inputCls} placeholder="Optional remarks" />
                </InputField>
              </div>
              <div className="mt-4 flex flex-wrap gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" name="per_diems" checked={formData.per_diems} onChange={handleChange} className="w-4 h-4 rounded accent-emerald-600" />
                  <span className="text-sm text-slate-700 font-medium">Per Diems / Expenses Allowed</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" name="assistants_allowed" checked={formData.assistants_allowed} onChange={handleChange} className="w-4 h-4 rounded accent-emerald-600" />
                  <span className="text-sm text-slate-700 font-medium">Assistants / Laborers Allowed</span>
                </label>
              </div>
            </div>

            {/* Submit */}
            {!viewMode && (
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
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
