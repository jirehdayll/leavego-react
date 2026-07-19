# 🚨 EMERGENCY DATA LOSS RESPONSE GUIDE

## IMMEDIATE ACTIONS REQUIRED

### 1. DO NOT PANIC - Data May Still Exist
Your data might not actually be deleted. Common causes of "data disappearance":

1. **Row Level Security (RLS) Policies** - Data exists but policies block access
2. **Wrong Database/Project** - Connected to wrong Supabase project
3. **Environment Variables** - Using placeholder credentials instead of real ones
4. **Caching Issues** - Frontend showing cached empty state

### 2. IMMEDIATE DIAGNOSTIC STEPS

#### Step 1: Check Supabase Dashboard Directly
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Table Editor → Check if data exists in:
   - `app_accounts` table
   - `leave_requests` table  
   - `user_leave_balances` table

#### Step 2: Run Emergency Scripts in Order
Run these in Supabase Dashboard → SQL Editor:

1. **`migrations/EMERGENCY_ACCOUNT_CHECK.sql`**
   - Checks if tables exist and have data
   - Shows current record counts
   - Identifies if data was actually deleted

2. **`migrations/EMERGENCY_RLS_CHECK.sql`**
   - Checks if RLS policies are blocking access
   - Can temporarily disable RLS to verify data exists

3. **`migrations/EMERGENCY_DATA_RECOVERY.sql`**
   - Checks for backup/replication data
   - Looks for transaction history
   - Identifies recent destructive operations

### 3. CHECK YOUR .ENV FILE
Your `.env` file might be pointing to the wrong project:

```bash
# Check if you're using placeholder credentials
VITE_SUPABASE_URL=https://your-project-id.supabase.co  # ❌ WRONG
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here  # ❌ WRONG

# Should be:
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co  # ✅ CORRECT
VITE_SUPABASE_ANON_KEY=your-actual-anon-key  # ✅ CORRECT
```

### 4. RESTART YOUR DEVELOPMENT SERVER
After updating `.env`, restart your server:
```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

## DATA RECOVERY OPTIONS

### Option 1: Data Exists But RLS Blocking It
**Solution**: Fix RLS policies (scripts will identify the issue)

### Option 2: Connected to Wrong Project  
**Solution**: Update `.env` with correct credentials

### Option 3: Data Actually Deleted
**Recovery Options**:
1. **Supabase Point-in-Time Recovery** (if available in your plan)
2. **Database backups** (if enabled)
3. **Transaction logs** (may contain recoverable data)

## PREVENTION MEASURES

### Immediate:
1. **Enable database backups** in Supabase Dashboard
2. **Export current data** before running any migrations
3. **Test migrations on staging** first

### Long-term:
1. Implement regular automated backups
2. Add data validation before destructive operations
3. Create disaster recovery plan

## CONTACT SUPPORT

If data is truly deleted and recovery options fail:
- Supabase Support: https://supabase.com/support
- Check if your plan includes point-in-time recovery

## CRITICAL: Do These NOW

1. ✅ Check Supabase Dashboard directly (bypass your app)
2. ✅ Run the emergency diagnostic scripts
3. ✅ Verify your `.env` credentials are correct
4. ✅ Restart your development server
5. ✅ Do NOT run any more migrations until data is verified

---

**Remember**: The most common cause of "missing data" is actually connecting to the wrong database or RLS policies blocking access. Your data is likely still there!
