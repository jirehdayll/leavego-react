import { supabase } from './supabaseClient';

export const STORAGE_KEY = 'userAccounts';

/** Stable IDs so QR codes and logins stay consistent across sessions and devices. */
export const DEFAULT_ACCOUNT_IDS = {
  admin: 'a0000000-0000-4000-8000-000000000001',
  employee: 'a0000000-0000-4000-8000-000000000002',
  cenro: 'a0000000-0000-4000-8000-000000000003',
} as const;

const DEFAULT_ACCOUNTS = [
  {
    id: DEFAULT_ACCOUNT_IDS.admin,
    email: 'admin@denr.gov.ph',
    password: 'admin',
    role: 'admin',
    fullName: 'Admin User',
    full_name: 'Admin User',
    is_active: true,
    isActive: true,
    createdAt: '2020-01-01T00:00:00.000Z',
  },
  {
    id: DEFAULT_ACCOUNT_IDS.employee,
    email: 'employee@denr.gov.ph',
    password: 'employee',
    role: 'employee',
    fullName: 'Employee User',
    full_name: 'Employee User',
    is_active: true,
    isActive: true,
    createdAt: '2020-01-01T00:00:00.000Z',
  },
  {
    id: DEFAULT_ACCOUNT_IDS.cenro,
    email: 'cenro@denr.gov.ph',
    password: 'cenro123',
    role: 'cenro',
    fullName: 'CENRO User',
    full_name: 'CENRO User',
    is_active: true,
    isActive: true,
    createdAt: '2020-01-01T00:00:00.000Z',
  },
];

export type AppAccount = Record<string, unknown> & {
  id: string;
  email: string;
  password?: string;
  role: string;
  full_name?: string;
  fullName?: string;
  is_active?: boolean;
  isActive?: boolean;
};

export function isAccountActive(account: AppAccount | null | undefined): boolean {
  if (!account) return false;
  if (account.is_active === false || account.isActive === false) return false;
  return true;
}

/** Normalize is_active / isActive and name fields on read. */
export function normalizeAccount(raw: Record<string, unknown>): AppAccount {
  const active = raw.is_active !== false && raw.isActive !== false;
  const fullName =
    (raw.full_name as string) ||
    (raw.fullName as string) ||
    (raw.name as string) ||
    '';
  return {
    ...raw,
    id: String(raw.id),
    email: String(raw.email || ''),
    role: String(raw.role || 'employee'),
    full_name: fullName,
    fullName,
    is_active: active,
    isActive: active,
  } as AppAccount;
}

function toRemoteRow(account: AppAccount) {
  return {
    id: account.id,
    email: account.email,
    password: account.password || '',
    role: account.role,
    full_name: account.full_name || account.fullName || '',
    first_name: account.first_name || null,
    middle_name: account.middle_name || null,
    surname: account.surname || null,
    position: account.position || null,
    department: account.department || null,
    salary_range: account.salary_range || null,
    is_active: isAccountActive(account),
    updated_at: new Date().toISOString(),
  };
}

function fromRemoteRow(row: Record<string, unknown>): AppAccount {
  return normalizeAccount({
    ...row,
    fullName: row.full_name,
    isActive: row.is_active,
  });
}

function readLocalRaw(): AppAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((a) => normalizeAccount(a)) : [];
  } catch {
    return [];
  }
}

function writeLocal(accounts: AppAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts.map(normalizeAccount)));
}

function mergeByEmail(local: AppAccount[], remote: AppAccount[]): AppAccount[] {
  const map = new Map<string, AppAccount>();
  for (const acc of remote) {
    map.set(acc.email.toLowerCase(), acc);
  }
  for (const acc of local) {
    const key = acc.email.toLowerCase();
    if (!map.has(key)) {
      map.set(key, acc);
    }
  }
  return Array.from(map.values()).map(normalizeAccount);
}

