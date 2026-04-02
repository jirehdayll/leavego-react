import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LogOut, FileText, Plane, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { APP_ROUTES } from '../constants/app';

export default function Selection() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(APP_ROUTES.ROOT);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf8] via-white to-[#eff6ff] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-100/40 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-3">
          <img src="/denr-logo.png" alt="DENR" className="w-10 h-10 object-contain rounded-full" />
          <div>
            <h1 className="font-black text-slate-800 text-lg leading-tight">LeaveGo</h1>
            <p className="text-slate-500 text-xs">DENR CENRO Olongapo</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!loading && isAdmin && (
            <button
              onClick={() => navigate(APP_ROUTES.ADMIN_DASHBOARD)}
              className="flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 transition-colors bg-emerald-50 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm hover:shadow border border-emerald-200/80 font-bold"
            >
              Admin Dashboard
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600 transition-colors bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm hover:shadow border border-slate-200/80"
          >
            <LogOut className="h-4 w-4" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 py-8">
        <div className="text-center mb-12 max-w-xl">
          <span className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
            Employee Self-Service
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight leading-tight">
            What would you like to submit?
          </h2>
          <p className="mt-4 text-slate-500 text-base sm:text-lg max-w-md mx-auto">
            Select the request type below to begin filling out your form.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <button
            onClick={() => navigate('/forms/leave')}
            className="group relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl border border-slate-100 hover:border-blue-200 transition-all duration-300 hover:-translate-y-1 text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-50/80 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-100/80 transition-colors" />
            <div className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-5">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Sick Leave</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-5">
                Apply for sick, vacation, maternity, paternity, or any other civil service leave.
              </p>
              <div className="flex items-center gap-2 text-blue-600 text-sm font-semibold">
                <span>Start Application</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/forms/travel')}
            className="group relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl border border-slate-100 hover:border-emerald-200 transition-all duration-300 hover:-translate-y-1 text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-50/80 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-100/80 transition-colors" />
            <div className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-5">
                <Plane className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Travel Order</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-5">
                Submit an official business travel order with destination, purpose, and travel details.
              </p>
              <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                <span>Start Application</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        </div>

        <div className="mt-10 flex items-center gap-4 flex-wrap justify-center">
          <div className="flex items-center gap-1.5 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="font-medium">Forms are reviewed within 1-3 business days</span>
          </div>
        </div>
      </main>
    </div>
  );
}
