@echo off
:: Check for Administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Requesting Administrative Privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)
title Guest Management Portal - Launcher
echo ===================================================
echo   Guest Management Portal Launcher for Windows
echo ===================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in System PATH.
    echo Please install Node.js (LTS version) from https://nodejs.org/
    pause
    exit /b
)

echo [INFO] Starting Backend API Server (Port 5000)...
start "GMP Backend API" cmd /k "cd backend && if not exist node_modules (npm install) && npm run dev"

echo [INFO] Starting Frontend Dev Web Server (Port 5173)...
start "GMP Frontend Client" cmd /k "cd frontend && if not exist node_modules (npm install) && npm run dev"

echo [INFO] Waiting for servers to initialize...
timeout /t 5 >nul

echo [INFO] Opening Web Portal in Default Browser...
start http://localhost:5173/

echo.
echo ===================================================
echo   System running! Close the spawned windows to stop.
echo ===================================================
echo.
pause
