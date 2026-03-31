-- COMPLETE FIX FOR LEAVE GO SYSTEM
-- Run this in Supabase SQL Editor step by step

-- Step 1: Remove existing table and policies
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP POLICY IF EXISTS "allow_all" ON leave_requests;

-- Step 2: Create table with all required fields
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

-- Step 3: Create indexes
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_submitted_at ON leave_requests(submitted_at);
CREATE INDEX idx_leave_requests_is_archived ON leave_requests(is_archived);

-- Step 4: Enable RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Step 5: Create simple policies (allow everything for now)
CREATE POLICY "Enable insert for all users" ON leave_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for all users" ON leave_requests FOR SELECT USING (true);
CREATE POLICY "Enable update for all users" ON leave_requests FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON leave_requests FOR DELETE USING (true);

-- Step 6: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Grant permissions
GRANT ALL ON leave_requests TO authenticated;
GRANT ALL ON leave_requests TO service_role;
GRANT ALL ON leave_requests TO anon;

-- Step 8: Test insert
INSERT INTO leave_requests (
  user_id, 
  user_email, 
  user_name, 
  request_type, 
  department, 
  details, 
  status
) VALUES (
  gen_random_uuid(),
  'test@example.com',
  'Test User',
  'Leave',
  'Test Department',
  '{"test": true, "message": "Database connection test"}',
  'Pending'
);

-- Step 9: Verify test insert
SELECT * FROM leave_requests WHERE user_email = 'test@example.com';

-- Step 10: Clean up test data
DELETE FROM leave_requests WHERE user_email = 'test@example.com';

-- Show success message
SELECT 'Database setup completed successfully!' as status;
