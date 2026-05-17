-- =========================================================
-- FIX: POST /auth/v1/token?grant_type=password returning HTTP 500
--      ("Database error granting user", "Database error querying schema", etc.)
--      + profiles RLS recursion
--
-- Run once in Supabase Dashboard → SQL Editor (as postgres).
-- If it still fails: Logs → Postgres / Auth for the exact SQLSTATE message.
-- Safe to run multiple times.
-- =========================================================

BEGIN;

-- 0) GoTrue can return 500 if auth.users token columns are NULL (e.g. users
--    inserted manually). Normalize NULLs to empty string for known columns.
DO $$
DECLARE
  col text;
BEGIN
  FOREACH col IN ARRAY ARRAY[
    'confirmation_token',
    'recovery_token',
    'email_change',
    'email_change_token_new',
    'email_change_token_current',
    'reauthentication_token'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'auth'
        AND table_name = 'users'
        AND column_name = col
    ) THEN
      EXECUTE format(
        'UPDATE auth.users SET %I = COALESCE(%I, %L) WHERE %I IS NULL',
        col, col, '', col
      );
    END IF;
  END LOOP;
END;
$$;

-- 1) Ensure required schema/table grants exist for Supabase auth flow.
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO authenticator;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticator;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- Helpful when extensions (e.g. uuid) are used from auth-related paths
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 1b) GoTrue connects as supabase_auth_admin. If you have triggers on auth.users
--     that INSERT/UPDATE public.* without SECURITY DEFINER, or that need table
--     grants, this role must be able to use public (see Supabase docs: Postgres roles).
DO $grantauth$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO supabase_auth_admin';
    EXECUTE 'GRANT USAGE ON SCHEMA auth TO supabase_auth_admin';
    EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_auth_admin';
    EXECUTE 'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin';
    EXECUTE 'GRANT USAGE ON SCHEMA extensions TO supabase_auth_admin';
    EXECUTE 'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO supabase_auth_admin';
  END IF;
END;
$grantauth$;

-- Sequences are required for some INSERT paths during auth transactions
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticator;

-- 2) Resolve recursive profiles policies.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles;', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, service_role, anon;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.get_user_role() IN ('admin', 'cenro', 'super_admin'));

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.get_user_role() IN ('admin', 'cenro', 'super_admin'));

-- 3) Resolve runtime schema drift seen in app logs.
ALTER TABLE public.leave_requests
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 4) LeaveGo: new auth users → profiles row (SECURITY DEFINER; avoids invoker RLS).
--    If your profiles table differs, comment out this section, fix columns, re-run.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.profiles (
    id,
    denr_email,
    full_name,
    first_name,
    middle_name,
    surname,
    position,
    role,
    is_active
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'first_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'middle_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'surname'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'position'), ''),
    LOWER(COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'role'), ''), 'employee')),
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMIT;

-- =============================================================================
-- After the transaction: diagnostics (read-only). If login still returns HTTP
-- 500, inspect these results and Dashboard → Logs → Auth / Postgres.
-- =============================================================================

SELECT
  t.tgname AS trigger_name,
  pg_get_triggerdef(t.oid, true) AS trigger_def
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'auth'
  AND c.relname = 'users'
  AND NOT t.tgisinternal
ORDER BY t.tgname;

SELECT
  p.proname AS function_name,
  n.nspname AS schema_name,
  CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.oid IN (
  SELECT t.tgfoid
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'auth' AND c.relname = 'users' AND NOT t.tgisinternal
)
ORDER BY n.nspname, p.proname;

SELECT c.relkind, c.relname AS object_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'auth'
  AND c.relkind IN ('r', 'v', 'm', 'f', 'p')
  AND c.relname NOT LIKE 'pg_%'
ORDER BY c.relkind, c.relname;
