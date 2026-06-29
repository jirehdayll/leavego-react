import { getAccountsSync, saveAccounts } from './accountStore';
import { leaveRequestsAPI } from '../api/leaveRequests';
import { leaveBalancesAPI } from '../api/leaveBalances';
import { REQUEST_STATUS } from '../constants';
import { supabase, supabaseServiceRole } from './supabaseClient';

export interface LeaveBalances {
  forced_leave: number;
  special_leave_privileges: number;
  wellness_leave: number;
  accumulated_sick: number;
  accumulated_vacation: number;
  last_accumulation_date?: string;
}

export interface LeaveBalanceDisplay {
  forced_leave: { balance: number; max?: number };
  special_leave: { balance: number; max?: number };
  wellness_leave: { balance: number; max?: number };
  vacation_leave: { balance: number };
  sick_leave: { balance: number };
}

export const LEAVE_BALANCES_UPDATED_EVENT = 'leaveBalancesUpdated';

const CREDIT_TRACKED_LEAVE_TYPES = [
  'Mandatory/Forced Leave',
  'Special Privilege Leave',
  'Wellness Leave',
  'Vacation Leave',
  'Sick Leave',
];

// Fixed-cap leave types that should be deducted on approval
const FIXED_CAP_LEAVE_TYPES = [
  'Mandatory/Forced Leave',
  'Special Privilege Leave',
  'Wellness Leave',
];

// Long-term accrual leave types that should NOT be deducted on approval
const ACCRUAL_LEAVE_TYPES = [
  'Vacation Leave',
  'Sick Leave',
];



function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getRequestLeaveType(form: any): string {
  return String(form?.details?.leave_type || form?.leave_type || '');
}

function getRequestDays(form: any): number {
  return toNumber(
    form?.details?.num_days ??
    form?.details?.number_of_days ??
    form?.num_days ??
    form?.number_of_days,
    0
  );
}

