@echo off
title Stop Workflo
color 0C

echo.
echo ========================================
echo    Stop Workflo Servers
echo ========================================
echo.

echo Stopping Node.js processes...
echo.

REM Kill all node processes (be careful - this kills ALL node processes)
taskkill /F /IM node.exe /T 2>nul

if %ERRORLEVEL% EQU 0 (
    echo ✅ All Node.js processes stopped.
) else (
    echo ⚠️  No Node.js processes were running.
)

echo.
echo ========================================
echo.
echo Workflo servers have been stopped.
echo.
echo Press any key to exit...
pause >nul
