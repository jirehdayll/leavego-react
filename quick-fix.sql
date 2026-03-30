-- Quick Fix for Leave Requests Table
-- Run this in Supabase SQL Editor to ensure everything works

-- Drop and recreate table with proper structure
DROP TABLE IF EXISTS leave_requests;

CREATE TABLE leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('Leave', 'Travel')),
  department TEXT,
  details JSONB NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Declined')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE,
  seen_by_admin BOOLEAN DEFAULT FALSE,
  admin_seen_at TIMESTAMP WITH TIME ZONE
);

-- Simple indexes
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_submitted_at ON leave_requests(submitted_at);

-- Enable RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Simple policy - allow all operations (for testing)
-- We'll tighten this later once everything works
DROP POLICY IF EXISTS "allow_all" ON leave_requests;
CREATE POLICY "allow_all" ON leave_requests USING (true) WITH CHECK (true);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests;
CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON leave_requests TO authenticated;
GRANT ALL ON leave_requests TO service_role;
