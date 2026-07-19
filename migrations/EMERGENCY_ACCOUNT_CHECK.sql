-- =========================================================
-- EMERGENCY ACCOUNT CHECK AND RECOVERY
-- =========================================================
-- This script checks account data and attempts recovery
-- 
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

-- Check if app_accounts table exists and has data
SELECT 
  'Table exists check' as check_type,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'app_accounts';

-- Check if leave_requests table exists and has data
SELECT 
  'Leave requests check' as check_type,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'leave_requests';

-- Check current accounts
SELECT id, email, full_name, is_active, created_at
FROM public.app_accounts
ORDER BY created_at DESC;

-- Check current leave requests
SELECT id, user_email, status, request_type, submitted_at
FROM public.leave_requests
ORDER BY submitted_at DESC
LIMIT 20;

-- Check if there might be data in a different schema
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name IN ('app_accounts', 'leave_requests')
ORDER BY table_schema, table_name;

-- Check for any recent large deletions
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows
FROM pg_stat_user_tables
WHERE tablename IN ('app_accounts', 'leave_requests', 'user_leave_balances')
ORDER BY deletes DESC;
