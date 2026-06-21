# Leave Credit Management System

## Overview

The Leave Credit Management System automatically tracks and manages employee leave credits through a Supabase-based backend with real-time frontend integration.

## Features

### 1. Automatic Leave Credit Deduction
- When a leave application is **approved**, the system automatically deducts the corresponding days from the user's leave credits
- Deduction is handled by a PostgreSQL database trigger (`deduct_leave_on_approval`)
- No manual intervention required

### 2. Leave Credit Validation
- Before submission, the form checks if the user has sufficient leave credits
- If insufficient credits are available, a warning is displayed but the user can still submit
- The warning message: "You only have X days available for this leave type. You are requesting Y days. You can still submit, but your application may be declined due to insufficient leave credits."

### 3. Leave Credit Display
- Current leave credits are displayed in the Leave Form before submission
- Leave credits are also available in the Employee Dashboard via the "Leave Balances" button
- Real-time updates when credits change

### 4. Daily Leave Accrual
- Vacation and Sick Leave credits accumulate daily when no leave is used
- Accrual rate: ~0.04167 days per day (~1.25 days per month)
- Accrual is paused if the user has approved fixed-cap leave during the accrual period
- Handled by the `process_daily_accrual()` database function

## Leave Credit Types

### Fixed-Cap Leaves (Monthly Reset)
- **Forced Leave**: 5.00 days (resets monthly)
- **Special Leave Privileges**: 3.00 days (resets monthly)
- **Wellness Leave**: 5.00 days (resets monthly)

### Accrual-Based Leaves (Shared Balance)
- **Vacation Leave**: Accumulates daily, no maximum limit
- **Sick Leave**: Accumulates daily, no maximum limit
- Both share the same accrual pool

## Database Schema

### Tables

#### `user_leave_balances`
Tracks leave balances for all employees:
- `user_id` (UUID): Reference to app_accounts
- `forced_leave_balance` (DECIMAL): Current forced leave balance
- `special_leave_balance` (DECIMAL): Current special leave balance
- `wellness_leave_balance` (DECIMAL): Current wellness leave balance
- `vacation_leave_balance` (DECIMAL): Current vacation leave balance
- `sick_leave_balance` (DECIMAL): Current sick leave balance
- `daily_accrual_rate` (DECIMAL): Daily accrual rate (default: 0.04167)
- `last_accrual_date` (DATE): Last date when accrual was processed
- `total_accrued_days` (DECIMAL): Total days accrued
- `last_reset_date` (DATE): Last date when fixed-cap leaves were reset
- `reset_cycle_count` (INTEGER): Number of reset cycles completed

#### `leave_balance_transactions`
Audit trail for all leave balance changes:
- `user_id` (UUID): Reference to app_accounts
- `balance_id` (UUID): Reference to user_leave_balances
- `transaction_type` (TEXT): 'deduction', 'reset', 'accrual', 'adjustment'
- `leave_type` (TEXT): Type of leave affected
- `previous_balance` (DECIMAL): Balance before transaction
- `amount_change` (DECIMAL): Amount changed (positive for additions, negative for deductions)
- `new_balance` (DECIMAL): Balance after transaction
- `leave_request_id` (UUID): Reference to leave request (if applicable)
- `reason` (TEXT): Description of the transaction
- `created_by` (TEXT): Who initiated the transaction

### Database Functions

#### `deduct_leave_on_approval()`
Trigger function that automatically deducts leave credits when a leave request is approved:
- Triggers on status change to 'Approved'
- Deducts from appropriate balance based on leave type
- Logs transaction in `leave_balance_transactions` table
- Handles shared balance for Vacation/Sick Leave

#### `process_daily_accrual(p_target_date)`
Processes daily passive accrual for all users:
- Calculates days to process since last accrual
- Checks if user had fixed-cap leave during the period
- Only accrues if no fixed-cap leave was used
- Updates both vacation and sick leave balances
- Logs accrual transactions

#### `initialize_user_leave_balance(p_user_id)`
Initializes leave balance for a new user:
- Creates new balance record with default values
- Logs initialization transactions
- Returns the balance ID

#### `get_user_leave_balance_summary(p_user_id)`
Returns a JSON summary of user's leave balances:
- Includes current balances, max values, last reset/accrual dates
- Auto-initializes if balance doesn't exist

#### `adjust_leave_balance(p_user_id, p_leave_type, p_amount, p_reason, p_admin_email)`
Admin function to manually adjust leave balances:
- Adjusts specified leave type by amount
- Logs adjustment transaction with admin email
- Returns previous balance, amount change, and new balance

