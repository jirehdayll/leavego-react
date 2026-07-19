-- =========================================================
-- Convert All Balance Columns to INTEGER
-- =========================================================
-- This migration converts all balance columns from DECIMAL to INTEGER.
-- This ensures the system uses whole numbers only as per requirements.
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

-- 1. Convert existing decimal values to integers by rounding
UPDATE public.user_leave_balances
SET 
  forced_leave_balance = ROUND(forced_leave_balance),
  special_leave_balance = ROUND(special_leave_balance),
  wellness_leave_balance = ROUND(wellness_leave_balance),
  vacation_leave_balance = ROUND(vacation_leave_balance),
  sick_leave_balance = ROUND(sick_leave_balance);

-- 2. Alter column types from DECIMAL to INTEGER
ALTER TABLE public.user_leave_balances
ALTER COLUMN forced_leave_balance TYPE INTEGER USING forced_leave_balance::INTEGER,
ALTER COLUMN special_leave_balance TYPE INTEGER USING special_leave_balance::INTEGER,
ALTER COLUMN wellness_leave_balance TYPE INTEGER USING wellness_leave_balance::INTEGER,
ALTER COLUMN vacation_leave_balance TYPE INTEGER USING vacation_leave_balance::INTEGER,
ALTER COLUMN sick_leave_balance TYPE INTEGER USING sick_leave_balance::INTEGER;

-- 3. Update default values to integers
ALTER TABLE public.user_leave_balances
ALTER COLUMN forced_leave_balance SET DEFAULT 5,
ALTER COLUMN special_leave_balance SET DEFAULT 3,
ALTER COLUMN wellness_leave_balance SET DEFAULT 5,
ALTER COLUMN vacation_leave_balance SET DEFAULT 0,
ALTER COLUMN sick_leave_balance SET DEFAULT 0;

-- 4. Verify the conversion
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE vacation_leave_balance = 0) as users_with_zero_vacation,
  COUNT(*) FILTER (WHERE sick_leave_balance = 0) as users_with_zero_sick,
  COUNT(*) FILTER (WHERE forced_leave_balance = 5) as users_with_default_forced,
  COUNT(*) FILTER (WHERE special_leave_balance = 3) as users_with_default_special,
  COUNT(*) FILTER (WHERE wellness_leave_balance = 5) as users_with_default_wellness,
  ROUND(AVG(vacation_leave_balance)::NUMERIC, 2) as avg_vacation,
  ROUND(AVG(sick_leave_balance)::NUMERIC, 2) as avg_sick,
  MAX(vacation_leave_balance) as max_vacation,
  MAX(sick_leave_balance) as max_sick
FROM public.user_leave_balances;

-- 5. Show sample data to verify
SELECT 
  user_id,
  forced_leave_balance,
  special_leave_balance,
  wellness_leave_balance,
  vacation_leave_balance,
  sick_leave_balance
FROM public.user_leave_balances
LIMIT 5;

COMMIT;
