@echo off
setlocal
title ThreatLens Full Stack Demo Launcher
cd /d "%~dp0"

echo =======================================================================
echo              THREATLENS ONE-CLICK FULL DEMO LAUNCHER
echo =======================================================================
echo.
echo Starting all servers and launching Chrome with extension pre-loaded...
echo.

where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Node.js and npm were not found in your system PATH.
  echo Please install Node.js v18 or newer to run this demo.
  echo.
  pause
  exit /b 1
)

set OPEN_BROWSER=1
call npm run demo -- --open-browser

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [Note] Demo stopped with exit code %ERRORLEVEL%.
  pause
)
