-- =========================================================
-- Ensure All Accounts Have Leave Balance Records
-- =========================================================
-- This migration ensures that ALL accounts in app_accounts have
-- corresponding leave balance records, so they will be included
-- in the yearly rollover process.
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

-- Create balance records for any accounts that don't have them
INSERT INTO public.user_leave_balances (user_id)
SELECT id FROM public.app_accounts
WHERE id NOT IN (SELECT user_id FROM public.user_leave_balances);

-- Initialize balances for the newly created records
UPDATE public.user_leave_balances
SET 
  vacation_leave_balance = 0,
  sick_leave_balance = 0,
  forced_leave_balance = 5,
  special_leave_balance = 3,
  wellness_leave_balance = 5
WHERE vacation_leave_balance IS NULL OR sick_leave_balance IS NULL;

-- Log initialization transactions for these accounts
INSERT INTO public.leave_balance_transactions (
  user_id, balance_id, transaction_type, leave_type,
  previous_balance, amount_change, new_balance,
  reason, created_by
)
SELECT 
  ulb.user_id,
  ulb.id,
  'adjustment',
  'forced_leave',
  0,
  5,
  5,
  'Ensured account has balance record for yearly rollover',
  'system'
FROM public.user_leave_balances ulb
WHERE ulb.created_at > NOW() - INTERVAL '1 minute'
  AND NOT EXISTS (
    SELECT 1 FROM public.leave_balance_transactions lbt
    WHERE lbt.balance_id = ulb.id
    AND lbt.reason = 'Ensured account has balance record for yearly rollover'
  );

COMMIT;

-- Verify the operation
SELECT 
  COUNT(*) as total_accounts,
  (SELECT COUNT(*) FROM public.user_leave_balances) as accounts_with_balances,
  (SELECT COUNT(*) FROM public.app_accounts) - (SELECT COUNT(*) FROM public.user_leave_balances) as accounts_without_balances
FROM public.app_accounts;
