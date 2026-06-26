-- =========================================================
-- Fix RLS Policies for Leave Balance Tables
-- =========================================================
-- This script fixes the Row-Level Security policies to allow
-- authenticated users to access their own leave balances.
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

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

COMMIT;

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('user_leave_balances', 'leave_balance_transactions')
ORDER BY tablename, policyname;
