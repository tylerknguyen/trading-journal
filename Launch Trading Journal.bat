@echo off
setlocal

set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

title Trading Journal

echo.
echo  ============================================
echo   Trading Journal - Launching at http://127.0.0.1:5173
echo  ============================================
echo.

if not exist ".venv\Scripts\python.exe" (
  echo Creating local Python environment...
  py -3.11 -m venv .venv 2>nul || py -3 -m venv .venv 2>nul || python -m venv .venv
  if errorlevel 1 (
    echo Could not create a Python virtual environment.
    echo Install Python 3.10 or 3.11 from python.org, then run this launcher again.
    pause
    exit /b 1
  )
  echo Installing dependencies (first run only)...
  ".venv\Scripts\python.exe" -m pip install --upgrade pip >nul 2>&1
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt
  if errorlevel 1 (
    echo Dependency install failed.
    pause
    exit /b 1
  )
)

REM Wait for server to bind, then open browser
start "" powershell -NoProfile -WindowStyle Hidden -Command ^
  "$deadline = (Get-Date).AddSeconds(20);" ^
  "while ((Get-Date) -lt $deadline) {" ^
  "  try { (Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:5173/api/health' -TimeoutSec 2).StatusCode | Out-Null; break } catch { Start-Sleep -Milliseconds 400 }" ^
  "};" ^
  "Start-Process 'http://127.0.0.1:5173/'"

echo Server starting. The app will open in your browser shortly.
echo Press Ctrl+C in this window to stop the server.
echo.

".venv\Scripts\python.exe" server.py

pause
