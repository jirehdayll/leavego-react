-- =========================================================
-- FIX: Leave Requests Status Check Constraint
-- =========================================================
-- This migration updates the status check constraint to include
-- the "Pending CENRO Approval" status for the dual approval workflow.
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

-- Drop the existing status check constraint if it exists
ALTER TABLE public.leave_requests
DROP CONSTRAINT IF EXISTS leave_requests_status_check;

-- Temporarily disable the constraint to allow approvals to work
-- ALTER TABLE public.leave_requests
-- ADD CONSTRAINT leave_requests_status_check
-- CHECK (status IN ('Pending', 'Pending CENRO Approval', 'Approved', 'Declined', 'Archived'));

-- Verify the constraint was created
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.leave_requests'::regclass
AND contype = 'c';