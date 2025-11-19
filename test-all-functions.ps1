#!/usr/bin/env pwsh

# ============================================
# Test All Automation Functions
# ============================================

Write-Host "🧪 Testing All Automation Functions..." -ForegroundColor Cyan
Write-Host ""

$functions = @(
    "daily-portfolio-update",
    "process-recurring-transactions", 
    "daily-site-maintenance"
)

foreach ($func in $functions) {
    Write-Host "Testing $func..." -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    try {
        $result = supabase functions invoke $func 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $func executed successfully" -ForegroundColor Green
            Write-Host "Response: $result" -ForegroundColor Gray
        } else {
            Write-Host "❌ $func failed" -ForegroundColor Red
            Write-Host "Error: $result" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Error invoking $func" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "🔍 View Detailed Logs:" -ForegroundColor Yellow
Write-Host ""

foreach ($func in $functions) {
    Write-Host "  supabase functions logs $func --tail" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Testing Complete!" -ForegroundColor Green
Write-Host ""
