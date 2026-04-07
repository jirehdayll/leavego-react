import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Home, FileText } from 'lucide-react';

export default function FormSuccessful() {
  const navigate = useNavigate();
  const location = useLocation();
  const formType = location.state?.type || 'Form';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf8] via-white to-[#eff6ff] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-100/40 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-100/30 rounded-full blur-[100px] translate-y-1/2 translate-x-1/2" />

      <div className="relative z-10 bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-10 text-center">
        {/* Animated checkmark */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-30 scale-110" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>

        <span className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
          {formType} Application
        </span>

        <h2 className="text-3xl font-black text-slate-800 mb-3">Successfully Submitted!</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          Your <strong className="text-slate-700">{formType} Application</strong> has been received and is now <span className="text-amber-600 font-semibold">pending review</span> by the administrator. You will be notified once it has been processed.
        </p>

        <div className="bg-slate-50 rounded-2xl p-4 mb-8 text-left">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            <FileText className="w-3.5 h-3.5" />
            What happens next?
          </div>
          <ul className="space-y-1.5 text-xs text-slate-600">
            <li className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span> Admin reviews your application</li>
            <li className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span> Form is approved or returned with notes</li>
            <li className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span> Official document is generated</li>
          </ul>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-500 transition-all duration-200"
        >
          <Home className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
