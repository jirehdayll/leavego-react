-- Supabase Email System Setup for LeaveGo
-- Run this SQL in your Supabase SQL Editor to set up the email notification system

-- 1. Create user_emails table to store registered user emails
CREATE TABLE IF NOT EXISTS user_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  department TEXT,
  position TEXT,
  role TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create email_notifications table to store email notifications
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_emails_email ON user_emails(email);
CREATE INDEX IF NOT EXISTS idx_user_emails_is_active ON user_emails(is_active);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_to_email ON email_notifications(to_email);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE user_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for user_emails
-- Allow service role to do everything
CREATE POLICY "Service role can do anything on user_emails"
  ON user_emails
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read their own email
CREATE POLICY "Users can read their own email"
  ON user_emails
  FOR SELECT
  TO authenticated
  USING (email = auth.email());

-- 6. Create RLS policies for email_notifications
-- Allow service role to do everything
CREATE POLICY "Service role can do anything on email_notifications"
  ON email_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to update updated_at
CREATE TRIGGER update_user_emails_updated_at
  BEFORE UPDATE ON user_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Create a function to trigger email sending when notification is inserted
CREATE OR REPLACE FUNCTION trigger_email_send()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called by a Supabase Edge Function
  -- The Edge Function will listen for inserts on this table and send emails
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger for email notifications
CREATE TRIGGER on_email_notification_insert
  AFTER INSERT ON email_notifications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_email_send();
