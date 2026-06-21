import { getAccountsSync, saveAccounts } from './accountStore';
import { leaveRequestsAPI } from '../api/leaveRequests';
import { REQUEST_STATUS } from '../constants';

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
  const leaveTypeLower = leaveType.toLowerCase();

  if (leaveTypeLower.includes('forced')) return balances.forced_leave;
  if (leaveTypeLower.includes('special') || leaveTypeLower.includes('privilege')) {
    return balances.special_leave_privileges;
  }
  if (leaveTypeLower.includes('wellness')) return balances.wellness_leave;
  if (leaveTypeLower.includes('sick')) return balances.accumulated_sick;
  if (leaveTypeLower.includes('vacation')) return balances.accumulated_vacation;

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
 * Called when the user logs in or views their dashboard.
 */
export async function updateDailyLeaveAccumulation(accountId: string): Promise<void> {
  const accounts = getAccountsSync();
  const account = accounts.find((a) => a.id === accountId);

  if (!account || !account.leave_balances) {
    return;
  }

  const balances = account.leave_balances;
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
  }

  persistBalances(accountId, newBalances);
}

/**
 * Decrease leave balances when a leave application is approved.
 */
export function decreaseLeaveBalance(
  accountId: string,
  leaveType: string,
  numDays: number
): void {
  const accounts = getAccountsSync();
  const account = accounts.find((a) => a.id === accountId);

  if (!account || !account.leave_balances || numDays <= 0) {
    return;
  }

  const balances = { ...account.leave_balances };
  const leaveTypeLower = leaveType.toLowerCase();

  if (leaveTypeLower.includes('forced')) {
    balances.forced_leave = Math.max(0, balances.forced_leave - numDays);
  } else if (leaveTypeLower.includes('special') || leaveTypeLower.includes('privilege')) {
    balances.special_leave_privileges = Math.max(
      0,
      balances.special_leave_privileges - numDays
    );
  } else if (leaveTypeLower.includes('wellness')) {
    balances.wellness_leave = Math.max(0, balances.wellness_leave - numDays);
  } else if (leaveTypeLower.includes('sick')) {
    balances.accumulated_sick = Math.max(0, balances.accumulated_sick - numDays);
  } else if (leaveTypeLower.includes('vacation')) {
    balances.accumulated_vacation = Math.max(0, balances.accumulated_vacation - numDays);
  }

  persistBalances(accountId, balances);
}

/**
 * Get leave balances for a specific account (source of truth for records).
 */
export function getLeaveBalances(accountId: string): LeaveBalances | null {
  const accounts = getAccountsSync();
  const account = accounts.find((a) => a.id === accountId);
  return account?.leave_balances || null;
}

export function getUnifiedLeaveBalances(accountId: string): LeaveBalanceDisplay {
  const balances = getLeaveBalances(accountId);
  if (!balances) {
    return formatBalancesForDisplay({
      forced_leave: 5,
      special_leave_privileges: 3,
      wellness_leave: 5,
      accumulated_sick: 0,
      accumulated_vacation: 0,
    });
  }
  return formatBalancesForDisplay(balances);
}

export function getInsufficientBalanceMessage(
  leaveType: string,
  daysRequested: number,
  availableBalance: number
): string {
  return `You do not have enough leave credit left. You only have ${availableBalance.toFixed(1)} day${availableBalance === 1 ? '' : 's'} available for ${leaveType}, but you are requesting ${daysRequested} day${daysRequested === 1 ? '' : 's'}.`;
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
