-- =========================================================
-- Add Yearly Leave Rollover Function
-- =========================================================
-- This migration adds the yearly_leave_rollover function if it's missing.
-- This function resets fixed-cap leaves and transfers unused balance to vacation/sick leave.
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

-- Create Yearly Rollover Function
CREATE OR REPLACE FUNCTION yearly_leave_rollover()
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance RECORD;
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
  -- Iterate through every user's balance
  FOR v_balance IN SELECT id, user_id, 
                          forced_leave_balance, special_leave_balance, wellness_leave_balance,
                          vacation_leave_balance, sick_leave_balance
                   FROM public.user_leave_balances
  LOOP
    -- Store previous balances for logging
    v_previous_forced := v_balance.forced_leave_balance;
    v_previous_special := v_balance.special_leave_balance;
    v_previous_wellness := v_balance.wellness_leave_balance;
    v_previous_vacation := v_balance.vacation_leave_balance;
    v_previous_sick := v_balance.sick_leave_balance;

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
    WHERE id = v_balance.id;

    -- Log transaction: Rollover to Vacation
    IF v_rollover_amount > 0 THEN
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_balance.user_id, v_balance.id, 'accrual', 'vacation_leave',
        v_previous_vacation::DECIMAL(8,3), v_rollover_amount, v_new_vacation::DECIMAL(8,3),
        'Yearly rollover from unused leaves', 'system'
      );
      
      -- Log transaction: Rollover to Sick
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_balance.user_id, v_balance.id, 'accrual', 'sick_leave',
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
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.yearly_leave_rollover() TO authenticated;

-- Verify function was created
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'yearly_leave_rollover';

COMMIT;
