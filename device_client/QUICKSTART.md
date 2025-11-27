# Quick Start Guide - NIC Device Client

## For Developers/IT Staff

### Step 1: Install Python (One-time setup)

1. Download Python 3.8+ from https://www.python.org/downloads/
2. Run installer
3. ✅ **IMPORTANT**: Check "Add Python to PATH"
4. Click "Install Now"

### Step 2: Configure VPS Connection

1. Open `config.py` in a text editor
2. Update these two lines:

```python
self.vps_url = 'https://your-actual-vps-domain.com'  # Your VPS URL
self.api_key = 'YOUR-ACTUAL-API-KEY-HERE'            # Your API key
```

3. Save the file

### Step 3: Install Dependencies

Open Command Prompt in the `device_client` folder:

```bash
pip install -r requirements.txt
```

### Step 4: Test Configuration

```bash
python test_connection.py
```

This will verify:
- ✓ Configuration is correct
- ✓ VPS is reachable
- ✓ ESP32 can be detected
- ✓ All dependencies installed

### Step 5: Test Run

```bash
python device_client.py
```

You should see:
- ESP32 detected
- Registered with VPS
- System tray icon appears
- Ready to receive commands

### Step 6: Build EXE

```bash
build.bat
```

This creates: `dist\NIC_Device_Client.exe`

### Step 7: Test EXE

1. Close the Python version (if running)
2. Double-click `dist\NIC_Device_Client.exe`
3. Verify it works the same way

### Step 8: Deploy to Agents

**Option A: Simple Deployment**
- Copy `NIC_Device_Client.exe` to agent computers
- Create desktop shortcut
- Done!

**Option B: Professional Installer**
1. Install Inno Setup: https://jrsoftware.org/isinfo.php
2. Open `installer.iss` in Inno Setup
3. Click "Compile"
4. Distribute `output\NIC_Device_Setup.exe`

---

## For End Users (Agents)

### Installation

1. Double-click `NIC_Device_Setup.exe`
2. Click "Next" → "Next" → "Install"
3. Check "Launch NIC Payment Device"
4. Click "Finish"

### Daily Use

1. **Starting**: Double-click desktop icon "NIC Payment Device"
2. **Status**: Look for green icon in system tray (bottom-right)
3. **Using**: Just login to web app and generate QR codes normally
4. **Closing**: Right-click tray icon → Exit

### Troubleshooting

**Problem**: Icon doesn't appear
- **Solution**: Check if ESP32 is plugged in via USB

**Problem**: QR doesn't display
- **Solution**: Right-click tray icon → Restart Connection

**Problem**: Application won't start
- **Solution**: Contact IT support

---

## Configuration Checklist

Before building/deploying, verify:

- [ ] `config.py` has correct VPS URL
- [ ] `config.py` has correct API key
- [ ] VPS backend is running and accessible
- [ ] Test connection passes all checks
- [ ] Test run works with actual ESP32
- [ ] EXE build completes successfully
- [ ] EXE runs on clean Windows machine

---

## File Checklist

Files needed for deployment:

**Minimum (Simple)**:
- `NIC_Device_Client.exe` - The application

**Recommended (With Installer)**:
- `NIC_Device_Setup.exe` - Installer
- `README.md` - User documentation

**Not Needed for Deployment**:
- Python source files (.py)
- requirements.txt
- build.bat
- All development files

---

## Support

### For Developers

Check logs: `device_client.log` in application folder

Common issues:
1. VPS connection → Check URL and API key
2. ESP32 detection → Install CH340 driver
3. Build errors → Check Python version and dependencies

### For End Users

Contact IT support with:
- Screenshot of error
- Log file (Right-click tray icon → View Logs)
- Computer name

---

## Next Steps After Building

1. ✅ Test on development machine
2. ✅ Test on clean Windows machine (no Python)
3. ✅ Test with actual VPS backend
4. ✅ Test QR generation flow end-to-end
5. ✅ Deploy to pilot users (2-3 agents)
6. ✅ Monitor for 1-2 days
7. ✅ Roll out to all agents

---

**Version**: 1.0.0  
**Last Updated**: November 2024
