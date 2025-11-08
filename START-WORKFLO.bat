@echo off
title Workflo Launcher
color 0B

echo.
echo ========================================
echo    Workflo - One-Click Launcher
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Starting Backend Server (Port 3000)...
start "Workflo Backend" cmd /k "cd apps\api && npm run start:dev"

timeout /t 5 /nobreak >nul

echo [2/3] Starting Frontend Server (Port 5173)...
start "Workflo Frontend" cmd /k "cd apps\web && npm run dev"

timeout /t 8 /nobreak >nul

echo.
echo ========================================
echo    Workflo is starting!
echo ========================================
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Demo Login:
echo   Email:    demo@example.com
echo   Password: demo123
echo.
echo ========================================
echo.

echo [3/3] Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo.
echo Servers are running in separate windows.
echo Close those windows to stop the servers.
echo.
echo Press any key to close this launcher...
pause >nul
