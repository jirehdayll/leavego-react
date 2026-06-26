-- =========================================================
-- Add Balance Constraint to Prevent Over-Requesting
-- =========================================================
-- This migration adds a check constraint to ensure users cannot
-- request more leave days than their available balance.
--
-- The constraint checks the leave balance before allowing a request
-- to be submitted with 'Pending' status.
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

-- Create function to check if user has sufficient balance for a leave request
CREATE OR REPLACE FUNCTION check_sufficient_leave_balance()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_id UUID;
  v_leave_type TEXT;
  v_num_days DECIMAL(8,3);
  v_available_balance DECIMAL(8,3);
  v_column_name TEXT;
BEGIN
  -- Only check on INSERT and when status is 'Pending'
  IF TG_OP = 'UPDATE' AND NEW.status <> 'Pending' THEN
    RETURN NEW;
  END IF;
  
  -- Only process leave requests (not travel orders)
  IF NEW.request_type <> 'Leave' THEN
    RETURN NEW;
  END IF;
  
  -- Get leave type and number of days from request details
  v_leave_type := NEW.details->>'leave_type';
  v_num_days := COALESCE(NEW.details->>'num_days', NEW.details->>'number_of_days')::DECIMAL(8,3);
  
  -- Validate we have the required data
  IF v_leave_type IS NULL OR v_num_days IS NULL OR v_num_days <= 0 THEN
    RETURN NEW;
  END IF;
  
  -- Only check for credit-tracked leave types
  IF v_leave_type NOT IN ('Mandatory/Forced Leave', 'Special Privilege Leave', 'Wellness Leave', 'Vacation Leave', 'Sick Leave') THEN
    RETURN NEW;
  END IF;
  
  -- Get or create balance record for the user
  SELECT id INTO v_balance_id
  FROM public.user_leave_balances
  WHERE user_id = NEW.user_id;
  
  -- If no balance record exists, initialize with defaults
  IF v_balance_id IS NULL THEN
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
  
  -- Get current balance
  EXECUTE format('SELECT %I FROM public.user_leave_balances WHERE id = $1', v_column_name)
  INTO v_available_balance
  USING v_balance_id;
  
  -- Check if user has sufficient balance
  IF v_available_balance < v_num_days THEN
    RAISE EXCEPTION 'Insufficient leave balance. You have % days available for %, but you are requesting % days.',
      v_available_balance, v_leave_type, v_num_days
    USING ERRCODE = 'check_violation';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for balance check
DROP TRIGGER IF EXISTS trigger_check_balance_constraint ON public.leave_requests;
CREATE TRIGGER trigger_check_balance_constraint
  BEFORE INSERT OR UPDATE ON public.leave_requests
  FOR EACH ROW
  WHEN (NEW.request_type = 'Leave' AND (NEW.status = 'Pending' OR NEW.status IS NULL))
  EXECUTE FUNCTION check_sufficient_leave_balance();

COMMIT;

-- Verify the trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_check_balance_constraint';
