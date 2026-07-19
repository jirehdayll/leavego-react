-- =========================================================
-- Reset All Vacation and Sick Leave Balances to Zero
-- =========================================================
-- This migration sets all existing vacation and sick leave
-- balances to 0 while preserving fixed-cap leave balances.
-- 
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

-- Update all existing leave balances to set vacation and sick to 0
UPDATE public.user_leave_balances
SET 
  vacation_leave_balance = 0.000,
  sick_leave_balance = 0.000,
  updated_at = NOW();

-- Log the reset transactions for audit trail
INSERT INTO public.leave_balance_transactions (
  user_id, 
  balance_id, 
  transaction_type, 
  leave_type,
  previous_balance, 
  amount_change, 
  new_balance,
  reason, 
  created_by
)
SELECT 
  user_id,
  id,
  'adjustment',
  'vacation_leave',
  vacation_leave_balance,  -- This will be the value before update (but we're setting to 0)
  -vacation_leave_balance,  -- Negative of current to bring to 0
  0,
  'System reset: Setting all vacation leave to 0',
  'system'
FROM public.user_leave_balances
WHERE vacation_leave_balance != 0;

INSERT INTO public.leave_balance_transactions (
  user_id, 
  balance_id, 
  transaction_type, 
  leave_type,
  previous_balance, 
  amount_change, 
  new_balance,
  reason, 
  created_by
)
SELECT 
  user_id,
  id,
  'adjustment',
  'sick_leave',
  sick_leave_balance,  -- This will be the value before update
  -sick_leave_balance,  -- Negative of current to bring to 0
  0,
  'System reset: Setting all sick leave to 0',
  'system'
FROM public.user_leave_balances
WHERE sick_leave_balance != 0;

-- Verify the update
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE vacation_leave_balance = 0) as users_with_zero_vacation,
  COUNT(*) FILTER (WHERE sick_leave_balance = 0) as users_with_zero_sick,
  ROUND(AVG(vacation_leave_balance)::NUMERIC, 3) as avg_vacation,
  ROUND(AVG(sick_leave_balance)::NUMERIC, 3) as avg_sick
FROM public.user_leave_balances;

COMMIT;
