@echo off
cd /d %~dp0
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
start "RJSC Frontend" cmd /k "npm run dev"
timeout /t 4 >nul
start http://localhost:3000
