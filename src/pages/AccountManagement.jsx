import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { authAPI } from '../api/auth';
import { profilesAPI } from '../api/profiles';
import { POSITIONS, USER_ROLES } from '../constants';
import AdminLayout from '../components/AdminLayout';
import {
  UserPlus, Search, Shield, User,
  Mail, Briefcase, Loader2, Power, XCircle,
  AlertCircle, Pencil, KeyRound, CheckCircle2
} from 'lucide-react';

// ─── Reusable Input ───────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white transition';

// ─── Confirmation Modal ───────────────────────────────────────────────────────
function ConfirmationModal({ title, message, confirmText, cancelText, onConfirm, onCancel, type = 'danger' }) {
  const colors = type === 'danger' 
    ? 'bg-red-600 hover:bg-red-700' 
    : 'bg-emerald-600 hover:bg-emerald-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div className="p-7 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            type === 'danger' ? 'bg-red-100' : 'bg-emerald-100'
          }`}>
            {type === 'danger' ? (
              <XCircle className="w-8 h-8 text-red-600" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            )}
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
          <p className="text-slate-600 text-sm mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-3 rounded-xl text-white font-semibold text-sm transition-colors ${colors}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create Account Modal ─────────────────────────────────────────────────────
function CreateAccountModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [formData, setFormData] = useState({
    fullName: '', email: '', password: '', position: '', role: USER_ROLES.EMPLOYEE
  });

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check duplicate in profiles table (client-safe)
      const duplicateResult = await profilesAPI.checkDuplicate(
        formData.email, formData.fullName
      );
      if (duplicateResult.exists) {
        const field = duplicateResult.type === 'profile' && duplicateResult.data.denr_email === formData.email 
          ? 'email' 
          : duplicateResult.type === 'profile' && duplicateResult.data.full_name === formData.fullName
          ? 'full name'
          : 'email';
        setError(`An account with that ${field} already exists.`);
        return;
      }

      // Create auth user using admin API for faster creation
      const { data: authData, error: createError } = await authAPI.createUser(
        formData.email,
        formData.password,
        {
          full_name: formData.fullName,
          role: formData.role,
          position: formData.position
        }
      );

      if (createError) {
        setError(
          createError.message.includes('already registered')
            ? 'Account already exists.'
            : createError.message
        );
        return;
      }

      if (authData?.user) {
        // Create profile entry immediately
        const { error: profileError } = await profilesAPI.create({
          id: authData.user.id,
          email: formData.email,
          denr_email: formData.email,
          full_name: formData.fullName,
          position: formData.position,
          role: formData.role,
          is_active: true
        });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't fail the whole process if profile creation fails
        }

        onSuccess();
        onClose();
      } else {
        setError('Failed to create user account.');
      }
    } catch (err) {
      console.error('Account creation error:', err);
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create Account" subtitle="Register a new system user" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-7 space-y-4">
        {error && <ErrorBanner message={error} />}
        <Field label="Full Name">
          <input required className={inputCls} placeholder="Juan Dela Cruz"
            value={formData.fullName} onChange={e => set('fullName', e.target.value)} />
        </Field>
        <Field label="Email Address">
          <input required type="email" className={inputCls} placeholder="juan@denr.gov.ph"
            value={formData.email} onChange={e => set('email', e.target.value)} />
        </Field>
        <Field label="Password">
          <input required type="password" minLength={6} className={inputCls}
            placeholder="Min. 6 characters"
            value={formData.password} onChange={e => set('password', e.target.value)} />
        </Field>
        <Field label="Position">
          <select className={inputCls} value={formData.position}
            onChange={e => set('position', e.target.value)}>
            <option value="">Select Position...</option>
            {POSITIONS.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </Field>
        <Field label="Role">
          <select className={inputCls} value={formData.role}
            onChange={e => set('role', e.target.value)}>
            <option value={USER_ROLES.EMPLOYEE}>Employee</option>
            <option value={USER_ROLES.ADMIN}>Administrator</option>
          </select>
        </Field>
        <SubmitButton loading={loading} label="Create Account" loadingLabel="Creating…"
          icon={<UserPlus className="w-4 h-4" />} />
      </form>
    </Modal>
  );
}

// ─── Edit Account Modal ───────────────────────────────────────────────────────
function EditAccountModal({ account, onClose, onSuccess }) {
  const [loading, setLoading]   = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPwField, setShowPwField] = useState(false);

  const [formData, setFormData] = useState({
    full_name: account.full_name  || '',
    email:     account.denr_email || account.email || '',
    position:  account.position   || '',
    role:      account.role       || USER_ROLES.EMPLOYEE
  });

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Update profiles table
      const { error: profileErr } = await profilesAPI.update(account.id, {
        full_name:  formData.full_name,
        denr_email: formData.email,
        email:      formData.email,
        position:   formData.position,
        role:       formData.role
      });

      if (profileErr) throw profileErr;

      // Also update auth user metadata (best-effort)
      await authAPI.updateUser(account.id, {
        email: formData.email,
        user_metadata: {
          full_name: formData.full_name,
          position:  formData.position,
          role:      formData.role
        }
      });

      setSuccess('Account updated successfully.');
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to update account.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setPwLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: pwErr } = await authAPI.updateUser(account.id, {
        password: newPassword
      });
      if (pwErr) throw pwErr;
      setSuccess('Password reset successfully.');
      setNewPassword('');
      setShowPwField(false);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <Modal title="Edit Account" subtitle={`Editing: ${account.full_name || account.denr_email}`} onClose={onClose}>
      <div className="p-7 space-y-5">
        {error   && <ErrorBanner   message={error}   />}
        {success && <SuccessBanner message={success} />}

        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Full Name">
            <input className={inputCls} value={formData.full_name}
              onChange={e => set('full_name', e.target.value)} />
          </Field>
          <Field label="Email Address">
            <input type="email" className={inputCls} value={formData.email}
              onChange={e => set('email', e.target.value)} />
          </Field>
          <Field label="Position">
            <select className={inputCls} value={formData.position}
              onChange={e => set('position', e.target.value)}>
              <option value="">Select Position...</option>
              {POSITIONS.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </Field>
          <Field label="Role">
            <select className={inputCls} value={formData.role}
              onChange={e => set('role', e.target.value)}>
              <option value={USER_ROLES.EMPLOYEE}>Employee</option>
              <option value={USER_ROLES.ADMIN}>Administrator</option>
            </select>
          </Field>
          <SubmitButton loading={loading} label="Save Changes" loadingLabel="Saving…"
            icon={<Pencil className="w-4 h-4" />} />
        </form>

        {/* Password Reset Section */}
        <div className="border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setShowPwField(p => !p)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-semibold transition"
          >
            <KeyRound className="w-4 h-4" />
            {showPwField ? 'Cancel Password Reset' : 'Reset Password'}
          </button>

          {showPwField && (
            <div className="mt-3 flex gap-2">
              <input
                type="password"
                minLength={6}
                className={inputCls + ' flex-1'}
                placeholder="New password (min. 6 chars)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={pwLoading}
                className="px-4 py-3 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 transition flex items-center gap-1.5 whitespace-nowrap"
              >
                {pwLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <KeyRound className="w-4 h-4" />}
                Set
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Shared UI Primitives ─────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div className="bg-gradient-to-r from-[#1a3530] to-[#0f211d] px-7 py-5 flex items-center justify-between text-white">
          <div>
            <h3 className="text-lg font-black">{title}</h3>
            <p className="text-emerald-300/70 text-xs">{subtitle}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

function SuccessBanner({ message }) {
  return (
    <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

function SubmitButton({ loading, label, loadingLabel, icon }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {loading ? loadingLabel : label}
    </button>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────
function AccountCard({ acc, isAdmin, onToggle, onEdit }) {
  const [showConfirm, setShowConfirm] = useState(false);
  
  const accent = isAdmin
    ? { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' }
    : { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500'   };

  const initial = acc.full_name?.charAt(0)?.toUpperCase() || '?';

  const handleToggleClick = () => {
    if (acc.is_active) {
      // Show confirmation for deactivation
      setShowConfirm(true);
    } else {
      // Activate immediately (no confirmation needed)
      onToggle(acc.id, acc.is_active);
    }
  };

  const handleConfirmToggle = () => {
    onToggle(acc.id, acc.is_active);
    setShowConfirm(false);
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${accent.bg} ${accent.text} rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0`}>
              {initial}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 leading-tight">
                {acc.full_name || 'Unnamed Account'}
              </p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${accent.bg} ${accent.text} mt-1`}>
                {isAdmin ? <Shield className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                {acc.role}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(acc)}
              className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all"
              title="Edit account"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={handleToggleClick}
              className={`p-2 rounded-xl transition-all ${
                acc.is_active
                  ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
              }`}
              title={acc.is_active ? 'Deactivate' : 'Activate'}
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{acc.denr_email || acc.email || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Briefcase className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{acc.position || 'No position set'}</span>
          </div>
          <div>
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold ${
              acc.is_active
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-red-50 text-red-600 border border-red-100'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${acc.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {acc.is_active ? 'Active' : 'Deactivated'}
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <ConfirmationModal
          title="Deactivate Account?"
          message={`Are you sure you want to deactivate ${acc.full_name || acc.email}? This will remove their access to the system but won't delete their data.`}
          confirmText="Yes, Deactivate"
          cancelText="Cancel"
          onConfirm={handleConfirmToggle}
          onCancel={() => setShowConfirm(false)}
          type="danger"
        />
      )}
    </>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, label, count, color }) {
  const colors = {
    purple: 'text-purple-600 bg-purple-100 text-purple-700',
    blue:   'text-blue-600 bg-blue-100 text-blue-700'
  };
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className={colors[color].split(' ')[0]}>{icon}</span>
      <h3 className="text-lg font-bold text-slate-800">{label}</h3>
      <span className={`text-xs font-bold px-2 py-1 rounded-full ${colors[color].split(' ').slice(1).join(' ')}`}>
        {count}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AccountManagement() {
  const [accounts, setAccounts]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [searchTerm, setSearchTerm]     = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAccount, setEditingAccount]   = useState(null);

  // ── Fetch directly from profiles table (client-safe, no service role needed)
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, denr_email, email, role, position, is_active, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setAccounts(data || []);
    } catch (err) {
      console.error('fetchAccounts error:', err);
      setError(
        err.code === '42501'
          ? 'Permission denied. Make sure the RLS fix SQL has been run in Supabase.'
          : err.message || 'Failed to load accounts.'
      );
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // ── Toggle active / inactive
  const toggleAccountStatus = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    
    // Optimistic UI update
    setAccounts(prev =>
      prev.map(a => a.id === id ? { ...a, is_active: newStatus } : a)
    );

    try {
      const { error: toggleError } = await profilesAPI.toggleActive(id, currentStatus);
      if (toggleError) {
        console.error('Toggle error:', toggleError);
        // Revert on failure
        setAccounts(prev =>
          prev.map(a => a.id === id ? { ...a, is_active: currentStatus } : a)
        );
        throw toggleError;
      }
      
      // Success - the optimistic update is already correct
      console.log(`Account ${id} ${newStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
      console.error('Failed to toggle account status:', err);
      // Error handling is done above with revert
    }
  };

  // ── Filter
  const filtered = accounts.filter(acc =>
    acc.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.denr_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const admins    = filtered.filter(a => a.role === USER_ROLES.ADMIN);
  const employees = filtered.filter(a => a.role !== USER_ROLES.ADMIN);

  return (
    <AdminLayout>
      <div className="p-6 sm:p-8 fade-in-up">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Account Management</h2>
            <p className="text-slate-500 text-sm mt-0.5">Manage system access and roles</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#1a3530] text-white text-sm font-bold shadow-lg shadow-emerald-900/10 hover:bg-[#2a5048] transition-all btn-bounce"
          >
            <UserPlus className="w-4 h-4" />
            Add New Account
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email…"
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-100 bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Global fetch error */}
        {error && (
          <div className="mb-6 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Could not load accounts</p>
              <p className="text-red-600/80">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Fetching accounts…</p>
          </div>
        )}

        {/* Accounts */}
        {!loading && !error && (
          <>
            {/* Admin Section */}
            <div className="mb-8">
              <SectionHeader
                icon={<Shield className="w-5 h-5" />}
                label="Administrator Accounts"
                count={admins.length}
                color="purple"
              />
              {admins.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {admins.map(acc => (
                    <AccountCard
                      key={acc.id}
                      acc={acc}
                      isAdmin
                      onToggle={toggleAccountStatus}
                      onEdit={setEditingAccount}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm py-4">No administrator accounts found.</p>
              )}
            </div>

            {/* Employee Section */}
            <div>
              <SectionHeader
                icon={<User className="w-5 h-5" />}
                label="Employee Accounts"
                count={employees.length}
                color="blue"
              />
              {employees.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {employees.map(acc => (
                    <AccountCard
                      key={acc.id}
                      acc={acc}
                      isAdmin={false}
                      onToggle={toggleAccountStatus}
                      onEdit={setEditingAccount}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm py-4">No employee accounts found.</p>
              )}
            </div>

            {/* Empty State */}
            {accounts.length === 0 && (
              <div className="py-20 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-slate-200" />
                </div>
                <p className="text-slate-500 font-bold">No accounts found</p>
                <p className="text-slate-400 text-sm mt-1">
                  No user accounts exist yet, or the RLS fix SQL needs to be applied.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateAccountModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchAccounts}
        />
      )}
      {editingAccount && (
        <EditAccountModal
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSuccess={() => { fetchAccounts(); setEditingAccount(null); }}
        />
      )}
    </AdminLayout>
  );
}