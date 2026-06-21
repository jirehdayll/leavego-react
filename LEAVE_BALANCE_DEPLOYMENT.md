# Leave Balance System Deployment Guide

This guide covers the deployment of the comprehensive leave balance management system with automated accrual, monthly resets, and premium UI overhaul.

## 📋 Overview

The leave balance system includes:
- **Database Schema**: `user_leave_balances` and `leave_balance_transactions` tables
- **PostgreSQL Functions**: Automatic deduction, monthly reset, daily accrual, balance adjustments
- **Edge Functions**: Daily accrual processor and monthly reset scheduler
- **React Context**: State management for leave balances
- **Premium UI**: Overhauled Records page with grid/list views and balance previews

## 🗄️ Database Migration Steps

### Step 1: Create Leave Balance Tables

Run the following SQL in your Supabase Dashboard → SQL Editor:

```bash
# Execute the table creation migration
migrations/create_leave_balances_table.sql
```

This creates:
- `user_leave_balances` table with fixed-cap and accrual-based leave tracking
- `leave_balance_transactions` table for audit trail
- Row-Level Security (RLS) policies
- Indexes for performance optimization

### Step 2: Create PostgreSQL Functions

Run the functions migration:

```bash
# Execute the functions migration
migrations/create_leave_balance_functions.sql
```

This creates:
- `deduct_leave_on_approval()` - Automatic leave deduction on approval
- `reset_fixed_cap_leaves()` - Monthly reset of fixed-cap leaves
- `process_daily_accrual()` - Daily passive accrual processing
- `initialize_user_leave_balance()` - Initialize balance for new users
- `adjust_leave_balance()` - Manual balance adjustments (admin)
- `get_user_leave_balance_summary()` - Get comprehensive balance summary

### Step 3: Initialize Existing Users

After running the migrations, initialize leave balances for existing users:

```sql
-- Initialize balances for all existing employees
INSERT INTO public.user_leave_balances (user_id)
SELECT id FROM public.app_accounts 
WHERE role NOT IN ('admin', 'super_admin')
ON CONFLICT (user_id) DO NOTHING;
```

## 🔧 Edge Functions Deployment

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Deploy Daily Accrual Function

```bash
# Deploy the daily accrual edge function
supabase functions deploy daily-accrual

# The function will be available at:
# https://your-project.supabase.co/functions/v1/daily-accrual
```

### Step 3: Deploy Monthly Reset Function

```bash
# Deploy the monthly reset edge function
supabase functions deploy monthly-reset

# The function will be available at:
# https://your-project.supabase.co/functions/v1/monthly-reset
```

## ⏰ Scheduling Automated Tasks

### Option 1: Supabase Cron Jobs (Recommended)

Add these cron jobs to your Supabase project:

```sql
-- Daily accrual at 2:00 AM UTC
SELECT cron.schedule(
  'daily-leave-accrual',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/daily-accrual',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Monthly reset on the 1st at 3:00 AM UTC
SELECT cron.schedule(
  'monthly-leave-reset',
  '0 3 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/monthly-reset',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

### Option 2: External Cron Service

Use an external service like GitHub Actions, Vercel Cron, or EasyCron:

**Daily Accrual (2:00 AM UTC):**
```
https://your-project.supabase.co/functions/v1/daily-accrual
```

**Monthly Reset (1st at 3:00 AM UTC):**
```
https://your-project.supabase.co/functions/v1/monthly-reset
```

## 🎨 UI Integration

The Records page has been completely overhauled with premium styling. No additional configuration is needed - the changes are already in the codebase.

### Key UI Features:
- **Grid/List View Toggle**: Switch between card grid and list layouts
- **Premium Cards**: Thick borders, rich shadows, gradient accents
- **Balance Previews**: Live leave balance display on employee cards
- **Interactive Filters**: Enhanced department, position, status, and date filters
- **Hunter Green Theme**: Consistent with DENR branding

## 🔒 Security Considerations

### Row-Level Security (RLS)

The migrations include comprehensive RLS policies:

- **Users**: Can view and manage their own balances
- **Admins**: Can view and adjust all balances
- **System**: Can insert/update balances via functions

### Environment Variables

Ensure these are set in your Supabase project:

```bash
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🧪 Testing

### Test Database Functions

```sql
-- Test balance initialization
SELECT initialize_user_leave_balance('user-uuid');

-- Test balance summary
SELECT get_user_leave_balance_summary('user-uuid');

-- Test manual adjustment
SELECT adjust_leave_balance(
  'user-uuid',
  'vacation_leave',
  5.0,
  'Manual adjustment',
  'admin@denr.gov.ph'
);
```

### Test Edge Functions