function ensureDefaults(accounts: AppAccount[]): AppAccount[] {
  const byEmail = new Map(accounts.map((a) => [a.email.toLowerCase(), a]));
  for (const def of DEFAULT_ACCOUNTS) {
    const key = def.email.toLowerCase();
    if (!byEmail.has(key)) {
      byEmail.set(key, normalizeAccount(def));
    } else {
      const existing = byEmail.get(key)!;
      byEmail.set(
        key,
        normalizeAccount({
          ...def,
          ...existing,
          id: existing.id || def.id,
          password: existing.password || def.password,
          is_active: existing.is_active,
          isActive: existing.isActive,
        })
      );
    }
  }
  return Array.from(byEmail.values()).map(normalizeAccount);
}

let hydratePromise: Promise<AppAccount[]> | null = null;

async function fetchRemoteAccounts(): Promise<AppAccount[]> {
  const { data, error } = await supabase
    .from('app_accounts')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.warn('[LeaveGo] app_accounts table missing — run migrations/create_app_accounts_table.sql');
    } else {
      console.warn('[LeaveGo] Could not load app_accounts:', error.message);
    }
    return [];
  }
  return (data || []).map((row) => fromRemoteRow(row as Record<string, unknown>));
}

async function pushAccountsToRemote(accounts: AppAccount[]) {
  if (!accounts.length) return;
  const rows = accounts.map(toRemoteRow);
  const { error } = await supabase.from('app_accounts').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.warn('[LeaveGo] Could not sync accounts to Supabase:', error.message);
  }
}

/** Load from Supabase when available; merge with local; persist locally. */
export async function hydrateAccounts(): Promise<AppAccount[]> {
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    const local = ensureDefaults(readLocalRaw());
    const remote = await fetchRemoteAccounts();

    let merged: AppAccount[];
    if (remote.length > 0) {
      merged = ensureDefaults(mergeByEmail(local, remote));
    } else if (local.length > 0) {
      merged = ensureDefaults(local);
      await pushAccountsToRemote(merged);
    } else {
      merged = ensureDefaults(DEFAULT_ACCOUNTS.map(normalizeAccount));
      writeLocal(merged);
      await pushAccountsToRemote(merged);
      return merged;
    }

    writeLocal(merged);
    if (remote.length === 0 || mergeByEmail(local, remote).length !== remote.length) {
      await pushAccountsToRemote(merged);
    }
    return merged;
  })();

  try {
    return await hydratePromise;
  } finally {
    hydratePromise = null;
  }
}

export function getAccountsSync(): AppAccount[] {
  return ensureDefaults(readLocalRaw());
}

export function saveAccounts(accounts: AppAccount[]) {
  const normalized = accounts.map(normalizeAccount);
  writeLocal(normalized);
  void pushAccountsToRemote(normalized);
}

export function getAccountById(id: string): AppAccount | null {
  return getAccountsSync().find((a) => a.id === id) || null;
}

export async function getAccountByIdRemote(id: string): Promise<AppAccount | null> {
  const local = getAccountById(id);
  if (local) return local;

  const { data, error } = await supabase.from('app_accounts').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return fromRemoteRow(data as Record<string, unknown>);
}

export async function syncAccount(account: AppAccount) {
  const normalized = normalizeAccount(account);
  const existing = readLocalRaw();
  const idx = existing.findIndex((a) => a.id === normalized.id);
  if (idx >= 0) existing[idx] = normalized;
  else existing.push(normalized);
  saveAccounts(existing);
}

export function removeAccount(id: string) {
  const next = readLocalRaw().filter((a) => a.id !== id);
  saveAccounts(next);
  void supabase.from('app_accounts').delete().eq('id', id);
}

export function findAccountByCredentials(email: string, password: string): AppAccount | null {
  const accounts = getAccountsSync();
  return (
    accounts.find(
      (acc) =>
        acc.email.toLowerCase() === email.toLowerCase() &&
        acc.password === password &&
        isAccountActive(acc)
    ) || null
  );
}
