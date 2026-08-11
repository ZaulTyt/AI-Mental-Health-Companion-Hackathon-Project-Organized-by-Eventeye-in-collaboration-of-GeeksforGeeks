@echo off
echo Starting AI Mental Health Companion...

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && .\venv2\Scripts\python app.py"

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo ===================================================
echo Both servers are starting up in separate windows!
echo Please wait a few seconds for them to initialize.
echo The frontend should open in your browser automatically.
echo ===================================================
pause
