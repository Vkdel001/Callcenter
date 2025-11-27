# ESP32 Integration - Simplified for Your Existing Project
## Reusing Your Current QR Infrastructure

---

## ✅ What You Already Have (REUSE)

### 1. ZwennPay Configuration (Already in your .env)
```bash
# Your existing .env file already has:
VITE_ZWENNPAY_MERCHANT_ID=56
VITE_ZWENNPAY_MERCHANT_LIFE=56
VITE_ZWENNPAY_MERCHANT_HEALTH=153
VITE_ZWENNPAY_MERCHANT_MOTOR=155
VITE_QR_TEST_MODE=false
```

**✅ REUSE THIS** - Don't duplicate in Python service

### 2. QR Generation Logic (Already in qrService.js)
```javascript
// Your existing src/services/qrService.js already:
- Calls ZwennPay API
- Handles LOB-specific merchant codes
- Generates QR data
- Creates QR images
- Sanitizes policy numbers
- Formats customer names
```

**✅ REUSE THIS** - Don't rewrite in Python

### 3. Customer Data (Already in Xano)
```javascript
// Your existing customerService.js already:
- Fetches customer from Xano
- Gets LOB (line_of_business)
- Gets policy number, name, amount
- Handles all business logic
```

**✅ REUSE THIS** - Don't duplicate

### 4. Authentication (Already working)
```javascript
// Your existing auth system already:
- Agent authentication
- API tokens
- Role-based access
```

**✅ REUSE THIS** - Don't change

---

## 🆕 What You Need to Add (NEW)

### Only 3 New Components Needed:

#### 1. Python Local Service (NEW)
**Purpose**: Bridge between your web app and ESP32 device
**Location**: Agent's computer (separate from web app)
**What it does**:
- Receives QR data from your web app
- Uploads image to ESP32 via USB
- Controls device rotation

#### 2. Device Communication Handler (NEW)
**Purpose**: Talk to ESP32 via serial port
**What it does**:
- Serial communication (USB)
- Image upload (chunked)
- Rotation control

#### 3. Frontend API Call (NEW)
**Purpose**: Send QR to device after generating on screen
**What it does**:
- Call local service API
- Pass QR data
- Handle response

---

## 🔄 Simplified Architecture

### Current Flow (Keep As-Is):
```
Agent → Web App → qrService.js → ZwennPay API → QR on Screen ✅
```

### Enhanced Flow (Add This):
```
Agent → Web App → qrService.js → ZwennPay API → QR on Screen ✅
                                                 ↓
                                    [NEW] Local Service → ESP32 Device ✅
```

**Key Point**: Your existing QR generation stays EXACTLY the same. We just ADD device upload in parallel.

---

## 📝 Simplified Configuration

### Python Service Config (insurance_device_config.py)

```python
# NEW FILE - But uses your existing values

# Serial Connection (NEW - for ESP32 device)
SERIAL_CONFIG = {
    'port': 'COM3',  # Find this in Device Manager
    'baudrate': 9600,
    'timeout': 5
}

# ZwennPay Settings (REUSE from your .env)
ZWENNPAY_CONFIG = {
    'merchant_id': 56,  # Same as VITE_ZWENNPAY_MERCHANT_LIFE
    'api_url': 'https://api.zwennpay.com:9425/api/v1.0/Common/GetMerchantQR',
    'timeout': 20
}

# Local Service Settings (NEW - for HTTP API)
SERVICE_CONFIG = {
    'host': '0.0.0.0',
    'port': 8080
}

# API Security (NEW - for local service only)
API_CONFIG = {
    'api_key': 'NIC-LOCAL-DEVICE-KEY-2024',  # NEW key for device service
    'require_auth': True
}

# Image Settings (NEW - for ESP32 display)
IMAGE_CONFIG = {
    'width': 320,
    'height': 480,
    'max_size_kb': 80
}
```

**Important Notes**:
- ✅ ZwennPay merchant ID: **SAME** as your existing config
- ✅ ZwennPay API URL: **SAME** as your existing config
- 🆕 API key: **NEW** (only for local device service, not your main app)
- 🆕 Serial port: **NEW** (for USB connection to ESP32)
- 🆕 Service port: **NEW** (8080, for local HTTP API)

