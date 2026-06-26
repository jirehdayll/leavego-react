-- Check if leave balance tables exist
SELECT 
  'user_leave_balances' as table_name,
  COUNT(*) as record_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'user_leave_balances'
UNION ALL
SELECT 
  'leave_balance_transactions' as table_name,
  COUNT(*) as record_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'leave_balance_transactions';

-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_deduct_leave_on_approval';

-- Check if balance records exist for users
SELECT 
  user_id,
  forced_leave_balance,
  special_leave_balance,
  wellness_leave_balance,
  vacation_leave_balance,
  sick_leave_balance
FROM public.user_leave_balances
LIMIT 5;
