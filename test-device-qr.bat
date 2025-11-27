@echo off
REM Test script to send QR command to device

echo ============================================================
echo Testing Device QR Display
echo ============================================================
echo.

REM Step 1: Link device to agent
echo [1/2] Linking device to agent...
curl -X POST http://localhost:5001/api/device/link ^
  -H "Content-Type: application/json" ^
  -H "X-API-Key: NIC-DEVICE-API-KEY-2024-CHANGE-ME" ^
  -d "{\"agent_id\": 1, \"agent_name\": \"Test Agent\", \"device_id\": \"device_DESKTOP-RSJ243K_4CD717\"}"

echo.
echo.

REM Step 2: Send QR command
echo [2/2] Sending QR command...
curl -X POST http://localhost:5001/api/device/qr ^
  -H "Content-Type: application/json" ^
  -H "X-API-Key: NIC-DEVICE-API-KEY-2024-CHANGE-ME" ^
  -d "{\"agent_id\": 1, \"qr_image\": \"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==\", \"customer_name\": \"Test Customer\", \"policy_number\": \"TEST001\", \"amount\": 1500}"

echo.
echo.
echo ============================================================
echo Test complete!
echo Check the device client terminal for command execution
echo ============================================================
pause
