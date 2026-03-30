-- Leave Go Forms Database Schema
-- Run this SQL in your Supabase SQL Editor to create/update the leave_requests table

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_submitted_at ON leave_requests(submitted_at);
CREATE INDEX IF NOT EXISTS idx_leave_requests_is_archived ON leave_requests(is_archived);
CREATE INDEX IF NOT EXISTS idx_leave_requests_seen_by_admin ON leave_requests(seen_by_admin);

-- Enable Row Level Security
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only see their own requests
CREATE POLICY "Users can view own requests" ON leave_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own requests
CREATE POLICY "Users can insert own requests" ON leave_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own requests (but not status)
CREATE POLICY "Users can update own requests" ON leave_requests
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests" ON leave_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'admin@denr.gov.ph'
    )
  );

-- Admins can update all requests
CREATE POLICY "Admins can update all requests" ON leave_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'admin@denr.gov.ph'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
