-- =========================================================
-- EMERGENCY DATA RECOVERY SCRIPT
-- =========================================================
-- This script checks for data loss and attempts recovery
-- 
-- DO NOT RUN THIS WITHOUT BACKUP FIRST
-- Run in Supabase Dashboard → SQL Editor
-- =========================================================

-- Step 1: Check current state of all tables
SELECT 'app_accounts' as table_name, COUNT(*) as record_count FROM public.app_accounts
UNION ALL
SELECT 'leave_requests' as table_name, COUNT(*) as record_count FROM public.leave_requests
UNION ALL
SELECT 'user_leave_balances' as table_name, COUNT(*) as record_count FROM public.user_leave_balances
UNION ALL
SELECT 'leave_balance_transactions' as table_name, COUNT(*) as record_count FROM public.leave_balance_transactions;

-- Step 2: Check if data exists in transaction history (may contain record of deleted data)
SELECT * FROM public.leave_balance_transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- Step 3: Check Supabase's built-in replication/slot status
SELECT * FROM pg_replication_slots;

-- Step 4: Check for any recent destructive operations
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%DELETE%' OR query LIKE '%TRUNCATE%' OR query LIKE '%DROP%'
ORDER BY calls DESC
LIMIT 10;

-- Step 5: Check if there are any archived/backup tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%backup%' OR table_name LIKE '%archive%' OR table_name LIKE '%old%');

-- Step 6: Check vacuum status (might recover deleted rows)
SELECT relname, last_vacuum, last_autovacuum, vacuum_count, autovacuum_count
FROM pg_stat_user_tables
WHERE relname IN ('app_accounts', 'leave_requests', 'user_leave_balances', 'leave_balance_transactions');
