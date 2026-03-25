import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { ArrowLeft, Send, ChevronDown } from 'lucide-react';

const LEAVE_TYPES = [
  'Vacation Leave',
  'Mandatory/Forced Leave',
  'Sick Leave',
  'Maternity Leave',
  'Paternity Leave',
  'Special Privilege Leave',
  'Solo Parent Leave',
  'Study Leave',
  '10-Day VAWC Leave',
  'Rehabilitation Privilege',
  'Special Leave Benefits for Women',
  'Special Emergency (Calamity) Leave',
  'Adoption Leave',
];

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
  const [loading, setLoading] = useState(false);
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

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to submit a request.');

      const fullName = `${formData.first_name} ${formData.middle_name} ${formData.last_name}`.trim();

      const { error } = await supabase.from('leave_requests').insert([{
        user_id: user.id,
        user_email: user.email,
        user_name: fullName,
        request_type: 'Leave',
        status: 'Pending',
        department: formData.office_department,
        details: formData,
      }]);

      if (error) throw error;
      navigate('/success', { state: { type: 'Leave', data: formData } });
    } catch (err) {
      alert(err.message || 'Error submitting form. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate('/selection')} className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Selection
        </button>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-7 flex items-start gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Application for Leave</h2>
              <p className="text-blue-100/80 text-sm mt-1">Civil Service Form No. 6 — Please fill out all required fields.</p>
            </div>
            <div className="ml-auto flex-shrink-0">
              <img src="/denr-logo.png" alt="DENR" className="w-12 h-12 object-contain opacity-100 rounded-full" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-8">
            {/* Section 1: Personal Info */}
            <div>
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-black">1</span>
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Office / Department" required>
                  <input type="text" name="office_department" required value={formData.office_department} onChange={handleChange} className={inputCls} placeholder="e.g. CENRO Olongapo" />
                </InputField>
                <InputField label="Date of Filing" required>
                  <input type="date" name="date_of_filing" required value={formData.date_of_filing} onChange={handleChange} className={inputCls} />
                </InputField>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <InputField label="Last Name" required>
                  <input type="text" name="last_name" required value={formData.last_name} onChange={handleChange} className={inputCls} placeholder="Dela Cruz" />
                </InputField>
                <InputField label="First Name" required>
                  <input type="text" name="first_name" required value={formData.first_name} onChange={handleChange} className={inputCls} placeholder="Juan" />
                </InputField>
                <InputField label="Middle Name">
                  <input type="text" name="middle_name" value={formData.middle_name} onChange={handleChange} className={inputCls} placeholder="Santos" />
                </InputField>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <InputField label="Position / Designation" required>
                  <input type="text" name="position" required value={formData.position} onChange={handleChange} className={inputCls} placeholder="Environmental Management Specialist" />
                </InputField>
                <InputField label="Salary (Monthly)">
                  <input type="text" name="salary" value={formData.salary} onChange={handleChange} className={inputCls} placeholder="₱ 0.00" />
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
                  className={`${inputCls} appearance-none pr-10`}
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
                  className={`${inputCls} mt-3 resize-none`}
                  placeholder="e.g. In Hospital – Appendicitis; Within Philippines – Batangas"
                />
              </InputField>
            </div>

            <hr className="border-slate-100" />

            {/* Section 3: Dates */}
            <div>
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-black">3</span>
                Leave Dates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField label="Start Date" required>
                  <input type="date" name="start_date" required value={formData.start_date} onChange={handleChange} className={inputCls} />
                </InputField>
                <InputField label="End Date" required>
                  <input type="date" name="end_date" required value={formData.end_date} onChange={handleChange} className={inputCls} />
                </InputField>
                <InputField label="Number of Working Days" required>
                  <input type="number" name="num_days" required min="1" value={formData.num_days} onChange={handleChange} className={inputCls} placeholder="e.g. 3" />
                </InputField>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-blue-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Submitting...</>
                ) : (
                  <><Send className="w-4 h-4" /> Submit Leave Application</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
