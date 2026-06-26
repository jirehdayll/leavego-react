-- =========================================================
-- Leave Balance Management Functions
-- =========================================================
-- This migration creates PostgreSQL functions for:
-- - Automatic leave deduction on approval
-- - Monthly reset of fixed-cap leaves
-- - Shared Vacation/Sick leave deduction
-- - Daily passive accrual processing
-- - Balance transaction logging
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

-- =========================================================
-- Function: Deduct leave balance on approval
-- =========================================================
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

-- Create trigger for automatic deduction
DROP TRIGGER IF EXISTS trigger_deduct_leave_on_approval ON public.leave_requests;
CREATE TRIGGER trigger_deduct_leave_on_approval
  BEFORE UPDATE OF status ON public.leave_requests
  FOR EACH ROW
  WHEN (NEW.status = 'Approved' AND OLD.status <> 'Approved')
  EXECUTE FUNCTION deduct_leave_on_approval();

-- =========================================================
-- Function: Monthly reset of fixed-cap leaves
-- =========================================================
CREATE OR REPLACE FUNCTION reset_fixed_cap_leaves()
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance RECORD;
  v_previous_forced DECIMAL(8,3);
  v_previous_special DECIMAL(8,3);
  v_previous_wellness DECIMAL(8,3);
BEGIN
  -- Reset all fixed-cap leaves to their default values
  FOR v_balance IN SELECT id, user_id, forced_leave_balance, special_leave_balance, wellness_leave_balance
                   FROM public.user_leave_balances
  LOOP
    -- Store previous balances for transaction logging
    v_previous_forced := v_balance.forced_leave_balance;
    v_previous_special := v_balance.special_leave_balance;
    v_previous_wellness := v_balance.wellness_leave_balance;
    
    -- Reset balances
    UPDATE public.user_leave_balances
    SET 
      forced_leave_balance = 5.00,
      special_leave_balance = 3.00,
      wellness_leave_balance = 5.00,
      last_reset_date = CURRENT_DATE,
      reset_cycle_count = reset_cycle_count + 1
    WHERE id = v_balance.id;
    
    -- Log forced leave reset transaction
    IF v_previous_forced <> 5.00 THEN
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_balance.user_id, v_balance.id, 'reset', 'forced_leave',
        v_previous_forced, 5.00 - v_previous_forced, 5.00,
        'Monthly reset to default', 'system'
      );
    END IF;
    
    -- Log special leave reset transaction
    IF v_previous_special <> 3.00 THEN
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_balance.user_id, v_balance.id, 'reset', 'special_leave',
        v_previous_special, 3.00 - v_previous_special, 3.00,
        'Monthly reset to default', 'system'
      );
    END IF;
    
    -- Log wellness leave reset transaction
    IF v_previous_wellness <> 5.00 THEN
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_balance.user_id, v_balance.id, 'reset', 'wellness_leave',
        v_previous_wellness, 5.00 - v_previous_wellness, 5.00,
        'Monthly reset to default', 'system'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- Function: Daily passive accrual processing
