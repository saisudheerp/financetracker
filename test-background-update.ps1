# =============================================
# Test Background Update Function
# This manually triggers the update to verify it works
# =============================================

Write-Host ""
Write-Host "🧪 Testing Background Update Function..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Triggering function manually..." -ForegroundColor Yellow
supabase functions invoke daily-portfolio-update --no-verify-jwt

Write-Host ""
Write-Host "📊 Checking recent logs..." -ForegroundColor Yellow
Write-Host ""
supabase functions logs daily-portfolio-update --limit 50

Write-Host ""
Write-Host "✅ Test complete!" -ForegroundColor Green
Write-Host ""
Write-Host "If you see prices being updated above, it's working!" -ForegroundColor White
Write-Host "The function will run automatically every weekday at 3:30 PM IST." -ForegroundColor Gray
Write-Host ""
