@echo off
:: ============================================================
:: protect-license.bat
:: Hides license security files with Windows System Hidden attributes
:: (+H +S) and locks NTFS permissions against deletion.
:: Run as Administrator.
:: ============================================================

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] This script must be run as Administrator.
    echo Right-click and choose "Run as administrator".
    pause
    exit /b 1
)

set "LIC_FILE=D:\GuestManagementApp\backend\middleware\license.js"
set "LIC_CACHE=D:\GuestManagementApp\backend\.lic"
set "LIC_SEAL=D:\GuestManagementApp\backend\.lic_integrity"

echo.
echo ============================================================
echo  GuestManagementApp - License Security & Stealth Protection
echo ============================================================
echo.

:: 1. Protect license.js
echo [1/3] Protecting: %LIC_FILE%
if not exist "%LIC_FILE%" (
    echo [WARN] File not found: %LIC_FILE%
) else (
    icacls "%LIC_FILE%" /inheritance:d >nul 2>&1
    icacls "%LIC_FILE%" /deny Everyone:(D,W,DA,WD,WDAC) >nul 2>&1
    icacls "%LIC_FILE%" /grant "SYSTEM:(F)" >nul 2>&1
    icacls "%LIC_FILE%" /grant "Administrators:(F)" >nul 2>&1
    echo [OK] license.js is protected against deletion and modification.
)

:: 2. Hide & Protect .lic_integrity
echo [2/3] Hiding & Protecting: %LIC_SEAL%
if not exist "%LIC_SEAL%" (
    echo [WARN] Integrity seal not found yet. Start backend first.
) else (
    attrib +h +s "%LIC_SEAL%" >nul 2>&1
    icacls "%LIC_SEAL%" /inheritance:d >nul 2>&1
    icacls "%LIC_SEAL%" /deny Everyone:(D,W,DA,WD,WDAC) >nul 2>&1
    icacls "%LIC_SEAL%" /grant "SYSTEM:(F)" >nul 2>&1
    icacls "%LIC_SEAL%" /grant "Administrators:(F)" >nul 2>&1
    echo [OK] .lic_integrity is now a hidden system file and protected.
)

:: 3. Hide & Protect .lic cache
echo [3/3] Hiding & Protecting: %LIC_CACHE%
if not exist "%LIC_CACHE%" (
    echo [WARN] License cache not found yet. Activate license first.
) else (
    attrib +h +s "%LIC_CACHE%" >nul 2>&1
    icacls "%LIC_CACHE%" /inheritance:d >nul 2>&1
    icacls "%LIC_CACHE%" /deny Everyone:(D) >nul 2>&1
    icacls "%LIC_CACHE%" /grant "SYSTEM:(F)" >nul 2>&1
    icacls "%LIC_CACHE%" /grant "Administrators:(F)" >nul 2>&1
    echo [OK] .lic cache is now a hidden system file and protected against deletion.
)

echo.
echo ============================================================
echo  Stealth & ACL Protection complete!
echo ============================================================
echo.
pause
