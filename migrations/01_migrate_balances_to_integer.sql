-- =========================================================
-- Migration: Convert Balances to Integer
-- =========================================================
-- This script alters the leave balance tables to strictly
-- use INTEGER data types instead of DECIMAL/NUMERIC.
-- It rounds any existing decimal values to the nearest whole number.
-- =========================================================

BEGIN;

-- 1. Alter user_leave_balances table
ALTER TABLE public.user_leave_balances
  ALTER COLUMN vacation_leave_balance TYPE INTEGER USING ROUND(COALESCE(vacation_leave_balance, 0))::INTEGER,
  ALTER COLUMN vacation_leave_balance SET DEFAULT 0,
  
  ALTER COLUMN sick_leave_balance TYPE INTEGER USING ROUND(COALESCE(sick_leave_balance, 0))::INTEGER,
  ALTER COLUMN sick_leave_balance SET DEFAULT 0,
  
  ALTER COLUMN forced_leave_balance TYPE INTEGER USING ROUND(COALESCE(forced_leave_balance, 5))::INTEGER,
  ALTER COLUMN forced_leave_balance SET DEFAULT 5,
  
  ALTER COLUMN special_leave_balance TYPE INTEGER USING ROUND(COALESCE(special_leave_balance, 3))::INTEGER,
  ALTER COLUMN special_leave_balance SET DEFAULT 3,
  
  ALTER COLUMN wellness_leave_balance TYPE INTEGER USING ROUND(COALESCE(wellness_leave_balance, 5))::INTEGER,
  ALTER COLUMN wellness_leave_balance SET DEFAULT 5;

-- 2. Alter leave_balance_transactions table
ALTER TABLE public.leave_balance_transactions
  ALTER COLUMN previous_balance TYPE INTEGER USING ROUND(COALESCE(previous_balance, 0))::INTEGER,
  ALTER COLUMN amount_change TYPE INTEGER USING ROUND(COALESCE(amount_change, 0))::INTEGER,
  ALTER COLUMN new_balance TYPE INTEGER USING ROUND(COALESCE(new_balance, 0))::INTEGER;

COMMIT;
