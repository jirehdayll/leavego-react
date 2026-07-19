-- =========================================================
-- EMERGENCY RLS POLICY CHECK
-- =========================================================
-- Sometimes data appears "gone" due to Row Level Security policies
-- This script checks if RLS is blocking data access
-- 
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

-- Check RLS status on main tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('app_accounts', 'leave_requests', 'user_leave_balances', 'leave_balance_transactions');

-- Check existing RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('app_accounts', 'leave_requests', 'user_leave_balances', 'leave_balance_transactions')
ORDER BY tablename, policyname;

-- Temporarily disable RLS to check if data exists (EMERGENCY ONLY)
-- This will allow you to see if data actually exists but is being blocked by policies

-- DISABLE RLS ON app_accounts (uncomment to test)
-- ALTER TABLE public.app_accounts DISABLE ROW LEVEL SECURITY;

-- DISABLE RLS ON leave_requests (uncomment to test)  
-- ALTER TABLE public.leave_requests DISABLE ROW LEVEL SECURITY;

-- DISABLE RLS ON user_leave_balances (uncomment to test)
-- ALTER TABLE public.user_leave_balances DISABLE ROW LEVEL SECURITY;

-- DISABLE RLS ON leave_balance_transactions (uncomment to test)
-- ALTER TABLE public.leave_balance_transactions DISABLE ROW LEVEL SECURITY;

-- After testing, re-enable RLS:
-- ALTER TABLE public.app_accounts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.user_leave_balances ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.leave_balance_transactions ENABLE ROW LEVEL SECURITY;