function getRequestDate(form: any): Date {
  const rawDate = form?.details?.start_date || form?.submitted_at || form?.created_at || new Date().toISOString();
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function isApprovedLeaveForm(form: any): boolean {
  return String(form?.status || '').toLowerCase() === REQUEST_STATUS.APPROVED.toLowerCase()
    && String(form?.request_type || '').toLowerCase() === 'leave';
}

function isDateInCurrentMonth(date: Date): boolean {
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
}

function computeBalancesFromApprovedRequests(forms: any[] = []): LeaveBalances {
  const balances: LeaveBalances = {
    forced_leave: 5,
    special_leave_privileges: 3,
    wellness_leave: 5,
    accumulated_sick: 10,
    accumulated_vacation: 10,
    last_accumulation_date: new Date().toISOString(),
  };

  for (const form of forms.filter(isApprovedLeaveForm)) {
    const leaveType = getRequestLeaveType(form).toLowerCase();
    const days = getRequestDays(form);
    if (!leaveType || days <= 0) continue;

    // Confirmed business rule:
    // - Forced Leave deducts only Forced Leave.
    // - Special Privilege Leave deducts only Special Leave.
    // - Wellness Leave deducts only Wellness Leave.
    // - Vacation Leave deducts only Vacation Leave.
    // - Sick Leave deducts only Sick Leave.
    // FL/SPL/WL must NOT deduct from Vacation/Sick.
    if (leaveType.includes('forced')) {
      balances.forced_leave = Math.max(0, balances.forced_leave - days);
    } else if (leaveType.includes('special') || leaveType.includes('privilege')) {
      balances.special_leave_privileges = Math.max(0, balances.special_leave_privileges - days);
    } else if (leaveType.includes('wellness')) {
      balances.wellness_leave = Math.max(0, balances.wellness_leave - days);
    } else if (leaveType.includes('sick')) {
      balances.accumulated_sick = Math.max(0, balances.accumulated_sick - days);
    } else if (leaveType.includes('vacation')) {
      balances.accumulated_vacation = Math.max(0, balances.accumulated_vacation - days);
    }
  }

  return balances;
}

async function persistBalancesToDatabase(accountId: string, balances: LeaveBalances): Promise<void> {
  const row = {
    user_id: accountId,
    forced_leave_balance: balances.forced_leave,
    special_leave_balance: balances.special_leave_privileges,
    wellness_leave_balance: balances.wellness_leave,
    vacation_leave_balance: balances.accumulated_vacation,
    sick_leave_balance: balances.accumulated_sick,
    last_accrual_date: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString(),
  };

  const upsertWith = async (client: typeof supabase) => client
    .from('user_leave_balances')
    .upsert(row, { onConflict: 'user_id' });

  let result = await upsertWith(supabase);
  if (result.error) {
    result = await upsertWith(supabaseServiceRole);
  }
  if (result.error) {
    console.warn('[Leave Balance] Could not persist recalculated balance to database:', result.error.message);
  }
}

/**
 * Refreshes the user's leave balances from Supabase.
 * The database is the source of truth; frontend recalculation must not overwrite DB balances.
 */
export async function recalculateLeaveBalancesFromApprovedRequests(
  accountId: string,
  knownForms?: any[]
): Promise<LeaveBalances> {
  // The database is the source of truth. A previous frontend recalculation wrote
  // stale/default balances back to Supabase and fought with the approval trigger.
  // Keep this function name for existing callers, but make it refresh from DB.
  const dbBalances = await getLeaveBalancesFromDB(accountId);
  if (dbBalances) {
    return dbBalances;
  }

  // Offline fallback only. Do not write this fallback back to Supabase.
  const forms = knownForms || [];
  const relevantForms = forms.filter((form) => {
    if (!isApprovedLeaveForm(form)) return false;
    return String(form.user_id || '') === accountId;
  });

  const balances = computeBalancesFromApprovedRequests(relevantForms);
  persistBalances(accountId, balances);
  return balances;
}

function notifyBalancesUpdated(accountId: string) {
  window.dispatchEvent(
    new CustomEvent(LEAVE_BALANCES_UPDATED_EVENT, { detail: { accountId } })
  );
}

function persistBalances(accountId: string, balances: LeaveBalances): void {
  const accounts = getAccountsSync();
  const updatedAccounts = accounts.map((a) =>
    a.id === accountId ? { ...a, leave_balances: balances } : a
  );
  saveAccounts(updatedAccounts);
  notifyBalancesUpdated(accountId);
}

export function isCreditTrackedLeaveType(leaveType: string): boolean {
  return CREDIT_TRACKED_LEAVE_TYPES.includes(leaveType);
}

/**
 * Check if a leave type belongs to the fixed-cap tier (should be deducted on approval)
 */
export function isFixedCapLeaveType(leaveType: string): boolean {
  const leaveTypeLower = String(leaveType || '').toLowerCase();
  return (
    leaveTypeLower.includes('forced') ||
    leaveTypeLower.includes('special') ||
    leaveTypeLower.includes('privilege') ||
    leaveTypeLower.includes('wellness')
  );
}

/**
 * Check if a leave type belongs to the accrual tier (should NOT be deducted on approval)
 */
export function isAccrualLeaveType(leaveType: string): boolean {
  const leaveTypeLower = leaveType.toLowerCase();
  return ACCRUAL_LEAVE_TYPES.some(type => leaveTypeLower.includes(type.toLowerCase()));
}

/**
 * Calculate the number of working days between two dates (excluding weekends)
 * This filters out Saturdays and Sundays from the date range.
 */
export function calculateWorkingDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error('Invalid date range for working days calculation:', { startDate, endDate });
    return 0;
  }
  
  // Ensure start is before end
  if (start > end) {
    console.error('Start date is after end date:', { startDate, endDate });
    return 0;
  }
  
  let workingDays = 0;
  const current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
}

export function formatBalancesForDisplay(balances: LeaveBalances): LeaveBalanceDisplay {
  return {
    forced_leave: { balance: balances.forced_leave, max: 5 },
    special_leave: { balance: balances.special_leave_privileges, max: 3 },
    wellness_leave: { balance: balances.wellness_leave, max: 5 },
    vacation_leave: { balance: balances.accumulated_vacation },
    sick_leave: { balance: balances.accumulated_sick },
  };
}

