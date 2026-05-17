import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { canAccessAdmin, resolveRoleFromProfile } from '../utils/auth';
import { USER_ROLES, UserRole } from '../constants';
import { generateUUID } from '../utils/uuid';

interface AuthState {
  user: any | null;
  role: UserRole | null;
  profile: any | null;
  isActive: boolean;
  loading: boolean;
}

const defaultAuthState: AuthState = {
  user: null,
  role: null,
  profile: null,
  isActive: true,
  loading: true,
};

export function useAuth() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize default accounts on first load
  useEffect(() => {
    const existingAccounts = localStorage.getItem('userAccounts');
    if (!existingAccounts) {
      const defaultAccounts = [
        {
          id: generateUUID(),
          email: 'admin@denr.gov.ph',
          password: 'admin',
          role: 'admin',
          fullName: 'Admin User',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: generateUUID(),
          email: 'employee@denr.gov.ph',
          password: 'employee',
          role: 'employee',
          fullName: 'Employee User',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: generateUUID(),
          email: 'cenro@denr.gov.ph',
          password: 'cenro123',
          role: 'cenro',
          fullName: 'CENRO User',
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('userAccounts', JSON.stringify(defaultAccounts));
    }
  }, []);

  // Check for existing auth on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem('basicAuth');
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        setUser(authData);
      } catch (error) {
        localStorage.removeItem('basicAuth');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((email: string, password: string) => {
    // Get stored accounts from localStorage
    const storedAccounts = JSON.parse(localStorage.getItem('userAccounts') || '[]');
    
    // Check hardcoded credentials first (for default accounts)
    const validCredentials = [
      { email: 'admin@denr.gov.ph', password: 'admin', role: 'admin', name: 'Admin User' },
      { email: 'employee@denr.gov.ph', password: 'employee', role: 'employee', name: 'Employee User' },
      { email: 'cenro@denr.gov.ph', password: 'cenro123', role: 'cenro', name: 'CENRO User' }
    ];

    const hardcodedCredential = validCredentials.find(cred => cred.email === email && cred.password === password);
    
    if (hardcodedCredential) {
      const userData = {
        id: generateUUID(),
        email: hardcodedCredential.email,
        role: hardcodedCredential.role,
        full_name: hardcodedCredential.name,
        isActive: true
      };
      
      setUser(userData);
      localStorage.setItem('basicAuth', JSON.stringify(userData));
      return { success: true, user: userData };
    }

    // Check stored accounts
    const storedAccount = storedAccounts.find((acc: any) => acc.email === email && acc.password === password);
    
    if (storedAccount) {
      // Check if account is active
      if (storedAccount.is_active === false) {
        return { success: false, error: 'Account is deactivated. Please contact administrator.' };
      }
      
      const userData = {
        id: storedAccount.id,
        email: storedAccount.email,
        role: storedAccount.role,
        full_name: storedAccount.full_name || storedAccount.fullName,
        isActive: storedAccount.is_active !== false
      };
      
      setUser(userData);
      localStorage.setItem('basicAuth', JSON.stringify(userData));
      return { success: true, user: userData };
    }
    
    return { success: false, error: 'Invalid email or password' };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('basicAuth');
  }, []);

  const createAccount = useCallback((email: string, password: string, fullName: string, role: string) => {
    // Get existing accounts from localStorage
    const existingAccounts = JSON.parse(localStorage.getItem('userAccounts') || '[]');
    
    // Check if email already exists
    if (existingAccounts.find((acc: any) => acc.email === email)) {
      return { success: false, error: 'Email already exists' };
    }

    // Create new account
    const newAccount = {
      id: generateUUID(),
      email,
      password,
      role,
      fullName,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    existingAccounts.push(newAccount);
    localStorage.setItem('userAccounts', JSON.stringify(existingAccounts));

    return { success: true, account: newAccount };
  }, []);

  const getAccounts = useCallback(() => {
    return JSON.parse(localStorage.getItem('userAccounts') || '[]');
  }, []);

  const deleteAccount = useCallback((accountId: string) => {
    const existingAccounts = JSON.parse(localStorage.getItem('userAccounts') || '[]');
    const updatedAccounts = existingAccounts.filter((acc: any) => acc.id !== accountId);
    localStorage.setItem('userAccounts', JSON.stringify(updatedAccounts));
    return { success: true };
  }, []);

  const resetPassword = useCallback((accountId: string, newPassword: string) => {
    const existingAccounts = JSON.parse(localStorage.getItem('userAccounts') || '[]');
    const updatedAccounts = existingAccounts.map((acc: any) => {
      if (acc.id === accountId) {
        return { ...acc, password: newPassword };
      }
      return acc;
    });
    localStorage.setItem('userAccounts', JSON.stringify(updatedAccounts));
    return { success: true };
  }, []);

  return {
    user,
    role: user?.role || null,
    profile: user,
    isActive: user?.isActive !== false,
    isAdmin: user?.role === 'admin' || user?.role === 'cenro',
    isEmployee: user?.role === 'employee',
    loading,
    login,
    logout,
    createAccount,
    getAccounts,
    deleteAccount,
    resetPassword
  };
}
