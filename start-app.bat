@echo off
:: ===================================================================
:: Guest Management Portal (GMP) - Single Click App Launcher
:: Auto-detects IIS vs Local Dev, starts Backend API & Frontend, and
:: opens the portal in your default browser.
:: ===================================================================

:: 1. Check for Administrator Privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Requesting Administrative Privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title Guest Management Portal - Launcher
color 0A
cd /d "%~dp0"

echo ===================================================================
echo   Guest Management Portal (GMP) - System Launcher
echo ===================================================================
echo.

:: 2. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in System PATH.
    echo Please install Node.js (LTS version) from https://nodejs.org/
    pause
    exit /b
)

:: 3. Check / Start Backend API (Port 5000)
echo [1/3] Checking Backend API Server (Port 5000)...
netstat -ano | findstr LISTENING | findstr ":5000" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend API is already running on port 5000.
) else (
    echo [INFO] Launching Backend API Server on port 5000...
    if not exist "%~dp0backend\node_modules" (
        echo [INFO] Installing backend dependencies...
        pushd "%~dp0backend"
        call npm install
        popd
    )
    start "GMP Backend API" cmd /k "cd /d "%~dp0backend" && npm run dev"
    timeout /t 3 >nul
)

:: 4. Check IIS vs Local Vite Frontend
echo.
echo [2/3] Checking Frontend Web Server...

netstat -ano | findstr LISTENING | findstr ":80 " >nul 2>&1
set IIS_RUNNING=%errorlevel%

if %IIS_RUNNING% equ 0 (
    echo [OK] IIS Web Server is active on Port 80.
    
    :: Ensure frontend is built for IIS if dist folder is missing
    if not exist "%~dp0frontend\dist" (
        echo [INFO] Building production frontend assets for IIS...
        pushd "%~dp0frontend"
        if not exist "node_modules" call npm install
        call npm run build
        popd
    )
    
    echo [INFO] Opening Portal (IIS Port 80) in Default Browser...
    start http://localhost/
) else (
    echo [INFO] IIS port 80 not active — checking Vite dev server (Port 5173)...
    netstat -ano | findstr LISTENING | findstr ":5173" >nul 2>&1
    if %errorlevel% neq 0 (
        echo [INFO] Launching Frontend Dev Server on port 5173...
        if not exist "%~dp0frontend\node_modules" (
            echo [INFO] Installing frontend dependencies...
            pushd "%~dp0frontend"
            call npm install
            popd
        )
        start "GMP Frontend Client" cmd /k "cd /d "%~dp0frontend" && npm run dev"
        timeout /t 4 >nul
    )
    echo [INFO] Opening Portal (Dev Port 5173) in Default Browser...
    start http://localhost:5173/
)

echo.
echo [3/3] Initialization Complete!
echo ===================================================================
echo   Guest Management Portal is running!
echo   Keep the terminal windows open while using the application.
echo ===================================================================
echo.
pause
