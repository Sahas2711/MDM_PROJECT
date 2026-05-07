@echo off
echo Starting AgriIntel...

echo [1/3] Starting FastAPI backend on http://localhost:8000
start "AgriIntel Backend" cmd /k "cd /d %~dp0backend && pip install -r requirements.txt -q && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Voice Assistant backend on http://localhost:8001
start "Voice Assistant Backend" cmd /k "cd /d %~dp0backend\voice-to-voice && pip install -r requirements.txt -q && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001"

timeout /t 3 /nobreak >nul

echo [3/3] Starting React frontend on http://localhost:5173
start "AgriIntel Frontend" cmd /k "cd /d %~dp0frontend && npm install --silent && npm run dev -- --host 0.0.0.0"

echo.
echo   Backend   -^> http://localhost:8000
echo   API Docs  -^> http://localhost:8000/docs
echo   Voice API -^> http://localhost:8001
echo   Voice Docs-^> http://localhost:8001/docs
echo   Frontend  -^> http://localhost:5173  (Vite may switch to 5174 if 5173 is busy)
echo.
echo All services are running in separate windows.
echo Close those windows to stop the servers.
pause