```bash
# Test daily accrual
curl -X POST https://your-project.supabase.co/functions/v1/daily-accrual \
  -H "Authorization: Bearer your-service-role-key"

# Test monthly reset
curl -X POST https://your-project.supabase.co/functions/v1/monthly-reset \
  -H "Authorization: Bearer your-service-role-key"
```

### Test UI Integration

1. Navigate to `/admin/records`
2. Verify premium grid layout displays
3. Click on an employee card
4. Verify balance modal shows new design with:
   - Fixed-cap leaves (Forced, Special, Wellness)
   - Accrual-based leaves (Vacation, Sick)
   - Progress bars and reset dates

## 📊 Monitoring

### Database Queries

Monitor balance transactions:

```sql
-- Recent balance changes
SELECT 
  t.transaction_type,
  t.leave_type,
  t.amount_change,
  t.created_at,
  a.full_name
FROM leave_balance_transactions t
JOIN app_accounts a ON t.user_id = a.id
ORDER BY t.created_at DESC
LIMIT 50;
```

### Edge Function Logs

View function logs in Supabase Dashboard → Edge Functions → Logs.

## 🚨 Troubleshooting

### Issue: Balances not updating on approval

**Solution**: Verify the trigger is active:
```sql
SELECT * FROM pg_trigger 
WHERE tgname = 'trigger_deduct_leave_on_approval';
```

### Issue: Daily accrual not running

**Solution**: Check cron job status:
```sql
SELECT * FROM cron.job 
WHERE jobname = 'daily-leave-accrual';
```

### Issue: Monthly reset not executing

**Solution**: Manually trigger the function:
```sql
SELECT reset_fixed_cap_leaves();
```

### Issue: UI not showing balances

**Solution**: Ensure LeaveBalanceProvider wraps the app:
```jsx
<LeaveBalanceProvider>
  <App />
</LeaveBalanceProvider>
```

## 📝 Configuration Notes

### Leave Type Caps

- **Forced Leave**: 5 days (resets monthly)
- **Special Leave**: 3 days (resets monthly)
- **Wellness Leave**: 5 days (resets monthly)
- **Vacation Leave**: Unlimited (accrues daily)
- **Sick Leave**: Unlimited (accrues daily, shared with Vacation)

### Accrual Rate

Default daily accrual rate: `0.04167` days/day
- This equals approximately 1.25 days per month (15 days / 365 days)
- Adjust in `user_leave_balances.daily_accrual_rate` column if needed

### Shared Balance Logic

Vacation and Sick Leave share a common pool:
- Deductions from either leave type affect both balances
- Accruals add to both balances simultaneously
- This ensures employees have flexibility in using their accrued time

## 🔄 Rollback Procedure

If issues arise, rollback the migrations:

```sql
-- Drop functions
DROP FUNCTION IF EXISTS deduct_leave_on_approval() CASCADE;
DROP FUNCTION IF EXISTS reset_fixed_cap_leaves() CASCADE;
DROP FUNCTION IF EXISTS process_daily_accrual() CASCADE;
DROP FUNCTION IF EXISTS initialize_user_leave_balance() CASCADE;
DROP FUNCTION IF EXISTS adjust_leave_balance() CASCADE;
DROP FUNCTION IF EXISTS get_user_leave_balance_summary() CASCADE;

-- Drop tables
DROP TABLE IF EXISTS leave_balance_transactions CASCADE;
DROP TABLE IF EXISTS user_leave_balances CASCADE;

-- Remove cron jobs
SELECT cron.unschedule('daily-leave-accrual');
SELECT cron.unschedule('monthly-leave-reset');
```

## ✅ Deployment Checklist

- [ ] Run `create_leave_balances_table.sql` migration
- [ ] Run `create_leave_balance_functions.sql` migration
- [ ] Initialize balances for existing users
- [ ] Deploy `daily-accrual` edge function
- [ ] Deploy `monthly-reset` edge function
- [ ] Schedule daily accrual cron job (2:00 AM UTC)
- [ ] Schedule monthly reset cron job (1st at 3:00 AM UTC)
- [ ] Verify RLS policies are active
- [ ] Test balance initialization
- [ ] Test balance deduction on approval
- [ ] Test manual balance adjustment
- [ ] Verify UI displays balances correctly
- [ ] Monitor first daily accrual execution
- [ ] Monitor first monthly reset execution

## 📞 Support

For issues or questions:
1. Check Supabase Dashboard logs
2. Review database function outputs
3. Verify cron job schedules
4. Test edge functions manually
5. Check browser console for UI errors

---

**System Version**: 1.0.0  
**Last Updated**: 2026-06-19  
**Database**: PostgreSQL 15+  
**Runtime**: Node.js 18+ / Deno for Edge Functions
