-- =========================================================
-- Update Yearly Leave Rollover to Handle New/Empty Accounts
-- =========================================================
-- This migration updates the yearly_leave_rollover() function to:
-- 1. Include auth users who don't have leave balance records yet
-- 2. Initialize accounts with zero/null balances with correct defaults
-- 3. Apply rollover calculations to all accounts consistently
-- =========================================================

BEGIN;

-- Create improved yearly rollover function that handles new/empty accounts
CREATE OR REPLACE FUNCTION yearly_leave_rollover()
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance RECORD;
  v_auth_user RECORD;
  v_remaining_total DECIMAL(8,3);
  v_rollover_amount DECIMAL(8,3);
  v_previous_vacation DECIMAL(8,3);
  v_previous_sick DECIMAL(8,3);
  v_previous_forced DECIMAL(8,3);
  v_previous_special DECIMAL(8,3);
  v_previous_wellness DECIMAL(8,3);
  v_balance_id UUID;
BEGIN
  -- Step 1: Find auth users who don't have leave balance records and initialize them
  FOR v_auth_user IN SELECT id FROM auth.users
  LOOP
    -- Check if user already has a balance record
    SELECT id INTO v_balance_id
    FROM public.user_leave_balances
    WHERE user_id = v_auth_user.id;
    
    -- If no balance record exists, initialize one
    IF v_balance_id IS NULL THEN
      v_balance_id := initialize_user_leave_balance(v_auth_user.id);
      RAISE NOTICE 'Initialized leave balance for new user: %', v_auth_user.id;
    END IF;
  END LOOP;

  -- Step 2: Process yearly rollover for all balance records
  FOR v_balance IN SELECT id, user_id, 
                          forced_leave_balance, special_leave_balance, wellness_leave_balance,
                          vacation_leave_balance, sick_leave_balance
                   FROM public.user_leave_balances
  LOOP
    -- Store previous balances for logging
    v_previous_forced := COALESCE(v_balance.forced_leave_balance, 0);
    v_previous_special := COALESCE(v_balance.special_leave_balance, 0);
    v_previous_wellness := COALESCE(v_balance.wellness_leave_balance, 0);
    v_previous_vacation := COALESCE(v_balance.vacation_leave_balance, 0);
    v_previous_sick := COALESCE(v_balance.sick_leave_balance, 0);

    -- Calculate total remaining fixed-cap leaves
    v_remaining_total := v_previous_forced + v_previous_special + v_previous_wellness;

    -- Split 50/50 for vacation and sick leave
    v_rollover_amount := v_remaining_total / 2;

    -- Update balances
    UPDATE public.user_leave_balances
    SET 
      -- Add rollover amount to vacation and sick leaves (convert to integer/whole number)
      vacation_leave_balance = ROUND(vacation_leave_balance + v_rollover_amount),
      sick_leave_balance = ROUND(sick_leave_balance + v_rollover_amount),
      
      -- Reset fixed-cap leaves back to maximums
      forced_leave_balance = 5.00,
      special_leave_balance = 3.00,
      wellness_leave_balance = 5.00,
      
      -- Update reset trackers
      last_reset_date = CURRENT_DATE,
      reset_cycle_count = COALESCE(reset_cycle_count, 0) + 1
    WHERE id = v_balance.id;

    -- Log transaction: Rollover to Vacation
    IF v_rollover_amount > 0 THEN
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_balance.user_id, v_balance.id, 'accrual', 'vacation_leave',
        v_previous_vacation, ROUND(v_rollover_amount), ROUND(v_previous_vacation + v_rollover_amount),
        'Yearly rollover from unused leaves', 'system'
      );
      
      -- Log transaction: Rollover to Sick
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_balance.user_id, v_balance.id, 'accrual', 'sick_leave',
        v_previous_sick, ROUND(v_rollover_amount), ROUND(v_previous_sick + v_rollover_amount),
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
        v_balance.user_id, v_balance.id, 'reset', 'forced_leave',
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
        v_balance.user_id, v_balance.id, 'reset', 'special_leave',
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
        v_balance.user_id, v_balance.id, 'reset', 'wellness_leave',
        v_previous_wellness, 5.00 - v_previous_wellness, 5.00,
        'Yearly reset to maximum', 'system'
      );
    END IF;
    
    RAISE NOTICE 'Processed yearly rollover for user: %, rollover amount: %', 
      v_balance.user_id, v_rollover_amount;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add a helper function to ensure all auth users have balance records
CREATE OR REPLACE FUNCTION ensure_all_users_have_balances()
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user RECORD;
  v_balance_id UUID;
BEGIN
  FOR v_auth_user IN SELECT id FROM auth.users
  LOOP
    SELECT id INTO v_balance_id
    FROM public.user_leave_balances
    WHERE user_id = v_auth_user.id;
    
    IF v_balance_id IS NULL THEN
      v_balance_id := initialize_user_leave_balance(v_auth_user.id);
      RAISE NOTICE 'Ensured balance record exists for user: %', v_auth_user.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMIT;
