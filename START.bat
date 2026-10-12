@echo off
cd /d %~dp0

if not exist node_modules (
  echo Installing frontend dependencies...
  call npm install
)

start "RJSC Backend" cmd /k "cd /d %~dp0\backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload"
timeout /t 2 >nul

start "RJSC Frontend" cmd /k "npm run dev"
timeout /t 4 >nul

start http://localhost:3000

