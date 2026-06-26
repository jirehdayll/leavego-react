-- =========================================================
-- COMPLETE LEAVE BALANCE SYSTEM FIX
-- =========================================================
-- This migration fixes all issues with the leave balance system:
-- 1. Updates database trigger to deduct from vacation/sick leave for forced/special/wellness
-- 2. Sets initial balances to 10 days for vacation and sick leave
-- 3. Fixes RLS policies for proper user access
-- 4. Initializes balances for existing users
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

-- =========================================================
-- Step 1: Fix RLS Policies
-- =========================================================

-- Drop existing policies that might be blocking access
DROP POLICY IF EXISTS "Users can view own leave balances" ON public.user_leave_balances;
DROP POLICY IF EXISTS "Users can insert own leave balances" ON public.user_leave_balances;
DROP POLICY IF EXISTS "Users can update own leave balances" ON public.user_leave_balances;

-- Create more permissive policies using text comparison
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

-- Ensure service role has full access
DROP POLICY IF EXISTS "Service role can manage leave balances" ON public.user_leave_balances;

CREATE POLICY "Service role can manage leave balances"
ON public.user_leave_balances
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =========================================================
-- Step 2: Update Database Trigger with Shared Deduction
-- =========================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_deduct_leave_on_approval ON public.leave_requests;
DROP FUNCTION IF EXISTS public.deduct_leave_on_approval();

-- Create improved function with shared deduction logic
CREATE OR REPLACE FUNCTION public.deduct_leave_on_approval()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_id UUID;
  v_previous_balance DECIMAL(8,3);
  v_new_balance DECIMAL(8,3);
  v_leave_type TEXT;
  v_num_days DECIMAL(8,3);
  v_column_name TEXT;
  v_is_shared_deduction BOOLEAN := FALSE;
  v_vacation_previous DECIMAL(8,3);
  v_sick_previous DECIMAL(8,3);
  v_vacation_new DECIMAL(8,3);
  v_sick_new DECIMAL(8,3);
  v_shared_deduction_amount DECIMAL(8,3);
