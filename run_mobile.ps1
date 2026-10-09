Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Starting Expo Go Server for Mobile App" -ForegroundColor Green
Write-Host " Scan QR code with Expo Go on your physical Android or iPhone" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\mobile"
npx expo start

