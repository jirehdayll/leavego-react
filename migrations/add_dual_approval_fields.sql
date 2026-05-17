-- Migration: Add dual approval fields to leave_requests table
-- This migration adds fields for the two-stage approval process (Admin → CENRO)

-- Add dual approval fields to leave_requests table
ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS admin_approved_by TEXT,
ADD COLUMN IF NOT EXISTS cenro_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cenro_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cenro_approved_by TEXT;

-- Add comments to document the new columns
COMMENT ON COLUMN leave_requests.admin_approved IS 'First stage approval by admin';
COMMENT ON COLUMN leave_requests.admin_approved_at IS 'Timestamp when admin approved';
COMMENT ON COLUMN leave_requests.admin_approved_by IS 'Email of admin who approved';
COMMENT ON COLUMN leave_requests.cenro_approved IS 'Second stage approval by CENRO';
COMMENT ON COLUMN leave_requests.cenro_approved_at IS 'Timestamp when CENRO approved';
COMMENT ON COLUMN leave_requests.cenro_approved_by IS 'Email of CENRO who approved';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_admin_approved ON leave_requests(admin_approved);
CREATE INDEX IF NOT EXISTS idx_leave_requests_cenro_approved ON leave_requests(cenro_approved);
