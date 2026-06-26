-- =========================================================
-- FIX USER BALANCE ACCESS AND INITIALIZATION
-- =========================================================
-- This script fixes the specific issues identified by the debug tool:
-- 1. RLS policies blocking user access to their own balance
-- 2. Missing balance record for the user
-- 3. Ensures proper initialization
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

-- =========================================================
-- Step 1: Fix RLS Policies to Allow User Access
-- =========================================================

-- Drop existing policies that might be blocking access
DROP POLICY IF EXISTS "Users can view own leave balances" ON public.user_leave_balances;
DROP POLICY IF EXISTS "Users can insert own leave balances" ON public.user_leave_balances;
DROP POLICY IF EXISTS "Users can update own leave balances" ON public.user_leave_balances;

-- Create more permissive policies using text comparison
CREATE POLICY "Users can view own leave balances"
ON public.user_leave_balances
FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own leave balances"
ON public.user_leave_balances
FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own leave balances"
ON public.user_leave_balances
FOR UPDATE
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Ensure service role has full access
DROP POLICY IF EXISTS "Service role can manage leave balances" ON public.user_leave_balances;

CREATE POLICY "Service role can manage leave balances"
ON public.user_leave_balances
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =========================================================
-- Step 2: Initialize Balance for Current User
-- =========================================================
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from the debug tool
-- Or run the function after this script

-- First, let's create a helper function to initialize any user's balance
CREATE OR REPLACE FUNCTION public.initialize_user_leave_balance_safe(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_id UUID;
BEGIN
  -- Check if balance already exists
  SELECT id INTO v_balance_id
  FROM public.user_leave_balances
  WHERE user_id = p_user_id;
  
  IF v_balance_id IS NOT NULL THEN
    RETURN v_balance_id;
  END IF;
  
  -- Insert new balance with default values
  INSERT INTO public.user_leave_balances (
    user_id,
    vacation_leave_balance,
    sick_leave_balance,
    forced_leave_balance,
    special_leave_balance,
    wellness_leave_balance
  ) VALUES (
    p_user_id,
    10.0,  -- 10 days vacation
    10.0,  -- 10 days sick
    5.0,   -- 5 days forced leave
    3.0,   -- 3 days special leave
    5.0    -- 5 days wellness leave
  )
  RETURNING id INTO v_balance_id;
  
  -- Log the initialization
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
  ) VALUES (
    p_user_id,
    v_balance_id,
    'adjustment',
    'vacation_leave',
    0.0,
    10.0,
    10.0,
    'Initial balance setup via safe initialization',
    'system'
  );
  
  RETURN v_balance_id;
END;
$$;

-- =========================================================
-- Step 3: Initialize Balance for All Users Without One
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
    -- Check if balance exists
    SELECT id INTO v_balance_id
    FROM public.user_leave_balances
    WHERE user_id = v_user.id;
    
    IF v_balance_id IS NULL THEN
      -- Use the safe function to initialize
      SELECT public.initialize_user_leave_balance_safe(v_user.id) INTO v_balance_id;
      RAISE NOTICE 'Initialized balance for user: % (ID: %)', v_user.email, v_balance_id;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- =========================================================
-- Usage Instructions:
-- =========================================================
-- 1. Run this entire script in Supabase SQL Editor
-- 2. After running, the debug tool should show:
--    - RLS Policies: SUCCESS
--    - User Balance Record: SUCCESS
--    - Database Functions: SUCCESS
-- 3. If you need to initialize a specific user, run:
--    SELECT public.initialize_user_leave_balance_safe('user-id-here');
-- =========================================================