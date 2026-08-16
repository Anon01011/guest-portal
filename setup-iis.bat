@echo off
title Guest Management Portal - Single Click IIS & Startup Installer
color 0A
echo ===================================================================
echo   Guest Management Portal (GMP) - Single Click IIS Setup & Auto-Start
echo ===================================================================
echo.

:: Check Administrator Privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Requesting Administrator Privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
echo [INFO] Running IIS Server & Background Auto-Start Setup...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-iis.ps1"

pause