export function getAvailableBalanceForLeaveType(
  balances: LeaveBalances,
  leaveType: string
): number {
  if (!balances) return 0;
  
  const leaveTypeLower = leaveType.toLowerCase();

  if (leaveTypeLower.includes('forced')) return balances.forced_leave || 0;
  if (leaveTypeLower.includes('special') || leaveTypeLower.includes('privilege')) {
    return balances.special_leave_privileges || 0;
  }
  if (leaveTypeLower.includes('wellness')) return balances.wellness_leave || 0;
  if (leaveTypeLower.includes('sick')) return balances.accumulated_sick || 0;
  if (leaveTypeLower.includes('vacation')) return balances.accumulated_vacation || 0;

  return 0;
}

export function hasSufficientBalance(
  accountId: string,
  leaveType: string,
  daysRequested: number
): boolean {
  if (!isCreditTrackedLeaveType(leaveType)) return true;

  const balances = getLeaveBalances(accountId);
  if (!balances) return false;

  return getAvailableBalanceForLeaveType(balances, leaveType) >= daysRequested;
}

/**
 * Runs the Supabase accrual function and refreshes the user's balance.
 * Vacation/Sick accrual is centralized in the database to avoid client-side drift.
 */
export async function updateDailyLeaveAccumulation(accountId: string): Promise<LeaveBalances | null> {
  // Accrual must be handled in Supabase so all clients see the same result.
  // The DB function uses the rule: Vacation/Sick start at 10 and accrue +6/year.
  try {
    await leaveBalancesAPI.processDailyAccrual(new Date().toISOString().split('T')[0]);
    return await getLeaveBalancesFromDB(accountId);
  } catch (error) {
    console.warn('[Accrual] Database accrual failed. Falling back to current cached balance only:', error);
    return getLeaveBalances(accountId);
  }
}

/**
 * Decrease leave balances when a leave application is approved.
 * Applies to all credit-tracked leave types (Forced, Special, Wellness, Vacation, Sick).
 */
export function decreaseLeaveBalance(
  accountId: string,
  leaveType: string,
  numDays: number
): void {
  // Check if leave type is tracked
  if (!isCreditTrackedLeaveType(leaveType)) {
    console.log(`[Balance Deduction] Skipping deduction for non-credit-tracked leave type: ${leaveType}`);
    return;
  }

  const accounts = getAccountsSync();
  const account = accounts.find((a) => a.id === accountId);

  if (!account) {
    console.error('Account not found for balance deduction:', accountId);
    return;
  }

  if (numDays <= 0) {
    console.warn('Invalid number of days for deduction:', numDays);
    return;
  }

  if (!account.leave_balances) {
    account.leave_balances = {
      forced_leave: 5,
      special_leave_privileges: 3,
      wellness_leave: 5,
      accumulated_sick: 10,
      accumulated_vacation: 10,
      last_accumulation_date: new Date().toISOString(),
    };
  }

  const balances = { ...account.leave_balances };
  const leaveTypeLower = String(leaveType || '').toLowerCase();

  console.log(`[Balance Deduction] Before:`, balances);
  console.log(`[Balance Deduction] Deducting ${numDays} days from ${leaveType}`);

  if (leaveTypeLower.includes('forced')) {
    balances.forced_leave = Math.max(0, balances.forced_leave - numDays);
    // Also deduct from vacation and sick leave balances (shared deduction)
    const deductionPerType = numDays / 2;
    balances.accumulated_vacation = Math.max(0, balances.accumulated_vacation - deductionPerType);
    balances.accumulated_sick = Math.max(0, balances.accumulated_sick - deductionPerType);
    console.log(`[Balance Deduction] Deducted ${numDays} from Forced Leave and ${deductionPerType} from both Vacation and Sick Leave`);
  } else if (leaveTypeLower.includes('special') || leaveTypeLower.includes('privilege')) {
    balances.special_leave_privileges = Math.max(
      0,
      balances.special_leave_privileges - numDays
    );
    // Also deduct from vacation and sick leave balances (shared deduction)
    const deductionPerType = numDays / 2;
    balances.accumulated_vacation = Math.max(0, balances.accumulated_vacation - deductionPerType);
    balances.accumulated_sick = Math.max(0, balances.accumulated_sick - deductionPerType);
    console.log(`[Balance Deduction] Deducted ${numDays} from Special Leave and ${deductionPerType} from both Vacation and Sick Leave`);
  } else if (leaveTypeLower.includes('wellness')) {
    balances.wellness_leave = Math.max(0, balances.wellness_leave - numDays);
    // Also deduct from vacation and sick leave balances (shared deduction)
    const deductionPerType = numDays / 2;
    balances.accumulated_vacation = Math.max(0, balances.accumulated_vacation - deductionPerType);
    balances.accumulated_sick = Math.max(0, balances.accumulated_sick - deductionPerType);
    console.log(`[Balance Deduction] Deducted ${numDays} from Wellness Leave and ${deductionPerType} from both Vacation and Sick Leave`);
  } else if (leaveTypeLower.includes('sick')) {
    balances.accumulated_sick = Math.max(0, balances.accumulated_sick - numDays);
    console.log(`[Balance Deduction] Deducted ${numDays} from Sick Leave`);
  } else if (leaveTypeLower.includes('vacation')) {
    balances.accumulated_vacation = Math.max(0, balances.accumulated_vacation - numDays);
    console.log(`[Balance Deduction] Deducted ${numDays} from Vacation Leave`);
  } else {
    console.warn('Unknown leave type for deduction:', leaveType);
    return;
  }

  console.log(`[Balance Deduction] After:`, balances);
  persistBalances(accountId, balances);
}

