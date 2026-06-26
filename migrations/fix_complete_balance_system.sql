-- =========================================================
-- Complete Leave Balance System Fix (Corrected)
-- =========================================================
BEGIN;

-- =========================================================
-- Step 1: Initialize balances for all existing users
-- =========================================================
DO $$
DECLARE
  v_user RECORD;
  v_balance_id UUID;
BEGIN
  FOR v_user IN 
    SELECT id, email, full_name 
    FROM public.app_accounts 
    WHERE role NOT IN ('admin', 'super_admin')
  LOOP
    SELECT id INTO v_balance_id
    FROM public.user_leave_balances
    WHERE user_id = v_user.id;
    
    IF v_balance_id IS NULL THEN
      INSERT INTO public.user_leave_balances (user_id)
      VALUES (v_user.id)
      RETURNING id INTO v_balance_id;
      
      RAISE NOTICE '✓ Initialized balance for user: % (%)', v_user.full_name, v_user.email;
    ELSE
      RAISE NOTICE '- Balance already exists for user: % (%)', v_user.full_name, v_user.email;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✓ Step 1 complete: All users have balance records';
END $$;

-- =========================================================
-- Step 2: Verify and recreate deduction trigger
-- =========================================================
DROP TRIGGER IF EXISTS trigger_deduct_leave_on_approval ON public.leave_requests;
DROP FUNCTION IF EXISTS public.deduct_leave_on_approval() CASCADE;

CREATE OR REPLACE FUNCTION public.deduct_leave_on_approval()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_id UUID;
  v_previous_balance DECIMAL(8,3);
  v_new_balance DECIMAL(8,3);
  v_leave_type TEXT;
  v_num_days DECIMAL(8,3);
  v_column_name TEXT;
BEGIN
  IF NEW.status <> 'Approved' OR (OLD.status = 'Approved') THEN
    RETURN NEW;
  END IF;

  IF NEW.request_type <> 'Leave' THEN
    RETURN NEW;
  END IF;

  v_leave_type := NEW.details->>'leave_type';
  
  v_num_days := COALESCE(
    (NEW.details->>'num_days')::DECIMAL(8,3),
    (NEW.details->>'number_of_days')::DECIMAL(8,3)
  );

  IF v_leave_type IS NULL OR v_num_days IS NULL OR v_num_days <= 0 THEN
    RAISE NOTICE 'Skipping deduction: missing leave_type or invalid num_days. leave_type=%, num_days=%', v_leave_type, v_num_days;
    RETURN NEW;
  END IF;

  SELECT id INTO v_balance_id
  FROM public.user_leave_balances
  WHERE user_id = NEW.user_id;

  IF v_balance_id IS NULL THEN
    INSERT INTO public.user_leave_balances (user_id)
    VALUES (NEW.user_id)
    RETURNING id INTO v_balance_id;
    RAISE NOTICE 'Initialized balance for user %: balance_id=%', NEW.user_id, v_balance_id;
  END IF;

  v_column_name := CASE
    WHEN v_leave_type ILIKE '%forced%' THEN 'forced_leave_balance'
    WHEN v_leave_type ILIKE '%special%' OR v_leave_type ILIKE '%privilege%' THEN 'special_leave_balance'
    WHEN v_leave_type ILIKE '%wellness%' THEN 'wellness_leave_balance'
    WHEN v_leave_type ILIKE '%sick%' THEN 'sick_leave_balance'
    WHEN v_leave_type ILIKE '%vacation%' THEN 'vacation_leave_balance'
    ELSE NULL
  END;

  IF v_column_name IS NULL THEN
    RAISE NOTICE 'Leave type "%" is not tracked for balance deduction', v_leave_type;
    RETURN NEW;
  END IF;

  EXECUTE format('SELECT %I FROM public.user_leave_balances WHERE id = $1', v_column_name)
  INTO v_previous_balance
  USING v_balance_id;

  v_new_balance := GREATEST(0, v_previous_balance - v_num_days);

  EXECUTE format('UPDATE public.user_leave_balances SET %I = $1, updated_at = NOW() WHERE id = $2', v_column_name)
  USING v_new_balance, v_balance_id;

  INSERT INTO public.leave_balance_transactions (
    user_id, balance_id, transaction_type, leave_type,
    previous_balance, amount_change, new_balance,
    leave_request_id, reason, created_by
  ) VALUES (
    NEW.user_id, v_balance_id, 'deduction',
    REPLACE(v_column_name, '_balance', ''),
    v_previous_balance, -v_num_days, v_new_balance,
    NEW.id, 'Leave approval deduction', 'system'
  );

  RAISE NOTICE '✓ Deducted % days from % for user % (balance: % -> %)',
    v_num_days, v_column_name, NEW.user_id, v_previous_balance, v_new_balance;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to deduct leave balance: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_leave_on_approval
  BEFORE UPDATE OF status ON public.leave_requests
  FOR EACH ROW
  WHEN (NEW.status = 'Approved' AND OLD.status <> 'Approved')
  EXECUTE FUNCTION public.deduct_leave_on_approval();

-- =========================================================
-- Step 3: Manually trigger daily accrual to catch up
-- =========================================================
DO $$
DECLARE
  v_balance RECORD;
  v_previous_vacation DECIMAL(8,3);
  v_previous_sick DECIMAL(8,3);
  v_accrual_amount DECIMAL(8,3);
  v_days_to_process INTEGER;
  v_had_fixed_cap_leave BOOLEAN;
  v_user_created_at DATE;
BEGIN
  FOR v_balance IN SELECT id, user_id, vacation_leave_balance, sick_leave_balance, 
                          daily_accrual_rate, last_accrual_date, total_accrued_days
                   FROM public.user_leave_balances
  LOOP
    SELECT created_at::DATE INTO v_user_created_at
    FROM public.app_accounts
    WHERE id = v_balance.user_id;
    
    v_days_to_process := CURRENT_DATE - GREATEST(v_balance.last_accrual_date, v_user_created_at);
    
    IF v_days_to_process <= 0 THEN
      CONTINUE;
    END IF;
    
    SELECT EXISTS(
      SELECT 1 FROM public.leave_requests lr
      WHERE lr.user_id = v_balance.user_id
        AND lr.status = 'Approved'
        AND lr.details->>'leave_type' IN ('Mandatory/Forced Leave', 'Special Privilege Leave', 'Wellness Leave')
        AND (
          (lr.details->>'start_date')::DATE <= CURRENT_DATE
          AND (lr.details->>'end_date')::DATE >= GREATEST(v_balance.last_accrual_date, v_user_created_at)
        )
    ) INTO v_had_fixed_cap_leave;
    
    IF NOT v_had_fixed_cap_leave THEN
      v_accrual_amount := v_balance.daily_accrual_rate * v_days_to_process;
      
      v_previous_vacation := v_balance.vacation_leave_balance;
      v_previous_sick := v_balance.sick_leave_balance;
      
      UPDATE public.user_leave_balances
      SET 
        vacation_leave_balance = vacation_leave_balance + v_accrual_amount,
        sick_leave_balance = sick_leave_balance + v_accrual_amount,
        last_accrual_date = CURRENT_DATE,
        total_accrued_days = total_accrued_days + v_accrual_amount
      WHERE id = v_balance.id;
      
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_balance.user_id, v_balance.id, 'accrual', 'vacation_leave',
        v_previous_vacation, v_accrual_amount, v_previous_vacation + v_accrual_amount,
        'Catch-up daily accrual (' || v_days_to_process || ' days)', 'system'
      );
      
      INSERT INTO public.leave_balance_transactions (
        user_id, balance_id, transaction_type, leave_type,
        previous_balance, amount_change, new_balance,
        reason, created_by
      ) VALUES (
        v_balance.user_id, v_balance.id, 'accrual', 'sick_leave',
        v_previous_sick, v_accrual_amount, v_previous_sick + v_accrual_amount,
        'Catch-up daily accrual (' || v_days_to_process || ' days)', 'system'
      );
      
      RAISE NOTICE '✓ Accrued % days for user_id % (total days processed: %)', 
        v_accrual_amount, v_balance.user_id, v_days_to_process;
    ELSE
      UPDATE public.user_leave_balances
      SET last_accrual_date = CURRENT_DATE
      WHERE id = v_balance.id;
      
      RAISE NOTICE '- Skipped accrual for user_id % (had fixed-cap leave during period)', v_balance.user_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✓ Step 3 complete: Catch-up accrual processed';
END $$;

COMMIT;

-- =========================================================
-- Step 4: Set up cron jobs safely using dynamic execution
-- =========================================================
DO $$
DECLARE
  v_project_url TEXT;
  v_anon_key TEXT;
  v_daily_sql TEXT;
  v_monthly_sql TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    
    -- Safely extract configurations outside string literals
    v_project_url := current_setting('app.supabase_url', true);
    
    -- Fallback to system strings if your settings environment maps differently
    IF v_project_url IS NULL OR v_project_url = '' THEN
       RAISE NOTICE '⚠ app.supabase_url not set up in configuration variables. Skipping cron scheduling.';
       RETURN;
    END IF;

    v_daily_sql := format('SELECT net.http_post(url := %L, headers := %L, body := %L, timeout := 30)',
                     v_project_url || '/functions/v1/daily-accrual',
                     '{"Content-Type": "application/json", "Authorization": "Bearer system"}'::jsonb,
                     '{}'::jsonb);

    v_monthly_sql := format('SELECT net.http_post(url := %L, headers := %L, body := %L, timeout := 30)',
                     v_project_url || '/functions/v1/monthly-reset',
                     '{"Content-Type": "application/json", "Authorization": "Bearer system"}'::jsonb,
                     '{}'::jsonb);

    -- Schedule jobs securely using sanitized string metrics
    PERFORM cron.schedule('daily-leave-accrual', '0 2 * * *', v_daily_sql);
    PERFORM cron.schedule('monthly-leave-reset', '0 3 1 * *', v_monthly_sql);
    
    RAISE NOTICE '✓ Step 4 complete: Cron jobs scheduled successfully.';
  ELSE
    RAISE NOTICE '⚠ Step 4 skipped: pg_cron extension not active or accessible.';
  END IF;
END $$;