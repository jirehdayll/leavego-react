import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import AdminLayout from '../components/AdminLayout';
import { 
  UserPlus, Search, MoreVertical, Shield, User, 
  Mail, Phone, Briefcase, Calendar, CheckCircle2, 
  XCircle, Loader2, AlertCircle, Trash2, Power
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Secondary client to create users without logging out the current admin
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

function CreateAccountModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    position: '',
    role: 'employee'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Check for duplicate email in profiles
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('denr_email', formData.email)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingUser) {
        throw new Error('An account with this email already exists.');
      }

      // 2. Sign up the user via the temporary client
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 3. Profile is auto-created by DB trigger, but we update it
        // with the additional info from the form
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.fullName,
            position: formData.position,
            role: formData.role,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;
        
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div className="bg-gradient-to-r from-[#1a3530] to-[#0f211d] px-7 py-5 flex items-center justify-between text-white">
          <div>
            <h3 className="text-lg font-black">Create Account</h3>
            <p className="text-emerald-300/70 text-xs">Register a new system user</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><XCircle className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-7 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Full Name</label>
              <input 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Juan Dela Cruz"
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Email Address</label>
              <input 
                required
                type="email"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="juan@denr.gov.ph"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Password</label>
              <input 
                required
                type="password"
                minLength={6}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Min. 6 characters"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Position</label>
              <input 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="e.g. Forester II"
                value={formData.position}
                onChange={e => setFormData({ ...formData, position: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Role</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="employee">Employee</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AccountManagement() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setAccounts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const toggleAccountStatus = async (id, currentStatus) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    
    if (!error) fetchAccounts();
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.denr_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Account Management</h2>
            <p className="text-slate-500 text-sm mt-0.5">Manage system access and roles</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#1a3530] text-white text-sm font-bold shadow-lg shadow-emerald-900/10 hover:bg-[#2a5048] transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Add New Account
          </button>
        </div>

        {/* Search & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by name or email..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-100 bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">{accounts.filter(a => a.is_active).length}</div>
            <p className="text-xs font-bold text-slate-500 uppercase">Active</p>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center font-bold">{accounts.filter(a => !a.is_active).length}</div>
            <p className="text-xs font-bold text-slate-500 uppercase">Inactive</p>
          </div>
        </div>

        {/* Accounts List */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <p className="text-slate-400 text-sm font-medium">Fetching accounts...</p>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-slate-200" />
              </div>
              <p className="text-slate-500 font-bold">No accounts found</p>
              <p className="text-slate-400 text-sm mt-1">Try adjusting your search filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">User Details</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Role & Position</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${acc.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {acc.full_name?.charAt(0) || <User className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{acc.full_name || 'Unnamed Account'}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="text-xs text-slate-400">{acc.denr_email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center w-fit gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${acc.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            <Shield className="w-2.5 h-2.5" />
                            {acc.role}
                          </span>
                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {acc.position || 'No position set'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${acc.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${acc.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {acc.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => toggleAccountStatus(acc.id, acc.is_active)}
                            className={`p-2.5 rounded-xl transition-all ${acc.is_active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                            title={acc.is_active ? "Deactivate" : "Activate"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateAccountModal 
          onClose={() => setShowCreateModal(false)} 
          onSuccess={fetchAccounts}
        />
      )}
    </AdminLayout>
  );
}