/**
 * Get leave balances for a specific account (source of truth for records).
 * Synchronous version that reads from localStorage only.
 */
export function getLeaveBalances(accountId: string): LeaveBalances | null {
  const accounts = getAccountsSync();
  const account = accounts.find((a) => a.id === accountId);
  return account?.leave_balances || null;
}

/**
 * Get leave balances from database (async version).
 * This should be called to sync with database after approvals.
 */
export async function getLeaveBalancesFromDB(accountId: string): Promise<LeaveBalances | null> {
  try {
    // Prefer the SECURITY DEFINER RPC. Direct table SELECT can be blocked by RLS
    // because this app uses app_accounts/local session instead of Supabase auth.users.
    try {
      const rpcBalance = await leaveBalancesAPI.getUserBalance(accountId);
      if (rpcBalance) {
        const balances = convertDBBalanceToLeaveBalances(rpcBalance);
        persistBalances(accountId, balances);
        return balances;
      }
    } catch (rpcError: any) {
      console.warn('[Leave Balance] RPC balance fetch failed, trying table fallback:', rpcError?.message || rpcError);
    }

    const dbBalance = await leaveBalancesAPI.getBalanceByUserId(accountId);
    if (dbBalance) {
      // Convert database format to LeaveBalances format
      const balances = convertDBBalanceToLeaveBalances(dbBalance);
      
      // Sync to localStorage
      const accounts = getAccountsSync();
      const updatedAccounts = accounts.map((a) =>
        a.id === accountId ? { ...a, leave_balances: balances } : a
      );
      saveAccounts(updatedAccounts);
      
      // Notify components that balances have been updated
      notifyBalancesUpdated(accountId);
      
      return balances;
    }

    console.warn('[Leave Balance] No balance record found in database for user:', accountId);
  } catch (error: any) {
    if (error?.message && error.message.includes('PGRST116')) {
      console.warn('[Leave Balance] No balance record found in database for user:', accountId);
    } else {
      console.error('[Leave Balance] Error fetching balance from database:', error);
    }
  }

  // Last-resort fallback only. This may be default localStorage data.
  return getLeaveBalances(accountId);
}

