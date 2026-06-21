-- =========================================================
-- Leave Balance System Schema
-- =========================================================
-- This migration creates the user_leave_balances table to track
-- leave balances for all employees with support for:
-- - Fixed-cap leaves (Forced, Special, Wellness) with monthly resets
-- - Accrual-based leaves (Vacation, Sick) with shared balance
-- - Daily passive accrual tracking
-- - Transaction history for audit trail
--
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

BEGIN;

-- Create user_leave_balances table
CREATE TABLE IF NOT EXISTS public.user_leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_accounts(id) ON DELETE CASCADE,
  
  -- Fixed-cap leaves (reset monthly)
  forced_leave_balance DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  special_leave_balance DECIMAL(5,2) NOT NULL DEFAULT 3.00,
  wellness_leave_balance DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  
  -- Accrual-based leaves (shared balance)
  vacation_leave_balance DECIMAL(8,3) NOT NULL DEFAULT 0.000,
  sick_leave_balance DECIMAL(8,3) NOT NULL DEFAULT 0.000,
  
  -- Accrual tracking
  daily_accrual_rate DECIMAL(8,5) NOT NULL DEFAULT 0.04167, -- ~1.25 days per month (15 days / 365 days)
  last_accrual_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_accrued_days DECIMAL(8,3) NOT NULL DEFAULT 0.000,
  
  -- Reset tracking
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reset_cycle_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT user_leave_balances_user_id_unique UNIQUE (user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_leave_balances_user_id ON public.user_leave_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_leave_balances_last_reset_date ON public.user_leave_balances(last_reset_date);
CREATE INDEX IF NOT EXISTS idx_user_leave_balances_last_accrual_date ON public.user_leave_balances(last_accrual_date);

-- Enable Row Level Security
-- Note: Temporarily disabled to allow trigger functions to work
-- ALTER TABLE public.user_leave_balances ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_leave_balances'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_leave_balances;', pol.policyname);
  END LOOP;
END $$;

-- Policy: Users can view their own leave balances
CREATE POLICY "Users can view own leave balances"
ON public.user_leave_balances
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Admins can view all leave balances
CREATE POLICY "Admins can view all leave balances"
ON public.user_leave_balances
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.app_accounts 
    WHERE id::text = auth.uid()::text 
    AND role IN ('admin', 'cenro', 'super_admin')
  )
);

-- Policy: Service role can manage leave balances
CREATE POLICY "Service role can manage leave balances"
ON public.user_leave_balances
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_leave_balances TO anon, authenticated, service_role;

-- Create leave_balance_transactions table for audit trail
CREATE TABLE IF NOT EXISTS public.leave_balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_accounts(id) ON DELETE CASCADE,
  balance_id UUID NOT NULL REFERENCES public.user_leave_balances(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type TEXT NOT NULL, -- 'deduction', 'reset', 'accrual', 'adjustment'
  leave_type TEXT NOT NULL, -- 'forced_leave', 'special_leave', 'wellness_leave', 'vacation_leave', 'sick_leave'
  
  -- Amount changes
  previous_balance DECIMAL(8,3) NOT NULL,
  amount_change DECIMAL(8,3) NOT NULL,
  new_balance DECIMAL(8,3) NOT NULL,
  
  -- Reference
  leave_request_id UUID REFERENCES public.leave_requests(id) ON DELETE SET NULL,
  reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);

-- Create indexes for transaction table
CREATE INDEX IF NOT EXISTS idx_leave_balance_transactions_user_id ON public.leave_balance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_balance_transactions_balance_id ON public.leave_balance_transactions(balance_id);
CREATE INDEX IF NOT EXISTS idx_leave_balance_transactions_leave_request_id ON public.leave_balance_transactions(leave_request_id);
CREATE INDEX IF NOT EXISTS idx_leave_balance_transactions_transaction_type ON public.leave_balance_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_leave_balance_transactions_created_at ON public.leave_balance_transactions(created_at);

-- Enable RLS on transactions
-- Note: Temporarily disabled to allow trigger functions to work
-- ALTER TABLE public.leave_balance_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing transaction policies
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leave_balance_transactions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.leave_balance_transactions;', pol.policyname);
  END LOOP;
END $$;

-- Transaction policies
CREATE POLICY "Users can view own transactions"
ON public.leave_balance_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
ON public.leave_balance_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.app_accounts 
    WHERE id::text = auth.uid()::text 
    AND role IN ('admin', 'cenro', 'super_admin')
  )
);

CREATE POLICY "Service role can manage transactions"
ON public.leave_balance_transactions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_balance_transactions TO anon, authenticated, service_role;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_leave_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_leave_balances_updated_at ON public.user_leave_balances;
CREATE TRIGGER trigger_update_leave_balances_updated_at
  BEFORE UPDATE ON public.user_leave_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_balances_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.user_leave_balances IS 'Tracks leave balances for all employees with support for fixed-cap and accrual-based leaves';
COMMENT ON COLUMN public.user_leave_balances.user_id IS 'Reference to the app_accounts table';
COMMENT ON COLUMN public.user_leave_balances.forced_leave_balance IS 'Fixed-cap leave: resets to 5.00 monthly';
COMMENT ON COLUMN public.user_leave_balances.special_leave_balance IS 'Fixed-cap leave: resets to 3.00 monthly';
COMMENT ON COLUMN public.user_leave_balances.wellness_leave_balance IS 'Fixed-cap leave: resets to 5.00 monthly';
COMMENT ON COLUMN public.user_leave_balances.vacation_leave_balance IS 'Accrual-based leave: shared with sick leave';
COMMENT ON COLUMN public.user_leave_balances.sick_leave_balance IS 'Accrual-based leave: shared with vacation leave';
COMMENT ON COLUMN public.user_leave_balances.daily_accrual_rate IS 'Daily accrual rate (default: 0.04167 = ~1.25 days/month)';
COMMENT ON COLUMN public.user_leave_balances.last_accrual_date IS 'Last date when daily accrual was processed';
COMMENT ON COLUMN public.user_leave_balances.last_reset_date IS 'Last date when fixed-cap leaves were reset';
COMMENT ON COLUMN public.user_leave_balances.reset_cycle_count IS 'Number of reset cycles completed';

COMMENT ON TABLE public.leave_balance_transactions IS 'Audit trail for all leave balance changes';
COMMENT ON COLUMN public.leave_balance_transactions.transaction_type IS 'Type of transaction: deduction, reset, accrual, adjustment';
COMMENT ON COLUMN public.leave_balance_transactions.leave_type IS 'Type of leave affected';
COMMENT ON COLUMN public.leave_balance_transactions.amount_change IS 'Positive for accruals/additions, negative for deductions';

COMMIT;

-- Verify tables were created
SELECT 
  'user_leave_balances' as table_name,
  COUNT(*) as record_count
FROM public.user_leave_balances
UNION ALL
SELECT 
  'leave_balance_transactions' as table_name,
  COUNT(*) as record_count
FROM public.leave_balance_transactions;
