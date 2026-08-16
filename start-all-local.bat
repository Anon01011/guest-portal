@echo off
:: ============================================================
:: start-all-local.bat
:: Starts ALL services for GuestManagementApp on local server:
::   1. FSQTAR Licence Manager API  (port 5050)
::   2. GuestManagementApp Backend  (port 5000)
::   3. Restarts IIS to serve frontend
:: Run as Administrator.
:: ============================================================

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Requesting Administrative Privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title GuestManagementApp - Local Server Launcher
color 0A
echo.
echo  =====================================================
echo    FSQTAR GuestManagementApp - Local Server Launcher
echo  =====================================================
echo.

:: ── Check Node.js ─────────────────────────────────────────
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause & exit /b
)

:: ── Step 1: Ensure Laravel Licence Manager is served by IIS ──
echo [1/3] Checking FSQTAR Licence Manager (Laravel PHP app on IIS)...
echo.
echo  The licence manager (D:\FSQTAR-PROJECTS\license) should be
echo  configured as an IIS site. Check http://localhost/api/v1/license/validate
echo.
curl -s -o nul -w "  Licence Manager status: %%{http_code}" http://localhost/api/v1/license/validate 2>nul
echo.
echo  [NOTE] If you see 405 or 422 (not 404), the licence manager is running correctly.
echo.

:: ── Compile Laravel Vite assets if needed ─────────────────
if not exist "D:\FSQTAR-PROJECTS\license\node_modules" (
    echo [INFO] Installing licence frontend npm packages...
    pushd D:\FSQTAR-PROJECTS\license
    call npm install
    popd
)

:: ── Step 2: Start GMP Backend (port 5000) ─────────────────
echo [2/3] Starting GuestManagementApp Backend (port 5000)...
if not exist "D:\GuestManagementApp\backend\node_modules" (
    echo [INFO] Installing GMP backend dependencies...
    pushd D:\GuestManagementApp\backend
    call npm install
    popd
)
start "GMP Backend API" cmd /k "cd /d D:\GuestManagementApp\backend && echo Starting GMP Backend on port 5000... && node server.js"
timeout /t 5 >nul

:: ── Step 3: Restart IIS (serves frontend on port 80) ──────
echo [3/3] Restarting IIS to serve frontend...
iisreset /restart >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] IIS restarted successfully.
) else (
    echo [WARN] IIS restart failed. Try manually: iisreset /restart
)

:: ── Verify services ────────────────────────────────────────
timeout /t 3 >nul
echo.
echo  Verifying services...
echo.

curl -s -o nul -w "  Licence Manager (8080): %%{http_code}" http://127.0.0.1:8080/api/v1/license/validate 2>nul
echo.
curl -s -o nul -w "  GMP Backend     (5000): %%{http_code}" http://127.0.0.1:5000/api/license/status 2>nul
echo.
curl -s -o nul -w "  IIS Frontend      (80): %%{http_code}" http://127.0.0.1:80/ 2>nul
echo.
echo.
echo  =====================================================
echo    All services verified!
echo    Frontend:        http://localhost/
echo    Backend API:     http://localhost:5000
echo    Licence Manager: http://127.0.0.1:8080
echo  =====================================================
echo.
pause
