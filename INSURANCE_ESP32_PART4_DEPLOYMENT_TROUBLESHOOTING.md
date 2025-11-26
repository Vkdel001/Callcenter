# Deployment Guide & Troubleshooting

## 🚀 Production Deployment

### Deployment Checklist

#### Pre-Deployment
- [ ] All tests passed
- [ ] Configuration file updated with production values
- [ ] Strong API key generated
- [ ] COM port verified
- [ ] Device tested for 24+ hours
- [ ] Backup plan ready

#### Agent Computer Setup
- [ ] Windows 10/11 installed
- [ ] Python 3.7+ installed
- [ ] All dependencies installed
- [ ] ESP32 device connected to USB
- [ ] Device recognized in Device Manager
- [ ] Service tested successfully
- [ ] Startup script created
- [ ] Desktop shortcut created

#### Network Setup
- [ ] Local service accessible
- [ ] Firewall configured (if needed)
- [ ] Backend can reach local service
- [ ] Frontend can reach backend

#### Documentation
- [ ] Quick reference guide printed
- [ ] Agent training completed
- [ ] Support contact information provided
- [ ] Troubleshooting guide accessible

---

## 🔧 Troubleshooting Guide

### Issue 1: Device Not Connecting

**Symptoms**:
- "Failed to connect to ESP32" error
- "Device not connected" in service logs
- Service starts but device shows as disconnected

**Solutions**:

1. **Check USB Connection**
   ```
   - Unplug and replug USB cable
   - Try different USB port
   - Check cable is not damaged
   ```

2. **Verify COM Port**
   ```
   - Open Device Manager (Win + X → Device Manager)
   - Expand "Ports (COM & LPT)"
   - Find your device (e.g., "USB Serial Port (COM3)")
   - Note the COM port number
   - Update insurance_device_config.py if different
   ```

3. **Check Port Availability**
   ```python
   # Run this to list available ports
   python -c "from insurance_esp32_handler import InsuranceESP32Handler; h = InsuranceESP32Handler(); print(h.list_available_ports())"
   ```

4. **Close Other Programs**
   ```
   - Close Arduino IDE
   - Close PuTTY or other serial terminals
   - Close other Python scripts using the port
   ```

5. **Run as Administrator**
   ```
   - Right-click start_service.bat
   - Select "Run as administrator"
   ```

6. **Check Device Drivers**
   ```
   - Device Manager → Right-click device → Update driver
   - Or install CH340/CP2102 drivers if needed
   ```

---

### Issue 2: QR Generation Fails

**Symptoms**:
- "Failed to generate QR code" error
- ZwennPay API timeout
- QR image not created

**Solutions**:

1. **Check Internet Connection**
   ```
   - Verify internet is working
   - Test: ping api.zwennpay.com
   - Check firewall isn't blocking Python
   ```

2. **Verify ZwennPay Credentials**
   ```python
   # In insurance_device_config.py
   ZWENNPAY_CONFIG = {
       'merchant_id': 56,  # Verify this is correct
       'api_url': 'https://api.zwennpay.com:9425/api/v1.0/Common/GetMerchantQR',
       'timeout': 20
   }
   ```

3. **Test API Manually**
   ```python
   import requests
   
   payload = {
       "MerchantId": 56,
       "SetTransactionAmount": True,
       "TransactionAmount": "100",
       "SetConvenienceIndicatorTip": False,
       "ConvenienceIndicatorTip": 0,
       "SetConvenienceFeeFixed": False,
       "ConvenienceFeeFixed": 0,
       "SetConvenienceFeePercentage": False,
       "ConvenienceFeePercentage": 0,
   }
   
   response = requests.post(
       "https://api.zwennpay.com:9425/api/v1.0/Common/GetMerchantQR",
       headers={"accept": "text/plain", "Content-Type": "application/json"},
       json=payload,
       timeout=20
   )
   
   print(response.status_code)
   print(response.text)
   ```

4. **Check Disk Space**
   ```
   - Ensure enough space for temp QR files
   - Clean up old QR files if needed
   ```

---

### Issue 3: Upload to Device Fails

**Symptoms**:
- "Upload failed" error
- "No acknowledgment for chunk" error
- Upload starts but doesn't complete

**Solutions**:

1. **Check Image Size**
   ```python
   # Image must be exactly 320x480 and under 80KB
   from PIL import Image
   img = Image.open('your_qr.jpg')
   print(f"Size: {img.size}")  # Should be (320, 480)
   
   import os
   size_kb = os.path.getsize('your_qr.jpg') / 1024
   print(f"File size: {size_kb:.1f} KB")  # Should be < 80
   ```

