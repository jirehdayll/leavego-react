import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { ArrowLeft, Send } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    position: '',
    salary: '',
    office: 'CENRO Olongapo',
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to submit a request.');

      const { error } = await supabase.from('leave_requests').insert([{
        user_id: user.id,
        user_email: user.email,
        user_name: formData.full_name,
        request_type: 'Travel',
        status: 'Pending',
        department: formData.office,
        details: formData,
      }]);

      if (error) throw error;
      navigate('/success', { state: { type: 'Travel', data: formData } });
    } catch (err) {
      alert(err.message || 'Error submitting form. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate('/selection')} className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Selection
        </button>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-8 py-7 flex items-start gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Travel Order Application</h2>
              <p className="text-emerald-100/80 text-sm mt-1">Official Travel Order — DENR CENRO Olongapo City</p>
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
                  <input type="text" name="position" required value={formData.position} onChange={handleChange} className={inputCls} placeholder="Environmental Management Specialist" />
                </InputField>
                <InputField label="Salary">
                  <input type="text" name="salary" value={formData.salary} onChange={handleChange} className={inputCls} placeholder="₱ 0.00" />
                </InputField>
                <InputField label="Office">
                  <input type="text" name="office" value={formData.office} onChange={handleChange} className={inputCls} />
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
                  <input type="date" name="departure_date" required value={formData.departure_date} onChange={handleChange} className={inputCls} />
                </InputField>
                <InputField label="Arrival Date" required>
                  <input type="date" name="arrival_date" required value={formData.arrival_date} onChange={handleChange} className={inputCls} />
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
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Submitting...</>
                ) : (
                  <><Send className="w-4 h-4" /> Submit Travel Order</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
