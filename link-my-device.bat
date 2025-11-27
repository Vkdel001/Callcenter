@echo off
REM Link device to your logged-in user (Agent ID: 24)

echo ============================================================
echo Linking Device to Agent 24
echo ============================================================
echo.

curl -X POST http://localhost:5001/api/device/link ^
  -H "Content-Type: application/json" ^
  -H "X-API-Key: NIC-DEVICE-API-KEY-2024-CHANGE-ME" ^
  -d "{\"agent_id\": 24, \"agent_name\": \"Flacq Agent\", \"device_id\": \"device_DESKTOP-RSJ243K_4CD717\"}"

echo.
echo.
echo ============================================================
echo Done! Try generating QR again in the app.
echo ============================================================
pause
