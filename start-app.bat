@echo off
REM ===================================================================
REM Guest Management Portal (GMP) - Single Click App Launcher
REM Auto-detects IIS vs Local Dev, starts Backend API & Frontend, and
REM opens the portal in your default browser.
REM ===================================================================

title Guest Management Portal - Launcher
color 0A
cd /d "%~dp0"

echo ===================================================================
echo   Guest Management Portal (GMP) - System Launcher
echo ===================================================================
echo.

REM 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in System PATH.
    echo Please install Node.js LTS version from https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM 2. Check / Start Backend API (Port 5000)
echo [1/3] Checking Backend API Server (Port 5000)...
netstat -ano | findstr LISTENING | findstr ":5000" >nul 2>&1
if %errorlevel% equ 0 goto BACKEND_RUNNING

echo [INFO] Launching Backend API Server on port 5000...
if not exist "%~dp0backend\node_modules" (
    echo [INFO] Installing backend dependencies...
    pushd "%~dp0backend"
    call npm install
    popd
)
start "GMP Backend API" cmd /k "cd /d "%~dp0backend" && npm run dev"
timeout /t 3 >nul
goto CHECK_FRONTEND

:BACKEND_RUNNING
echo [OK] Backend API is already running on port 5000.

:CHECK_FRONTEND
echo.
echo [2/3] Checking Frontend Web Server...

netstat -ano | findstr LISTENING | findstr ":80 " >nul 2>&1
if %errorlevel% equ 0 goto IIS_ACTIVE

REM IIS is not active on port 80 - use Vite Dev Server (port 5173)
echo [INFO] IIS port 80 not active - checking Vite dev server on port 5173...
netstat -ano | findstr LISTENING | findstr ":5173" >nul 2>&1
if %errorlevel% equ 0 goto VITE_RUNNING

echo [INFO] Launching Frontend Dev Server on port 5173...
if not exist "%~dp0frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    pushd "%~dp0frontend"
    call npm install
    popd
)
start "GMP Frontend Client" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 4 >nul

:VITE_RUNNING
echo [INFO] Opening Portal on Dev Port 5173 in Default Browser...
start http://localhost:5173/
goto DONE

:IIS_ACTIVE
echo [OK] IIS Web Server is active on Port 80.
if not exist "%~dp0frontend\dist" (
    echo [INFO] Building production frontend assets for IIS...
    pushd "%~dp0frontend"
    if not exist "node_modules" call npm install
    call npm run build
    popd
)
echo [INFO] Opening Portal on IIS Port 80 in Default Browser...
start http://localhost/

:DONE
echo.
echo [3/3] Initialization Complete!
echo ===================================================================
echo   Guest Management Portal is running!
echo ===================================================================
echo.
pause
