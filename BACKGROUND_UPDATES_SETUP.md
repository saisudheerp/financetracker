# 🚀 Quick Setup Guide - Background Updates

## What This Does

Your finance tracker will now update automatically **even when the website is closed**:

- ✅ Stock prices updated daily at 3:30 PM IST
- ✅ Mutual fund NAVs updated daily at 3:30 PM IST
- ✅ Portfolio snapshots saved for all users
- ✅ Works in the background (no need to open website)

## Setup (5 minutes)

### Step 1: Install Supabase CLI

```powershell
npm install -g supabase
```

### Step 2: Login

```powershell
supabase login
```

This will open a browser - authorize the app.

### Step 3: Find Your Project Reference

1. Go to https://supabase.com/dashboard
2. Open your project
3. Go to Settings → General
4. Copy your "Reference ID" (looks like: `hyvrwyavsmjsrkvbprlg`)

### Step 4: Link Your Project

```powershell
cd d:\web_development\financetracker
supabase link --project-ref YOUR_REFERENCE_ID
```

Replace `YOUR_REFERENCE_ID` with the ID from Step 3.

### Step 5: Deploy the Function

```powershell
.\deploy-functions.ps1
```

Or manually:

```powershell
supabase functions deploy daily-portfolio-update
```

### Step 6: Enable Cron Schedule

1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/functions
2. Click on `daily-portfolio-update`
3. Click "Enable Cron"
4. Enter cron expression: `0 10 * * 1-5`
5. Save

**Done! 🎉**

## Verify It's Working

### Test Immediately (Manual Trigger):

```powershell
supabase functions invoke daily-portfolio-update
```

### Check Logs:

```powershell
supabase functions logs daily-portfolio-update
```

You should see:

```
🚀 Starting daily portfolio update...
📊 Updating prices for X unique symbols...
✅ RELIANCE.NS: ₹2450.50
✅ 120503: ₹145.67
💾 Saved X prices to database
📸 Snapshot saved for user abc123: ₹150000.00
✅ Daily update complete
```

## When Does It Run?

**Every weekday at 3:30 PM IST** (when market closes)

- Monday to Friday only
- Automatically, no intervention needed
- Even if nobody is using the website

## Cost

**FREE** - Supabase gives 2 million function invocations/month for free.
This uses ~20/month (weekdays only).

## Troubleshooting

### "Deployment failed"

```powershell
# Login again
supabase login

# Link project again
supabase link --project-ref YOUR_REF_ID

# Try deploying again
supabase functions deploy daily-portfolio-update
```

### "Prices not updating"

1. Check if cron is enabled in Supabase Dashboard
2. View logs: `supabase functions logs daily-portfolio-update`
3. Make sure RLS policies allow INSERT/UPDATE (see FIX_PORTFOLIO_PRICES_RLS.sql)

### "Function runs but no updates"

Check database permissions:

1. Go to Supabase Dashboard → SQL Editor
2. Run the script: `SQL Scripts\FIX_PORTFOLIO_PRICES_RLS.sql`

## Disable Auto-Updates

If you want to stop automatic updates:

1. Go to Supabase Dashboard → Functions
2. Click on `daily-portfolio-update`
3. Disable "Cron Schedule"

## Need Help?

Check these files:

- `supabase/functions/README.md` - Detailed documentation
- `supabase/functions/daily-portfolio-update/index.ts` - Function code
- Logs: `supabase functions logs daily-portfolio-update --tail`
