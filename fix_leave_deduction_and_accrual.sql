-- =========================================================
-- Fix Leave Balance Deduction and Daily Accrual
-- =========================================================

BEGIN;

-- 1. Update deduct_leave_on_approval to properly read num_days
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

  -- Get leave type
  v_leave_type := NEW.details->>'leave_type';
  -- Fix: Check both num_days and number_of_days to ensure it catches the frontend format
  v_num_days := COALESCE(NEW.details->>'num_days', NEW.details->>'number_of_days')::DECIMAL(8,3);

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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 2. Update daily passive accrual to add exactly 1.0 day instead of the fractional daily_accrual_rate
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
  FOR v_balance IN SELECT id, user_id, vacation_leave_balance, sick_leave_balance, 
                          daily_accrual_rate, last_accrual_date, total_accrued_days
                   FROM public.user_leave_balances
  LOOP
    v_days_to_process := p_target_date - v_balance.last_accrual_date;
    
    IF v_days_to_process <= 0 THEN
      CONTINUE;
    END IF;
    
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
    
    IF NOT v_had_fixed_cap_leave THEN
      -- Fix: Use 1.0 day per days processed instead of fractional daily_accrual_rate
      v_accrual_amount := 1.0 * v_days_to_process;
      
      v_previous_vacation := v_balance.vacation_leave_balance;
      v_previous_sick := v_balance.sick_leave_balance;
      
      UPDATE public.user_leave_balances
      SET 
        vacation_leave_balance = vacation_leave_balance + v_accrual_amount,
        sick_leave_balance = sick_leave_balance + v_accrual_amount,
        last_accrual_date = p_target_date,
        total_accrued_days = total_accrued_days + v_accrual_amount
      WHERE id = v_balance.id;
      
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_balance.user_id, v_balance.id, 'accrual', 'vacation_leave',
        v_previous_vacation, v_accrual_amount, v_previous_vacation + v_accrual_amount,
        'Daily passive accrual (+1 day)', 'system'
      );
      
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_balance.user_id, v_balance.id, 'accrual', 'sick_leave',
        v_previous_sick, v_accrual_amount, v_previous_sick + v_accrual_amount,
        'Daily passive accrual (+1 day)', 'system'
      );
    ELSE
      UPDATE public.user_leave_balances
      SET last_accrual_date = p_target_date
      WHERE id = v_balance.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- 3. Set up cron for 11:59PM daily (Requires pg_cron extension enabled in Supabase)
-- NOTE: If pg_cron is enabled, uncomment the following line to schedule it:
-- SELECT cron.schedule('daily-accrual', '59 23 * * *', 'SELECT process_daily_accrual()');
