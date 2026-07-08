-- =========================================================
-- Remove Default 10-day Balances & Implement Yearly Rollover
-- =========================================================

BEGIN;

-- 1. Update the table schema to default to 0 for vacation and sick leave
ALTER TABLE public.user_leave_balances
ALTER COLUMN vacation_leave_balance SET DEFAULT 0.000,
ALTER COLUMN sick_leave_balance SET DEFAULT 0.000;

-- 2. Reset existing 10-day balances to 0 for all users
UPDATE public.user_leave_balances
SET 
  vacation_leave_balance = 0.000,
  sick_leave_balance = 0.000,
  updated_at = NOW()
WHERE 
  vacation_leave_balance = 10.000 
  AND sick_leave_balance = 10.000;

-- 3. Update the initialization function to use 0
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
  
  -- Create new balance record (vacation and sick will default to 0 per table schema)
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

-- 4. Create Yearly Rollover Function
CREATE OR REPLACE FUNCTION yearly_leave_rollover()
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance RECORD;
  v_remaining_total DECIMAL(8,3);
  v_rollover_amount DECIMAL(8,3);
  v_previous_vacation DECIMAL(8,3);
  v_previous_sick DECIMAL(8,3);
  v_previous_forced DECIMAL(8,3);
  v_previous_special DECIMAL(8,3);
  v_previous_wellness DECIMAL(8,3);
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

    -- Update balances
    UPDATE public.user_leave_balances
    SET 
      -- Add rollover amount to vacation and sick leaves
      vacation_leave_balance = vacation_leave_balance + v_rollover_amount,
      sick_leave_balance = sick_leave_balance + v_rollover_amount,
      
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
        v_previous_vacation, v_rollover_amount, v_previous_vacation + v_rollover_amount,
        'Yearly rollover from unused leaves', 'system'
      );
      
      -- Log transaction: Rollover to Sick
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_balance.user_id, v_balance.id, 'accrual', 'sick_leave',
        v_previous_sick, v_rollover_amount, v_previous_sick + v_rollover_amount,
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

-- 5. Set up cron for yearly rollover (Optional, requires pg_cron extension)
-- Uncomment the following line if pg_cron is enabled to run on Jan 1st every year
-- SELECT cron.schedule('yearly-rollover', '0 0 1 1 *', 'SELECT yearly_leave_rollover()');

COMMIT;
