@echo off
REM Build script for NIC Device Client
REM Creates standalone Windows EXE using PyInstaller

echo ============================================================
echo NIC Device Client - Build Script
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher
    pause
    exit /b 1
)

echo [1/5] Checking Python installation...
python --version

REM Check if PyInstaller is installed
echo.
echo [2/5] Checking PyInstaller...
pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo PyInstaller not found. Installing...
    pip install pyinstaller
) else (
    echo PyInstaller is already installed
)

REM Install dependencies
echo.
echo [3/5] Installing dependencies...
pip install -r requirements.txt

REM Clean previous builds
echo.
echo [4/5] Cleaning previous builds...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist __pycache__ rmdir /s /q __pycache__
if exist *.spec del /q *.spec

REM Build EXE
echo.
echo [5/5] Building EXE...
echo This may take a few minutes...
echo.

pyinstaller --onefile ^
    --windowed ^
    --name="NIC_Device_Client" ^
    --icon=icon.ico ^
    --add-data="icon.ico;." ^
    --hidden-import=PIL ^
    --hidden-import=PIL._tkinter_finder ^
    device_client.py

if errorlevel 1 (
    echo.
    echo ============================================================
    echo BUILD FAILED!
    echo ============================================================
    pause
    exit /b 1
)

echo.
echo ============================================================
echo BUILD SUCCESSFUL!
echo ============================================================
echo.
echo EXE Location: dist\NIC_Device_Client.exe
echo.
echo Next steps:
echo 1. Update config.py with your VPS URL and API key
echo 2. Test the EXE: dist\NIC_Device_Client.exe
echo 3. Create installer using Inno Setup (optional)
echo.
echo ============================================================
pause
