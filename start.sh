#!/bin/bash
# AgriIntel — start backend + frontend

echo "Starting AgriIntel..."

# Backend
echo "[1/2] Starting FastAPI backend on http://localhost:8000"
cd backend
pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Give backend a moment to boot
sleep 2

# Frontend
echo "[2/2] Starting React frontend on http://localhost:5173"
cd frontend
npm install --silent
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "  Backend  → http://localhost:8000"
echo "  API Docs → http://localhost:8000/docs"
echo "  Frontend → http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait and clean up on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
