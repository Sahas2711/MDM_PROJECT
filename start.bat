@echo off
echo Starting AgriIntel...

echo [1/2] Starting FastAPI backend on http://localhost:8000
start "AgriIntel Backend" cmd /k "cd backend && pip install -r requirements.txt -q && uvicorn main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] Starting React frontend on http://localhost:5173
start "AgriIntel Frontend" cmd /k "cd frontend && npm install --silent && npm run dev"

echo.
echo   Backend  -^> http://localhost:8000
echo   API Docs -^> http://localhost:8000/docs
echo   Frontend -^> http://localhost:5173
echo.
echo Both servers are running in separate windows.
echo Close those windows to stop the servers.
pause
