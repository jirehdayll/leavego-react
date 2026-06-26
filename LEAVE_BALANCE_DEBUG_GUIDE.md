# Leave Balance Debug Tool Guide

## Overview
The Leave Balance Debug Tool is a comprehensive diagnostic page that helps identify why leave balances may not be working correctly.

## Access
Navigate to: `/admin/debug/balance` (requires admin role)

## What It Checks

### 1. Authentication
- Verifies user is authenticated
- Checks session validity
- Displays user ID, email, and role

### 2. Database Connection
- Tests basic Supabase connectivity
- Verifies can query app_accounts table

### 3. Table Structure
- Checks if `user_leave_balances` table exists
- Checks if `leave_balance_transactions` table exists
- Shows table structure and sample data

### 4. RLS Policies
- Tests if user can read their own balance records
- Identifies permission issues

### 5. User Balance Record
- Checks if balance record exists for current user
- Verifies balances are non-zero
- Shows complete balance data

### 6. Database Functions
- Tests `initialize_user_leave_balance` RPC function
- Tests `get_user_leave_balance_summary` RPC function
- Identifies missing or broken database functions

### 7. API Layer
- Tests `leaveBalancesAPI.getBalanceByUserId()`
- Tests `leaveBalancesAPI.getAllBalances()`
- Verifies API functions work correctly

### 8. Local Storage
- Checks if user account exists in local storage
- Verifies `leave_balances` property exists
- Compares local vs database balances

### 9. Balance Manager
- Tests `getUnifiedLeaveBalances()` function
- Tests `getLeaveBalancesFromDB()` function
- Verifies balance manager logic

### 10. Transaction History
- Checks if transaction records exist
- Shows recent transactions
- Identifies if deduction transactions are being created

### 11. Data Synchronization
- Compares database balances with local storage
- Identifies sync issues between systems

### 12. Database Triggers
- Verifies deduction trigger function exists
- Checks if automatic deductions are configured

## Common Issues and Solutions

### Issue: "No balance record found for user"
**Solution**: The balance record needs to be initialized. The debug tool will attempt to initialize it automatically, or you can run the initialization function manually.

### Issue: "RLS policies prevent access"
**Solution**: Run the migration script `complete_balance_fix.sql` to fix RLS policies.

### Issue: "Database function not found"
**Solution**: Run the migration script `create_leave_balance_functions.sql` to create the required RPC functions.

### Issue: "All balances are zero"
**Solution**: Run the migration script `complete_balance_fix.sql` to add initial balances (10 days vacation + 10 days sick leave).

### Issue: "Database and local storage differ"
**Solution**: This indicates a synchronization issue. The local storage may have stale data. Try clearing local storage or refreshing the page.

### Issue: "Transaction records don't exist"
**Solution**: This suggests the deduction trigger isn't working. Check that the trigger function exists and is properly configured.

## How to Use

1. Log in as an admin user
2. Navigate to `/admin/debug/balance`
3. Click "Run Debug Tests"
4. Review the results for each category
5. Check the summary at the bottom for quick overview
6. Click "View Details" on any test to see the actual data

## Quick Fix Commands

If you identify issues, here are the quick fixes:

### Fix RLS Policies
Run in Supabase SQL Editor:
```sql
-- See migrations/complete_balance_fix.sql
```

### Initialize User Balance
```sql
SELECT initialize_user_leave_balance('user-id-here');
```

### Add Initial Balances
```sql
-- See migrations/complete_balance_fix.sql (Step 3)
```

### Check Current Balances
```sql
SELECT * FROM user_leave_balances WHERE user_id = 'your-user-id';
```

### Check Transaction History
```sql
SELECT * FROM leave_balance_transactions WHERE user_id = 'your-user-id' ORDER BY created_at DESC LIMIT 10;
```

## Interpreting Results

- ✓ **Success**: Everything is working correctly
- ✗ **Error**: Something is broken and needs fixing
- ⚠ **Warning**: Not necessarily broken, but needs attention
- ℹ **Info**: Normal behavior, no action needed

## Support

If you continue to have issues after using this tool:
1. Export the debug results (screenshot or copy data)
2. Check the migration files in `/migrations/` folder
3. Review the implementation guide `LEAVE_BALANCE_DEPLOYMENT.md`
4. Check the leave balance documentation `LEAVE_MANAGEMENT_IMPLEMENTATION.md`