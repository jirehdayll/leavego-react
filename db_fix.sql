-- SCHEMA FIX FOR LEAVEGO --
-- This script ensures the profiles table is generic and the triggers are robust.

-- 1. Add generic email column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='email') THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- 2. Populate email column from denr_email
UPDATE public.profiles SET email = denr_email WHERE email IS NULL;

-- 3. Update handle_new_user trigger to populate both
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, denr_email, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.email,
    CASE 
      WHEN NEW.email = 'admin@gmail.com' THEN 'admin' 
      WHEN NEW.email = 'admin@denr.gov.ph' THEN 'admin'
      ELSE 'employee' 
    END,
    true
  )
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    denr_email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- 4. Fix RLS for profiles (ensure admins can actually see everything)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
      LIMIT 1
    )
  );

-- 5. Final sync: ensure admin@gmail.com is admin
UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@gmail.com';
UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@denr.gov.ph';
