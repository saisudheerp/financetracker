# Supabase Edge Functions for Background Updates

## Overview

This directory contains Supabase Edge Functions that run automatically in the background to keep your finance tracker updated even when the website is closed.

## Functions

### 1. **daily-portfolio-update**

- **Schedule**: Every weekday at 3:30 PM IST (market close)
- **What it does**:
  - Fetches latest stock prices from Yahoo Finance
  - Fetches latest mutual fund NAVs from MFAPI
  - Updates `portfolio_prices` table
  - Creates daily snapshots in `portfolio_history` table for all users
  - Works for ALL users, not just active ones

## Setup Instructions

### Prerequisites

1. Install Supabase CLI:

   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:

   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   Find your project ref in: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/general

### Deploy the Edge Function

1. Deploy the function:

   ```bash
   supabase functions deploy daily-portfolio-update
   ```

2. Set up the cron schedule in Supabase Dashboard:
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/functions
   - Click on `daily-portfolio-update`
   - Enable "Cron Schedule"
   - Use cron expression: `0 10 * * 1-5` (3:30 PM IST / 10:00 AM UTC, weekdays only)

### Verify It's Working

1. **Test manually** (trigger immediately):

   ```bash
   supabase functions invoke daily-portfolio-update
   ```

2. **Check logs**:

   ```bash
   supabase functions logs daily-portfolio-update
   ```

3. **Monitor in Dashboard**:
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/functions
   - Click on `daily-portfolio-update` → Logs

## Cron Schedule Explanation

```
0 10 * * 1-5
│ │  │ │ │
│ │  │ │ └─ Day of week (1-5 = Monday-Friday)
│ │  │ └─── Month (any)
│ │  └───── Day of month (any)
│ └──────── Hour (10 = 10 AM UTC = 3:30 PM IST)
└────────── Minute (0)
```

**Why 10 AM UTC?**

- India is UTC+5:30
- 10:00 AM UTC = 3:30 PM IST
- Stock market closes at 3:30 PM IST

## Environment Variables

The function automatically has access to:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (full access)

No additional setup needed!

## What Happens Automatically

Every weekday at 3:30 PM IST:

1. ✅ Fetches prices for ALL symbols in database
2. ✅ Updates `portfolio_prices` table
3. ✅ Creates snapshots for ALL users in `portfolio_history`
4. ✅ Works even if nobody is using the website
5. ✅ Logs everything for debugging

## Monitoring & Debugging

### Check if cron is running:

```bash
supabase functions logs daily-portfolio-update --tail
```

### Manual trigger (test):

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-portfolio-update \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### View execution history:

- Dashboard → Functions → daily-portfolio-update → Executions

## Cost Considerations

- **Edge Functions**: First 2 million requests/month FREE
- **Cron executions**: ~20 per month (weekdays only)
- **Expected cost**: $0/month (well within free tier)

## Troubleshooting

### Function not running at scheduled time?

1. Check cron is enabled in Dashboard
2. Verify cron expression is correct
3. Check function logs for errors

### Prices not updating?

1. Check function logs: `supabase functions logs daily-portfolio-update`
2. Verify RLS policies allow INSERT/UPDATE on `portfolio_prices`
3. Test manually: `supabase functions invoke daily-portfolio-update`

### How to disable auto-updates?

1. Go to Dashboard → Functions
2. Click on `daily-portfolio-update`
3. Disable "Cron Schedule"

## Backup & Recovery

The function is stateless and idempotent:

- ✅ Safe to run multiple times
- ✅ Overwrites old prices with latest
- ✅ No risk of duplicate snapshots (uses timestamps)

## Future Enhancements

Possible improvements:

- [ ] Add email notifications for significant price changes
- [ ] Add webhook for real-time updates
- [ ] Support for international markets (NYSE, NASDAQ)
- [ ] Custom alert thresholds per user
- [ ] Weekly/monthly summary emails
