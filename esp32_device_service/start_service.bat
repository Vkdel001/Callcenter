@echo off
echo ============================================================
echo Starting ESP32 Device Service
echo ============================================================
echo.

cd /d "%~dp0"

python device_service.py

pause