---

## 🔧 What Actually Changes in Your Project

### Minimal Changes Required:

#### 1. Add Device Service API Call (src/services/deviceService.js)

```javascript
// NEW FILE - Simple wrapper for device API

const DEVICE_SERVICE_URL = 'http://localhost:8080';
const DEVICE_API_KEY = 'NIC-LOCAL-DEVICE-KEY-2024';

export const deviceService = {
  // Check if device service is available
  async isAvailable() {
    try {
      const response = await fetch(`${DEVICE_SERVICE_URL}/health`);
      const data = await response.json();
      return data.status === 'online' && data.device === 'connected';
    } catch (error) {
      return false;
    }
  },

  // Send QR to device (parallel to screen display)
  async displayQR(customerData) {
    try {
      const response = await fetch(`${DEVICE_SERVICE_URL}/qr/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': DEVICE_API_KEY
        },
        body: JSON.stringify({
          amount: customerData.amountDue,
          customer_name: customerData.name,
          policy_number: customerData.policyNumber,
          customer_id: customerData.id
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

#### 2. Update CustomerDetail.jsx (Add device option)

```javascript
// MODIFY EXISTING FILE - Add device display

import { deviceService } from '../services/deviceService';

// In your existing handleGenerateQR function:
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
      deviceService.displayQR(customer).then(result => {
        if (result.success) {
          console.log('✅ QR also displayed on device');
          // Optional: Show success message
        }
      });
    }
    
  } catch (error) {
    console.error('QR generation error:', error);
  }
};
```

**That's it!** Your existing QR generation stays exactly the same. We just ADD device display in parallel.

---

## 🎯 Key Differences from Documentation

### Documentation Shows:
- Full Python QR generation (ZwennPay API call in Python)
- Complete QR image creation in Python
- Standalone service

### Your Simplified Approach:
- ✅ Keep QR generation in JavaScript (existing qrService.js)
- ✅ Python service just receives QR data and uploads to device
- ✅ Reuse all existing infrastructure

### Why This is Better for You:
1. **Less Code**: Don't duplicate QR generation logic
2. **Less Risk**: Existing QR generation unchanged
3. **Easier Maintenance**: One place for QR logic (qrService.js)
4. **Faster Implementation**: Just add device upload, not rebuild everything

---

## 📋 Simplified Implementation Steps

### Step 1: Python Service (Simplified)

Create **insurance_device_service.py** (simplified version):

```python
"""
Simplified Device Service - Receives QR data from web app
"""

from flask import Flask, request, jsonify
import serial
import time
from PIL import Image
import io
import base64

app = Flask(__name__)

# Configuration
COM_PORT = 'COM3'  # Change based on Device Manager
API_KEY = 'NIC-LOCAL-DEVICE-KEY-2024'
device = None

def connect_device():
    """Connect to ESP32"""
    global device
    try:
        device = serial.Serial(COM_PORT, 9600, timeout=5)
        time.sleep(2)
        return True
    except Exception as e:
        print(f"Device connection error: {e}")
        return False

def upload_to_device(image_data):
    """Upload image to ESP32"""
    # Simplified upload logic
    # (Full implementation in documentation)
    pass

@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    device_status = 'connected' if device and device.is_open else 'disconnected'
    return jsonify({
        'status': 'online',
        'device': device_status
    })

@app.route('/qr/display', methods=['POST'])
def display_qr():
    """Receive QR image from web app and display on device"""
    # Verify API key
    if request.headers.get('X-API-Key') != API_KEY:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    
    # Get QR image (base64 encoded from web app)
    qr_image_base64 = data.get('qr_image')
    
    # Decode and resize for device (320x480)
    image_data = base64.b64decode(qr_image_base64)
    image = Image.open(io.BytesIO(image_data))
    image = image.resize((320, 480))
    
    # Upload to device
    success = upload_to_device(image)
    
    if success:
        return jsonify({'success': True, 'message': 'QR displayed on device'})
    else:
        return jsonify({'success': False, 'error': 'Upload failed'}), 500

if __name__ == '__main__':
    print("Connecting to ESP32...")
    if connect_device():
        print("✓ Device connected")
    else:
        print("✗ Device not connected")
    
    print("Starting service on http://localhost:8080")
    app.run(host='0.0.0.0', port=8080)
```

### Step 2: Frontend Integration (Minimal)

Just add this to your existing CustomerDetail.jsx:

```javascript
// After generating QR for screen, also send to device
const sendToDevice = async (qrImageUrl) => {
  try {
    // Convert QR image to base64
    const response = await fetch(qrImageUrl);
    const blob = await response.blob();
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      const base64data = reader.result.split(',')[1];
      
      // Send to device service
      await fetch('http://localhost:8080/qr/display', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'NIC-LOCAL-DEVICE-KEY-2024'
        },
        body: JSON.stringify({
          qr_image: base64data
        })
      });
    };
    
    reader.readAsDataURL(blob);
  } catch (error) {
    console.error('Device upload error:', error);
  }
};
```

---

## 🎯 Summary: What You Actually Need

### Reuse from Your Project:
1. ✅ ZwennPay merchant IDs (from .env)
2. ✅ ZwennPay API URL (from .env)
3. ✅ QR generation logic (qrService.js)
4. ✅ Customer data (Xano)
5. ✅ Authentication (existing)
6. ✅ LOB handling (existing)

### Add New:
1. 🆕 Python service on agent computer (receives QR, uploads to device)
2. 🆕 Device API key (only for local service, separate from main app)
3. 🆕 Serial port config (COM3, for USB connection)
4. 🆕 Frontend API call (send QR to device after screen display)

### Don't Duplicate:
- ❌ Don't rewrite ZwennPay API calls in Python
- ❌ Don't duplicate QR generation logic
- ❌ Don't change existing authentication
- ❌ Don't modify Xano structure

---

## 💡 Recommended Approach

### Option 1: Full Python Service (Documentation)
**Pros**: Complete, standalone, well-documented
**Cons**: Duplicates your existing QR logic
**Use if**: You want complete independence

### Option 2: Simplified Service (Recommended for You)
**Pros**: Reuses your existing code, minimal changes, less risk
**Cons**: Requires web app to be running
**Use if**: You want fastest implementation with least risk

### My Recommendation: **Option 2 (Simplified)**

**Why?**
1. Your QR generation already works perfectly
2. No need to duplicate ZwennPay integration
3. Faster implementation (1 week vs 2 weeks)
4. Less code to maintain
5. Lower risk (existing code unchanged)

**How?**
1. Keep your existing qrService.js exactly as-is
2. Add simple Python service that just receives QR image and uploads to device
3. Add one API call in frontend to send QR to device
4. Done!

---

## 🚀 Quick Start (Simplified Approach)

### Day 1: Setup
```powershell
# Install Python
# Install dependencies: pip install pyserial Pillow Flask

# Create simplified service (100 lines vs 500 lines)
# Configure COM port
# Test device connection
```

### Day 2: Integration
```javascript
// Add deviceService.js (50 lines)
// Update CustomerDetail.jsx (10 lines)
// Test with existing QR generation
```

### Day 3: Deploy
```powershell
# Start Python service on agent computer
# Test full flow
# Done!
```

**Total Time**: 3 days instead of 3 weeks (for POC)

---

## ✅ Final Answer to Your Question

**Q: Do we still need to define ZwennPay config and API key in Python?**

**A: Partially YES, but simplified:**

### ZwennPay Config:
- **If using Full Python Service**: YES, define in Python (duplicate from .env)
- **If using Simplified Service**: NO, keep in your existing qrService.js

### API Key:
- **Your existing API keys**: NO, don't touch them
- **New device service API key**: YES, create NEW key (only for device service)

### Recommended:
Use **Simplified Service** approach:
- Keep ZwennPay config in your existing .env
- Keep QR generation in your existing qrService.js
- Only add device upload service (minimal Python code)
- Only add one new API key (for device service only)

**This way, you reuse 90% of your existing code and only add the device upload part!**

---

*This simplified approach leverages your existing infrastructure and minimizes changes. You get the same result with less code and less risk.*
