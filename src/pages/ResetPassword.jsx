import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { APP_ROUTES } from '../constants';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    // Check session explicitly on mount
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (cancelled) return;
      if (sessionError) setError(sessionError.message);
      else if (session) setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });

    const t = setTimeout(() => {
      if (cancelled) return;
      
      // Stop the loading spinner after 2.5 seconds regardless of session state
      setReady((r) => {
        if (!r) {
          // If we still don't have a session, check if there's a specific URL error
          if ((window.location.hash || '').includes('error')) {
            setError('Recovery link error. Request a new reset from the login page.');
          } else {
            // Optional: You could show a generic error here if you want to strictly prevent 
            // access without a session, e.g. setError('No active recovery session found.');
          }
        }
        return true;
      });
    }, 2500);

    return () => {
      cancelled = true;
      clearTimeout(t);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: upErr } = await supabase.auth.updateUser({ password: password });
      if (upErr) throw upErr;
      
      setDone(true);
      await supabase.auth.signOut();
      setTimeout(() => navigate(APP_ROUTES.LOGIN, { replace: true }), 2500);
    } catch (err) {
      setError(err.message || 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fffe] relative px-6 sm:px-12 fade-in-up">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(20,184,166,0.04),transparent_50%),radial-gradient(circle_at_20%_80%,rgba(16,185,129,0.04),transparent_50%)]" />
        
        <div className="relative z-10 w-full max-w-[420px] text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-30 scale-110" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
          <span className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
            Success
          </span>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Password Updated</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Your new password has been successfully set. Redirecting to sign in...
          </p>
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.LOGIN, { replace: true })}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 transition-all duration-200"
          >
            Go to sign in now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fffe] relative px-6 sm:px-12 fade-in-up">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(20,184,166,0.04),transparent_50%),radial-gradient(circle_at_20%_80%,rgba(16,185,129,0.04),transparent_50%)]" />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-6">
            <img src="/denr-logo.png" alt="DENR" className="w-20 h-20 object-contain drop-shadow-md" />
          </div>
          <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200 mb-4">
            Security Check
          </span>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Make a New Password</h2>
          <p className="mt-1.5 text-slate-500 text-sm">Please enter and reconfirm your new password below.</p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {ready ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full pl-11 pr-12 py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Reconfirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-11 pr-12 py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed btn-bounce"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Updating...
                </span>
              ) : 'Set Password'}
            </button>
          </form>
        ) : !error && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mb-4"></div>
            <p className="text-slate-400 text-sm">Checking recovery session...</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.LOGIN)}
            className="text-sm text-emerald-700 font-semibold hover:text-emerald-600 hover:underline transition-colors"
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
