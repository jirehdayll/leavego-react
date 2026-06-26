-- =========================================================
-- Add Initial Vacation and Sick Leave Balance
-- =========================================================
-- This migration adds 10 days to vacation leave and 10 days to sick leave
-- for all existing users. This is a one-time initial balance setup.
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

-- Add 10 days to vacation and sick leave for all users
UPDATE public.user_leave_balances
SET 
  vacation_leave_balance = vacation_leave_balance + 10.0,
  sick_leave_balance = sick_leave_balance + 10.0,
  updated_at = NOW();

-- Log the adjustment for each user
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
  ulb.user_id,
  ulb.id,
  'adjustment',
  'vacation_leave',
  ulb.vacation_leave_balance - 10.0,
  10.0,
  ulb.vacation_leave_balance,
  'Initial balance setup: Added 10 days',
  'system'
FROM public.user_leave_balances ulb;

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
  ulb.user_id,
  ulb.id,
  'adjustment',
  'sick_leave',
  ulb.sick_leave_balance - 10.0,
  10.0,
  ulb.sick_leave_balance,
  'Initial balance setup: Added 10 days',
  'system'
FROM public.user_leave_balances ulb;

COMMIT;

-- Verify the update
SELECT 
  u.email,
  u.full_name,
  ROUND(ulb.vacation_leave_balance::NUMERIC, 2) as vacation_leave_balance,
  ROUND(ulb.sick_leave_balance::NUMERIC, 2) as sick_leave_balance,
  ulb.updated_at
FROM public.user_leave_balances ulb
JOIN public.app_accounts u ON ulb.user_id = u.id
ORDER BY u.full_name;
