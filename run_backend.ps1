Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Starting Triage-Bot FastAPI Backend on http://0.0.0.0:8000" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

