import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAccountsSync, saveAccounts } from '../lib/accountStore';
import { supabase } from '../lib/supabaseClient';
import { POSITIONS, USER_ROLES, DEPARTMENTS, EMPLOYEE_TYPES } from '../constants';
import AdminLayout from '../components/AdminLayout';
import { userEmailService } from '../services/userEmailService';
import {
  UserPlus, Search, Shield, User,
  Mail, Briefcase, Loader2, Power, XCircle,
  AlertCircle, Pencil, KeyRound, CheckCircle2, Trash2, Eye, EyeOff, Settings, Plus, Building, UserCog, Send
} from 'lucide-react';

// ─── Email Masking Utility ─────────────────────────────────────────────────────
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '—';
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;
  
  // Show first 3 characters, mask the rest with asterisks
  const visibleChars = Math.min(3, localPart.length);
  const maskedPart = localPart.slice(0, visibleChars) + '*'.repeat(Math.max(3, localPart.length - visibleChars));
  return `${maskedPart}@${domain}`;
}

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

const disabledInputCls =
  'w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-600 disabled:opacity-60 disabled:cursor-not-allowed transition';

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

// ─── Department & Position Management Modal ─────────────────────────────────────
function DepartmentPositionManagementModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('departments');
  const [newDepartment, setNewDepartment] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [customDepartments, setCustomDepartments] = useState(() => {
    const saved = localStorage.getItem('customDepartments');
    return saved ? JSON.parse(saved) : [];
  });
  const [customPositions, setCustomPositions] = useState(() => {
    const saved = localStorage.getItem('customPositions');
    return saved ? JSON.parse(saved) : [];
  });

  const getAllDepartments = () => [...DEPARTMENTS, ...customDepartments];
  const getAllPositions = () => [...POSITIONS, ...customPositions];

  const handleAddDepartment = () => {
    if (newDepartment.trim() && !customDepartments.includes(newDepartment.trim())) {
      const updated = [...customDepartments, newDepartment.trim()];
      setCustomDepartments(updated);
      localStorage.setItem('customDepartments', JSON.stringify(updated));
      setNewDepartment('');
      // Dispatch custom event to notify forms to refresh
      window.dispatchEvent(new CustomEvent('departmentsUpdated'));
    }
  };

  const handleAddPosition = () => {
    if (newPosition.trim() && !customPositions.includes(newPosition.trim())) {
      const updated = [...customPositions, newPosition.trim()];
      setCustomPositions(updated);
      localStorage.setItem('customPositions', JSON.stringify(updated));
      setNewPosition('');
      // Dispatch custom event to notify forms to refresh
      window.dispatchEvent(new CustomEvent('positionsUpdated'));
    }
  };

  const handleRemoveDepartment = (dept) => {
    const updated = customDepartments.filter(d => d !== dept);
    setCustomDepartments(updated);
    localStorage.setItem('customDepartments', JSON.stringify(updated));
  };

  const handleRemovePosition = (pos) => {
    const updated = customPositions.filter(p => p !== pos);
    setCustomPositions(updated);
    localStorage.setItem('customPositions', JSON.stringify(updated));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Manage Departments & Positions</h3>
              <p className="text-xs text-slate-500">Add custom options that will appear in forms</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-all">
            <XCircle className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="px-7 py-4 border-b border-slate-100">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('departments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'departments'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Building className="w-4 h-4" />
              Departments
            </button>
            <button
              onClick={() => setActiveTab('positions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'positions'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <UserCog className="w-4 h-4" />
              Positions
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-7">
          {activeTab === 'departments' ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddDepartment()}
                  placeholder="Enter new department name..."
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                />
                <button
                  onClick={handleAddDepartment}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Default Departments</p>
                {DEPARTMENTS.map((dept) => (
                  <div key={dept} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl">
                    <span className="text-sm text-slate-700">{dept}</span>
                    <span className="text-xs text-slate-400">Default</span>
                  </div>
                ))}
              </div>

              {customDepartments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Custom Departments</p>
                  {customDepartments.map((dept) => (
                    <div key={dept} className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-sm text-slate-700">{dept}</span>
                      <button
                        onClick={() => handleRemoveDepartment(dept)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPosition()}
                  placeholder="Enter new position name..."
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                />
                <button
                  onClick={handleAddPosition}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Default Positions</p>
                {POSITIONS.map((pos) => (
                  <div key={pos} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl">
                    <span className="text-sm text-slate-700">{pos}</span>
                    <span className="text-xs text-slate-400">Default</span>
                  </div>
                ))}
              </div>

              {customPositions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Custom Positions</p>
                  {customPositions.map((pos) => (
                    <div key={pos} className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-sm text-slate-700">{pos}</span>
                      <button
                        onClick={() => handleRemovePosition(pos)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create Account Modal ─────────────────────────────────────────────────────
function CreateAccountModal({ onClose, onSuccess }) {
  const { createAccount } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [customDepartments, setCustomDepartments] = useState(() => {
    const saved = localStorage.getItem('customDepartments');
    return saved ? JSON.parse(saved) : [];
  });
  const [customPositions, setCustomPositions] = useState(() => {
    const saved = localStorage.getItem('customPositions');
    return saved ? JSON.parse(saved) : [];
  });
  const [formData, setFormData] = useState({
    firstName: '', middleName: '', surname: '', email: '', position: POSITIONS[0] || '', role: USER_ROLES.EMPLOYEE, department: '', employeeType: EMPLOYEE_TYPES[0] || 'Regular'
  });

  const allDepartments = [...new Set([...DEPARTMENTS, ...customDepartments])];
  const allPositions = [...new Set([...POSITIONS, ...customPositions])];

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const handlePasswordReset = async () => {
    if (!formData.email.trim()) {
      setError('Email is required to send password reset.');
      return;
    }

    setResetLoading(true);
    setError(null);
    setResetSuccess(false);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        // Check if it's a development environment issue
        if (resetError.message?.includes('Email') || resetError.message?.includes('SMTP')) {
          setError('Password reset email could not be sent. Please ensure email service is configured in Supabase.');
        } else {
          setError(resetError.message || 'Failed to send password reset email.');
        }
      } else {
        setResetSuccess(true);
        setTimeout(() => setResetSuccess(false), 5000);
      }
    } catch (err) {
      setError('Failed to send password reset email. Please check your Supabase email configuration.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate required fields
    if (!formData.firstName.trim() || !formData.surname.trim()) {
      setError('First name and surname are required.');
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required.');
      setLoading(false);
      return;
    }

    if (!formData.position.trim()) {
      setError('Position is required.');
      setLoading(false);
      return;
    }

    try {
      const fullName = `${formData.firstName} ${formData.middleName} ${formData.surname}`.trim();
      
      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      
      const result = createAccount(
        formData.email,
        tempPassword,
        fullName,
        formData.role
      );

      if (result.success) {
        const updatedAccounts = getAccountsSync().map((acc) => {
          if (acc.email === formData.email) {
            return {
              ...acc,
              first_name: formData.firstName,
              middle_name: formData.middleName,
              surname: formData.surname,
              full_name: fullName,
              position: formData.position,
              department: formData.department,
              employee_type: formData.employeeType,
              is_active: true,
              isActive: true,
              leave_balances: {
                forced_leave: 5,
                special_leave_privileges: 3,
                wellness_leave: 5,
                accumulated_sick: 10,
                accumulated_vacation: 10,
                last_accumulation_date: new Date().toISOString()
              }
            };
          }
          return acc;
        });
        saveAccounts(updatedAccounts);

        // Register user email in Supabase for email notifications
        await userEmailService.registerUserEmail(
          formData.email,
          fullName,
          formData.department,
          formData.position,
          formData.role
        );

        // Send password reset email immediately after account creation
        await handlePasswordReset();

        onSuccess();
        onClose();
        setFormData({
          firstName: '', middleName: '', surname: '', email: '', position: POSITIONS[0] || '', role: USER_ROLES.EMPLOYEE, department: '', employeeType: EMPLOYEE_TYPES[0] || 'Regular'
        });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create Account" subtitle="Register a new system user" onClose={onClose}>
      <form onSubmit={handleSubmit} autoComplete="off" className="p-7 space-y-4 overflow-visible">
        {/* Honeypot inputs to trap browser credential injection */}
        <input type="text" name="trap_username" style={{ display: 'none' }} tabIndex="-1" autoComplete="off" />
        <input type="password" name="trap_password" style={{ display: 'none' }} tabIndex="-1" autoComplete="off" />
        
        {error && <ErrorBanner message={error} />}
        {resetSuccess && <SuccessBanner message="Password reset email sent successfully." />}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="First Name">
            <input required className={inputCls} placeholder="Juan"
              value={formData.firstName} onChange={e => set('firstName', e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Middle Name">
            <input className={inputCls} placeholder="Santos"
              value={formData.middleName} onChange={e => set('middleName', e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Surname">
            <input required className={inputCls} placeholder="Dela Cruz"
              value={formData.surname} onChange={e => set('surname', e.target.value)} autoComplete="off" />
          </Field>
        </div>
        <Field label="Email Address">
          <input required type="email" className={inputCls} placeholder="juan@denr.gov.ph"
            value={formData.email} onChange={e => set('email', e.target.value)} autoComplete="new-password" />
        </Field>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <KeyRound className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800 mb-1">Password Setup</p>
              <p className="text-xs text-blue-600 mb-3">
                A password reset link will be sent to the user's email after account creation. They will set their own password securely.
              </p>
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={resetLoading || !formData.email}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {resetLoading ? 'Sending...' : 'Send Password Reset Link'}
              </button>
            </div>
          </div>
        </div>
        <Field label="Position">
          <select required className={inputCls} value={formData.position}
            onChange={e => set('position', e.target.value)}>
            <option value="">Select Position...</option>
            {allPositions.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </Field>
        <Field label="Department">
          <select className={inputCls} value={formData.department}
            onChange={e => set('department', e.target.value)}>
            <option value="">Select Department...</option>
            {allDepartments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </Field>
        <Field label="Employee Type">
          <select className={inputCls} value={formData.employeeType}
            onChange={e => set('employeeType', e.target.value)}>
            {EMPLOYEE_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
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
function EditAccountModal({ account, onClose, onSuccess, updateAccounts }) {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [customDepartments, setCustomDepartments] = useState(() => {
    const saved = localStorage.getItem('customDepartments');
    return saved ? JSON.parse(saved) : [];
  });
  const [customPositions, setCustomPositions] = useState(() => {
    const saved = localStorage.getItem('customPositions');
    return saved ? JSON.parse(saved) : [];
  });

  const allDepartments = [...new Set([...DEPARTMENTS, ...customDepartments])];
  const allPositions = [...new Set([...POSITIONS, ...customPositions])];

  // Parse existing full_name into separate fields
  const nameParts = (account.full_name || account.name || '').split(' ');
  const [formData, setFormData] = useState({
    firstName: account.first_name || nameParts[0] || '',
    middleName: account.middle_name || (nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : (nameParts[1] || '')),
    surname: account.surname || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''),
    email: account.denr_email || account.email || '',
    position: account.position || POSITIONS[0] || '',
    department: account.department || '',
    employeeType: account.employee_type || EMPLOYEE_TYPES[0] || 'Regular',
    is_active: account.is_active !== false && account.isActive !== false
  });

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const handlePasswordReset = async () => {
    if (!formData.email.trim()) {
      setError('Email is required to send password reset.');
      return;
    }

    setResetLoading(true);
    setError(null);
    setResetSuccess(false);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        // Check if it's a development environment issue
        if (resetError.message?.includes('Email') || resetError.message?.includes('SMTP')) {
          setError('Password reset email could not be sent. Please ensure email service is configured in Supabase.');
        } else {
          setError(resetError.message || 'Failed to send password reset email.');
        }
      } else {
        setResetSuccess(true);
        setTimeout(() => setResetSuccess(false), 5000);
      }
    } catch (err) {
      setError('Failed to send password reset email. Please check your Supabase email configuration.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate required fields
    if (!formData.position.trim()) {
      setError('Position is required.');
      setLoading(false);
      return;
    }

    try {
      // Update in localStorage
      const existingAccounts = JSON.parse(localStorage.getItem('userAccounts') || '[]');
      const fullName = `${formData.firstName} ${formData.middleName} ${formData.surname}`.trim();
      
      console.log('Editing account with ID:', account.id);
      console.log('Existing accounts count:', existingAccounts.length);
      console.log('Form data:', formData);
      
      const updatedAccounts = existingAccounts.map(acc => {
        console.log('Comparing account ID:', acc.id, 'with target ID:', account.id, 'Match:', acc.id === account.id, 'String match:', String(acc.id) === String(account.id));
        if (String(acc.id) === String(account.id)) {
          const updated = {
            ...acc,
            first_name: formData.firstName,
            middle_name: formData.middleName,
            surname: formData.surname,
            full_name: fullName,
            position: formData.position,
            department: formData.department,
            employee_type: formData.employeeType,
            is_active: formData.is_active,
            isActive: formData.is_active
          };
          console.log('Updated account:', updated);
          return updated;
        }
        return acc;
      });
      
      console.log('Updated accounts count:', updatedAccounts.length);
      
      // Save to localStorage
      localStorage.setItem('userAccounts', JSON.stringify(updatedAccounts));
      console.log('Saved to localStorage');
      
      // Verify save
      const verifyAccounts = JSON.parse(localStorage.getItem('userAccounts') || '[]');
      const verifyAccount = verifyAccounts.find(a => String(a.id) === String(account.id));
      console.log('Verification - Account after save:', verifyAccount);
      
      // Update database (Supabase) - atomic update of only organizational metadata
      const { error: dbError } = await supabase
        .from('app_accounts')
        .update({
          position: formData.position,
          department: formData.department,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', String(account.id));
      
      if (dbError) {
        console.error('Database update error:', dbError);
        setError('Failed to sync with database. Changes saved locally.');
      } else {
        console.log('Database update successful');
      }
      
      // Dispatch event to notify other components (Records, Dashboard) to refresh
      window.dispatchEvent(new CustomEvent('accountUpdated', { detail: { accountId: account.id } }));
      
      // Show success popup
      setShowSuccessModal(true);
      
      // Close modal after short delay
      setTimeout(() => {
        setShowSuccessModal(false);
        onSuccess();
      }, 2000);
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to update account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal title="Edit Account" subtitle={`Editing: ${account.full_name || account.denr_email}`} onClose={onClose}>
        <div className="p-7 space-y-5">
          {error   && <ErrorBanner   message={error}   />}
          {resetSuccess && <SuccessBanner message="Password reset email sent successfully." />}

          <form onSubmit={handleSave} className="space-y-4 overflow-visible">
            {/* Personal Identity Fields - Read Only */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Personal Identity (Read-Only)</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="First Name">
                  <input disabled className={disabledInputCls} value={formData.firstName} />
                </Field>
                <Field label="Middle Name">
                  <input disabled className={disabledInputCls} value={formData.middleName} />
                </Field>
                <Field label="Surname">
                  <input disabled className={disabledInputCls} value={formData.surname} />
                </Field>
              </div>
              <Field label="Email Address">
                <input disabled type="email" className={disabledInputCls} value={maskEmail(formData.email)} />
              </Field>
            </div>

            {/* Organizational Metadata - Editable */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-3">Organizational Metadata</p>
              <Field label="Position">
                <select required className={inputCls} value={formData.position}
                  onChange={e => set('position', e.target.value)}>
                  <option value="">Select Position...</option>
                  {allPositions.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </Field>
              <Field label="Department">
                <select className={inputCls} value={formData.department}
                  onChange={e => set('department', e.target.value)}>
                  <option value="">Select Department...</option>
                  {allDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </Field>
              <Field label="Employee Type">
                <select className={inputCls} value={formData.employeeType}
                  onChange={e => set('employeeType', e.target.value)}>
                  {EMPLOYEE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Password Reset Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <KeyRound className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-800 mb-1">Password Management</p>
                  <p className="text-xs text-blue-600 mb-3">
                    Send a secure password reset link to the user's email. They will set their own password.
                  </p>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={resetLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {resetLoading ? 'Sending...' : 'Send Password Reset Link'}
                  </button>
                </div>
              </div>
            </div>
            
            <SubmitButton loading={loading} label="Save Changes" loadingLabel="Saving…"
              icon={<Pencil className="w-4 h-4" />} />
          </form>
        </div>
      </Modal>

      {/* Success Popup Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="p-7 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-emerald-100">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Account Updated!</h3>
              <p className="text-slate-600 text-sm mb-6">Your changes have been saved successfully and will be reflected across all pages.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Shared UI Primitives ─────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-[fadeIn_0.2s_ease-out]">
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


// ─── Account Card Component ─────────────────────────────────────────────────────
function AccountCard({ acc, isAdmin, onToggle, onEdit, onDelete }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const displayName = acc.full_name || acc.name || acc.email || 'Unknown';
  const initial = displayName.charAt(0).toUpperCase();
  
  const accent = isAdmin 
    ? { bg: 'bg-purple-100', text: 'text-purple-700' }
    : { bg: 'bg-blue-100', text: 'text-blue-700' };

  const active = acc.is_active !== false && acc.isActive !== false;

  const handleToggleClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmToggle = () => {
    onToggle(acc.id, active);
    setShowConfirm(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete(acc.id);
    setShowDeleteConfirm(false);
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
                {displayName}
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
              onClick={handleDeleteClick}
              className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all"
              title="Delete account"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleToggleClick}
              className={`p-2 rounded-xl transition-all ${
                active
                  ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
              }`}
              title={active ? 'Deactivate' : 'Activate'}
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{maskEmail(acc.denr_email || acc.email)}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Briefcase className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{acc.position || 'No position set'}</span>
          </div>
          <div>
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold ${
              active
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-red-50 text-red-600 border border-red-100'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {active ? 'Active' : 'Deactivated'}
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <ConfirmationModal
          title={active ? "Deactivate Account?" : "Activate Account?"}
          message={`Are you sure you want to ${active ? 'deactivate' : 'activate'} ${acc.full_name || acc.email}? This will ${active ? 'remove' : 'restore'} their access to the system.`}
          confirmText={`Yes, ${active ? 'Deactivate' : 'Activate'}`}
          cancelText="Cancel"
          onConfirm={handleConfirmToggle}
          onCancel={() => setShowConfirm(false)}
          type={active ? "danger" : "success"}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmationModal
          title="Delete Account?"
          message={`Are you sure you want to permanently delete ${acc.full_name || acc.email}? This action cannot be undone and will remove all associated data.`}
          confirmText="Yes, Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
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

export default function AccountManagement() {
  const { createAccount, getAccounts, deleteAccount, updateAccounts, accountsReady } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [showDeptPosModal, setShowDeptPosModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // Fetch accounts from localStorage
  const fetchAccounts = useCallback(() => {
    setLoading(true);
    setError(null);
    
    try {
      const userAccounts = getAccounts();
      setAccounts(userAccounts);
    } catch (err) {
      console.error('fetchAccounts error:', err);
      setError('Failed to load accounts.');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [getAccounts]);

  useEffect(() => {
    if (accountsReady) fetchAccounts();
  }, [fetchAccounts, accountsReady]);

  // Real-time subscription to app_accounts table changes
  useEffect(() => {
    const channel = supabase
      .channel('app-accounts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'app_accounts'
        },
        (payload) => {
          console.log('[AccountManagement Realtime] Change detected in app_accounts:', payload);
          // Silent fetch to update page records without disruptive loading spinner
          fetchAccounts();
        }
      )
      .subscribe((status) => {
        console.log('[AccountManagement Realtime] Subscription status:', status);
        setConnectionStatus(status === 'SUBSCRIBED' ? 'connected' : 'connecting');
      });

    return () => {
      console.log('[AccountManagement Realtime] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [fetchAccounts]);

  // Toggle active / inactive
  const toggleAccountStatus = (id, currentStatus) => {
    const newStatus = !currentStatus;
    const updatedAccounts = accounts.map((a) =>
      a.id === id ? { ...a, is_active: newStatus, isActive: newStatus } : a
    );
    setAccounts(updatedAccounts);
    updateAccounts(updatedAccounts);
  };

  // ── Delete account
  const handleDeleteAccount = (id) => {
    // Remove from list
    setAccounts(prev => prev.filter(a => a.id !== id));
    
    // Remove from localStorage
    deleteAccount(id);
  };

  // ── Filter
  const filtered = accounts.filter(acc =>
    acc.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.denr_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const admins    = filtered.filter(a => a.role === USER_ROLES.ADMIN || a.role === USER_ROLES.CENRO);
  const employees = filtered.filter(a => a.role !== USER_ROLES.ADMIN && a.role !== USER_ROLES.CENRO);

  return (
    <AdminLayout>
      <div className="p-6 sm:p-8 fade-in-up">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Account Management</h2>
            <p className="text-slate-500 text-sm mt-0.5">Manage system access and roles</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeptPosModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 text-sm font-bold shadow-sm hover:bg-slate-50 transition-all"
            >
              <Settings className="w-4 h-4" />
              Manage Depts & Positions
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#1a3530] text-white text-sm font-bold shadow-lg shadow-emerald-900/10 hover:bg-[#2a5048] transition-all btn-bounce"
            >
              <UserPlus className="w-4 h-4" />
              Add New Account
            </button>
          </div>
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
                      onDelete={handleDeleteAccount}
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
                      onDelete={handleDeleteAccount}
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
          updateAccounts={updateAccounts}
        />
      )}
      {showDeptPosModal && (
        <DepartmentPositionManagementModal
          onClose={() => setShowDeptPosModal(false)}
        />
      )}
    </AdminLayout>
  );
}