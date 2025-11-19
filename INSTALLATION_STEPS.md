# 🚀 Step-by-Step Deployment Instructions

## ⚠️ Prerequisites Setup (Do This First!)

### Option 1: Install Supabase CLI via npm (Recommended)

**In PowerShell, run:**
```powershell
npm install -g supabase
```

If that fails, try:
```powershell
npm install -g @supabase/supabase-js supabase
```

### Option 2: Download Supabase CLI Manually

1. Go to: https://github.com/supabase/cli/releases/latest
2. Download: `supabase_windows_amd64.zip`
3. Extract to a folder (e.g., `C:\supabase`)
4. Add to PATH:
   ```powershell
   $env:Path += ";C:\supabase"
   ```

### Option 3: Use Supabase Dashboard (No CLI Needed!)

You can deploy functions directly from the Supabase Dashboard:

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **Functions** in left sidebar
4. Click **Create a new function**
5. Copy paste each function code manually

---

## 📍 Where to Execute Step 1

**Current Directory:** `D:\web_development\financetracker`  
**Terminal:** PowerShell (you're already here ✅)

---

## 🎯 Step 1: Login to Supabase

### After CLI is installed, run:

```powershell
# 1. Login to Supabase
supabase login
```

This will:
- Open your browser
- Ask you to authorize the CLI
- Return to terminal when done

### 2. Link Your Project

```powershell
supabase link --project-ref YOUR_PROJECT_REF
```

**Find YOUR_PROJECT_REF:**
- Go to: https://supabase.com/dashboard
- Select your project
- Go to: **Settings** → **General**
- Copy the **Reference ID**
- Paste it in the command above

---

## 🚀 Step 2: Deploy Functions

### Option A: Deploy All at Once (Recommended)

```powershell
# From: D:\web_development\financetracker
.\deploy-all-functions.ps1
```

### Option B: Deploy One by One

```powershell
supabase functions deploy daily-portfolio-update
supabase functions deploy process-recurring-transactions
supabase functions deploy daily-site-maintenance
```

---

## ⏰ Step 3: Enable Cron Schedules

**Go to Supabase Dashboard:**
1. https://supabase.com/dashboard
2. Select your project
3. Click **Functions** in left sidebar
4. For **each function**, click on it
5. Scroll to **Cron Schedule** section
6. Click **Enable Cron**
7. Enter the schedule:

| Function | Cron Expression | Paste This |
|----------|----------------|-----------|
| daily-portfolio-update | Weekdays 3:30 PM IST | `0 10 * * 1-5` |
| process-recurring-transactions | Every hour | `0 * * * *` |
| daily-site-maintenance | Midnight IST | `30 18 * * *` |

8. Click **Save**

---

## 🧪 Step 4: Test Functions

```powershell
# Test all
.\test-all-functions.ps1

# OR test individually
supabase functions invoke daily-portfolio-update
supabase functions invoke process-recurring-transactions
supabase functions invoke daily-site-maintenance
```

---

## 🔍 Step 5: Verify

```powershell
# View logs
supabase functions logs daily-portfolio-update --tail
supabase functions logs process-recurring-transactions --tail
supabase functions logs daily-site-maintenance --tail
```

---

## 🐛 Troubleshooting

### "supabase: command not found"

**Fix:** Install Supabase CLI (see Prerequisites above)

### "Not logged in"

**Fix:** Run `supabase login`

### "Project not found"

**Fix:** Run `supabase link --project-ref YOUR_REF`

### "Permission denied on .ps1 script"

**Fix:** Run this first:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 📝 Summary of Commands

```powershell
# 1. Install CLI (choose one method from Prerequisites)
npm install -g supabase

# 2. Login
supabase login

# 3. Link project
supabase link --project-ref YOUR_PROJECT_REF

# 4. Deploy
.\deploy-all-functions.ps1

# 5. Test
.\test-all-functions.ps1

# 6. View logs
supabase functions logs daily-portfolio-update --tail
```

---

## ✅ Current Status

- ✅ Edge Functions created (3 files)
- ✅ Cron configs ready
- ✅ TypeScript errors fixed (0 errors)
- ✅ Deployment scripts ready
- ⏳ **Next: Install Supabase CLI**
- ⏳ **Then: Run deployment commands above**

---

**Need Help?** Check `COMPLETE_AUTOMATION_GUIDE.md` for full details.
