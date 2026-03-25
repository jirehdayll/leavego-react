-- ============================================================
-- LeaveGo System — Supabase Database Schema
-- Run this entire script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/srjithxfgpuaoqvtoyqr/sql
-- ============================================================

-- 1. Profiles Table (links to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  age INTEGER,
  position TEXT,
  personal_email TEXT,
  denr_email TEXT UNIQUE,
  role TEXT DEFAULT 'employee', -- 'employee' | 'admin'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Leave Requests Table
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  request_type TEXT NOT NULL CHECK (request_type IN ('Leave', 'Travel')),
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Declined')),
  is_archived BOOLEAN DEFAULT false,
  department TEXT,
  details JSONB,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Triggers to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Auto-create profile on new Supabase Auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, denr_email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN NEW.email = 'admin@denr.gov.ph' THEN 'admin' ELSE 'employee' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admin can view/modify all profiles (via service_role, which bypasses RLS)
-- The following allows admins to see all profiles through the anon key:
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 7. RLS Policies for leave_requests
CREATE POLICY "Users can insert own requests"
  ON public.leave_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own requests"
  ON public.leave_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests"
  ON public.leave_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all requests"
  ON public.leave_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 8. Seed initial admin and employee accounts in Supabase Auth
-- NOTE: Do this manually in the Supabase Dashboard > Authentication > Users
-- Add user: admin@denr.gov.ph / admin
-- Add user: employee@denr.gov.ph / employee
-- After creating, the trigger above will auto-create their profiles.
-- Then manually set admin@denr.gov.ph role to 'admin':
UPDATE public.profiles SET role = 'admin', full_name = 'System Administrator' WHERE denr_email = 'admin@denr.gov.ph';
UPDATE public.profiles SET role = 'employee', full_name = 'Sample Employee' WHERE denr_email = 'employee@denr.gov.ph';

-- 9. Enable Realtime for leave_requests (run this instead of using the UI)
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;

-- ============================================================
-- DONE! Your LeaveGo database is now configured.
-- ============================================================
