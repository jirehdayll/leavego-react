-- =========================================================
-- Update Initial Leave Balances to 10 Days
-- =========================================================
-- This migration updates existing user_leave_balances records
-- to set vacation_leave_balance and sick_leave_balance to 10.000
-- instead of 0.000 for new users.
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

-- Update existing records with 0 balances to 10 days
UPDATE public.user_leave_balances
SET 
  vacation_leave_balance = 10.000,
  sick_leave_balance = 10.000,
  updated_at = NOW()
WHERE 
  vacation_leave_balance = 0.000 
  OR sick_leave_balance = 0.000
  OR vacation_leave_balance IS NULL
  OR sick_leave_balance IS NULL;

-- Ensure all future records will have 10 days as default
-- (This is already handled by the updated table schema in create_leave_balances_table.sql)

-- Log the changes
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % user_leave_balances records with 10-day initial vacation and sick leave balances', updated_count;
END $$;

COMMIT;

-- Verification query (run separately to check results)
-- SELECT user_id, vacation_leave_balance, sick_leave_balance, updated_at 
-- FROM public.user_leave_balances 
-- ORDER BY updated_at DESC;