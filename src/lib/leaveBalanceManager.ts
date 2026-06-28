import { getAccountsSync, saveAccounts } from './accountStore';
import { leaveRequestsAPI } from '../api/leaveRequests';
import { leaveBalancesAPI } from '../api/leaveBalances';
import { REQUEST_STATUS } from '../constants';
import { supabase } from './supabaseClient';

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
  const leaveTypeLower = leaveType.toLowerCase();
  return FIXED_CAP_LEAVE_TYPES.some(type => leaveTypeLower.includes(type.toLowerCase().replace('/', '')));
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
 * Adds +1 day to vacation and sick leave for each month with no approved leave applications.
 * Also ensures initial balances are set if user has zero accumulated leave.
 * Called when the user logs in or views their dashboard.
 */
export async function updateDailyLeaveAccumulation(accountId: string): Promise<void> {
  const accounts = getAccountsSync();
  const account = accounts.find((a) => a.id === accountId);

  if (!account || !account.leave_balances) {
    // Initialize with default balances if none exist
    if (account) {
      const defaultBalances: LeaveBalances = {
        forced_leave: 5,
        special_leave_privileges: 3,
        wellness_leave: 5,
        accumulated_sick: 10, // Give initial 10 days
        accumulated_vacation: 10, // Give initial 10 days
        last_accumulation_date: new Date().toISOString(),
      };
      persistBalances(accountId, defaultBalances);
    }
    return;
  }

  const balances = account.leave_balances;
  
  // Give initial 10 days if user has zero accumulated leave
  if (balances.accumulated_sick === 0 && balances.accumulated_vacation === 0) {
    const newBalances: LeaveBalances = {
      ...balances,
      accumulated_sick: 10,
      accumulated_vacation: 10,
      last_accumulation_date: new Date().toISOString(),
    };
    persistBalances(accountId, newBalances);
    console.log('[Accrual] Added initial 10 days to vacation and sick leave');
    return;
  }

  const lastAccumulationDate = balances.last_accumulation_date
    ? new Date(balances.last_accumulation_date)
    : new Date((account.createdAt as string) || '2020-01-01');

  const today = new Date();

  const monthsDiff =
    (today.getFullYear() - lastAccumulationDate.getFullYear()) * 12 +
    (today.getMonth() - lastAccumulationDate.getMonth());

  if (monthsDiff <= 0) {
    return;
  }

  const { data: userForms } = await leaveRequestsAPI.getAll({ user_id: accountId });

  let monthsWithoutLeave = 0;

  for (let i = 0; i < monthsDiff; i++) {
    const checkDate = new Date(lastAccumulationDate);
    checkDate.setMonth(checkDate.getMonth() + i + 1);

    const monthStart = new Date(checkDate.getFullYear(), checkDate.getMonth(), 1);
    const monthEnd = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0);

    const hasApprovedLeaveInMonth = (userForms || []).some((form) => {
      if (form.status !== REQUEST_STATUS.APPROVED) return false;
      const formDate = new Date(form.submitted_at || form.created_at);
      return formDate >= monthStart && formDate <= monthEnd;
    });

    if (!hasApprovedLeaveInMonth) {
      monthsWithoutLeave++;
    }
  }

  const newBalances: LeaveBalances = {
    ...balances,
    last_accumulation_date: today.toISOString(),
  };

  if (monthsWithoutLeave > 0) {
    newBalances.accumulated_sick = balances.accumulated_sick + monthsWithoutLeave;
    newBalances.accumulated_vacation = balances.accumulated_vacation + monthsWithoutLeave;
    console.log(`[Accrual] Added ${monthsWithoutLeave} days to vacation and sick leave`);
  }

  persistBalances(accountId, newBalances);
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

  // Initialize leave_balances if it doesn't exist
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

  if (numDays <= 0) {
    console.warn('Invalid number of days for deduction:', numDays);
    return;
  }

  const balances = { ...account.leave_balances };
  const leaveTypeLower = leaveType.toLowerCase();

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
    // Try to fetch from database
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
      
      return balances;
    } else {
      console.log('No balance record found in database for user:', accountId);
    }
  } catch (error) {
    if (error.message && error.message.includes('PGRST116')) {
      console.log('No balance record found in database for user:', accountId);
    } else {
      console.error('Error fetching balance from database:', error);
    }
  }

  // Fallback to localStorage
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
    return dbBalance as LeaveBalances;
  }

  // If it is in RPC summary format (i.e. has wellness_leave as an object with balance property)
  if (dbBalance.wellness_leave && typeof dbBalance.wellness_leave === 'object') {
    return {
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
  }

  // Otherwise, map from database row format (user_leave_balances columns)
  return {
    forced_leave: dbBalance.forced_leave_balance !== undefined && dbBalance.forced_leave_balance !== null ? Number(dbBalance.forced_leave_balance) : 5,
    special_leave_privileges: dbBalance.special_leave_balance !== undefined && dbBalance.special_leave_balance !== null ? Number(dbBalance.special_leave_balance) : 3,
    wellness_leave: dbBalance.wellness_leave_balance !== undefined && dbBalance.wellness_leave_balance !== null ? Number(dbBalance.wellness_leave_balance) : 5,
    accumulated_sick: dbBalance.sick_leave_balance !== undefined && dbBalance.sick_leave_balance !== null ? Number(dbBalance.sick_leave_balance) : 10,
    accumulated_vacation: dbBalance.vacation_leave_balance !== undefined && dbBalance.vacation_leave_balance !== null ? Number(dbBalance.vacation_leave_balance) : 10,
    last_accumulation_date: dbBalance.last_accrual_date || dbBalance.last_accumulation_date,
  };
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
