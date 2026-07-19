-- =========================================================
-- Convert Vacation and Sick Leave from DECIMAL to INTEGER
-- =========================================================
-- This migration converts vacation_leave_balance and sick_leave_balance
-- from DECIMAL(8,3) to INTEGER, rounding existing values to whole numbers.
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

-- 1. First, convert existing decimal values to integers by rounding
UPDATE public.user_leave_balances
SET 
  vacation_leave_balance = ROUND(vacation_leave_balance),
  sick_leave_balance = ROUND(sick_leave_balance);

-- 2. Alter column types from DECIMAL to INTEGER
ALTER TABLE public.user_leave_balances
ALTER COLUMN vacation_leave_balance TYPE INTEGER USING vacation_leave_balance::INTEGER,
ALTER COLUMN sick_leave_balance TYPE INTEGER USING sick_leave_balance::INTEGER;

-- 3. Update default values to 0 (integer)
ALTER TABLE public.user_leave_balances
ALTER COLUMN vacation_leave_balance SET DEFAULT 0,
ALTER COLUMN sick_leave_balance SET DEFAULT 0;

-- 4. Verify the conversion
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE vacation_leave_balance = 0) as users_with_zero_vacation,
  COUNT(*) FILTER (WHERE sick_leave_balance = 0) as users_with_zero_sick,
  ROUND(AVG(vacation_leave_balance)::NUMERIC, 2) as avg_vacation,
  ROUND(AVG(sick_leave_balance)::NUMERIC, 2) as avg_sick,
  MAX(vacation_leave_balance) as max_vacation,
  MAX(sick_leave_balance) as max_sick
FROM public.user_leave_balances;

-- 5. Show sample data to verify
SELECT 
  user_id,
  vacation_leave_balance,
  sick_leave_balance,
  forced_leave_balance,
  special_leave_balance,
  wellness_leave_balance
FROM public.user_leave_balances
LIMIT 5;

COMMIT;
