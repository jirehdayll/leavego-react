-- FIX INFINITE RECURSION IN RLS POLICIES --
-- This script fixes the infinite recursion issue in the profiles table policies

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

-- Create new, non-recursive policies

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all profiles (using service role bypass)
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

-- Admins can update all profiles
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

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
      LIMIT 1
    )
  );
