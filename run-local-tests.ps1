# NIC Reminder Service - Local Testing Script (PowerShell)

Write-Host "========================================" -ForegroundColor Blue
Write-Host " NIC Reminder Service - Local Testing" -ForegroundColor Blue  
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Check Node.js installation
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check .env file
Write-Host ""
Write-Host "Checking if .env file exists..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found" -ForegroundColor Red
    Write-Host "Please make sure your .env file is in the current directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ".env file found ✓" -ForegroundColor Green

# Run tests
Write-Host ""
Write-Host "Running reminder service tests..." -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow

try {
    node test-reminder-service.js
    $exitCode = $LASTEXITCODE
    
    Write-Host ""
    if ($exitCode -eq 0) {
        Write-Host "🎉 All tests completed successfully!" -ForegroundColor Green
        Write-Host "The service is ready for VPS deployment." -ForegroundColor Green
    } else {
        Write-Host "⚠️ Some tests failed." -ForegroundColor Yellow
        Write-Host "Please review the output above and fix any issues." -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR: Failed to run tests" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to exit"