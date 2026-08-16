@echo off
title Guest Management Portal - Service Manager
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)
echo Restarting IIS Web Server...
iisreset /restart

echo Starting Backend API Service silently...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do taskkill /F /PID %%a 2>nul
timeout /t 1 >nul
wscript.exe "D:\GuestManagementApp\backend\start-hidden.vbs"

echo Opening application in browser using System IP...
powershell -Command "$ip = (Get-NetIPAddress -AddressFamily IPv4 -Type Unicast -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '169.254*' -and $_.IPAddress -ne '127.0.0.1' } | Select-Object -First 1).IPAddress; if (-not $ip) { $ip = 'localhost' }; Start-Process \"http://$ip/\""
pause
