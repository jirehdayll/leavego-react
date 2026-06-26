-- =========================================================
-- Enable Leave Balance Deduction on Approval
-- =========================================================
-- This migration updates the deduct_leave_on_approval function
-- to actually deduct leave balances when a leave request is approved.
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

-- Drop the existing trigger
DROP TRIGGER IF EXISTS trigger_deduct_leave_on_approval ON public.leave_requests;

-- Update the function to actually deduct balances
CREATE OR REPLACE FUNCTION deduct_leave_on_approval()
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

  -- Get leave type and number of days from request details
  v_leave_type := NEW.details->>'leave_type';
  v_num_days := (NEW.details->>'number_of_days')::DECIMAL(8,3);

  -- Validate we have the required data
  IF v_leave_type IS NULL OR v_num_days IS NULL OR v_num_days <= 0 THEN
    RAISE NOTICE 'Skipping deduction: missing leave_type or number_of_days';
    RETURN NEW;
  END IF;

  -- Get or create balance record for the user
  SELECT id INTO v_balance_id
  FROM public.user_leave_balances
  WHERE user_id = NEW.user_id;

  IF v_balance_id IS NULL THEN
    -- Initialize balance for new user
    v_balance_id := initialize_user_leave_balance(NEW.user_id);
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
  EXECUTE format('UPDATE public.user_leave_balances SET %I = $1 WHERE id = $2', v_column_name)
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

  RAISE NOTICE 'Deducted % days from % for user % (balance: % -> %)',
    v_num_days, v_column_name, NEW.user_id, v_previous_balance, v_new_balance;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_deduct_leave_on_approval
  BEFORE UPDATE OF status ON public.leave_requests
  FOR EACH ROW
  WHEN (NEW.status = 'Approved' AND OLD.status <> 'Approved')
  EXECUTE FUNCTION deduct_leave_on_approval();

COMMIT;

-- Verify the trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_deduct_leave_on_approval';
