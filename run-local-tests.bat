@echo off
echo ========================================
echo  NIC Reminder Service - Local Testing
echo ========================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version

echo.
echo Checking if .env file exists...
if not exist ".env" (
    echo ERROR: .env file not found
    echo Please make sure your .env file is in the current directory
    pause
    exit /b 1
)

echo .env file found ✓

echo.
echo Running reminder service tests...
echo ================================
node test-reminder-service.js

echo.
echo Test completed. Press any key to exit...
pause >nul