2. **Reduce Chunk Size**
   ```python
   # In insurance_device_config.py
   DEVICE_CONFIG = {
       'chunk_size': 512,  # Try smaller chunks (default is 1024)
       # ...
   }
   ```

3. **Check Device Memory**
   ```python
   # Run this to check available memory
   from insurance_esp32_handler import InsuranceESP32Handler
   h = InsuranceESP32Handler()
   h.connect()
   memory = h.get_free_memory()
   print(f"Free memory: {memory} KB")
   ```

4. **Reconnect Device**
   ```
   - Stop service
   - Unplug device
   - Wait 5 seconds
   - Plug back in
   - Start service
   ```

5. **Clear Device Storage**
   ```python
   # Delete old files from device
   from insurance_esp32_handler import InsuranceESP32Handler
   h = InsuranceESP32Handler()
   h.connect()
   h.delete_image(1)  # Delete slot 1
   h.disconnect()
   ```

---

### Issue 4: API Authentication Fails

**Symptoms**:
- "Unauthorized" error (401)
- "Invalid API key" message

**Solutions**:

1. **Verify API Key**
   ```javascript
   // In frontend
   const API_KEY = 'your-secure-api-key-here';
   
   // Must match insurance_device_config.py:
   API_CONFIG = {
       'api_key': 'your-secure-api-key-here',
       // ...
   }
   ```

2. **Check Headers**
   ```javascript
   // Ensure header is correct
   headers: {
       'X-API-Key': API_KEY,  // Note: X-API-Key, not X-Api-Key
       'Content-Type': 'application/json'
   }
   ```

3. **Disable Auth for Testing**
   ```python
   # In insurance_device_config.py (TESTING ONLY!)
   API_CONFIG = {
       'require_auth': False,  # Disable authentication
       // ...
   }
   ```

---

### Issue 5: Service Won't Start

**Symptoms**:
- Service crashes immediately
- "Port already in use" error
- Import errors

**Solutions**:

1. **Check Port Availability**
   ```bash
   # Windows
   netstat -ano | findstr :8080
   
   # If port is in use, kill the process or change port
   ```

2. **Change Service Port**
   ```python
   # In insurance_device_config.py
   SERVICE_CONFIG = {
       'port': 8081,  # Try different port
       // ...
   }
   ```

3. **Check Dependencies**
   ```bash
   pip list
   # Verify all required packages are installed
   
   # Reinstall if needed
   pip install -r requirements.txt --force-reinstall
   ```

4. **Check Python Version**
   ```bash
   python --version
   # Should be 3.7 or higher
   ```

5. **Check for Syntax Errors**
   ```bash
   python -m py_compile insurance_local_service.py
   # Should show no errors
   ```

---

### Issue 6: Frontend Can't Reach Service

**Symptoms**:
- "Network error" in frontend
- "Failed to fetch" error
- CORS errors

**Solutions**:

1. **Check Service is Running**
   ```bash
   # Open browser and go to:
   http://localhost:8080/health
   
   # Should return JSON with status: "online"
   ```

2. **Check Firewall**
   ```
   - Windows Firewall → Allow an app
   - Add Python to allowed apps
   - Or temporarily disable firewall for testing
   ```

3. **Enable CORS (if needed)**
   ```python
   # Add to insurance_local_service.py
   from flask_cors import CORS
   
   app = Flask(__name__)
   CORS(app)  # Enable CORS for all routes
   ```

4. **Use Backend Proxy**
   ```
   Instead of frontend → local service
   Use: frontend → backend → local service
   (See implementation guide for proxy code)
   ```

5. **Check Network**
   ```bash
   # From agent computer
   ping [backend-server-ip]
   
   # From backend server
   ping [agent-computer-ip]
   ```

---

### Issue 7: QR Not Displaying on Device

**Symptoms**:
- Upload succeeds but QR not visible
- Device shows old image
- Blank screen

**Solutions**:

1. **Check Rotation Status**
   ```python
   # Stop rotation to show QR
   from insurance_esp32_handler import InsuranceESP32Handler
   h = InsuranceESP32Handler()
   h.connect()
   h.stop_rotation()
   ```

2. **Verify Upload Slot**
   ```python
   # Ensure uploading to correct slot
   DEVICE_CONFIG = {
       'upload_slot': 1,  # Should be 1
       // ...
   }
   ```

3. **Check Device Display**
   ```
   - Device might be in sleep mode
   - Try pressing device button (if available)
   - Power cycle device
   ```

4. **Upload Test Image**
   ```python
   # Upload a known good image
   from insurance_esp32_handler import InsuranceESP32Handler
   h = InsuranceESP32Handler()
   h.connect()
   h.upload_image('test_image.jpg', 1)
   h.stop_rotation()
   ```

---

### Issue 8: Multiple Agents / Devices

