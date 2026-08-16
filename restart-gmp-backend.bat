@echo off
:: ============================================================
:: restart-gmp-backend.bat — Run as Administrator
:: Kills the GMP backend and restarts it with updated code.
:: ============================================================

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Requesting Administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo  ========================================
echo   GMP Backend Restart
echo  ========================================
echo.

:: Kill whatever is on port 5000
echo [1/3] Stopping process on port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "0.0.0.0:5000 "') do (
    echo  Found PID %%a — terminating...
    taskkill /F /PID %%a >nul 2>&1
    if %errorlevel% equ 0 (
        echo  [OK] PID %%a terminated.
    ) else (
        echo  [WARN] Could not terminate PID %%a - trying SC stop...
        sc stop GuestManagementApp >nul 2>&1
    )
)

:: Wait for port to release
ping 127.0.0.1 -n 4 > nul

:: Verify port is free
netstat -ano | findstr "0.0.0.0:5000 " >nul 2>&1
if %errorlevel% equ 0 (
    echo  [WARN] Port 5000 still in use. Starting anyway...
) else (
    echo  [OK] Port 5000 is free.
)

:: Start fresh backend
echo [2/3] Starting GMP Backend (port 5000)...
start "GMP Backend API" cmd /k "cd /d D:\GuestManagementApp\backend && echo. && echo GMP Backend starting... && node server.js"

:: Wait and verify
echo [3/3] Verifying startup...
ping 127.0.0.1 -n 6 > nul

curl -s -o nul -w " Backend /api/license/status: HTTP %%{http_code}" http://127.0.0.1:5000/api/license/status 2>nul
echo.

echo.
echo  ========================================
echo   Done! Check the new backend window for:
echo     [License] Integrity check...
echo     [License] Validating against: ...
echo     [License] Valid / Invalid status
echo  ========================================
echo.
pause
