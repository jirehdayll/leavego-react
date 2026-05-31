import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, X, AlertTriangle, FileText } from 'lucide-react';

// Terms and Conditions Modal
function TermsAndConditionsModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-[fadeIn_0.2s_ease-out]">
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className=" font-black text-slate-800 text-center mb-6">Terms and Conditions</h3>
          
          <div className="space-y-6 text-slate-600 text-sm leading-relaxed">
            <section>
              <h4 className="text-emerald-700 font-bold mb-2">1. Official Usage</h4>
              <p>The LeaveGo System is intended solely for official use by the Department of Environment and Natural Resources (DENR) CENRO Olongapo employees. Unauthorized access, modification, or distribution of any data within this system is strictly prohibited and subject to disciplinary action.</p>
            </section>
            
            <section>
              <h4 className="text-emerald-700 font-bold mb-2">2. Data Privacy</h4>
              <p>By using this system, you consent to the collection, processing, and storage of your personal information (including name, position, salary, and leave/travel details) strictly for administrative purposes, in compliance with the Data Privacy Act of 2012. We are committed to safeguarding your information against unauthorized access.</p>
            </section>
            
            <section>
              <h4 className="text-emerald-700 font-bold mb-2">3. Accountability</h4>
              <p>Users are responsible for maintaining the confidentiality of their login credentials. All applications (Leave and Travel) submitted through your account are considered official and binding. Any falsification of information may result in administrative sanctions.</p>
            </section>
          </div>
        </div>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors"
          >
            I Accept and Understand
          </button>
        </div>
      </div>
    </div>
  );
}

// Deactivated Account Modal
function DeactivatedModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div className="p-7 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Account is not Anymore Available</h3>
          <p className="text-slate-600 text-sm mb-6">
            This account is no longer available. Please contact an administrator for assistance.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}



export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDeactivatedModal, setShowDeactivatedModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        const from = location.state?.from;
        if (from) {
          navigate(from, { replace: true });
        } else if (result.user.role === 'admin' || result.user.role === 'cenro') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex fade-in-up">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#0d2b24] via-[#1a4035] to-[#0a4229]">
        {/* Decorative blobs */}
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-emerald-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-80px] right-[-80px] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-400/5 rounded-full blur-[80px]" />

        {/* Top DENR Label */}
        <div className="absolute top-8 left-10 z-10">
          <p className="text-emerald-400/90 text-xs font-semibold uppercase tracking-[0.2em]">Department of Environment</p>
          <p className="text-emerald-400/90 text-xs font-semibold uppercase tracking-[0.2em]">and Natural Resources</p>
        </div>

        {/* Center Logo + Text */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 gap-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-white/5 blur-xl scale-110" />
            <img src="/denr-logo.png" alt="DENR Logo" className="relative w-52 h-52 object-contain drop-shadow-2xl rounded-full" />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black text-white tracking-tight">LeaveGo</h1>
            <p className="mt-2 text-emerald-300/80 text-sm font-medium tracking-wide">Official Leave &amp; Travel Management System</p>
            <div className="mt-6 flex items-center gap-3 justify-center">
              <div className="w-8 h-0.5 bg-emerald-500/40 rounded-full" />
              <span className="text-emerald-400/90 text-xs uppercase tracking-widest">DENR CENRO Olongapo</span>
              <div className="w-8 h-0.5 bg-emerald-500/40 rounded-full" />
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-emerald-300/90 text-xs italic">"Malinis na Kapaligiran at Mayamang Kalikasan para sa Buong Sambayanan."</p>
          <p className="text-emerald-300/70 text-xs mt-1">© {new Date().getFullYear()} LeaveGo System · Powered by DENR IT</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#f8fffe] relative px-6 sm:px-12">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(20,184,166,0.04),transparent_50%),radial-gradient(circle_at_20%_80%,rgba(16,185,129,0.04),transparent_50%)]" />

        <div className="relative z-10 w-full max-w-[420px]">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src="/denr-logo.png" alt="DENR" className="w-24 h-24 object-contain" />
          </div>

          {/* Header */}
          <div className="mb-8">
            <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200 mb-4">
              DENR Employee Portal
            </span>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Welcome back</h2>
            <p className="mt-1.5 text-slate-500 text-sm">Sign in to your LeaveGo account to continue.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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

            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed btn-bounce"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In to LeaveGo'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              By signing in, you agree to our{' '}
              <button 
                onClick={() => setShowTermsModal(true)}
                className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
              >
                Terms and Conditions
              </button>
            </p>
          </div>
          
          <p className="mt-8 text-center text-xs text-slate-400">
            Need help? Contact <a href="mailto:it@denr.gov.ph" className="text-emerald-600 hover:underline">it@denr.gov.ph</a>
          </p>
        </div>
      </div>

      {/* Deactivated Account Modal */}
      {showDeactivatedModal && (
        <DeactivatedModal onClose={() => {
          setShowDeactivatedModal(false);
          // Clear any stored error and reset form
          setError(null);
          setEmail('');
          setPassword('');
        }} />
      )}

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <TermsAndConditionsModal onClose={() => setShowTermsModal(false)} />
      )}
    </div>
  );
}
