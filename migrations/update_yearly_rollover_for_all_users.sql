-- =========================================================
-- Update Yearly Rollover to Handle All Users
-- =========================================================
-- This migration updates the yearly_leave_rollover function to ensure
-- all users (including those without balance records) are processed.
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

-- Update Yearly Rollover Function to handle all users
CREATE OR REPLACE FUNCTION yearly_leave_rollover()
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_balance_id UUID;
  v_remaining_total DECIMAL(8,3);
  v_rollover_amount DECIMAL(8,3);
  v_previous_vacation INTEGER;
  v_previous_sick INTEGER;
  v_previous_forced DECIMAL(8,3);
  v_previous_special DECIMAL(8,3);
  v_previous_wellness DECIMAL(8,3);
  v_new_vacation INTEGER;
  v_new_sick INTEGER;
BEGIN
  -- Iterate through every user in app_accounts
  FOR v_user IN SELECT id FROM public.app_accounts WHERE is_active = true
  LOOP
    -- Check if balance record exists, create if not
    SELECT id INTO v_balance_id
    FROM public.user_leave_balances
    WHERE user_id = v_user.id;
    
    IF v_balance_id IS NULL THEN
      -- Initialize balance for this user
      v_balance_id := initialize_user_leave_balance(v_user.id);
    END IF;
    
    -- Get current balances
    SELECT 
      forced_leave_balance, 
      special_leave_balance, 
      wellness_leave_balance,
      vacation_leave_balance, 
      sick_leave_balance
    INTO 
      v_previous_forced, 
      v_previous_special, 
      v_previous_wellness,
      v_previous_vacation, 
      v_previous_sick
    FROM public.user_leave_balances
    WHERE id = v_balance_id;

    -- Calculate total remaining fixed-cap leaves
    v_remaining_total := COALESCE(v_previous_forced, 0) + COALESCE(v_previous_special, 0) + COALESCE(v_previous_wellness, 0);

    -- Split 50/50 for vacation and sick leave
    v_rollover_amount := v_remaining_total / 2;

    -- Calculate new balances (round to nearest integer)
    v_new_vacation := ROUND(v_previous_vacation + v_rollover_amount);
    v_new_sick := ROUND(v_previous_sick + v_rollover_amount);

    -- Update balances
    UPDATE public.user_leave_balances
    SET 
      -- Add rollover amount to vacation and sick leaves (as integers)
      vacation_leave_balance = v_new_vacation,
      sick_leave_balance = v_new_sick,
      
      -- Reset fixed-cap leaves back to maximums
      forced_leave_balance = 5.00,
      special_leave_balance = 3.00,
      wellness_leave_balance = 5.00,
      
      -- Update reset trackers
      last_reset_date = CURRENT_DATE,
      reset_cycle_count = reset_cycle_count + 1
    WHERE id = v_balance_id;

    -- Log transaction: Rollover to Vacation
    IF v_rollover_amount > 0 THEN
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_user.id, v_balance_id, 'accrual', 'vacation_leave',
        v_previous_vacation::DECIMAL(8,3), v_rollover_amount, v_new_vacation::DECIMAL(8,3),
        'Yearly rollover from unused leaves', 'system'
      );
      
      -- Log transaction: Rollover to Sick
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_user.id, v_balance_id, 'accrual', 'sick_leave',
        v_previous_sick::DECIMAL(8,3), v_rollover_amount, v_new_sick::DECIMAL(8,3),
        'Yearly rollover from unused leaves', 'system'
      );
    END IF;

    -- Log transaction: Reset Forced
    IF v_previous_forced <> 5.00 THEN
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_user.id, v_balance_id, 'reset', 'forced_leave',
        v_previous_forced, 5.00 - v_previous_forced, 5.00,
        'Yearly reset to maximum', 'system'
      );
    END IF;

    -- Log transaction: Reset Special
    IF v_previous_special <> 3.00 THEN
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_user.id, v_balance_id, 'reset', 'special_leave',
        v_previous_special, 3.00 - v_previous_special, 3.00,
        'Yearly reset to maximum', 'system'
      );
    END IF;

    -- Log transaction: Reset Wellness
    IF v_previous_wellness <> 5.00 THEN
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_user.id, v_balance_id, 'reset', 'wellness_leave',
        v_previous_wellness, 5.00 - v_previous_wellness, 5.00,
        'Yearly reset to maximum', 'system'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMIT;
