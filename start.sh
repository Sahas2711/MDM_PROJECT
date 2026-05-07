#!/bin/bash
# AgriIntel - start backend + voice backend + frontend

echo "Starting AgriIntel..."

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[1/3] Starting FastAPI backend on http://localhost:8000"
cd "$ROOT_DIR/backend" || exit 1
pip install -r requirements.txt -q
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd "$ROOT_DIR" || exit 1

sleep 2

echo "[2/3] Starting Voice Assistant backend on http://localhost:8001"
cd "$ROOT_DIR/backend/voice-to-voice" || exit 1
pip install -r requirements.txt -q
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001 &
VOICE_BACKEND_PID=$!
cd "$ROOT_DIR" || exit 1

sleep 2

echo "[3/3] Starting React frontend on http://localhost:5173"
cd "$ROOT_DIR/frontend" || exit 1
npm install --silent
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!
cd "$ROOT_DIR" || exit 1

echo ""
echo "  Backend    -> http://localhost:8000"
echo "  API Docs   -> http://localhost:8000/docs"
echo "  Voice API  -> http://localhost:8001"
echo "  Voice Docs -> http://localhost:8001/docs"
echo "  Frontend   -> http://localhost:5173"
echo "  Note       -> Vite may switch to 5174 if 5173 is already in use"
echo ""
echo "Press Ctrl+C to stop all services."

trap "kill $BACKEND_PID $VOICE_BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
