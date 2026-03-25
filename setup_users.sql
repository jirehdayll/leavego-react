-- SETUP USERS FOR LEAVEGO --
-- This script creates the core test users in the Supabase `auth.users` table
-- and links them to the `public.profiles` table with the correct roles.

-- We assume pgcrypto is already enabled in Supabase by default
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Employee User
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
  created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'employee@gmail.com', crypt('employee', gen_salt('bf')), now(), 
  now(), now(), '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- 2. Create Admin User
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
  created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'admin@gmail.com', crypt('admin', gen_salt('bf')), now(), 
  now(), now(), '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- 3. Upsert Profile for Employee
INSERT INTO public.profiles (id, full_name, email, role, is_active)
SELECT id, 'Test Employee', email, 'employee', true FROM auth.users WHERE email = 'employee@gmail.com'
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = 'employee';

-- 4. Upsert Profile for Admin
INSERT INTO public.profiles (id, full_name, email, role, is_active)
SELECT id, 'System Admin', email, 'admin', true FROM auth.users WHERE email = 'admin@gmail.com'
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = 'admin';

-- OPTIONAL: Helper Trigger
-- If you want new signups to automatically get a profile entry (useful if created via dashboard)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, is_active)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, 'employee', true)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
 