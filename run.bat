@echo off
setlocal enabledelayedexpansion
title ThreatLens Full Stack & Extension Launcher
cd /d "%~dp0"

echo =======================================================================
echo              THREATLENS ONE-CLICK FULL DEMO LAUNCHER
echo =======================================================================
echo.
echo Starting all servers and launching Chrome with extension pre-loaded...
echo.

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Node.js / npm was not found in your system PATH.
  echo Please install Node.js (v18+) or ensure npm is available in your PATH.
  echo.
  pause
  exit /b 1
)

set OPEN_BROWSER=1
npm run demo -- --open-browser

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [Note] The demo runner stopped with status code %ERRORLEVEL%.
  pause
)
