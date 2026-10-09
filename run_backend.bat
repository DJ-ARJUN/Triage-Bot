@echo off
echo ========================================================
echo  Starting Triage-Bot FastAPI Backend on http://0.0.0.0:8000
echo ========================================================
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause

