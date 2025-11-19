# 🚀 Complete Site Automation Setup

## Overview

Your Finance Tracker now has **3 automated Edge Functions** that keep the entire site updated even when nobody is using it:

1. **daily-portfolio-update** - Updates stock/mutual fund prices (3:30 PM IST, weekdays)
2. **process-recurring-transactions** - Processes recurring income/expenses (every hour)
3. **daily-site-maintenance** - Daily cleanup and maintenance tasks (midnight IST)

---

## ✨ What Gets Updated Automatically

### Portfolio (Already Working)
- ✅ Stock prices from Yahoo Finance
- ✅ Mutual fund NAV from MFAPI
- ✅ Daily portfolio snapshots
- ✅ Price change alerts

### Recurring Transactions (NEW)
- ✅ Auto-creates transactions when due
- ✅ Updates next due dates
- ✅ Processes daily, weekly, monthly, quarterly, yearly schedules
- ✅ Marks transactions as "Auto-generated"

### Site Maintenance (NEW)
- ✅ Cleans up old portfolio history (>90 days)
- ✅ Cleans up old price alerts (>30 days)
- ✅ Updates budget goal progress
- ✅ Checks and marks achieved savings goals
- ✅ Generates daily analytics summaries

---

## 📅 Automation Schedule

| Function | Schedule | Time (IST) | Runs When |
|----------|----------|------------|-----------|
| **daily-portfolio-update** | `0 10 * * 1-5` | 3:30 PM | Weekdays only |
| **process-recurring-transactions** | `0 * * * *` | Every hour | Every day |
| **daily-site-maintenance** | `30 18 * * *` | Midnight (12:00 AM) | Every day |

---

## 🛠️ Deployment Steps

### Step 1: Deploy All Edge Functions

```powershell
# Make sure you're logged in and linked
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all three functions
supabase functions deploy daily-portfolio-update
supabase functions deploy process-recurring-transactions
supabase functions deploy daily-site-maintenance
```

### Step 2: Enable Cron Schedules

For **each function**, go to Supabase Dashboard → Functions → [Function Name] → Enable Cron:

1. **daily-portfolio-update**
   - Schedule: `0 10 * * 1-5`
   - Description: "Update portfolio prices at 3:30 PM IST on weekdays"

2. **process-recurring-transactions**
   - Schedule: `0 * * * *`
   - Description: "Process recurring transactions every hour"

3. **daily-site-maintenance**
   - Schedule: `30 18 * * *`
   - Description: "Daily maintenance at midnight IST"

### Step 3: Run RLS SQL (If Not Already Done)

```sql
-- In Supabase SQL Editor, run:
-- SQL Scripts/FIX_PORTFOLIO_PRICES_RLS.sql
```

### Step 4: Test Each Function

```powershell
# Test portfolio update
supabase functions invoke daily-portfolio-update

# Test recurring transactions
supabase functions invoke process-recurring-transactions

# Test maintenance
supabase functions invoke daily-site-maintenance

# Check logs for each
supabase functions logs daily-portfolio-update --tail
supabase functions logs process-recurring-transactions --tail
supabase functions logs daily-site-maintenance --tail
```

---

## 🎯 How Each Function Works

### 1. Daily Portfolio Update

**Runs:** 3:30 PM IST (weekdays)

**What it does:**
1. Fetches all unique stock symbols and mutual fund codes from database
2. Calls Yahoo Finance API for stock prices
3. Calls MFAPI for mutual fund NAV
4. Updates `portfolio_prices` table with latest prices
5. Creates daily snapshots in `portfolio_history` for all users
6. Calculates portfolio gains/losses

**Benefits:**
- Your portfolio is always up-to-date
- Historical charts have accurate data
- No need to open the site for price updates
- Works for ALL users simultaneously

---

### 2. Process Recurring Transactions

**Runs:** Every hour

**What it does:**
1. Checks `recurring_transactions` table for due transactions
2. For each due transaction:
   - Creates actual transaction in `transactions` table
   - Marks it as "Auto-generated"
   - Calculates next due date based on frequency
   - Updates `next_due_date` and `last_processed`
3. Handles daily, weekly, monthly, quarterly, yearly frequencies

**Benefits:**
- Never forget to record recurring income/expenses
- Rent, salaries, subscriptions auto-recorded
- Perfect for budgeting and forecasting
- Automatic payment tracking

**Example:**
- You set "Netflix Subscription" as monthly ₹500
- Every month on the due date, function creates the transaction automatically
- Updates next month's date
- You see it in your transactions without doing anything

---

### 3. Daily Site Maintenance

**Runs:** Midnight IST

**What it does:**

**Task 1: Portfolio History Cleanup**
- Deletes portfolio snapshots older than 90 days
- Keeps database size manageable
- Retains 3 months of history for charts

**Task 2: Alerts Cleanup**
- Deletes price alerts older than 30 days
- Reduces noise from old notifications
- Keeps recent alerts only

**Task 3: Budget Progress Update**
- Recalculates spent amounts for all budget goals
- Updates monthly/quarterly/yearly tracking
- Helps with budget monitoring

**Task 4: Savings Goals Check**
- Checks if any savings goal reached target
- Auto-marks goals as "achieved"
- Triggers achievement badges

**Task 5: Daily Analytics**
- Generates daily income/expense summaries
- Creates data for trend analysis
- Prepares reports for all users

**Benefits:**
- Clean, optimized database
- Accurate budget tracking
- Automatic goal achievements
- Daily financial insights

---

