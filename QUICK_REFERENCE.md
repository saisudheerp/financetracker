# ⚡ Quick Reference - Site Automation

## 🚀 Deploy (One Command)
```powershell
.\deploy-all-functions.ps1
```

## 🧪 Test (One Command)
```powershell
.\test-all-functions.ps1
```

## 📊 View Logs
```powershell
supabase functions logs daily-portfolio-update --tail
supabase functions logs process-recurring-transactions --tail
supabase functions logs daily-site-maintenance --tail
```

## ⏰ Cron Schedules (Set in Dashboard)

| Function | Schedule | Time |
|----------|----------|------|
| daily-portfolio-update | `0 10 * * 1-5` | 3:30 PM IST (weekdays) |
| process-recurring-transactions | `0 * * * *` | Every hour |
| daily-site-maintenance | `30 18 * * *` | Midnight IST |

## ✅ What's Automated

- ✅ Stock/MF prices (weekdays 3:30 PM)
- ✅ Recurring transactions (hourly)
- ✅ Database cleanup (daily midnight)
- ✅ Budget tracking (daily midnight)
- ✅ Savings goals (daily midnight)
- ✅ Analytics (daily midnight)

## 💰 Cost
**$0/month** (770 invocations, free tier = 2M)

## 📖 Full Docs
- `COMPLETE_AUTOMATION_GUIDE.md` - Complete guide
- `AUTOMATION_SUMMARY.md` - Deployment summary
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step