**Scenario**: Multiple agents each with their own device

**Solutions**:

1. **Separate Service Instances**
   ```
   Agent 1: COM3, Port 8080
   Agent 2: COM4, Port 8081
   Agent 3: COM5, Port 8082
   ```

2. **Configuration per Agent**
   ```python
   # Create agent1_config.py, agent2_config.py, etc.
   # Or use environment variables
   
   import os
   SERIAL_CONFIG = {
       'port': os.getenv('DEVICE_PORT', 'COM3'),
       // ...
   }
   
   SERVICE_CONFIG = {
       'port': int(os.getenv('SERVICE_PORT', '8080')),
       // ...
   }
   ```

3. **Start Scripts per Agent**
   ```batch
   REM start_agent1.bat
   set DEVICE_PORT=COM3
   set SERVICE_PORT=8080
   python insurance_local_service.py
   
   REM start_agent2.bat
   set DEVICE_PORT=COM4
   set SERVICE_PORT=8081
   python insurance_local_service.py
   ```

4. **Backend Routing**
   ```python
   # Backend knows which agent uses which service
   AGENT_SERVICES = {
       'AGT001': 'http://agent1-pc:8080',
       'AGT002': 'http://agent2-pc:8080',
       'AGT003': 'http://agent3-pc:8080',
   }
   
   def get_agent_service_url(agent_id):
       return AGENT_SERVICES.get(agent_id)
   ```

---

## 📊 Monitoring & Maintenance

### Daily Checks

1. **Service Status**
   ```
   - Check service is running
   - Verify device connected
   - Check logs for errors
   ```

2. **Device Health**
   ```
   - Check free memory
   - Verify QR generation works
   - Test full flow once
   ```

### Weekly Maintenance

1. **Log Review**
   ```
   - Review error logs
   - Check for patterns
   - Archive old logs
   ```

2. **Performance Check**
   ```
   - QR generation time
   - Upload success rate
   - API response times
   ```

### Monthly Maintenance

1. **Updates**
   ```
   - Update Python packages
   - Check for security updates
   - Update documentation
   ```

2. **Backup**
   ```
   - Backup configuration files
   - Backup logs
   - Document any changes
   ```

---

## 📈 Performance Optimization

### Optimize QR Generation

```python
# Cache QR generator instance
qr_generator = InsuranceQRGenerator()  # Create once

# Reuse for multiple QRs
result1 = qr_generator.generate_qr_for_premium(1500, "Customer 1", "POL1")
result2 = qr_generator.generate_qr_for_premium(2000, "Customer 2", "POL2")
```

### Optimize Device Connection

```python
# Keep connection alive
# Don't disconnect after each upload
handler = InsuranceESP32Handler()
handler.connect()

# Use for multiple uploads
handler.upload_image(qr1, 1)
handler.upload_image(qr2, 1)
handler.upload_image(qr3, 1)

# Only disconnect when done for the day
handler.disconnect()
```

### Optimize Upload Speed

```python
# Increase chunk size if stable
DEVICE_CONFIG = {
    'chunk_size': 2048,  # Larger chunks = faster (if stable)
    // ...
}

# Or decrease if unstable
DEVICE_CONFIG = {
    'chunk_size': 512,  # Smaller chunks = more stable
    // ...
}
```

---

## 🔒 Security Best Practices

### 1. API Key Security

```python
# DON'T hardcode in frontend
const API_KEY = 'my-secret-key';  // ✗ Bad

// DO use environment variables or backend proxy
const API_KEY = process.env.DEVICE_API_KEY;  // ✓ Good

// OR use backend proxy (best)
fetch('/api/device/generate-qr', {...})  // ✓ Best
```

### 2. Network Security

```
- Run service on localhost only (0.0.0.0 only if needed)
- Use VPN for remote access
- Don't expose service to internet directly
- Use HTTPS for frontend-backend communication
```

### 3. Data Security

```python
# Don't log sensitive data
logger.info(f"QR for customer {customer_id}")  # ✓ Good
logger.info(f"QR data: {qr_data}")  # ✗ Bad (contains payment info)

# Clean up temp files
try:
    os.remove(qr_filename)
except:
    pass
```

### 4. Access Control

```python
# Verify agent permissions in backend
def generate_qr_endpoint():
    agent_id = get_current_agent_id()
    if not has_permission(agent_id, 'generate_qr'):
        return jsonify({'error': 'Unauthorized'}), 403
    # ...
```

---

## 📞 Support & Contact

### Getting Help

1. **Check Logs**
   ```
   - insurance_device_YYYYMMDD.log
   - Look for ERROR or WARNING messages
   ```

2. **Run Diagnostics**
   ```bash
   python test_device.py
   python test_qr.py
   python test_full_flow.py
   ```

