import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { APP_ROUTES } from '../constants';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Handles the redirect from Supabase password recovery emails.
 * Add this URL to Supabase → Authentication → URL configuration.
 */
export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });

    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (cancelled) return;
      if (sessionError) setError(sessionError.message);
      else if (session) setReady(true);
    });

    const t = setTimeout(() => {
      if (cancelled) return;
      setReady((r) => r || false);
      setError((e) => e || ((window.location.hash || '').includes('error') ? 'Recovery link error. Request a new reset from the login page.' : null));
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
      const { error: upErr } = await supabase.auth.updateUser({ password });
      if (upErr) throw upErr;
      setDone(true);
      await supabase.auth.signOut();
      setTimeout(() => navigate(APP_ROUTES.LOGIN, { replace: true }), 2000);
    } catch (err) {
      setError(err.message || 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0fdf8] via-white to-[#eff6ff] p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-emerald-100 shadow-2xl p-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-30 scale-110" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
          <span className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
            Password Reset
          </span>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Password reset success</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Your new password has been saved. You will be redirected to sign in shortly.
          </p>
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.LOGIN, { replace: true })}
            className="mt-8 w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 transition-colors"
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fffe] p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-100 shadow-lg p-8">
        <h1 className="text-xl font-black text-slate-800 mb-1">Set new password</h1>
        <p className="text-slate-500 text-sm mb-6">Use the link from your email, then choose a new password below.</p>

        {error && (
          <div className="mb-4 flex gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {ready ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">New password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={show ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShow(!show)}>
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Confirm password</label>
              <input
                type={show ? 'text' : 'password'}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Save password'}
            </button>
          </form>
        ) : !error && (
          <p className="text-slate-400 text-sm">Checking recovery session…</p>
        )}

        <button
          type="button"
          onClick={() => navigate(APP_ROUTES.LOGIN)}
          className="mt-6 text-sm text-emerald-700 font-medium hover:underline w-full text-center"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}
