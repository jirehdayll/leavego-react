import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAccountsSync, saveAccounts } from '../lib/accountStore';
import { POSITIONS, USER_ROLES, DEPARTMENTS } from '../constants';
import AdminLayout from '../components/AdminLayout';
import { userEmailService } from '../services/userEmailService';
import {
  UserPlus, Search, Shield, User,
  Mail, Briefcase, Loader2, Power, XCircle,
  AlertCircle, Pencil, KeyRound, CheckCircle2, Trash2, Eye, EyeOff, Settings, Plus, Building, UserCog
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [customDepartments, setCustomDepartments] = useState(() => {
    const saved = localStorage.getItem('customDepartments');
    return saved ? JSON.parse(saved) : [];
  });
  const [customPositions, setCustomPositions] = useState(() => {
    const saved = localStorage.getItem('customPositions');
    return saved ? JSON.parse(saved) : [];
  });
  const [formData, setFormData] = useState({
    firstName: '', middleName: '', surname: '', email: '', password: '', confirmPassword: '', position: POSITIONS[0] || '', role: USER_ROLES.EMPLOYEE, department: ''
  });

  const allDepartments = [...new Set([...DEPARTMENTS, ...customDepartments])];
  const allPositions = [...new Set([...POSITIONS, ...customPositions])];

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

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

    if (!formData.position.trim()) {
      setError('Position is required.');
      setLoading(false);
      return;
    }


    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      const fullName = `${formData.firstName} ${formData.middleName} ${formData.surname}`.trim();
      
      const result = createAccount(
        formData.email,
        formData.password,
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
              is_active: true,
              isActive: true,
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

        onSuccess();
        onClose();
        setFormData({
          firstName: '', middleName: '', surname: '', email: '', password: '', confirmPassword: '', position: POSITIONS[0] || '', role: USER_ROLES.EMPLOYEE, department: ''
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
        {error && <ErrorBanner message={error} />}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="First Name">
            <input required className={inputCls} placeholder="Juan"
              value={formData.firstName} onChange={e => set('firstName', e.target.value)} />
          </Field>
          <Field label="Middle Name">
            <input className={inputCls} placeholder="Santos"
              value={formData.middleName} onChange={e => set('middleName', e.target.value)} />
          </Field>
          <Field label="Surname">
            <input required className={inputCls} placeholder="Dela Cruz"
              value={formData.surname} onChange={e => set('surname', e.target.value)} />
          </Field>
        </div>
        <Field label="Email Address">
          <input required type="email" className={inputCls} placeholder="juan@denr.gov.ph"
            value={formData.email} onChange={e => set('email', e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Password">
          <div className="relative">
            <input required type={showPassword ? "text" : "password"} minLength={6} className={inputCls + ' pr-12'}
              placeholder="Min. 6 characters"
              value={formData.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>
        <Field label="Confirm Password">
          <div className="relative">
            <input required type={showConfirmPassword ? "text" : "password"} minLength={6} className={inputCls + ' pr-12'}
              placeholder="Confirm password"
              value={formData.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} autoComplete="new-password" />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>
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
        <Field label="Role">
          <select className={inputCls} value={formData.role}
            onChange={e => set('role', e.target.value)}>
            <option value={USER_ROLES.EMPLOYEE}>Employee</option>
            <option value={USER_ROLES.ADMIN}>Administrator</option>
            <option value={USER_ROLES.CENRO}>CENRO</option>
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
  const { resetPassword } = useAuth();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    role: account.role || USER_ROLES.EMPLOYEE,
    department: account.department || '',
    newPassword: '',
    confirmPassword: ''
  });

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate required fields
    if (!formData.firstName.trim() || !formData.surname.trim()) {
      setError('First name and surname are required.');
      setLoading(false);
      return;
    }

    if (!formData.position.trim()) {
      setError('Position is required.');
      setLoading(false);
      return;
    }

    // Validate password fields if password section is shown
    if (showPasswordSection) {
      if (formData.newPassword !== formData.confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }

      if (formData.newPassword.length < 6) {
        setError('Password must be at least 6 characters long.');
        setLoading(false);
        return;
      }
    }

    try {
      // Update in localStorage
      const existingAccounts = JSON.parse(localStorage.getItem('userAccounts') || '[]');
      const updatedAccounts = existingAccounts.map(acc => {
        if (acc.id === account.id) {
          const fullName = `${formData.firstName} ${formData.middleName} ${formData.surname}`.trim();
          return {
            ...acc,
            first_name: formData.firstName,
            middle_name: formData.middleName,
            surname: formData.surname,
            full_name: fullName,
            denr_email: formData.email,
            email: formData.email,
            position: formData.position,
            role: formData.role,
            department: formData.department,
            ...(showPasswordSection && formData.newPassword && { password: formData.newPassword })
          };
        }
        return acc;
      });
      
      updateAccounts(updatedAccounts);
      
      if (showPasswordSection && formData.newPassword) {
        setSuccess('Account and password updated successfully.');
      } else {
        setSuccess('Account updated successfully.');
      }
      
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to update account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Edit Account" subtitle={`Editing: ${account.full_name || account.denr_email}`} onClose={onClose}>
      <div className="p-7 space-y-5">
        {error   && <ErrorBanner   message={error}   />}
        {success && <SuccessBanner message={success} />}

        <form onSubmit={handleSave} className="space-y-4 overflow-visible">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="First Name">
              <input className={inputCls} value={formData.firstName}
                onChange={e => set('firstName', e.target.value)} />
            </Field>
            <Field label="Middle Name">
              <input className={inputCls} value={formData.middleName}
                onChange={e => set('middleName', e.target.value)} />
            </Field>
            <Field label="Surname">
              <input className={inputCls} value={formData.surname}
                onChange={e => set('surname', e.target.value)} />
            </Field>
          </div>
          <Field label="Email Address">
            <input type="email" className={inputCls} value={formData.email}
              onChange={e => set('email', e.target.value)} />
          </Field>
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
          <Field label="Role">
            <select className={inputCls} value={formData.role}
              onChange={e => set('role', e.target.value)}>
              <option value={USER_ROLES.EMPLOYEE}>Employee</option>
              <option value={USER_ROLES.ADMIN}>Administrator</option>
              <option value={USER_ROLES.CENRO}>CENRO</option>
            </select>
          </Field>
          
          {/* Password Reset Section */}
          <div className="border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors mb-3"
            >
              <KeyRound className="w-4 h-4" />
              {showPasswordSection ? 'Cancel Password Reset' : 'Reset Password'}
            </button>
            
            {showPasswordSection && (
              <div className="space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <Field label="New Password">
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      minLength={6} 
                      className={inputCls + ' pr-12'}
                      placeholder="Min. 6 characters"
                      value={formData.newPassword} 
                      onChange={e => set('newPassword', e.target.value)} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
                <Field label="Confirm New Password">
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      minLength={6} 
                      className={inputCls + ' pr-12'}
                      placeholder="Confirm new password"
                      value={formData.confirmPassword} 
                      onChange={e => set('confirmPassword', e.target.value)} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
              </div>
            )}
          </div>
          
          <SubmitButton loading={loading} label="Save Changes" loadingLabel="Saving…"
            icon={<Pencil className="w-4 h-4" />} />
        </form>
      </div>
    </Modal>
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
            <span className="truncate">{acc.denr_email || acc.email || '—'}</span>
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
    if (window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      // Remove from list
      setAccounts(prev => prev.filter(a => a.id !== id));
      
      // Remove from localStorage
      deleteAccount(id);
      
      alert('Account deleted successfully.');
    }
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