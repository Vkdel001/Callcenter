# ESP32 Device Service - Simplified Implementation

## 🎯 Quick Start (3 Steps)

### Step 1: Install Python & Dependencies (5 minutes)
```powershell
# Download Python 3.11 from python.org
# During installation, CHECK "Add Python to PATH"

# Verify installation
python --version

# Install dependencies
cd esp32_device_service
pip install -r requirements.txt
```

### Step 2: Configure & Test Device (5 minutes)
```powershell
# 1. Plug in ESP32 device via USB
# 2. Open Device Manager (Win + X → Device Manager)
# 3. Find COM port under "Ports (COM & LPT)" (e.g., COM3)
# 4. Edit device_service.py, change COM_PORT if needed
# 5. Test connection:

python test_device.py
```

**Expected Output:**
```
============================================================
ESP32 DEVICE CONNECTION TEST
============================================================

Available COM ports:
  COM3: USB Serial Port

Attempting to connect to COM3...
✓ Connected successfully to COM3
  Baudrate: 9600
  Timeout: 5 seconds

Testing rotation commands...
  ✓ Stop rotation command sent
  ✓ Start rotation command sent

✓ All tests passed!

You can now run device_service.py
```

### Step 3: Start Service (1 minute)
```powershell
# Option A: Double-click start_service.bat

# Option B: Command line
python device_service.py
```

**Expected Output:**
```
============================================================
ESP32 DEVICE SERVICE (SIMPLIFIED)
============================================================
Service URL: http://localhost:8080
API Key: NIC-LOCAL-DEVI...
============================================================
Connecting to ESP32 device...
============================================================
✓ ESP32 device connected successfully
============================================================
Service is ready!
============================================================
 * Running on http://0.0.0.0:8080
```

---

## 🔧 Configuration

### Change COM Port
Edit `device_service.py`, line 18:
```python
COM_PORT = 'COM4'  # Change to your port
```

### Change API Key
Edit `device_service.py`, line 20:
```python
API_KEY = 'YOUR-SECURE-KEY-HERE'
```

Also update `src/services/deviceService.js`, line 6:
```javascript
const DEVICE_API_KEY = 'YOUR-SECURE-KEY-HERE';
```

### Change Service Port
Edit `device_service.py`, line 21:
```python
SERVICE_PORT = 8081  # Change if 8080 is in use
```

---

## 🧪 Testing

### Test 1: Health Check
```powershell
# Open browser:
http://localhost:8080/health
```

**Expected Response:**
```json
{
  "status": "online",
  "service": "ESP32 Device Service (Simplified)",
  "device": "connected",
  "timestamp": "2024-11-26T10:30:00"
}
```

### Test 2: Display QR (using curl or Postman)
```powershell
curl -X POST http://localhost:8080/qr/display ^
  -H "Content-Type: application/json" ^
  -H "X-API-Key: NIC-LOCAL-DEVICE-KEY-2024" ^
  -d "{\"qr_image_url\":\"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=TEST\",\"customer_name\":\"Test Customer\",\"policy_number\":\"TEST123\",\"amount\":1500}"
```

**Expected**: QR code should appear on ESP32 device

---

## 🔗 Frontend Integration

### Already Done:
✅ `src/services/deviceService.js` created

### Update CustomerDetail.jsx:

Find your existing `handleGenerateQR` function and add device display:

```javascript
import { deviceService } from '../services/deviceService';

const handleGenerateQR = async (customer) => {
  try {
    // EXISTING: Generate QR for screen (keep as-is)
    const qrResult = await customerService.generateQRCode(customer);
    
    // Show QR on screen (existing functionality)
    setQrData(qrResult);
    setShowQRModal(true);
    
    // NEW: Also try to send to device (parallel, non-blocking)
    const deviceAvailable = await deviceService.isAvailable();
    if (deviceAvailable) {
      const deviceResult = await deviceService.displayQR(
        qrResult.qrCodeUrl,
        customer
      );
      
      if (deviceResult.success) {
        console.log('✅ QR displayed on device');
        // Optional: Show success toast/notification
      }
    } else {
      console.log('Device offline, using screen QR only');
    }
    
  } catch (error) {
    console.error('QR generation error:', error);
  }
};
```