3. **Check Documentation**
   ```
   - This guide
   - API specifications
   - Implementation steps
   ```

4. **Contact Support**
   ```
   Email: [your-support-email]
   Phone: [your-support-phone]
   Hours: [your-support-hours]
   ```

### Reporting Issues

When reporting issues, include:

1. **Error Message**
   ```
   Copy exact error from logs or screen
   ```

2. **Steps to Reproduce**
   ```
   1. Started service
   2. Clicked Generate QR
   3. Got error: "Upload failed"
   ```

3. **Environment**
   ```
   - Windows version
   - Python version
   - COM port
   - Service version
   ```

4. **Logs**
   ```
   Attach relevant log file
   ```

---

## ✅ Success Criteria

### Technical Success
- [ ] Service runs 24/7 without crashes
- [ ] QR generation success rate > 99%
- [ ] Upload success rate > 99%
- [ ] Average QR display time < 5 seconds
- [ ] Device stays connected for full day

### Business Success
- [ ] Agents can use system without training
- [ ] Customers can scan QR easily
- [ ] Payment confirmation is quick
- [ ] No manual intervention needed
- [ ] System integrates seamlessly with existing workflow

### User Satisfaction
- [ ] Agents find it easy to use
- [ ] Customers prefer device over screen
- [ ] Fewer payment errors
- [ ] Faster transaction times
- [ ] Positive feedback from team

---

## 🎓 Training Materials

### Agent Quick Start

**5-Minute Training**:

1. **Starting the Service** (30 seconds)
   - Double-click "Start Device Service"
   - Wait for green checkmark

2. **Generating QR** (1 minute)
   - Search customer
   - Click "Generate QR on Device"
   - Customer scans from device

3. **Completing Payment** (30 seconds)
   - Click "Payment Complete"
   - System updates automatically

4. **Troubleshooting** (3 minutes)
   - Device not connected: Check USB
   - Service not starting: Run as admin
   - QR not showing: Restart service

### Video Tutorial Script

```
[0:00] Welcome to the Insurance Premium Device System
[0:10] This device displays QR codes for customer payments
[0:20] Let me show you how to use it...

[0:30] Step 1: Start the service
[0:35] Double-click the desktop icon
[0:40] Wait for the green checkmark

[0:50] Step 2: Search for a customer
[0:55] Enter policy number or name
[1:00] View outstanding premium amount

[1:10] Step 3: Generate QR
[1:15] Click "Generate QR on Device"
[1:20] QR appears on the device screen
[1:25] Customer scans with phone

[1:35] Step 4: Confirm payment
[1:40] After customer pays, click "Payment Complete"
[1:45] System updates automatically

[1:55] That's it! Easy and fast.
[2:00] For help, check the quick reference guide.
```

---

## 📋 Appendix

### A. File Structure

```
insurance_device_service/
├── insurance_device_config.py          # Configuration
├── insurance_esp32_handler.py          # Device communication
├── insurance_qr_generator.py           # QR generation
├── insurance_local_service.py          # HTTP API service
├── requirements.txt                    # Dependencies
├── test_device.py                      # Device tests
├── test_qr.py                          # QR tests
├── test_full_flow.py                   # Integration tests
├── test_api.py                         # API tests
├── start_service.bat                   # Startup script
├── install_service.bat                 # Service installer
└── logs/                               # Log files
    └── insurance_device_YYYYMMDD.log
```

### B. Environment Variables

```bash
# Optional environment variables
DEVICE_PORT=COM3
SERVICE_PORT=8080
API_KEY=your-secure-api-key
ZWENNPAY_MERCHANT_ID=56
LOG_LEVEL=INFO
```

### C. Useful Commands

```bash
# List COM ports
python -c "import serial.tools.list_ports; print([p.device for p in serial.tools.list_ports.comports()])"

# Check service status
curl http://localhost:8080/health

# Test QR generation
curl -X POST http://localhost:8080/qr/generate \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1500, "customer_name": "Test"}'

# Check Python packages
pip list | findstr -i "serial pillow qrcode flask requests"

# View logs
type insurance_device_20240115.log | more
```

---

## 🎉 Conclusion

You now have a complete guide to integrate the ESP32 payment device into your insurance premium collection system!

**Key Points**:
- Local service handles device communication
- Frontend calls API to generate QR
- QR displays on physical device
- Customer scans and pays
- Agent confirms payment
- System updates Xano database

**Next Steps**:
1. Set up development environment
2. Run all tests
3. Deploy to agent computer
4. Train agents
5. Go live!

**Remember**:
- Keep service running during business hours
- Check logs regularly
- Maintain device connection
- Update documentation as needed

Good luck with your implementation! 🚀
