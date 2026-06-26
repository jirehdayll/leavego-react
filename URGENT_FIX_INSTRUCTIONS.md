# 🚨 URGENT FIX INSTRUCTIONS

## Based on your debug results, here are the issues and fixes:

### Issues Found:
1. ❌ **RLS Policies blocking user access** - User cannot read their own balance
2. ⚠️ **No balance record exists** - Database has no balance record for your user
3. ❌ **Database functions failing** - RLS policies block initialization functions
4. ❌ **API calls failing** - Expect single record but none exists

## 🔧 IMMEDIATE FIX REQUIRED:

### Step 1: Run the SQL Migration Script

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor** 
3. **Copy and paste** the entire content of this file:
   ```
   migrations/fix_user_balance_access.sql
   ```
4. **Click "Run"** to execute the script

### Step 2: Test the Fix

1. After running the SQL script, go back to the debug tool: `/admin/debug/balance`
2. Click **"Run Debug Tests"** again
3. All errors should now be resolved

### Step 3: Alternative Manual Fix

If the SQL script doesn't work, run this in Supabase SQL Editor:

```sql
-- Fix RLS policies immediately
DROP POLICY IF EXISTS "Users can view own leave balances" ON public.user_leave_balances;
DROP POLICY IF EXISTS "Users can insert own leave balances" ON public.user_leave_balances;
DROP POLICY IF EXISTS "Users can update own leave balances" ON public.user_leave_balances;

CREATE POLICY "Users can view own leave balances"
ON public.user_leave_balances
FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own leave balances"
ON public.user_leave_balances
FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own leave balances"
ON public.user_leave_balances
FOR UPDATE
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Initialize your balance (replace YOUR_USER_ID with your actual user ID from debug tool)
INSERT INTO public.user_leave_balances (
  user_id,
  vacation_leave_balance,
  sick_leave_balance,
  forced_leave_balance,
  special_leave_balance,
  wellness_leave_balance
) VALUES (
  'YOUR_USER_ID_HERE',
  10.0,  -- 10 days vacation
  10.0,  -- 10 days sick
  5.0,   -- 5 days forced leave
  3.0,   -- 3 days special leave
  5.0    -- 5 days wellness leave
);
```

### Step 4: Use Auto-Fix Button

I've also added an **"Auto-Fix Issues"** button to the debug tool that will:
- Attempt to initialize your balance automatically
- Re-run the debug tests after fixing

## What I Fixed in the Code:

1. **Updated API calls** to use `.maybeSingle()` instead of `.single()` to handle missing records gracefully
2. **Improved error handling** in the debug tool to show warnings instead of errors for missing records
3. **Added auto-fix functionality** to the debug tool
4. **Created safe initialization function** that bypasses RLS issues
5. **Updated balance manager** to handle missing database records properly

## Expected Results After Fix:

✅ **Authentication**: All tests pass  
✅ **Database Connection**: All tests pass  
✅ **Table Structure**: All tests pass  
✅ **RLS Policies**: User can access own balance  
✅ **User Balance Record**: Balance record exists with non-zero values  
✅ **Database Functions**: All functions work  
✅ **API Layer**: All API calls work  
✅ **Local Storage**: Data synced with database  
✅ **Balance Manager**: All functions work  
✅ **Transaction History**: Shows initialization transaction  

## If Issues Persist:

1. Check that you're using the correct user ID
2. Ensure you're logged in as the same user in both the app and Supabase
3. Verify the SQL script ran successfully (check for error messages in Supabase)
4. Try the manual SQL fix as a fallback

The main issue is that the RLS policies were too restrictive and no balance record existed in the database. The SQL script will fix both issues.