-- =========================================================
-- COMPLETE LEAVE BALANCE SYSTEM FIX
-- =========================================================
-- This script fixes ALL issues preventing leave balances from working:
-- 1. Fixes RLS policies to allow users to access their balances
-- 2. Initializes balance records for all users
-- 3. Adds 10 days vacation/sick to all users
-- 4. Ensures deduction trigger is working
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

-- =========================================================
-- Step 1: Fix RLS Policies
-- =========================================================

-- Enable RLS on user_leave_balances
ALTER TABLE public.user_leave_balances ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own leave balances" ON public.user_leave_balances;
DROP POLICY IF EXISTS "Admins can view all leave balances" ON public.user_leave_balances;
DROP POLICY IF EXISTS "Service role can manage leave balances" ON public.user_leave_balances;

-- Create policy: Users can view their own balances
CREATE POLICY "Users can view own leave balances"
ON public.user_leave_balances
FOR SELECT
USING (auth.uid()::text = user_id::text);

-- Create policy: Users can insert their own balances
CREATE POLICY "Users can insert own leave balances"
ON public.user_leave_balances
FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

-- Create policy: Users can update their own balances
CREATE POLICY "Users can update own leave balances"
ON public.user_leave_balances
FOR UPDATE
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Create policy: Admins can view all balances
CREATE POLICY "Admins can view all leave balances"
ON public.user_leave_balances
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.app_accounts 
    WHERE id::text = auth.uid()::text 
    AND role IN ('admin', 'cenro', 'super_admin')
  )
);

-- Create policy: Admins can update all balances
CREATE POLICY "Admins can update all leave balances"
ON public.user_leave_balances
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.app_accounts 
    WHERE id::text = auth.uid()::text 
    AND role IN ('admin', 'cenro', 'super_admin')
  )
);

-- Create policy: Service role can manage everything
CREATE POLICY "Service role can manage leave balances"
ON public.user_leave_balances
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Enable RLS on leave_balance_transactions
ALTER TABLE public.leave_balance_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing transaction policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.leave_balance_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.leave_balance_transactions;
DROP POLICY IF EXISTS "Service role can manage transactions" ON public.leave_balance_transactions;

-- Create policy: Users can view their own transactions
CREATE POLICY "Users can view own transactions"
ON public.leave_balance_transactions
FOR SELECT
USING (auth.uid()::text = user_id::text);

-- Create policy: Users can insert their own transactions
CREATE POLICY "Users can insert own transactions"
ON public.leave_balance_transactions
FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

-- Create policy: Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
ON public.leave_balance_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.app_accounts 
    WHERE id::text = auth.uid()::text 
    AND role IN ('admin', 'cenro', 'super_admin')
  )
);

-- Create policy: Service role can manage transactions
CREATE POLICY "Service role can manage transactions"
ON public.leave_balance_transactions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =========================================================
-- Step 2: Initialize Balance Records for All Users
-- =========================================================

DO $$
DECLARE
  v_user RECORD;
  v_balance_id UUID;
BEGIN
  FOR v_user IN 
    SELECT id, email, full_name 
    FROM public.app_accounts 
    WHERE role NOT IN ('admin', 'super_admin')
  LOOP
    SELECT id INTO v_balance_id
    FROM public.user_leave_balances
    WHERE user_id = v_user.id;
    
    IF v_balance_id IS NULL THEN
      INSERT INTO public.user_leave_balances (user_id)
      VALUES (v_user.id)
      RETURNING id INTO v_balance_id;
      
      RAISE NOTICE 'Initialized balance for user: %', v_user.email;
    END IF;
  END LOOP;
END $$;

-- =========================================================
-- Step 3: Add 10 Days Vacation and Sick Leave
-- =========================================================

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

-- =========================================================
-- Step 4: Recreate Deduction Trigger
-- =========================================================

DROP TRIGGER IF EXISTS trigger_deduct_leave_on_approval ON public.leave_requests;
DROP FUNCTION IF EXISTS public.deduct_leave_on_approval() CASCADE;

