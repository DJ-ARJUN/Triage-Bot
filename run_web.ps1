Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Starting Reviewer Web Portal on http://localhost:3000" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\reviewer-web"
npm run dev

