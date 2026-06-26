-- =========================================================
-- Verify and Fix Complete Balance System
-- =========================================================
-- This script verifies the entire balance system and fixes any issues
-- Run this in Supabase SQL Editor to ensure everything is working
-- =========================================================

-- Step 1: Check if user_leave_balances table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_leave_balances' AND table_schema = 'public') THEN
    RAISE NOTICE '✓ user_leave_balances table exists';
  ELSE
    RAISE EXCEPTION '✗ user_leave_balances table does NOT exist - run create_leave_balances_table.sql first';
  END IF;
END $$;

-- Step 2: Check if leave_balance_transactions table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leave_balance_transactions' AND table_schema = 'public') THEN
    RAISE NOTICE '✓ leave_balance_transactions table exists';
  ELSE
    RAISE EXCEPTION '✗ leave_balance_transactions table does NOT exist - run create_leave_balances_table.sql first';
  END IF;
END $$;

-- Step 3: Check if initialize_user_leave_balance function exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'initialize_user_leave_balance') THEN
    RAISE NOTICE '✓ initialize_user_leave_balance function exists';
  ELSE
    RAISE EXCEPTION '✗ initialize_user_leave_balance function does NOT exist - run create_leave_balance_functions.sql first';
  END IF;
END $$;

-- Step 4: Drop and recreate the deduction trigger to ensure it's correct
DROP TRIGGER IF EXISTS trigger_deduct_leave_on_approval ON public.leave_requests;
DROP FUNCTION IF EXISTS public.deduct_leave_on_approval();

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
    -- Initialize balance for new user
    v_balance_id := public.initialize_user_leave_balance(NEW.user_id);
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
  END IF;

  -- Get current balance
  EXECUTE format('SELECT %I FROM public.user_leave_balances WHERE id = $1', v_column_name)
  INTO v_previous_balance
  USING v_balance_id;

  -- Calculate new balance (ensure it doesn't go below 0)
  v_new_balance := GREATEST(0, v_previous_balance - v_num_days);

  -- Update the balance
  EXECUTE format('UPDATE public.user_leave_balances SET %I = $1, updated_at = NOW() WHERE id = $2', v_column_name)
  USING v_new_balance, v_balance_id;

  -- Log the transaction
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

  RAISE NOTICE '✓ Deducted % days from % for user % (balance: % -> %)',
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

DO $$
BEGIN
  RAISE NOTICE '✓ trigger_deduct_leave_on_approval created successfully';
END $$;

-- Step 5: Verify the trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_deduct_leave_on_approval';

-- Step 6: Check if there are any pending leave requests
SELECT 
  COUNT(*) as pending_count,
  COUNT(*) FILTER (WHERE request_type = 'Leave') as pending_leave_count
FROM public.leave_requests
WHERE status = 'Pending';

-- Step 7: Show current balances for all users
SELECT 
  u.email,
  u.full_name,
  ulb.forced_leave_balance,
  ulb.special_leave_balance,
  ulb.wellness_leave_balance,
  ulb.vacation_leave_balance,
  ulb.sick_leave_balance
FROM public.user_leave_balances ulb
JOIN public.app_accounts u ON ulb.user_id = u.id
ORDER BY u.full_name;

-- Step 8: Show recent balance transactions
SELECT 
  t.transaction_type,
  t.leave_type,
  t.amount_change,
  t.new_balance,
  t.reason,
  t.created_at,
  u.email
FROM public.leave_balance_transactions t
JOIN public.app_accounts u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 10;
