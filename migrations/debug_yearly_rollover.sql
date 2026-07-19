-- =========================================================
-- Debug Yearly Rollover Function
-- =========================================================
-- This script helps debug the yearly rollover function to see
-- which accounts are being processed and what their balances are.
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

-- Check which accounts exist
SELECT 
  id,
  email,
  full_name,
  is_active,
  created_at
FROM public.app_accounts
ORDER BY created_at DESC;

-- Check which accounts have balance records
SELECT 
  aa.id,
  aa.email,
  aa.full_name,
  ulb.id as balance_id,
  ulb.vacation_leave_balance,
  ulb.sick_leave_balance,
  ulb.forced_leave_balance,
  ulb.special_leave_balance,
  ulb.wellness_leave_balance,
  ulb.last_reset_date,
  ulb.reset_cycle_count
FROM public.app_accounts aa
LEFT JOIN public.user_leave_balances ulb ON aa.id = ulb.user_id
ORDER BY aa.created_at DESC;

-- Check recent rollover transactions
SELECT 
  lbt.user_id,
  aa.email,
  aa.full_name,
  lbt.transaction_type,
  lbt.leave_type,
  lbt.previous_balance,
  lbt.amount_change,
  lbt.new_balance,
  lbt.reason,
  lbt.created_at
FROM public.leave_balance_transactions lbt
JOIN public.app_accounts aa ON lbt.user_id = aa.id
WHERE lbt.transaction_type = 'rollover'
ORDER BY lbt.created_at DESC
LIMIT 20;

-- Check recent reset transactions
SELECT 
  lbt.user_id,
  aa.email,
  aa.full_name,
  lbt.transaction_type,
  lbt.leave_type,
  lbt.previous_balance,
  lbt.amount_change,
  lbt.new_balance,
  lbt.reason,
  lbt.created_at
FROM public.leave_balance_transactions lbt
JOIN public.app_accounts aa ON lbt.user_id = aa.id
WHERE lbt.transaction_type = 'reset'
ORDER BY lbt.created_at DESC
LIMIT 20;

-- Test the function on a single account first
DO $$
DECLARE
  v_test_user_id UUID := (SELECT id FROM public.app_accounts LIMIT 1);
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
  RAISE NOTICE 'Testing rollover for user: %', v_test_user_id;
  
  -- Get or create balance
  SELECT id INTO v_balance_id
  FROM public.user_leave_balances
  WHERE user_id = v_test_user_id;
  
  IF v_balance_id IS NULL THEN
    RAISE NOTICE 'Creating balance record for user';
    INSERT INTO public.user_leave_balances (user_id)
    VALUES (v_test_user_id)
    RETURNING id INTO v_balance_id;
    
    UPDATE public.user_leave_balances
    SET 
      vacation_leave_balance = 0,
      sick_leave_balance = 0,
      forced_leave_balance = 5,
      special_leave_balance = 3,
      wellness_leave_balance = 5
    WHERE id = v_balance_id;
  END IF;
  
  -- Get current balances
  SELECT 
    forced_leave_balance::INTEGER,
    special_leave_balance::INTEGER,
    wellness_leave_balance::INTEGER,
    vacation_leave_balance::INTEGER,
    sick_leave_balance::INTEGER
  INTO 
    v_previous_forced,
    v_previous_special,
    v_previous_wellness,
    v_previous_vacation,
    v_previous_sick
  FROM public.user_leave_balances
  WHERE id = v_balance_id;
  
  RAISE NOTICE 'Current balances - Forced: %, Special: %, Wellness: %, Vacation: %, Sick: %',
    v_previous_forced, v_previous_special, v_previous_wellness, v_previous_vacation, v_previous_sick;
  
  -- Calculate rollover
  v_total_leftover := v_previous_forced + v_previous_special + v_previous_wellness;
  v_new_vacation := v_previous_vacation + v_total_leftover;
  v_new_sick := v_previous_sick + v_total_leftover;
  
  RAISE NOTICE 'Total leftover: %, New vacation: %, New sick: %',
    v_total_leftover, v_new_vacation, v_new_sick;
  
  -- Update balances
  UPDATE public.user_leave_balances
  SET 
    vacation_leave_balance = v_new_vacation,
    sick_leave_balance = v_new_sick,
    forced_leave_balance = 5,
    special_leave_balance = 3,
    wellness_leave_balance = 5,
    last_reset_date = CURRENT_DATE,
    reset_cycle_count = reset_cycle_count + 1
  WHERE id = v_balance_id;
  
  RAISE NOTICE 'Rollover test completed successfully';
END $$;