CREATE OR REPLACE FUNCTION public.deduct_leave_on_approval()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_id UUID;
  v_previous_balance DECIMAL(8,3);
  v_new_balance DECIMAL(8,3);
  v_leave_type TEXT;
  v_num_days DECIMAL(8,3);
  v_column_name TEXT;
BEGIN
  IF NEW.status <> 'Approved' OR (OLD.status = 'Approved') THEN
    RETURN NEW;
  END IF;

  IF NEW.request_type <> 'Leave' THEN
    RETURN NEW;
  END IF;

  v_leave_type := NEW.details->>'leave_type';
  v_num_days := COALESCE(
    (NEW.details->>'num_days')::DECIMAL(8,3),
    (NEW.details->>'number_of_days')::DECIMAL(8,3)
  );

  IF v_leave_type IS NULL OR v_num_days IS NULL OR v_num_days <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_balance_id
  FROM public.user_leave_balances
  WHERE user_id = NEW.user_id;

  IF v_balance_id IS NULL THEN
    INSERT INTO public.user_leave_balances (user_id)
    VALUES (NEW.user_id)
    RETURNING id INTO v_balance_id;
  END IF;

  v_column_name := CASE
    WHEN v_leave_type ILIKE '%forced%' THEN 'forced_leave_balance'
    WHEN v_leave_type ILIKE '%special%' OR v_leave_type ILIKE '%privilege%' THEN 'special_leave_balance'
    WHEN v_leave_type ILIKE '%wellness%' THEN 'wellness_leave_balance'
    WHEN v_leave_type ILIKE '%sick%' THEN 'sick_leave_balance'
    WHEN v_leave_type ILIKE '%vacation%' THEN 'vacation_leave_balance'
    ELSE NULL
  END;

  IF v_column_name IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format('SELECT %I FROM public.user_leave_balances WHERE id = $1', v_column_name)
  INTO v_previous_balance
  USING v_balance_id;

  v_new_balance := GREATEST(0, v_previous_balance - v_num_days);

  EXECUTE format('UPDATE public.user_leave_balances SET %I = $1, updated_at = NOW() WHERE id = $2', v_column_name)
  USING v_new_balance, v_balance_id;

  INSERT INTO public.leave_balance_transactions (
    user_id, balance_id, transaction_type, leave_type,
    previous_balance, amount_change, new_balance,
    leave_request_id, reason, created_by
  ) VALUES (
    NEW.user_id, v_balance_id, 'deduction',
    REPLACE(v_column_name, '_balance', ''),
    v_previous_balance, -v_num_days, v_new_balance,
    NEW.id, 'Leave approval deduction', 'system'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_leave_on_approval
  BEFORE UPDATE OF status ON public.leave_requests
  FOR EACH ROW
  WHEN (NEW.status = 'Approved' AND OLD.status <> 'Approved')
  EXECUTE FUNCTION public.deduct_leave_on_approval();

COMMIT;

-- =========================================================
-- Verification
-- =========================================================

SELECT '=== Current Balances ===' as info;
SELECT 
  u.email,
  u.full_name,
  ulb.forced_leave_balance,
  ulb.special_leave_balance,
  ulb.wellness_leave_balance,
  ROUND(ulb.vacation_leave_balance::NUMERIC, 2) as vacation_leave_balance,
  ROUND(ulb.sick_leave_balance::NUMERIC, 2) as sick_leave_balance
FROM public.user_leave_balances ulb
JOIN public.app_accounts u ON ulb.user_id = u.id
ORDER BY u.full_name;

SELECT '=== Recent Transactions ===' as info;
SELECT 
  t.transaction_type,
  t.leave_type,
  ROUND(t.amount_change::NUMERIC, 2) as amount_change,
  ROUND(t.new_balance::NUMERIC, 2) as new_balance,
  t.reason,
  u.email
FROM public.leave_balance_transactions t
JOIN public.app_accounts u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 10;

SELECT '=== Trigger Status ===' as info;
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_deduct_leave_on_approval';