## 📊 Monitoring & Logs

### View Real-time Logs

```powershell
# Portfolio updates
supabase functions logs daily-portfolio-update --tail

# Recurring transactions
supabase functions logs process-recurring-transactions --tail

# Maintenance tasks
supabase functions logs daily-site-maintenance --tail
```

### Check Execution History

Go to Supabase Dashboard → Functions → [Function Name] → Executions

You'll see:
- Number of executions
- Success/failure rate
- Execution duration
- Error messages (if any)

---

## 🔍 Verification

### After Deploying, Verify:

**Portfolio Updates:**
```sql
-- Check latest prices
SELECT symbol, current_price, last_updated 
FROM portfolio_prices 
ORDER BY last_updated DESC;

-- Check daily snapshots
SELECT user_id, snapshot_date, total_value 
FROM portfolio_history 
ORDER BY snapshot_date DESC 
LIMIT 20;
```

**Recurring Transactions:**
```sql
-- Check processed recurring transactions
SELECT * FROM recurring_transactions 
WHERE last_processed IS NOT NULL 
ORDER BY last_processed DESC;

-- Check auto-generated transactions
SELECT * FROM transactions 
WHERE description LIKE '%Auto-generated%' 
ORDER BY date DESC;
```

**Maintenance Tasks:**
```sql
-- Check database size is reasonable
SELECT 
  COUNT(*) as total_snapshots,
  MIN(recorded_at) as oldest,
  MAX(recorded_at) as newest
FROM portfolio_history;

-- Check achieved savings goals
SELECT * FROM savings_goals 
WHERE is_achieved = true;
```

---

## 💰 Cost Analysis

All three functions combined:

| Function | Executions/Month | Cost |
|----------|------------------|------|
| daily-portfolio-update | ~20 (weekdays) | $0 |
| process-recurring-transactions | ~720 (hourly) | $0 |
| daily-site-maintenance | ~30 (daily) | $0 |
| **TOTAL** | **~770/month** | **$0** |

**Supabase Free Tier:** 2 million invocations/month  
**Your Usage:** 770/month (0.04% of limit)  
**Cost:** $0/month ✅

---

## 🎛️ Configuration

### Change Portfolio Update Time

Edit `supabase/functions/daily-portfolio-update/cron.json`:

```json
{
  "schedule": "0 10 * * 1-5",  // Change time here
  "description": "Update at 3:30 PM IST"
}
```

Time conversion: IST = UTC + 5:30
- 3:30 PM IST = 10:00 AM UTC (`0 10`)
- 9:00 AM IST = 3:30 AM UTC (`30 3`)

### Change Recurring Processing Frequency

Edit `supabase/functions/process-recurring-transactions/cron.json`:

```json
{
  "schedule": "0 * * * *",  // Currently hourly
  "description": "Process every hour"
}
```

Options:
- Every hour: `0 * * * *`
- Every 6 hours: `0 */6 * * *`
- Every 12 hours: `0 */12 * * *`
- Once daily: `0 0 * * *`

### Change Maintenance Time

Edit `supabase/functions/daily-site-maintenance/cron.json`:

```json
{
  "schedule": "30 18 * * *",  // Midnight IST
  "description": "Daily maintenance"
}
```

---

## 🐛 Troubleshooting

### Function Not Running on Schedule

1. Check cron is enabled in Dashboard
2. Verify cron expression is correct
3. Check function logs for errors
4. Test manual invocation

### Recurring Transactions Not Created

1. Check `is_active = true` in database
2. Verify `next_due_date` is today or earlier
3. Check logs: `supabase functions logs process-recurring-transactions`
4. Test manual run: `supabase functions invoke process-recurring-transactions`

### Portfolio Prices Not Updating

1. Verify RLS policies allow INSERT/UPDATE
2. Check Yahoo Finance/MFAPI are accessible
3. Verify symbols are correct format
4. Check logs for API errors

### Maintenance Tasks Failing

1. Check service role key has full permissions
2. Verify all tables exist
3. Check logs for specific task failures
4. Test manual run

---

## 📱 User Experience

### What Users See:

**Before Automation:**
- Manual refresh needed
- Recurring expenses forgotten
- Stale data in charts
- Budget tracking manual

**After Automation:**
- Fresh data every time they open site
- Recurring transactions auto-created
- Accurate historical charts
- Budgets always up-to-date
- Goals marked achieved automatically
- Database stays clean and fast

**Users Don't Need To:**
- Remember to refresh
- Manually add recurring payments
- Clean up old data
- Track goal achievements
- Do any maintenance

---

## 🎉 Summary

Your Finance Tracker is now **fully automated**:

✅ Portfolio updates automatically (weekdays, 3:30 PM)  
✅ Recurring transactions processed automatically (hourly)  
✅ Database cleaned automatically (daily)  
✅ Budget goals tracked automatically (daily)  
✅ Savings achievements marked automatically (daily)  
✅ Analytics generated automatically (daily)  
✅ Everything works even when site is closed  
✅ Zero monthly cost  

**Your site is now a true "set it and forget it" finance tracker!** 🚀

---

## 📚 Additional Resources

- **DEPLOYMENT_CHECKLIST.md** - Step-by-step deployment
- **DEVELOPER_NOTES.md** - VS Code/Deno warnings explained
- **PROJECT_STATUS.md** - Complete system status
- **FINAL_STATUS.md** - Comprehensive overview

---

**Last Updated:** November 4, 2025  
**Status:** Production Ready  
**Cost:** $0/month  
**Automation:** 100%