BEGIN
  -- Only trigger on status change to 'Approved'
  IF NEW.status <> 'Approved' OR (OLD.status = 'Approved') THEN
    RETURN NEW;
  END IF;

  -- Only process leave requests (not travel orders)
  IF NEW.request_type <> 'Leave' THEN
    RETURN NEW;
  END IF;

  -- Get leave type from request details
  v_leave_type := NEW.details->>'leave_type';
  
  -- Get number of days - try both field names
  v_num_days := COALESCE(
    (NEW.details->>'num_days')::DECIMAL(8,3),
    (NEW.details->>'number_of_days')::DECIMAL(8,3)
  );

  -- Validate we have the required data
  IF v_leave_type IS NULL OR v_num_days IS NULL OR v_num_days <= 0 THEN
    RAISE NOTICE 'Skipping deduction: missing leave_type or invalid num_days. leave_type=%, num_days=%', v_leave_type, v_num_days;
    RETURN NEW;
  END IF;

  -- Get or create balance record for the user
  SELECT id INTO v_balance_id
  FROM public.user_leave_balances
  WHERE user_id = NEW.user_id;

  IF v_balance_id IS NULL THEN
    -- Initialize balance for new user with 10 days
    INSERT INTO public.user_leave_balances (
      user_id,
      vacation_leave_balance,
      sick_leave_balance,
      forced_leave_balance,
      special_leave_balance,
      wellness_leave_balance
    ) VALUES (
      NEW.user_id,
      10.0,  -- 10 days vacation
      10.0,  -- 10 days sick
      5.0,   -- 5 days forced leave
      3.0,   -- 3 days special leave
      5.0    -- 5 days wellness leave
    )
    RETURNING id INTO v_balance_id;
    RAISE NOTICE 'Initialized balance for user %: balance_id=%', NEW.user_id, v_balance_id;
  END IF;

  -- Map leave type to column name
  v_column_name := CASE
    WHEN v_leave_type ILIKE '%forced%' THEN 'forced_leave_balance'
    WHEN v_leave_type ILIKE '%special%' OR v_leave_type ILIKE '%privilege%' THEN 'special_leave_balance'
    WHEN v_leave_type ILIKE '%wellness%' THEN 'wellness_leave_balance'
    WHEN v_leave_type ILIKE '%sick%' THEN 'sick_leave_balance'
    WHEN v_leave_type ILIKE '%vacation%' THEN 'vacation_leave_balance'
    ELSE NULL
  END;

  -- If leave type is not tracked, skip deduction
  IF v_column_name IS NULL THEN
    RAISE NOTICE 'Leave type "%" is not tracked for balance deduction', v_leave_type;
    RETURN NEW;
  END;

  -- Check if this is a shared deduction type (forced, special, wellness)
  v_is_shared_deduction := (
    v_leave_type ILIKE '%forced%' OR 
    v_leave_type ILIKE '%special%' OR 
    v_leave_type ILIKE '%privilege%' OR 
    v_leave_type ILIKE '%wellness%'
  );

  -- Get current balance for the specific leave type
  EXECUTE format('SELECT %I FROM public.user_leave_balances WHERE id = $1', v_column_name)
  INTO v_previous_balance
  USING v_balance_id;

  -- Calculate new balance (ensure it doesn't go below 0)
  v_new_balance := GREATEST(0, v_previous_balance - v_num_days);

  -- Update the specific leave type balance
  EXECUTE format('UPDATE public.user_leave_balances SET %I = $1, updated_at = NOW() WHERE id = $2', v_column_name)
  USING v_new_balance, v_balance_id;

  -- Log the transaction for the specific leave type
  INSERT INTO public.leave_balance_transactions (
    user_id, balance_id, transaction_type, leave_type,
    previous_balance, amount_change, new_balance,
    leave_request_id, reason, created_by
  ) VALUES (
    NEW.user_id, v_balance_id, 'deduction',
    REPLACE(v_column_name, '_balance', ''),
    v_previous_balance, -v_num_days, v_new_balance,
    NEW.id, 'Leave approval deduction', 'system'
  );

  -- If this is a shared deduction type, also deduct from vacation and sick leave
  IF v_is_shared_deduction THEN
    -- Calculate shared deduction (split equally between vacation and sick)
    v_shared_deduction_amount := v_num_days / 2.0;
    
    -- Get current vacation and sick balances
    SELECT vacation_leave_balance, sick_leave_balance 
    INTO v_vacation_previous, v_sick_previous
    FROM public.user_leave_balances 
    WHERE id = v_balance_id;
    
    -- Calculate new balances
    v_vacation_new := GREATEST(0, v_vacation_previous - v_shared_deduction_amount);
    v_sick_new := GREATEST(0, v_sick_previous - v_shared_deduction_amount);
    
    -- Update vacation and sick balances
    UPDATE public.user_leave_balances 
    SET 
      vacation_leave_balance = v_vacation_new,
      sick_leave_balance = v_sick_new,
      updated_at = NOW()
    WHERE id = v_balance_id;
    
    -- Log vacation deduction
    INSERT INTO public.leave_balance_transactions (
      user_id, balance_id, transaction_type, leave_type,
      previous_balance, amount_change, new_balance,
      leave_request_id, reason, created_by
    ) VALUES (
      NEW.user_id, v_balance_id, 'deduction',
      'vacation_leave',
      v_vacation_previous, -v_shared_deduction_amount, v_vacation_new,
      NEW.id, 'Shared deduction from ' || v_leave_type, 'system'
    );
    
    -- Log sick deduction
    INSERT INTO public.leave_balance_transactions (
      user_id, balance_id, transaction_type, leave_type,
      previous_balance, amount_change, new_balance,
      leave_request_id, reason, created_by
    ) VALUES (
      NEW.user_id, v_balance_id, 'deduction',
      'sick_leave',
      v_sick_previous, -v_shared_deduction_amount, v_sick_new,
      NEW.id, 'Shared deduction from ' || v_leave_type, 'system'
    );
    
    RAISE NOTICE 'Shared deduction: Deducted % days from vacation and % days from sick leave for user %',
      v_shared_deduction_amount, v_shared_deduction_amount, NEW.user_id;
  END IF;

  RAISE NOTICE 'Deducted % days from % for user % (balance: % -> %)',
    v_num_days, v_column_name, NEW.user_id, v_previous_balance, v_new_balance;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to deduct leave balance: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_deduct_leave_on_approval
  BEFORE UPDATE OF status ON public.leave_requests
  FOR EACH ROW
  WHEN (NEW.status = 'Approved' AND OLD.status <> 'Approved')
  EXECUTE FUNCTION public.deduct_leave_on_approval();

-- =========================================================
-- Step 3: Update Initial Balances for Existing Users
-- =========================================================

-- Update existing records with 0 balances to 10 days
UPDATE public.user_leave_balances
SET 
  vacation_leave_balance = 10.000,
  sick_leave_balance = 10.000,
  updated_at = NOW()
WHERE 
  vacation_leave_balance = 0.000 
  OR sick_leave_balance = 0.000
  OR vacation_leave_balance IS NULL
  OR sick_leave_balance IS NULL;

-- =========================================================
-- Step 4: Initialize Balances for Users Without Records
-- =========================================================

DO $$
DECLARE
  v_user RECORD;
  v_balance_id UUID;
BEGIN
  FOR v_user IN 
    SELECT id, email, full_name 
    FROM public.app_accounts 
    WHERE role NOT IN ('admin', 'super_admin')
  LOOP
    -- Check if balance exists
    SELECT id INTO v_balance_id
    FROM public.user_leave_balances
    WHERE user_id = v_user.id;
    
    IF v_balance_id IS NULL THEN
      -- Insert new balance with default values
      INSERT INTO public.user_leave_balances (
        user_id,
        vacation_leave_balance,
        sick_leave_balance,
        forced_leave_balance,
        special_leave_balance,
        wellness_leave_balance
      ) VALUES (
        v_user.id,
        10.0,  -- 10 days vacation
        10.0,  -- 10 days sick
        5.0,   -- 5 days forced leave
        3.0,   -- 3 days special leave
        5.0    -- 5 days wellness leave
      )
      RETURNING id INTO v_balance_id;
      
      RAISE NOTICE 'Initialized balance for user: % (ID: %)', v_user.email, v_balance_id;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- =========================================================
-- Verification Queries
-- =========================================================

-- Check trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_deduct_leave_on_approval';

-- Check updated balances
SELECT 
  user_id,
  vacation_leave_balance,
  sick_leave_balance,
  forced_leave_balance,
  special_leave_balance,
  wellness_leave_balance,
  updated_at
FROM public.user_leave_balances
ORDER BY updated_at DESC
LIMIT 10;

-- =========================================================
-- Expected Results After Running This Script:
-- =========================================================
-- ✅ Database trigger updated with shared deduction logic
-- ✅ All users have 10 days initial vacation and sick leave
-- ✅ RLS policies fixed for proper user access
-- ✅ Balance records initialized for all users
-- ✅ When forced/special/wellness leave is approved:
--    - Specific leave type balance is deducted
--    - Vacation leave balance is deducted (half the days)
--    - Sick leave balance is deducted (half the days)
-- =========================================================