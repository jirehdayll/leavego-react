-- =========================================================
-- FIX: Leave Requests RLS Policies
-- =========================================================
-- This migration adds proper RLS policies for the leave_requests table
-- to allow authenticated users to create and view their own requests,
-- and allow admins/CENRO to view and manage all requests.
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

-- Enable RLS on leave_requests table (if not already enabled)
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might conflict
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leave_requests'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.leave_requests;', pol.policyname);
  END LOOP;
END $$;

-- Policy 1: Authenticated users can INSERT their own leave requests
CREATE POLICY "Users can create own leave requests"
ON public.leave_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Policy 2: Authenticated users can VIEW their own leave requests
CREATE POLICY "Users can view own leave requests"
ON public.leave_requests
FOR SELECT
USING (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Policy 3: Authenticated users can UPDATE their own leave requests (if needed)
CREATE POLICY "Users can update own leave requests"
ON public.leave_requests
FOR UPDATE
USING (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Policy 4: Admins can view all leave requests
CREATE POLICY "Admins can view all leave requests"
ON public.leave_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'cenro', 'super_admin')
  )
);

-- Policy 5: Admins can insert leave requests (for admin-created requests)
CREATE POLICY "Admins can create leave requests"
ON public.leave_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'cenro', 'super_admin')
  )
);

-- Policy 6: Admins can update all leave requests
CREATE POLICY "Admins can update all leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'cenro', 'super_admin')
  )
);

-- Policy 7: Admins can delete all leave requests
CREATE POLICY "Admins can delete all leave requests"
ON public.leave_requests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'cenro', 'super_admin')
  )
);

COMMIT;

-- Verify policies were created
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
WHERE schemaname = 'public' AND tablename = 'leave_requests'
ORDER BY policyname;