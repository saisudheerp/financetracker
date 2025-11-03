# =============================================
# Deploy Supabase Edge Functions
# Run this script to deploy background updates
# =============================================

Write-Host "🚀 Deploying Supabase Edge Functions..." -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
Write-Host "Checking Supabase CLI..." -ForegroundColor Yellow
$supabaseVersion = supabase --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install it with:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host ""
    exit 1
}
Write-Host "✅ Supabase CLI installed: $supabaseVersion" -ForegroundColor Green
Write-Host ""

# Deploy the function
Write-Host "Deploying daily-portfolio-update function..." -ForegroundColor Yellow
supabase functions deploy daily-portfolio-update

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Function deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/functions" -ForegroundColor White
    Write-Host "2. Click on 'daily-portfolio-update'" -ForegroundColor White
    Write-Host "3. Enable 'Cron Schedule'" -ForegroundColor White
    Write-Host "4. Enter cron expression: 0 10 * * 1-5" -ForegroundColor White
    Write-Host "   (This runs at 3:30 PM IST every weekday)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🧪 Test the function:" -ForegroundColor Cyan
    Write-Host "  supabase functions invoke daily-portfolio-update" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 View logs:" -ForegroundColor Cyan
    Write-Host "  supabase functions logs daily-portfolio-update --tail" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Make sure you're logged in: supabase login" -ForegroundColor White
    Write-Host "2. Link your project: supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor White
    Write-Host "3. Check the README.md for detailed instructions" -ForegroundColor White
    Write-Host ""
}