export function convertDBBalanceToLeaveBalances(dbBalance: any): LeaveBalances {
  if (!dbBalance) {
    return {
      forced_leave: 5,
      special_leave_privileges: 3,
      wellness_leave: 5,
      accumulated_sick: 10,
      accumulated_vacation: 10,
    };
  }

  // If it is in LeaveBalances format (i.e. has wellness_leave as a number)
  if (typeof dbBalance.wellness_leave === 'number') {
    console.log('[convertDBBalanceToLeaveBalances] Already in LeaveBalances format');
    return dbBalance as LeaveBalances;
  }

  // If it is in RPC summary format (i.e. has wellness_leave as an object with balance property)
  if (dbBalance.wellness_leave && typeof dbBalance.wellness_leave === 'object') {
    console.log('[convertDBBalanceToLeaveBalances] Converting from RPC summary format');
    const converted = {
      forced_leave: dbBalance.forced_leave?.balance !== undefined ? Number(dbBalance.forced_leave.balance) : 5,
      special_leave_privileges: (dbBalance.special_leave?.balance !== undefined ? Number(dbBalance.special_leave.balance) : 
                                 dbBalance.special_leave_privileges?.balance !== undefined ? Number(dbBalance.special_leave_privileges.balance) : 3),
      wellness_leave: dbBalance.wellness_leave?.balance !== undefined ? Number(dbBalance.wellness_leave.balance) : 5,
      accumulated_sick: (dbBalance.sick_leave?.balance !== undefined ? Number(dbBalance.sick_leave.balance) : 
                         dbBalance.accumulated_sick?.balance !== undefined ? Number(dbBalance.accumulated_sick.balance) : 10),
      accumulated_vacation: (dbBalance.vacation_leave?.balance !== undefined ? Number(dbBalance.vacation_leave.balance) : 
                             dbBalance.accumulated_vacation?.balance !== undefined ? Number(dbBalance.accumulated_vacation.balance) : 10),
      last_accumulation_date: dbBalance.vacation_leave?.last_accrual || dbBalance.last_accumulation_date,
    };
    console.log('[convertDBBalanceToLeaveBalances] Converted from RPC format:', converted);
    return converted;
  }

  // Otherwise, map from database row format (user_leave_balances columns)
  console.log('[convertDBBalanceToLeaveBalances] Converting from database row format');
  const converted = {
    forced_leave: dbBalance.forced_leave_balance !== undefined && dbBalance.forced_leave_balance !== null ? Number(dbBalance.forced_leave_balance) : 5,
    special_leave_privileges: dbBalance.special_leave_balance !== undefined && dbBalance.special_leave_balance !== null ? Number(dbBalance.special_leave_balance) : 3,
    wellness_leave: dbBalance.wellness_leave_balance !== undefined && dbBalance.wellness_leave_balance !== null ? Number(dbBalance.wellness_leave_balance) : 5,
    accumulated_sick: dbBalance.sick_leave_balance !== undefined && dbBalance.sick_leave_balance !== null ? Number(dbBalance.sick_leave_balance) : 10,
    accumulated_vacation: dbBalance.vacation_leave_balance !== undefined && dbBalance.vacation_leave_balance !== null ? Number(dbBalance.vacation_leave_balance) : 10,
    last_accumulation_date: dbBalance.last_accrual_date || dbBalance.last_accumulation_date,
  };
  console.log('[convertDBBalanceToLeaveBalances] Converted from row format:', converted);
  return converted;
}

export function getUnifiedLeaveBalances(accountId: string, dbBalance?: any): LeaveBalanceDisplay {
  if (dbBalance) {
    return formatBalancesForDisplay(convertDBBalanceToLeaveBalances(dbBalance));
  }
  const balances = getLeaveBalances(accountId);
  if (!balances) {
    return formatBalancesForDisplay({
      forced_leave: 5,
      special_leave_privileges: 3,
      wellness_leave: 5,
      accumulated_sick: 10,
      accumulated_vacation: 10,
    });
  }
  return formatBalancesForDisplay(balances);
}

export function getInsufficientBalanceMessage(
  leaveType: string,
  daysRequested: number,
  availableBalance: number
): string {
  return `You do not have enough leave credit left. You only have ${Math.round(availableBalance)} day${Math.round(availableBalance) === 1 ? '' : 's'} available for ${leaveType}, but you are requesting ${daysRequested} day${daysRequested === 1 ? '' : 's'}.`;
}

/**
 * Update leave balances for all employee accounts (admin function).
 */
export async function updateAllLeaveBalances(): Promise<void> {
  const accounts = getAccountsSync();

  for (const account of accounts) {
    if (account.role === 'employee') {
      await updateDailyLeaveAccumulation(account.id);
    }
  }
}
