@echo off
setlocal

set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

echo Starting Trading Journal...
echo.

if not exist ".venv\Scripts\python.exe" (
  echo Creating local Python environment...
  py -3.11 -m venv .venv 2>nul || py -3 -m venv .venv 2>nul || python -m venv .venv
  if errorlevel 1 (
    echo Could not create a Python virtual environment.
    echo Install Python 3.10 or 3.11, then run this launcher again.
    pause
    exit /b 1
  )
)

echo Installing/updating dependencies...
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
  echo Dependency install failed.
  pause
  exit /b 1
)

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:5173/'"

echo.
echo Trading Journal is running at http://127.0.0.1:5173/
echo Leave this window open while you use the app.
echo Press Ctrl+C in this window to stop the app.
echo.

".venv\Scripts\python.exe" server.py

pause
