#!/usr/bin/env pwsh

# ============================================
# Deploy All Automation Functions
# ============================================

Write-Host "🚀 Deploying Finance Tracker Automation Functions..." -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
try {
    $version = supabase --version
    Write-Host "✅ Supabase CLI installed: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not found. Installing..." -ForegroundColor Red
    npm install -g supabase
}

Write-Host ""
Write-Host "📦 Deploying 3 Edge Functions..." -ForegroundColor Yellow
Write-Host ""

# Deploy Function 1: Portfolio Updates
Write-Host "1️⃣ Deploying daily-portfolio-update..." -ForegroundColor Cyan
try {
    supabase functions deploy daily-portfolio-update --no-verify-jwt
    Write-Host "   ✅ daily-portfolio-update deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed to deploy daily-portfolio-update" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host ""

# Deploy Function 2: Recurring Transactions
Write-Host "2️⃣ Deploying process-recurring-transactions..." -ForegroundColor Cyan
try {
    supabase functions deploy process-recurring-transactions --no-verify-jwt
    Write-Host "   ✅ process-recurring-transactions deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed to deploy process-recurring-transactions" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host ""

# Deploy Function 3: Daily Maintenance
Write-Host "3️⃣ Deploying daily-site-maintenance..." -ForegroundColor Cyan
try {
    supabase functions deploy daily-site-maintenance --no-verify-jwt
    Write-Host "   ✅ daily-site-maintenance deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed to deploy daily-site-maintenance" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ All functions deployed!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to Supabase Dashboard → Functions" -ForegroundColor White
Write-Host ""
Write-Host "2. Enable Cron for each function:" -ForegroundColor White
Write-Host "   • daily-portfolio-update: 0 10 * * 1-5" -ForegroundColor Gray
Write-Host "   • process-recurring-transactions: 0 * * * *" -ForegroundColor Gray
Write-Host "   • daily-site-maintenance: 30 18 * * *" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test each function:" -ForegroundColor White
Write-Host "   supabase functions invoke daily-portfolio-update" -ForegroundColor Gray
Write-Host "   supabase functions invoke process-recurring-transactions" -ForegroundColor Gray
Write-Host "   supabase functions invoke daily-site-maintenance" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Monitor logs:" -ForegroundColor White
Write-Host "   supabase functions logs [function-name] --tail" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 See COMPLETE_AUTOMATION_GUIDE.md for full details" -ForegroundColor Cyan
Write-Host ""
