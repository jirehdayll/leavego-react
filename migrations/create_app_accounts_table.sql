-- LeaveGo: shared app accounts (basic-auth users) synced across browsers / Vercel / local.
-- Run once in Supabase Dashboard → SQL Editor.
-- Safe to run multiple times.

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_accounts (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  password text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'employee',
  full_name text,
  first_name text,
  middle_name text,
  surname text,
  position text,
  department text,
  salary_range text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_accounts_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_app_accounts_role ON public.app_accounts (role);
CREATE INDEX IF NOT EXISTS idx_app_accounts_is_active ON public.app_accounts (is_active);

ALTER TABLE public.app_accounts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_accounts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.app_accounts;', pol.policyname);
  END LOOP;
END $$;

-- Client-side admin gate; anon key is already public in the SPA bundle.
CREATE POLICY "app_accounts_select"
  ON public.app_accounts FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "app_accounts_insert"
  ON public.app_accounts FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "app_accounts_update"
  ON public.app_accounts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "app_accounts_delete"
  ON public.app_accounts FOR DELETE TO anon, authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_accounts TO anon, authenticated, service_role;

COMMIT;