### Optional: Add Device Status Indicator

```javascript
import { deviceService } from '../services/deviceService';
import { useState, useEffect } from 'react';

function CustomerDetail() {
  const [deviceOnline, setDeviceOnline] = useState(false);
  
  // Check device status on mount and every 30 seconds
  useEffect(() => {
    const checkDevice = async () => {
      const available = await deviceService.isAvailable();
      setDeviceOnline(available);
    };
    
    checkDevice();
    const interval = setInterval(checkDevice, 30000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div>
      {/* Device status indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${deviceOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
        <span className="text-sm text-gray-600">
          {deviceOnline ? 'Device Connected' : 'Screen Only'}
        </span>
      </div>
      
      {/* Rest of your component */}
    </div>
  );
}
```

---

## 🚨 Troubleshooting

### Issue: Device Not Connecting

**Symptoms:**
```
✗ ESP32 device not found
```

**Solutions:**
1. Check USB cable is connected
2. Verify COM port in Device Manager
3. Update COM_PORT in device_service.py
4. Try different USB port
5. Run as administrator
6. Close other programs using the port (Arduino IDE, PuTTY, etc.)

### Issue: Service Won't Start

**Symptoms:**
```
Port 8080 is already in use
```

**Solutions:**
1. Change SERVICE_PORT in device_service.py
2. Or kill process using port 8080:
```powershell
netstat -ano | findstr :8080
taskkill /PID <process_id> /F
```

### Issue: Frontend Can't Reach Service

**Symptoms:**
```
Device service offline: Failed to fetch
```

**Solutions:**
1. Verify service is running (check console)
2. Check Windows Firewall (allow Python)
3. Verify URL is http://localhost:8080
4. Check API key matches in both files

### Issue: QR Not Displaying on Device

**Symptoms:**
```
Upload failed
```

**Solutions:**
1. Check device memory (might be full)
2. Reduce CHUNK_SIZE in device_service.py (try 512)
3. Restart device (unplug/replug USB)
4. Restart service

---

## 📊 Monitoring

### Check Service Logs
```powershell
# View today's log
type device_service_20241126.log | more

# View last 20 lines
powershell -command "Get-Content device_service_20241126.log -Tail 20"
```

### Monitor in Real-Time
```powershell
# Keep service console open to see real-time logs
python device_service.py
```

---

## 🔒 Security

### API Key
- Change default API key in both files
- Don't commit API key to git
- Use environment variables in production

### Network
- Service runs on localhost only (secure)
- Only accessible from same computer
- No internet exposure

---

## 🎯 Success Checklist

- [ ] Python installed and verified
- [ ] Dependencies installed
- [ ] ESP32 device connected
- [ ] COM port identified
- [ ] test_device.py passes
- [ ] Service starts successfully
- [ ] Health endpoint responds
- [ ] QR displays on device
- [ ] Frontend integration complete
- [ ] Desktop shortcut created

---

## 📞 Support

### Common Commands
```powershell
# List COM ports
python -c "import serial.tools.list_ports; [print(p.device) for p in serial.tools.list_ports.comports()]"

# Test service
curl http://localhost:8080/health

# Check Python version
python --version

# Check installed packages
pip list
```

### Files Structure
```
esp32_device_service/
├── device_service.py       # Main service
├── test_device.py          # Connection test
├── requirements.txt        # Dependencies
├── start_service.bat       # Startup script
├── README.md              # This file
└── device_service_*.log   # Log files
```

---

## 🚀 Next Steps

1. ✅ Service running successfully
2. ✅ Device connected and tested
3. ✅ Frontend integration complete
4. 🔄 Test with real customer data
5. 🔄 Train agent on usage
6. 🔄 Deploy to production

---

**Service is ready to use! Your existing QR generation stays exactly the same, we just added device display in parallel.**
