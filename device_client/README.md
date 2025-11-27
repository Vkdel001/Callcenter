# NIC Device Client - Windows Application

Windows application that polls VPS for QR display commands and communicates with ESP32 device via USB.

## 📋 Prerequisites

### Software Requirements
- **Windows 10/11** (64-bit)
- **Python 3.8 or higher** (for development/building)
- **ESP32 Device** connected via USB
- **CH340 USB Driver** (if not already installed)

### Hardware Requirements
- ESP32 device with 320x480 display
- USB cable
- Internet connection

## 🚀 Quick Start (For End Users)

### Option 1: Use Pre-built EXE (Recommended)

1. Download `NIC_Device_Client.exe`
2. Double-click to run
3. System tray icon will appear (green = online)
4. Done! The device is now ready to receive QR codes

### Option 2: Install from Installer

1. Download `NIC_Device_Setup.exe`
2. Run installer
3. Follow installation wizard
4. Launch from desktop shortcut
5. Done!

## 🛠️ Development Setup

### 1. Install Python

Download and install Python 3.8+ from [python.org](https://www.python.org/downloads/)

Make sure to check "Add Python to PATH" during installation.

### 2. Install Dependencies

```bash
cd device_client
pip install -r requirements.txt
```

### 3. Configure VPS Connection

Edit `config.py`:

```python
# Update these values
self.vps_url = 'https://your-vps-domain.com'  # Your actual VPS URL
self.api_key = 'YOUR-ACTUAL-API-KEY'          # Your actual API key
```

### 4. Test Run

```bash
python device_client.py
```

The application will:
1. Detect ESP32 device
2. Register with VPS
3. Start polling for commands
4. Show system tray icon

## 📦 Building EXE

### Build Standalone EXE

```bash
build.bat
```

This will:
1. Install PyInstaller
2. Install dependencies
3. Build single EXE file
4. Output to `dist/NIC_Device_Client.exe`

### Build Installer (Optional)

1. Install [Inno Setup](https://jrsoftware.org/isinfo.php)
2. Open `installer.iss` in Inno Setup
3. Click "Compile"
4. Installer will be created in `output/` folder

## 🔧 Configuration

### Environment Variables (Optional)

Instead of editing `config.py`, you can set environment variables:

```bash
set VPS_URL=https://your-vps-domain.com
set API_KEY=YOUR-ACTUAL-API-KEY
```

### Configuration File

All settings are in `config.py`:

| Setting | Default | Description |
|---------|---------|-------------|
| `vps_url` | - | VPS backend URL |
| `api_key` | - | API authentication key |
| `poll_interval` | 2 | Polling interval (seconds) |
| `log_file` | device_client.log | Log file location |
| `log_level` | INFO | Logging level |

## 📱 Usage

### System Tray Menu

Right-click the system tray icon:

- **Status** - Show current status
- **Device** - Show device ID
- **View Logs** - Open log file
- **Restart Connection** - Reconnect to VPS/ESP32
- **Exit** - Close application

### Status Indicators

- **Green Icon** - Online and ready
- **Red Icon** - Offline or error
- **Tooltip** - Shows current status

### Logs

Logs are saved to `device_client.log` in the application directory.

View logs:
- Right-click tray icon → "View Logs"
- Or open `device_client.log` manually

## 🐛 Troubleshooting

### ESP32 Not Detected

**Problem**: "ESP32 device not found" error

**Solutions**:
1. Check USB cable connection
2. Install CH340 driver: [Download](http://www.wch.cn/downloads/CH341SER_ZIP.html)
3. Try different USB port
4. Check Device Manager → Ports (COM & LPT)

### Cannot Connect to VPS

**Problem**: "Cannot connect to server" error

**Solutions**:
1. Check internet connection
2. Verify VPS URL in `config.py`
3. Verify API key matches VPS
4. Check firewall settings
5. Test VPS: `curl https://your-vps.com/api/device/health`

### QR Not Displaying

**Problem**: Command received but QR doesn't show

**Solutions**:
1. Check ESP32 is connected
2. Check logs for upload errors
3. Verify image size (<80KB)
4. Restart application
5. Check ESP32 firmware

### High CPU Usage

**Problem**: Application using too much CPU

**Solutions**:
1. Increase poll interval in `config.py`
2. Check for errors in logs
3. Restart application

## 📊 Monitoring

### Check Device Status

View logs to see:
- Device registration
- Polling activity
- Command execution
- Errors and warnings

### Log Levels

- **INFO** - Normal operation
- **WARNING** - Non-critical issues
- **ERROR** - Critical errors
- **DEBUG** - Detailed debugging (set in config.py)

## 🔄 Updates

### Update Application

1. Download new version
2. Close old application (Exit from tray)
3. Replace EXE file
4. Start new version

### Update Configuration

1. Exit application
2. Edit `config.py`
3. Restart application

## 📝 File Structure

```
device_client/
├── device_client.py      # Main application
├── esp32_handler.py      # ESP32 communication
├── vps_api.py           # VPS API client
├── config.py            # Configuration
├── logger_util.py       # Logging utility
├── requirements.txt     # Python dependencies
├── build.bat           # Build script
├── icon.ico            # System tray icon
├── README.md           # This file
└── dist/               # Built EXE (after build)
    └── NIC_Device_Client.exe
```

## 🔐 Security

- API key is required for all VPS communication
- Device ID is unique per computer
- No sensitive data stored locally
- Logs contain no customer information

## 📞 Support

### Common Issues

1. **ESP32 not detected** → Check USB driver
2. **VPS connection failed** → Check URL and API key
3. **QR not displaying** → Check ESP32 connection
4. **Application crashes** → Check logs

### Getting Help

1. Check logs: `device_client.log`
2. Review troubleshooting section
3. Contact IT support with:
   - Log file
   - Error message
   - Device ID

## 📄 License

Internal use only - NIC Life Insurance

## 🔖 Version

**Version**: 1.0.0  
**Date**: November 2024  
**Status**: Production Ready