-- =========================================================
CREATE OR REPLACE FUNCTION process_daily_accrual(p_target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance RECORD;
  v_previous_vacation DECIMAL(8,3);
  v_previous_sick DECIMAL(8,3);
  v_accrual_amount DECIMAL(8,3);
  v_days_to_process INTEGER;
  v_current_date DATE;
  v_had_fixed_cap_leave BOOLEAN;
BEGIN
  -- Process each user's balance
  FOR v_balance IN SELECT id, user_id, vacation_leave_balance, sick_leave_balance, 
                          daily_accrual_rate, last_accrual_date, total_accrued_days
                   FROM public.user_leave_balances
  LOOP
    -- Calculate days to process
    v_days_to_process := p_target_date - v_balance.last_accrual_date;
    
    IF v_days_to_process <= 0 THEN
      CONTINUE;
    END IF;
    
    -- Check if user had any fixed-cap leave during this period
    SELECT EXISTS(
      SELECT 1 FROM public.leave_requests lr
      WHERE lr.user_id = v_balance.user_id
        AND lr.status = 'Approved'
        AND lr.details->>'leave_type' IN ('Mandatory/Forced Leave', 'Special Privilege Leave', 'Wellness Leave')
        AND (
          (lr.details->>'start_date')::DATE <= p_target_date
          AND (lr.details->>'end_date')::DATE >= v_balance.last_accrual_date
        )
    ) INTO v_had_fixed_cap_leave;
    
    -- Only accrue if no fixed-cap leave was used
    IF NOT v_had_fixed_cap_leave THEN
      v_accrual_amount := v_balance.daily_accrual_rate * v_days_to_process;
      
      -- Store previous balances
      v_previous_vacation := v_balance.vacation_leave_balance;
      v_previous_sick := v_balance.sick_leave_balance;
      
      -- Update vacation leave balance
      UPDATE public.user_leave_balances
      SET 
        vacation_leave_balance = vacation_leave_balance + v_accrual_amount,
        sick_leave_balance = sick_leave_balance + v_accrual_amount,
        last_accrual_date = p_target_date,
        total_accrued_days = total_accrued_days + v_accrual_amount
      WHERE id = v_balance.id;
      
      -- Log vacation accrual transaction
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_balance.user_id, v_balance.id, 'accrual', 'vacation_leave',
        v_previous_vacation, v_accrual_amount, v_previous_vacation + v_accrual_amount,
        'Daily passive accrual (' || v_days_to_process || ' days)', 'system'
      );
      
      -- Log sick accrual transaction
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_balance.user_id, v_balance.id, 'accrual', 'sick_leave',
        v_previous_sick, v_accrual_amount, v_previous_sick + v_accrual_amount,
        'Daily passive accrual (' || v_days_to_process || ' days)', 'system'
      );
    ELSE
      -- Just update the last accrual date without accruing
      UPDATE public.user_leave_balances
      SET last_accrual_date = p_target_date
      WHERE id = v_balance.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- Function: Initialize leave balance for new users
