import { useState, useEffect, useCallback } from 'react';
import {
  hydrateAccounts,
  getAccountsSync,
  saveAccounts,
  removeAccount,
  findAccountByCredentials,
  normalizeAccount,
  isAccountActive,
  type AppAccount,
} from '../lib/accountStore';

function sessionFromAccount(account: AppAccount) {
  return {
    id: account.id,
    email: account.email,
    role: account.role,
    full_name: account.full_name || account.fullName,
    isActive: isAccountActive(account),
  };
}

export function useAuth() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasSession, setHasSession] = useState<boolean>(false);
  const [accountsReady, setAccountsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await hydrateAccounts();
      if (!cancelled) setAccountsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const storedAuth = sessionStorage.getItem('basicAuth');
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        if (authData.id) {
          const account = getAccountsSync().find((a) => a.id === authData.id);
          if (account && !isAccountActive(account)) {
            sessionStorage.removeItem('basicAuth');
          } else {
            setUser(authData);
            setHasSession(true);
          }
        } else {
          sessionStorage.removeItem('basicAuth');
        }
      } catch {
        sessionStorage.removeItem('basicAuth');
      }
    }
    setLoading(false);
  }, [accountsReady]);

  const login = useCallback((email: string, password: string) => {
    const account = findAccountByCredentials(email, password);

    if (!account) {
      const inactive = getAccountsSync().find(
        (acc) =>
          acc.email.toLowerCase() === email.toLowerCase() && acc.password === password
      );
      if (inactive && !isAccountActive(inactive)) {
        return { success: false, error: 'Account is deactivated. Please contact administrator.' };
      }
      return { success: false, error: 'Invalid email or password' };
    }

    const userData = sessionFromAccount(account);
    setUser(userData);
    setHasSession(true);
    sessionStorage.setItem('basicAuth', JSON.stringify(userData));
    return { success: true, user: userData };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setHasSession(false);
    sessionStorage.removeItem('basicAuth');
  }, []);

  const createAccount = useCallback(
    (email: string, password: string, fullName: string, role: string) => {
      const existingAccounts = getAccountsSync();

      if (existingAccounts.find((acc) => acc.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, error: 'Email already exists' };
      }

      const newAccount = normalizeAccount({
        id: crypto.randomUUID(),
        email,
        password,
        role,
        fullName,
        full_name: fullName,
        isActive: true,
        is_active: true,
        createdAt: new Date().toISOString(),
      });

      saveAccounts([...existingAccounts, newAccount]);
      return { success: true, account: newAccount };
    },
    []
  );

  const getAccounts = useCallback(() => getAccountsSync(), [accountsReady]);

  const deleteAccount = useCallback((accountId: string) => {
    removeAccount(accountId);
    return { success: true };
  }, []);

  const resetPassword = useCallback((accountId: string, newPassword: string) => {
    const existingAccounts = getAccountsSync();
    const updatedAccounts = existingAccounts.map((acc) =>
      acc.id === accountId ? { ...acc, password: newPassword } : acc
    );
    saveAccounts(updatedAccounts);
    return { success: true };
  }, []);

  const updateAccounts = useCallback((accounts: AppAccount[]) => {
    saveAccounts(accounts);
  }, []);

  return {
    user,
    role: user?.role || null,
    profile: user,
    isActive: user?.isActive !== false,
    isAdmin: user?.role === 'admin' || user?.role === 'cenro',
    isEmployee: user?.role === 'employee',
    loading: loading || !accountsReady,
    hasSession,
    accountsReady,
    login,
    logout,
    createAccount,
    getAccounts,
    deleteAccount,
    resetPassword,
    updateAccounts,
  };
}