## Frontend Integration

### Components

#### LeaveBalanceContext
React Context that provides:
- `fetchUserBalance(userId)`: Fetch user's leave balance from Supabase
- `initializeBalance(userId)`: Initialize balance for new user
- `adjustBalance(userId, leaveType, amount, reason, adminEmail)`: Admin adjustment
- `fetchUserTransactions(userId, limit)`: Get transaction history
- `fetchAllBalances()`: Get all balances (admin)
- `subscribeToBalanceChanges(userId, callback)`: Real-time subscription

#### LeaveForm
- Displays current leave credits before submission
- Validates leave credits and shows warnings if insufficient
- Allows submission even with insufficient credits (with confirmation)
- Real-time balance updates

#### EmployeeDashboard
- Displays leave balances via "Leave Balances" button
- Fetches balances from Supabase on load
- Shows formatted balance modal
- Fallback to localStorage if Supabase fails

## Migration Setup

To set up the leave credit system in your Supabase database:

1. Run the table creation migration:
   ```bash
   # Execute migrations/create_leave_balances_table.sql in Supabase SQL Editor
   ```

2. Run the functions migration:
   ```bash
   # Execute migrations/create_leave_balance_functions.sql in Supabase SQL Editor
   ```

3. Verify the setup:
   ```sql
   -- Check tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('user_leave_balances', 'leave_balance_transactions');
   
   -- Check functions exist
   SELECT routine_name FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name IN (
     'deduct_leave_on_approval',
     'process_daily_accrual',
     'initialize_user_leave_balance',
     'get_user_leave_balance_summary',
     'adjust_leave_balance'
   );
   ```

## Usage Flow

### For Employees

1. **View Leave Credits**: Click "Leave Balances" button in Employee Dashboard
2. **Apply for Leave**: 
   - Go to Leave Form
   - Current credits are displayed at the top
   - Select leave type and dates
   - System validates if sufficient credits are available
   - If insufficient, warning is shown but submission is allowed
3. **After Approval**:
   - Credits are automatically deducted by database trigger
   - Transaction is logged in audit trail
   - Updated balance is reflected in dashboard

### For Admins

1. **View All Balances**: Use `fetchAllBalances()` API
2. **Adjust Balances**: Use `adjustBalance()` API for manual adjustments
3. **Process Daily Accrual**: Call `processDailyAccrual()` API (can be automated via cron job)
4. **Reset Fixed-Cap Leaves**: Call `resetFixedCapLeaves()` API (monthly)

## Automation

### Daily Accrual Job
Set up a cron job or scheduled function to process daily accrual:

```javascript
// Example: Run daily at midnight
const { leaveBalancesAPI } = require('./src/api/leaveBalances');

async function processDailyAccrual() {
  try {
    await leaveBalancesAPI.processDailyAccrual();
    console.log('Daily accrual processed successfully');
  } catch (error) {
    console.error('Error processing daily accrual:', error);
  }
}

// Schedule to run daily
// (Implementation depends on your hosting environment)
```

### Monthly Reset Job
Set up a monthly job to reset fixed-cap leaves:

```javascript
async function resetFixedCapLeaves() {
  try {
    await leaveBalancesAPI.resetFixedCapLeaves();
    console.log('Fixed-cap leaves reset successfully');
  } catch (error) {
    console.error('Error resetting fixed-cap leaves:', error);
  }
}
```

## Troubleshooting

### Balances not updating after approval
- Check if the trigger `trigger_deduct_leave_on_approval` exists
- Verify the trigger is firing: Check `leave_balance_transactions` table
- Ensure the leave type in the request matches the expected format

### Daily accrual not working
- Verify `last_accrual_date` is being updated
- Check if user had fixed-cap leave during the accrual period
- Ensure the `process_daily_accrual` function is being called

### Leave credits showing as 0
- Check if balance was initialized for the user
- Run `initialize_user_leave_balance(user_id)` for affected users
- Verify the user_id matches between `app_accounts` and `user_leave_balances`

## Security

- Row Level Security (RLS) is enabled on both tables
- Users can only view their own balances
- Admins can view all balances
- System functions have appropriate permissions
- All transactions are logged with audit trail

## Notes

- The system uses Supabase as the single source of truth
- LocalStorage is used only as a fallback if Supabase is unavailable
- All balance changes are logged for audit purposes
- The system handles both old localStorage format and new Supabase format for backward compatibility