-- =========================================================
CREATE OR REPLACE FUNCTION initialize_user_leave_balance(p_user_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_id UUID;
BEGIN
  -- Check if balance already exists
  SELECT id INTO v_balance_id
  FROM public.user_leave_balances
  WHERE user_id = p_user_id;
  
  IF v_balance_id IS NOT NULL THEN
    RETURN v_balance_id;
  END IF;
  
  -- Create new balance record
  INSERT INTO public.user_leave_balances (user_id)
  VALUES (p_user_id)
  RETURNING id INTO v_balance_id;
  
  -- Log initialization transactions
  INSERT INTO public.leave_balance_transactions (
    user_id, balance_id, transaction_type, leave_type,
    previous_balance, amount_change, new_balance,
    reason, created_by
  ) VALUES 
    (p_user_id, v_balance_id, 'adjustment', 'forced_leave', 0, 5, 5, 'Initial balance setup', 'system'),
    (p_user_id, v_balance_id, 'adjustment', 'special_leave', 0, 3, 3, 'Initial balance setup', 'system'),
    (p_user_id, v_balance_id, 'adjustment', 'wellness_leave', 0, 5, 5, 'Initial balance setup', 'system'),
    (p_user_id, v_balance_id, 'adjustment', 'vacation_leave', 0, 0, 0, 'Initial balance setup', 'system'),
    (p_user_id, v_balance_id, 'adjustment', 'sick_leave', 0, 0, 0, 'Initial balance setup', 'system');
  
  RETURN v_balance_id;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- Function: Manual balance adjustment (admin function)
-- =========================================================
CREATE OR REPLACE FUNCTION adjust_leave_balance(
  p_user_id UUID,
  p_leave_type TEXT,
  p_amount DECIMAL(8,3),
  p_reason TEXT,
  p_admin_email TEXT
) RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_id UUID;
  v_previous_balance DECIMAL(8,3);
  v_new_balance DECIMAL(8,3);
  v_column_name TEXT;
BEGIN
  -- Get or create balance record
  SELECT id INTO v_balance_id
  FROM public.user_leave_balances
  WHERE user_id = p_user_id;
  
  IF v_balance_id IS NULL THEN
    v_balance_id := initialize_user_leave_balance(p_user_id);
  END IF;
  
  -- Map leave type to column name
  v_column_name := CASE p_leave_type
    WHEN 'forced_leave' THEN 'forced_leave_balance'
    WHEN 'special_leave' THEN 'special_leave_balance'
    WHEN 'wellness_leave' THEN 'wellness_leave_balance'
    WHEN 'vacation_leave' THEN 'vacation_leave_balance'
    WHEN 'sick_leave' THEN 'sick_leave_balance'
    ELSE NULL
  END;
  
  IF v_column_name IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid leave type');
  END IF;
  
  -- Get current balance
  EXECUTE format('SELECT %I FROM public.user_leave_balances WHERE id = $1', v_column_name)
  INTO v_previous_balance
  USING v_balance_id;
  
  -- Calculate new balance
  v_new_balance := GREATEST(0, v_previous_balance + p_amount);
  
  -- Update balance
  EXECUTE format('UPDATE public.user_leave_balances SET %I = $1 WHERE id = $2', v_column_name)
  USING v_new_balance, v_balance_id;
  
  -- Log transaction
  INSERT INTO public.leave_balance_transactions (
    user_id, balance_id, transaction_type, leave_type,
    previous_balance, amount_change, new_balance,
    reason, created_by
  ) VALUES (
    p_user_id, v_balance_id, 'adjustment', p_leave_type,
    v_previous_balance, p_amount, v_new_balance,
    p_reason, p_admin_email
  );
  
  RETURN json_build_object(
    'success', true,
    'previous_balance', v_previous_balance,
    'amount_change', p_amount,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- Function: Get user leave balance summary
-- =========================================================
CREATE OR REPLACE FUNCTION get_user_leave_balance_summary(p_user_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance RECORD;
  v_balance_id UUID;
  v_summary JSON;
BEGIN
  -- Get or create balance
  SELECT * INTO v_balance
  FROM public.user_leave_balances
  WHERE user_id = p_user_id;
  
  IF v_balance IS NULL THEN
    -- Initialize and return default
    v_balance_id := initialize_user_leave_balance(p_user_id);
    SELECT * INTO v_balance
    FROM public.user_leave_balances
    WHERE id = v_balance_id;
  END IF;
  
  -- Build summary
  SELECT json_build_object(
    'user_id', v_balance.user_id,
    'forced_leave', json_build_object(
      'balance', v_balance.forced_leave_balance,
      'max', 5.00,
      'remaining', v_balance.forced_leave_balance,
      'last_reset', v_balance.last_reset_date
    ),
    'special_leave', json_build_object(
      'balance', v_balance.special_leave_balance,
      'max', 3.00,
      'remaining', v_balance.special_leave_balance,
      'last_reset', v_balance.last_reset_date
    ),
    'wellness_leave', json_build_object(
      'balance', v_balance.wellness_leave_balance,
      'max', 5.00,
      'remaining', v_balance.wellness_leave_balance,
      'last_reset', v_balance.last_reset_date
    ),
    'vacation_leave', json_build_object(
      'balance', ROUND(v_balance.vacation_leave_balance::NUMERIC, 2),
      'accrual_rate', v_balance.daily_accrual_rate,
      'total_accrued', ROUND(v_balance.total_accrued_days::NUMERIC, 2),
      'last_accrual', v_balance.last_accrual_date
    ),
    'sick_leave', json_build_object(
      'balance', ROUND(v_balance.sick_leave_balance::NUMERIC, 2),
      'accrual_rate', v_balance.daily_accrual_rate,
      'total_accrued', ROUND(v_balance.total_accrued_days::NUMERIC, 2),
      'last_accrual', v_balance.last_accrual_date
    ),
    'reset_cycle_count', v_balance.reset_cycle_count,
    'updated_at', v_balance.updated_at
  ) INTO v_summary;
  
  RETURN v_summary;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Verify functions were created
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'deduct_leave_on_approval',
    'reset_fixed_cap_leaves',
    'process_daily_accrual',
    'initialize_user_leave_balance',
    'adjust_leave_balance',
    'get_user_leave_balance_summary'
  )
ORDER BY routine_name;
