-- =========================================================
-- FIX: Disable RLS for Custom Auth System
-- =========================================================
-- The application uses a custom localStorage-based authentication system
-- but the database has RLS policies that require Supabase Auth (auth.uid()).
-- This causes INSERT operations to fail because auth.uid() is null.
--
-- This script disables RLS on leave_requests to allow the custom auth to work.
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

-- Disable RLS on leave_requests table
ALTER TABLE public.leave_requests DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'leave_requests';

COMMIT;

-- Note: If you need to re-enable RLS later, you would need to:
-- 1. Either migrate to Supabase Auth, or
-- 2. Modify the RLS policies to work with your custom auth system
--    (e.g., by checking against app_accounts table instead of auth.uid())
