BEGIN;

-- 1. Round existing values in user_leave_balances to integers
UPDATE public.user_leave_balances
SET 
  vacation_leave_balance = ROUND(vacation_leave_balance::NUMERIC),
  sick_leave_balance = ROUND(sick_leave_balance::NUMERIC),
  forced_leave_balance = ROUND(forced_leave_balance::NUMERIC),
  special_leave_balance = ROUND(special_leave_balance::NUMERIC),
  wellness_leave_balance = ROUND(wellness_leave_balance::NUMERIC);

-- 2. Alter column types in user_leave_balances to INTEGER with defaults
ALTER TABLE public.user_leave_balances
  ALTER COLUMN vacation_leave_balance TYPE INTEGER USING vacation_leave_balance::INTEGER,
  ALTER COLUMN vacation_leave_balance SET DEFAULT 0,
  ALTER COLUMN sick_leave_balance TYPE INTEGER USING sick_leave_balance::INTEGER,
  ALTER COLUMN sick_leave_balance SET DEFAULT 0,
  ALTER COLUMN forced_leave_balance TYPE INTEGER USING forced_leave_balance::INTEGER,
  ALTER COLUMN forced_leave_balance SET DEFAULT 5,
  ALTER COLUMN special_leave_balance TYPE INTEGER USING special_leave_balance::INTEGER,
  ALTER COLUMN special_leave_balance SET DEFAULT 3,
  ALTER COLUMN wellness_leave_balance TYPE INTEGER USING wellness_leave_balance::INTEGER,
  ALTER COLUMN wellness_leave_balance SET DEFAULT 5;

-- 3. Round existing values in leave_balance_transactions to integers
UPDATE public.leave_balance_transactions
SET 
  previous_balance = ROUND(previous_balance::NUMERIC),
  amount_change = ROUND(amount_change::NUMERIC),
  new_balance = ROUND(new_balance::NUMERIC);

-- 4. Alter column types in leave_balance_transactions to INTEGER
ALTER TABLE public.leave_balance_transactions
  ALTER COLUMN previous_balance TYPE INTEGER USING previous_balance::INTEGER,
  ALTER COLUMN amount_change TYPE INTEGER USING amount_change::INTEGER,
  ALTER COLUMN new_balance TYPE INTEGER USING new_balance::INTEGER;

COMMIT;
