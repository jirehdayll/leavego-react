import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { APP_ROUTES } from '../constants';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Shield, KeyRound } from 'lucide-react';

/**
 * Dedicated Password Creation/Reset Page
 * 
 * This is a standalone, secure page for handling password creation and reset.
 * It securely consumes authentication access tokens from recovery links and provides
 * a clean interface for password updates without disrupting existing application routing.
 * 
 * Features:
 * - Secure token validation from Supabase recovery links
 * - Password confirmation with strength validation
 * - Isolated from existing profile update functions
 * - Production-ready error handling
 */
export default function PasswordReset() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const checkRecoverySession = async () => {
      try {
        // Check for password recovery token in URL
        const accessToken = searchParams.get('access_token');
        
        if (accessToken) {
          // Exchange access token for session
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: '' // Will be handled by Supabase
          });
          
          if (error) {
            if (!cancelled) {
              setError('Invalid or expired recovery link. Please request a new password reset.');
              setTokenValid(false);
            }
            return;
          }
          
          if (data.session) {
            if (!cancelled) {
              setTokenValid(true);
              setReady(true);
            }
          }
        } else {
          // Check existing session for password recovery event
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            if (!cancelled) setError(sessionError.message);
            return;
          }
          
          if (session) {
            if (!cancelled) {
              setTokenValid(true);
              setReady(true);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to validate recovery session. Please try again.');
          setTokenValid(false);
        }
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || session) {
        setTokenValid(true);
        setReady(true);
      }
    });

    checkRecoverySession();

    const t = setTimeout(() => {
      if (cancelled) return;
      if (!ready) {
        setReady(false);
        setError('Recovery link not found or expired. Please request a new password reset from the login page.');
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearTimeout(t);
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const validatePassword = (pwd) => {
    if (pwd.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter.';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter.';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      
      if (updateError) {
        throw updateError;
      }
      
      setDone(true);
      
      // Sign out after successful password update
      await supabase.auth.signOut();
      
      // Redirect to login after delay
      setTimeout(() => {
        navigate(APP_ROUTES.LOGIN, { replace: true });
      }, 2500);
      
    } catch (err) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success state
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
            Password Updated
          </span>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Password reset successful</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Your new password has been saved securely. You will be redirected to the login page shortly.
          </p>
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.LOGIN, { replace: true })}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20"
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50 p-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/30 mb-4">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Create New Password</h1>
          <p className="text-slate-500 text-sm">
            Secure your account by setting a new password
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
          {error && (
            <div className="mb-6 flex gap-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {ready && tokenValid ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Password Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={show ? 'text' : 'password'}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                  Confirm Password
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={show ? 'text' : 'password'}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Confirm your new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Requirements */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-600 mb-2">Password Requirements:</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className={`w-1.5 h-1.5 rounded-full ${password.length >= 6 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    At least 6 characters
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(password) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    One uppercase letter
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(password) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    One lowercase letter
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(password) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    One number
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          ) : !error ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-4">
                <KeyRound className="w-6 h-6 text-slate-400 animate-pulse" />
              </div>
              <p className="text-slate-400 text-sm">Validating recovery link...</p>
            </div>
          ) : null}

          {/* Back to Login */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate(APP_ROUTES.LOGIN)}
              className="w-full text-sm text-emerald-700 font-medium hover:text-emerald-600 transition-colors"
            >
              ← Back to login
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" />
            Secured by Supabase Auth
          </p>
        </div>
      </div>
    </div>
  );
}
