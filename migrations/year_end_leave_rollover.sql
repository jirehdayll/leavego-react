-- =========================================================
-- Year-End Leave Rollover and Conversion System
-- =========================================================
-- This migration implements the yearly leave rollover system.
-- At year-end, unspent credits from Forced, Special, and Wellness leaves
-- are converted and transferred to Vacation and Sick leave balances.
--
-- Rules:
-- 1. Integer only - no decimals anywhere
-- 2. Base defaults: Vacation 0, Sick 0, Forced 5, Special 3, Wellness 5
-- 3. New accounts get these base defaults
-- 4. Year-end rollover: Total Leftover = Unspent Forced + Unspent Special + Unspent Wellness
-- 5. Add Total Leftover to BOTH vacation and sick leave balances
-- 6. Reset fixed categories back to base values
-- 7. Processes ALL accounts (including newly created, inactive, and accounts with no application history)
-- 8. Logs rollover transactions for ALL accounts, even those with 0 credits
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

-- =========================================================
-- Function: Process Yearly Leave Rollover
-- =========================================================
CREATE OR REPLACE FUNCTION process_yearly_leave_rollover()
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_balance_id UUID;
  v_total_leftover INTEGER;
  v_previous_vacation INTEGER;
  v_previous_sick INTEGER;
  v_previous_forced INTEGER;
  v_previous_special INTEGER;
  v_previous_wellness INTEGER;
  v_new_vacation INTEGER;
  v_new_sick INTEGER;
BEGIN
  -- Iterate through every user (including newly created and inactive accounts)
  FOR v_user IN SELECT id FROM auth.users
  LOOP
    -- Check if balance record exists, create if not
    SELECT id INTO v_balance_id
    FROM public.user_leave_balances
    WHERE user_id = v_user.id;
    
    IF v_balance_id IS NULL THEN
      -- Initialize balance for this user with base defaults
      INSERT INTO public.user_leave_balances (user_id, vacation_leave_balance, sick_leave_balance, forced_leave_balance, special_leave_balance, wellness_leave_balance)
      VALUES (v_user.id, 0, 0, 5, 3, 5)
      RETURNING id INTO v_balance_id;
      
      -- Log initialization transactions
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES 
        (v_user.id, v_balance_id, 'adjustment', 'forced_leave', 0, 5, 5, 'Initial balance setup', 'system'),
        (v_user.id, v_balance_id, 'adjustment', 'special_leave', 0, 3, 3, 'Initial balance setup', 'system'),
        (v_user.id, v_balance_id, 'adjustment', 'wellness_leave', 0, 5, 5, 'Initial balance setup', 'system'),
        (v_user.id, v_balance_id, 'adjustment', 'vacation_leave', 0, 0, 0, 'Initial balance setup', 'system'),
        (v_user.id, v_balance_id, 'adjustment', 'sick_leave', 0, 0, 0, 'Initial balance setup', 'system');
    END IF;
    
    -- Get current balances (all as integers, using COALESCE for safety)
    SELECT 
      COALESCE(forced_leave_balance::INTEGER, 0),
      COALESCE(special_leave_balance::INTEGER, 0),
      COALESCE(wellness_leave_balance::INTEGER, 0),
      COALESCE(vacation_leave_balance::INTEGER, 0),
      COALESCE(sick_leave_balance::INTEGER, 0)
    INTO 
      v_previous_forced,
      v_previous_special,
      v_previous_wellness,
      v_previous_vacation,
      v_previous_sick
    FROM public.user_leave_balances
    WHERE id = v_balance_id;
    
    -- Calculate Total Leftover = Unspent Forced + Unspent Special + Unspent Wellness
    v_total_leftover := v_previous_forced + v_previous_special + v_previous_wellness;
    
    -- Calculate new balances
    -- Add Total Leftover to BOTH vacation and sick leave
    v_new_vacation := v_previous_vacation + v_total_leftover;
    v_new_sick := v_previous_sick + v_total_leftover;
    
    -- Update balances
    UPDATE public.user_leave_balances
    SET 
      -- Add rollover amount to vacation and sick leaves
      vacation_leave_balance = v_new_vacation,
      sick_leave_balance = v_new_sick,
      
      -- Reset fixed-cap leaves back to base values
      forced_leave_balance = 5,
      special_leave_balance = 3,
      wellness_leave_balance = 5,
      
      -- Update reset trackers
      last_reset_date = CURRENT_DATE,
      reset_cycle_count = reset_cycle_count + 1
    WHERE id = v_balance_id;
    
    -- Log rollover transactions (even if 0, to track that rollover was processed)
    -- Log vacation rollover
    INSERT INTO public.leave_balance_transactions (
      user_id, balance_id, transaction_type, leave_type,
      previous_balance, amount_change, new_balance,
      reason, created_by
    ) VALUES (
      v_user.id, v_balance_id, 'rollover', 'vacation_leave',
      v_previous_vacation, v_total_leftover, v_new_vacation,
      'Year-end conversion of unspent Wellness/Forced/Special leaves', 'system'
    );
    
    -- Log sick rollover
    INSERT INTO public.leave_balance_transactions (
      user_id, balance_id, transaction_type, leave_type,
      previous_balance, amount_change, new_balance,
      reason, created_by
    ) VALUES (
      v_user.id, v_balance_id, 'rollover', 'sick_leave',
      v_previous_sick, v_total_leftover, v_new_sick,
      'Year-end conversion of unspent Wellness/Forced/Special leaves', 'system'
    );
    
    -- Log reset transactions for fixed-cap leaves
    IF v_previous_forced <> 5 THEN
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_user.id, v_balance_id, 'reset', 'forced_leave',
        v_previous_forced, 5 - v_previous_forced, 5,
        'Year-end reset to base value', 'system'
      );
    END IF;
    
    IF v_previous_special <> 3 THEN
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_user.id, v_balance_id, 'reset', 'special_leave',
        v_previous_special, 3 - v_previous_special, 3,
        'Year-end reset to base value', 'system'
      );
    END IF;
    
    IF v_previous_wellness <> 5 THEN
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_user.id, v_balance_id, 'reset', 'wellness_leave',
        v_previous_wellness, 5 - v_previous_wellness, 5,
        'Year-end reset to base value', 'system'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.process_yearly_leave_rollover() TO authenticated;

-- Verify function was created
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'process_yearly_leave_rollover';

COMMIT;
