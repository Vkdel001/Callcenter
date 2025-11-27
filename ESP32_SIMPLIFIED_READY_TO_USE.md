# ESP32 Simplified Service - Ready to Use
## Complete Implementation Guide (Option 2)

---

## 🎯 What You're Building

A simple Python service that:
1. Receives QR images from your existing web app
2. Uploads them to ESP32 device via USB
3. Controls device display (show QR, restart rotation)

**Your existing QR generation stays EXACTLY the same!**

---

## 📦 Part 1: Python Service Files

Create folder: `C:\insurance_device_service\`

### File 1: requirements.txt
```
pyserial==3.5
Pillow==10.0.0
Flask==2.3.3
Flask-CORS==4.0.0
```

### File 2: config.py
```python
# Device Service Configuration

# Serial Port (Check Device Manager for your COM port)
COM_PORT = 'COM3'
BAUD_RATE = 9600

# Service Settings
SERVICE_HOST = '0.0.0.0'
SERVICE_PORT = 8080

# Security
API_KEY = 'NIC-LOCAL-DEVICE-KEY-2024'  # Change this!

# Device Settings
DEVICE_WIDTH = 320
DEVICE_HEIGHT = 480
MAX_FILE_SIZE_KB = 80
CHUNK_SIZE = 1024
```

---

## 📄 Part 2: Python Service Code

See separate files in next sections...

---

## 🔧 Part 3: Frontend Integration

### File: src/services/deviceService.js (NEW)
```javascript
// Device Service API Client
const DEVICE_SERVICE_URL = 'http://localhost:8080';
const DEVICE_API_KEY = 'NIC-LOCAL-DEVICE-KEY-2024';

export const deviceService = {
  async checkHealth() {
    try {
      const response = await fetch(`${DEVICE_SERVICE_URL}/health`);
      return await response.json();
    } catch (error) {
      return { status: 'offline', device: 'disconnected' };
    }
  },

  async isAvailable() {
    const health = await this.checkHealth();
    return health.status === 'online' && health.device === 'connected';
  },

  async displayQR(qrImageUrl, customerData) {
    try {
      const response = await fetch(`${DEVICE_SERVICE_URL}/qr/display`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': DEVICE_API_KEY
        },
        body: JSON.stringify({
          qr_image_url: qrImageUrl,
          customer_name: customerData.name,
          policy_number: customerData.policyNumber,
          amount: customerData.amountDue
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Device service error:', error);
      return { success: false, error: error.message };
    }
  }
};
```

---

## 📋 Part 4: Installation Steps

### Step 1: Install Python (if not installed)
1. Download Python 3.11 from python.org
2. Run installer, CHECK "Add Python to PATH"
3. Verify: `python --version`

### Step 2: Create Project Folder
```powershell
mkdir C:\insurance_device_service
cd C:\insurance_device_service
```

### Step 3: Install Dependencies
```powershell
pip install -r requirements.txt
```

### Step 4: Find COM Port
1. Plug in ESP32 device
2. Open Device Manager (Win + X)
3. Look under "Ports (COM & LPT)"
4. Note the COM port (e.g., COM3)
5. Update config.py

### Step 5: Test Device Connection
```powershell
python test_device.py
```

---

## 🚀 Part 5: Usage

### Start Service
```powershell
python device_service.py
```

### Test from Browser
```
http://localhost:8080/health
```

### Integration Complete!
Your web app will now automatically send QR to device when available.

---

*Full code files provided separately due to length limits*
