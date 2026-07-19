BEGIN;

-- 1. Create the sync function
CREATE OR REPLACE FUNCTION public.sync_new_user_to_app_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert the new user into public.app_accounts
  INSERT INTO public.app_accounts (
    id,
    email,
    role,
    full_name,
    first_name,
    middle_name,
    surname,
    position,
    is_active
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    LOWER(COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'role'), ''), 'employee')),
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'first_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'middle_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'surname'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'position'), ''),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert the initial base leave balances for the new user
  INSERT INTO public.user_leave_balances (
    user_id,
    vacation_leave_balance,
    sick_leave_balance,
    forced_leave_balance,
    special_leave_balance,
    wellness_leave_balance
  )
  VALUES (
    NEW.id,
    0,
    0,
    5,
    3,
    5
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Attach the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_sync_app_accounts ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_app_accounts
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_new_user_to_app_accounts();

-- 3. Retroactive Sync: Catch any existing lost accounts in auth.users
-- Sync into app_accounts
INSERT INTO public.app_accounts (id, email, role)
SELECT id, email, 'employee'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.app_accounts)
ON CONFLICT (id) DO NOTHING;

-- Sync into user_leave_balances
INSERT INTO public.user_leave_balances (
  user_id, 
  vacation_leave_balance, 
  sick_leave_balance, 
  forced_leave_balance, 
  special_leave_balance, 
  wellness_leave_balance
)
SELECT id, 0, 0, 5, 3, 5
FROM public.app_accounts
WHERE id NOT IN (SELECT user_id FROM public.user_leave_balances)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
