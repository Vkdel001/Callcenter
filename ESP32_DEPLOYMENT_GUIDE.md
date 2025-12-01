# ESP32 Device Integration - VPS Deployment Guide

**Project**: NIC Life Insurance Call Center System  
**Feature**: ESP32 QR Code Display Integration  
**Deployment Type**: VPS Backend + Local Windows Clients  
**Version**: 1.2 (Production Ready)  
**Date**: November 27, 2024  
**Status**: ✅ Ready for Production Deployment

---

## 🆕 Version 1.2 Updates (Latest)

**Critical Production Features:**
- ✅ **Agent Shift Change Support**: Automatic device re-linking when agents change
- ✅ **Smart Auto-Linking**: Automatically finds and links to online devices
- ✅ **3-Tier Linking Strategy**: Multiple fallback methods for robust linking
- ✅ **Persistent Device ID**: Stores device_id for faster future connections
- ✅ **Enhanced Logging**: Clear console messages for easy troubleshooting
- ✅ **Better Error Handling**: Visible error messages instead of silent failures

**What This Means:**
- ✅ **No restarts needed** for agent shift changes throughout the day
- ✅ Device linking works even with computer name mismatches
- ✅ Multiple agents can use same device seamlessly
- ✅ Troubleshooting is easier with detailed console logging
- ✅ Production-tested with edge cases verified

---

## 📋 Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Architecture Summary](#architecture-summary)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [VPS Backend Deployment](#vps-backend-deployment)
5. [Frontend Configuration](#frontend-configuration)
6. [Windows Client Distribution](#windows-client-distribution)
7. [Testing & Verification](#testing--verification)
8. [Rollback Procedures](#rollback-procedures)
9. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🎯 Deployment Overview

### What We're Deploying

**VPS Server (Production):**
- ✅ Backend Device API Service (`backend-device-service.cjs`)
- ✅ Updated Frontend (React app with device integration)
- ✅ Nginx configuration for API proxy

**Agent Computers (Local):**
- ✅ Windows Client EXE (`NIC_Device_Client.exe`)
- ✅ ESP32 devices connected via USB

### Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    VPS SERVER                               │
│  https://your-domain.com                                    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Nginx (Port 80/443)                                 │  │
│  │  - Serves React App (with device features)          │  │
│  │  - Proxies /api/device/* to port 5001               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Device API Service (Node.js - Port 5001)           │  │
│  │  File: backend-device-service.cjs                    │  │
│  │  - Manages device registry                          │  │
│  │  - Handles command queueing                         │  │
│  │  - Provides polling endpoint                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                    ↑ HTTPS Polling (every 2 seconds)
        ┌───────────┴───────────┬───────────┬───────────┐
        │                       │           │           │
┌───────▼──────┐    ┌──────────▼───┐  ┌───▼──────┐  ┌─▼────────┐
│ AGENT 1 PC   │    │ AGENT 2 PC   │  │AGENT 3 PC│  │AGENT 4 PC│
│ Windows      │    │ Windows      │  │Windows   │  │Windows   │
│              │    │              │  │          │  │          │
│ ┌──────────┐ │    │ ┌──────────┐ │  │┌────────┐│  │┌────────┐│
│ │Device EXE│ │    │ │Device EXE│ │  ││Device  ││  ││Device  ││
│ │+ ESP32   │ │    │ │+ ESP32   │ │  ││+ ESP32 ││  ││+ ESP32 ││
│ └──────────┘ │    │ └──────────┘ │  │└────────┘│  │└────────┘│
└──────────────┘    └──────────────┘  └──────────┘  └──────────┘
```

---

## 🔑 Configuration Summary (READ THIS FIRST!)

**All three components must use the SAME API key for authentication:**

| Component | File to Edit | Setting | Production Value |
|-----------|-------------|---------|------------------|
| **VPS Backend** | `.env` | `DEVICE_API_KEY=` | `+uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=` |
| **Frontend** | `src/services/deviceService.js` | `const DEVICE_API_KEY =` | `'+uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI='` |
| **Windows Client** | `device_client/config.py` | `self.api_key = os.getenv('API_KEY', ...)` | `'+uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI='` |

**URLs Configuration:**

| Component | Setting | Production Value |
|-----------|---------|------------------|
| **VPS Backend** | Runs on port | `5001` (localhost only) |
| **Frontend** | `DEVICE_SERVICE_URL` | `'https://payments.niclmauritius.site'` |
| **Windows Client** | `self.vps_url` | `'https://payments.niclmauritius.site'` |
| **Nginx Proxy** | Proxies `/api/device/` to | `http://localhost:5001/api/device/` |

**⚠️ CRITICAL NOTES:**
1. The API key is **hardcoded** in all three places - no environment variables are used
2. All three API keys must be **identical** (including the `=` at the end)
3. Frontend and Windows client both connect to `https://payments.niclmauritius.site`
4. Backend runs on `localhost:5001` and is accessed via Nginx proxy

---

## ✅ Pre-Deployment Checklist

### VPS Server Requirements
- [ ] Ubuntu 20.04+ or similar Linux distribution
- [ ] Node.js 18.x LTS installed
- [ ] Nginx installed and configured
- [ ] SSL certificate active (Let's Encrypt)
- [ ] Firewall configured (UFW)
- [ ] Minimum 2GB RAM available
- [ ] Port 5001 available for device service

### Code Preparation
- [ ] All ESP32 code committed to Git repository
- [ ] Backend service tested locally
- [ ] Frontend tested with device integration
- [ ] Windows client EXE built and tested
- [ ] Documentation reviewed and updated

### Configuration Files Ready
- [ ] `.env` file with production URLs
- [ ] `backend-device-service.cjs` with correct API key
- [ ] `device_client/config.py` with production VPS URL
- [ ] Nginx configuration prepared

### Agent Computer Requirements
- [ ] Windows 10/11 (64-bit)
- [ ] USB port available for ESP32
- [ ] Internet connection (HTTPS access to VPS)
- [ ] No Python installation needed (EXE is standalone)

---

## 🚀 VPS Backend Deployment

### Step 1: Connect to VPS

```bash
# SSH to your VPS server
ssh root@your-vps-ip

# Navigate to project directory
cd /var/www/nic-callcenter
```

### Step 2: Pull Latest Code

```bash
# Check current status
git status

# Pull latest changes (includes ESP32 integration)
git pull origin main

# Verify new files are present
ls -la backend-device-service.cjs
ls -la device_client/
```

### Step 3: Install PM2 (if not already installed)

```bash
# Install PM2 globally for process management
npm install -g pm2

# Verify installation
pm2 --version
```

### Step 4: Configure Environment Variables

```bash
# Edit production environment file
nano .env
```

**Check if these variables already exist** (they should be at the bottom of your `.env` file):

```bash
# Device Service Configuration
DEVICE_SERVICE_PORT=5001
DEVICE_API_KEY=+uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=
```

**If they don't exist, add them:**

```bash
# Add to bottom of .env file
DEVICE_SERVICE_PORT=5001
DEVICE_API_KEY=+uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=
```

**⚠️ IMPORTANT**: 
- This API key is already generated and secure
- You must use this **exact same key** in frontend and Windows client
- If you want to generate a new key: `openssl rand -base64 32`
- If you change it here, you MUST update it in all three places (see Configuration Summary above)

### Step 5: Install Dependencies

```bash
# Install dotenv package (required for loading .env file)
npm install dotenv

# Verify installation
npm list dotenv
```

### Step 6: Create Device Data Directory

```bash
# Create directory for device data storage
mkdir -p /var/www/nic-callcenter/device_data

# Set proper permissions
chown -R www-data:www-data /var/www/nic-callcenter/device_data
chmod 755 /var/www/nic-callcenter/device_data
```

### Step 7: Start Device Service with PM2

```bash
# Start the device service
pm2 start backend-device-service.cjs --name device-api

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot (if not already done)
pm2 startup

# Verify service is running
pm2 status

# Check logs to verify .env was loaded
pm2 logs device-api --lines 20
```

**Expected Output:**
```
┌─────┬──────────────┬─────────┬─────────┬──────────┐
│ id  │ name         │ status  │ restart │ uptime   │
├─────┼──────────────┼─────────┼─────────┼──────────┤
│ 0   │ device-api   │ online  │ 0       │ 5s       │
└─────┴──────────────┴─────────┴─────────┴──────────┘
```

**✅ Important Note:**
The backend service now automatically loads the `.env` file using `dotenv` (added in `backend-device-service.cjs`). No need for PM2 ecosystem files or environment variable flags. Just make sure `dotenv` is installed (Step 5).

### Step 8: Configure Nginx Proxy

```bash
# Edit Nginx configuration
sudo nano /etc/nginx/sites-available/nic-callcenter
```

Add this location block inside the `server` block:

```nginx
# Device API proxy
location /api/device/ {
    proxy_pass http://localhost:5001/api/device/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Increase timeout for long polling
    proxy_read_timeout 90s;
    proxy_connect_timeout 90s;
    proxy_send_timeout 90s;
}
```

**Complete Nginx Configuration Example:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    root /var/www/nic-callcenter/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Device API proxy (NEW)
    location /api/device/ {
        proxy_pass http://localhost:5001/api/device/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
        proxy_connect_timeout 90s;
        proxy_send_timeout 90s;
    }
    
    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

```bash
# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

### Step 8: Test Device API Endpoint

```bash
# Test health endpoint
curl https://your-domain.com/api/device/health

# Expected response:
# {"status":"online","service":"NIC Device API","version":"1.0.0","timestamp":"..."}
```

---

## 🎨 Frontend Configuration

### Step 1: Update Device Service Configuration

**⚠️ IMPORTANT**: The device service configuration is **hardcoded** in the JavaScript file. You must edit the file directly.

```bash
# Edit device service configuration
nano src/services/deviceService.js
```

**Find these two lines** (around line 6-7):

```javascript
// BEFORE (localhost):
const DEVICE_SERVICE_URL = 'http://localhost:5001';
const DEVICE_API_KEY = 'NIC-DEVICE-API-KEY-2024-CHANGE-ME';
```

**Change to:**

```javascript
// AFTER (production):
const DEVICE_SERVICE_URL = 'https://payments.niclmauritius.site';
const DEVICE_API_KEY = '+uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=';
```

**⚠️ Critical Notes:**
- The API key must **match exactly** with `DEVICE_API_KEY` in your VPS `.env` file
- Include the `=` at the end of the API key
- The URL should be your domain (without `/api/device/` path)
- Do NOT use `.env.production` - this code doesn't read environment variables

**After editing, the top of the file should look like:**

```javascript
/**
 * ESP32 Device Service Client
 * Communicates with VPS backend to queue QR commands for devices
 * Uses polling-based architecture for production deployment
 */

const DEVICE_SERVICE_URL = 'https://payments.niclmauritius.site';
const DEVICE_API_KEY = '+uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=';

class DeviceService {
  constructor() {
    this.serviceUrl = DEVICE_SERVICE_URL;
    this.apiKey = DEVICE_API_KEY;
    // ... rest of the code
  }
  // ... rest of the class
}
```

### Step 2: Build Frontend

```bash
# Install dependencies (if needed)
npm install

# Build production version
npm run build

# Verify build completed
ls -la dist/
```

### Step 3: Deploy Frontend

```bash
# Frontend is already in dist/ folder
# Nginx will serve it automatically

# Verify files are accessible
curl -I https://your-domain.com

# Expected: HTTP/2 200
```

---

## 💻 Windows Client Distribution

### Step 1: Update Windows Client Configuration

**⚠️ CRITICAL**: The Windows client configuration must match your VPS backend exactly!

**On your development machine:**

```bash
# Navigate to device client folder
cd device_client

# Edit configuration file
nano config.py
```

**Find these lines** (around line 13-14):

```python
# BEFORE (default):
self.vps_url = os.getenv('VPS_URL', 'http://localhost:5001')
self.api_key = os.getenv('API_KEY', 'NIC-DEVICE-API-KEY-2024-CHANGE-ME')
```

**Change to** (hardcoded production values):

```python
# AFTER (production):
self.vps_url = os.getenv('VPS_URL', 'https://payments.niclmauritius.site')
self.api_key = os.getenv('API_KEY', '+uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=')
```

**📋 Configuration Checklist:**

| Setting | Value | Must Match |
|---------|-------|------------|
| `vps_url` | `https://payments.niclmauritius.site` | Your actual domain |
| `api_key` | `+uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=` | `DEVICE_API_KEY` in VPS `.env` |

**⚠️ Why use `os.getenv()` with defaults?**
- Keeps the fallback pattern for flexibility
- The default value (second parameter) is what gets used when building the EXE
- You can still override with environment variables if needed later

**Complete updated section should look like:**

```python
class Config:
    def __init__(self):
        # VPS Configuration (PRODUCTION)
        self.vps_url = os.getenv('VPS_URL', 'https://payments.niclmauritius.site')
        self.api_key = os.getenv('API_KEY', '+uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=')
        
        # Computer Information
        self.computer_name = self.get_computer_name()
        
        # Logging Configuration
        self.log_file = os.path.join(os.getcwd(), 'device_client.log')
        self.log_level = 'INFO'
        self.log_max_size = 10 * 1024 * 1024  # 10 MB
        self.log_backup_count = 5
        
        # Polling Configuration
        self.poll_interval = 2  # seconds
        
        # ESP32 Configuration
        self.esp32_baud_rate = 9600
        self.esp32_timeout = 5
        self.device_width = 320
        self.device_height = 480
        self.chunk_size = 1024
        
        # Retry Configuration
        self.max_retries = 3
        self.retry_delay = 5  # seconds
```

### Step 2: Build Windows EXE

```bash
# Build the EXE
build.bat

# Verify EXE was created
dir dist\NIC_Device_Client.exe
```

### Step 3: Test EXE Locally

```bash
# Test the EXE on your development machine
dist\NIC_Device_Client.exe

# Verify:
# - Connects to production VPS
# - Registers device successfully
# - Shows green system tray icon
```

### Step 4: Create Distribution Package

```bash
# Create a distribution folder
mkdir NIC_Device_Client_Distribution

# Copy necessary files
copy dist\NIC_Device_Client.exe NIC_Device_Client_Distribution\
copy README.md NIC_Device_Client_Distribution\
copy QUICKSTART.md NIC_Device_Client_Distribution\

# Create a simple installation guide
```

Create `NIC_Device_Client_Distribution\INSTALL.txt`:

```
NIC Payment Device Client - Installation Guide
==============================================

REQUIREMENTS:
- Windows 10/11 (64-bit)
- ESP32 device with USB cable
- Internet connection (HTTPS access to NIC server)

INSTALLATION STEPS:

1. Plug in ESP32 device via USB
   - Windows will automatically install CH340 USB driver
   - Wait for "Device Ready" notification

2. Copy NIC_Device_Client.exe to your computer
   - Recommended location: C:\NIC\Device\
   - Or Desktop for easy access

3. Create desktop shortcut (optional)
   - Right-click NIC_Device_Client.exe
   - Select "Create shortcut"
   - Move shortcut to Desktop

4. Run the application
   - Double-click NIC_Device_Client.exe
   - Look for green icon in system tray (bottom-right)
   - Green icon = Online and ready

5. Login to NIC web portal
   - Your device will automatically link to your account
   - You can now generate QR codes

TROUBLESHOOTING:

- No green icon appears
  → Check ESP32 USB connection
  → Try different USB port

- Red icon in system tray
  → Check internet connection
  → Contact IT support

- Application won't start
  → Check Windows Defender didn't block it
  → Right-click → Properties → Unblock

SUPPORT:
Contact IT Department for assistance
```

### Step 5: Distribute to Agent Computers

**Option A: Manual Distribution**
```
1. Copy NIC_Device_Client_Distribution folder to USB drive
2. Visit each agent computer
3. Copy files to C:\NIC\Device\
4. Create desktop shortcut
5. Test with agent
```

**Option B: Network Distribution**
```
1. Upload to shared network drive
2. Send email to agents with instructions
3. Agents download and install themselves
4. IT provides remote support if needed
```

**Option C: Installer (Advanced)**
```
1. Use Inno Setup to create installer
2. Distribute installer.exe
3. Agents run installer
4. Desktop shortcut created automatically
```

---

## ✅ Testing & Verification

### VPS Backend Testing

```bash
# 1. Test health endpoint
curl https://your-domain.com/api/device/health

# Expected: {"status":"online",...}

# 2. Check PM2 status
pm2 status

# Expected: device-api status = online

# 3. Check PM2 logs
pm2 logs device-api --lines 50

# Expected: No errors, service running

# 4. Check device data directory
ls -la /var/www/nic-callcenter/device_data/

# Expected: device-registry.json, device-commands.json

# 5. Test device registration (manual)
curl -X POST https://your-domain.com/api/device/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR-API-KEY" \
  -d '{
    "device_id": "test_device_123",
    "computer_name": "TEST-PC",
    "com_port": "COM3"
  }'

# Expected: {"success":true,"device_id":"test_device_123"}
```

### Frontend Testing

```bash
# 1. Access web application
# Open browser: https://your-domain.com

# 2. Login as agent

# 3. Navigate to customer detail page

# 4. Click "Generate QR" button

# 5. Verify:
# - QR displays on screen
# - No console errors
# - Device service called successfully
```

### Windows Client Testing

**On Agent Computer:**

```
1. Run NIC_Device_Client.exe

2. Verify system tray icon appears (green)

3. Check logs:
   - Open device_client.log
   - Look for "Device registered successfully"
   - Look for "Polling started"

4. Login to web portal

5. Generate QR code for test customer

6. Verify:
   - QR displays on ESP32 device
   - Rotation stops
   - QR is clear and scannable

7. Close QR modal

8. Verify:
   - Rotation resumes on ESP32
```

### End-to-End Testing

**Complete Workflow Test:**

```
1. Agent starts Windows client
   ✓ Green icon appears

2. Agent logs into web portal
   ✓ Device links automatically

3. Agent opens customer detail
   ✓ Customer data loads

4. Agent clicks "Generate QR"
   ✓ QR displays on screen
   ✓ QR displays on ESP32 device
   ✓ Rotation stops

5. Customer scans QR and pays
   ✓ Payment processes

6. Agent closes QR modal
   ✓ Rotation resumes on ESP32

7. Agent logs out
   ✓ Device remains ready for next agent
```

---

## �  Recent Improvements (v1.1)

### Auto-Linking Feature

**What Changed:**
The device linking system now includes a **3-tier smart linking strategy** that automatically handles computer name mismatches:

**Linking Strategy:**
1. **Tier 1**: Find by exact `device_id` (fastest - uses stored ID from previous session)
2. **Tier 2**: Find by `computer_name` (fallback for exact name match)
3. **Tier 3**: **Auto-link to most recent online device** (smart fallback - NEW!)

**Benefits:**
- ✅ Works even if computer names don't match between browser and Windows client
- ✅ Automatically links to any online device that isn't already assigned
- ✅ Stores device_id for faster linking in future sessions
- ✅ Better error messages and logging for troubleshooting

**Console Logging:**
When you login, you'll now see clear messages in browser console:
```
🔗 Attempting to link device for agent: 24 John Doe
✅ Device linked successfully: device_DESKTOP-RSJ243K_4CD717
```

Or if there's an issue:
```
⚠️ Device linking failed: No online device available
```

**Troubleshooting:**
If device linking fails:
1. Check Windows client is running (green system tray icon)
2. Check browser console for detailed error messages
3. Verify device is registered: `curl https://your-domain.com/api/device/list`
4. Try logging out and back in (device_id is now stored)

---

## 🔄 Rollback Procedures

### If Deployment Fails

**Step 1: Stop Device Service**
```bash
# Stop PM2 service
pm2 stop device-api

# Or delete it completely
pm2 delete device-api
```

**Step 2: Revert Nginx Configuration**
```bash
# Remove device API proxy block
sudo nano /etc/nginx/sites-available/nic-callcenter

# Remove the /api/device/ location block

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

**Step 3: Revert Frontend Code**
```bash
cd /var/www/nic-callcenter

# Checkout previous commit
git log --oneline -10
git checkout <previous-commit-hash>

# Rebuild frontend
npm run build

# Reload Nginx
sudo systemctl reload nginx
```

**Step 4: Notify Agents**
```
Send email to all agents:
- Device integration temporarily disabled
- Use standard QR generation (screen only)
- Windows client not needed at this time
```

### If Windows Client Has Issues

**Quick Fix:**
```
1. Stop Windows client (right-click tray icon → Exit)
2. Revert to previous EXE version
3. Update config.py with correct VPS URL
4. Rebuild EXE
5. Redistribute to agents
```

---

## 📊 Monitoring & Maintenance

### Daily Monitoring

```bash
# Check device service status
pm2 status device-api

# Check device service logs
pm2 logs device-api --lines 50

# Check for errors
pm2 logs device-api --err --lines 20

# Check device count
curl https://your-domain.com/api/device/list \
  -H "X-API-Key: YOUR-API-KEY" | jq '.stats'
```

### Weekly Maintenance

```bash
# Check device data file sizes
du -sh /var/www/nic-callcenter/device_data/*

# Cleanup old command history (if needed)
# Commands older than 7 days are auto-cleaned

# Check PM2 logs size
pm2 flush  # Clear old logs if too large

# Restart service for fresh start
pm2 restart device-api
```

### Performance Monitoring

```bash
# Check service memory usage
pm2 monit

# Check device statistics
curl https://your-domain.com/api/device/list \
  -H "X-API-Key: YOUR-API-KEY" | jq '.stats'

# Expected output:
# {
#   "total_devices": 10,
#   "online_devices": 8,
#   "total_qr_today": 45
# }
```

### Agent Shift Changes (NEW in v1.1)

**How It Works:**
The system automatically handles agent transitions without any restarts!

**Shift Change Process:**
```
1. Previous agent logs out from web portal
2. New agent logs in with their credentials  
3. Device automatically re-links to new agent
4. New agent can immediately generate QR codes
```

**Important Notes:**
- ✅ **NO need to restart Windows EXE** - Keep it running all day
- ✅ **NO need to restart backend service** - Runs continuously  
- ✅ **Device stays connected** - ESP32 remains plugged in
- ✅ **Automatic re-linking** - System detects and handles shift changes

**What You'll See:**
Browser console shows:
```
🔗 Attempting to link device for agent: 26 Agent Name
✅ Device linked successfully: device_DESKTOP-RSJ243K_4CD717
```

Backend logs show:
```
Re-linking device from previous agent (shift change)
```

### Agent Support

**Common Issues:**

| Issue | Solution |
|-------|----------|
| Green icon not appearing | Check ESP32 USB connection |
| Red icon in tray | Check internet connection |
| QR not displaying on device | Restart Windows client |
| Device not linking | Check agent logged in correctly |
| "No device linked" after shift change | Refresh browser (Ctrl+F5) and try again |

**Support Checklist:**
```
1. Verify ESP32 connected via USB
2. Verify Windows client running (green icon)
3. Verify agent logged into web portal
4. Check device_client.log for errors
5. For shift changes: Just logout/login (no restart needed!)
6. Restart Windows client only if device is unresponsive
7. Contact IT if issue persists
```

---

## 📝 Post-Deployment Checklist

### VPS Server
- [ ] Device service running (PM2 status = online)
- [ ] Nginx proxy configured and tested
- [ ] Health endpoint accessible
- [ ] Device data directory created
- [ ] Logs being written correctly
- [ ] No errors in PM2 logs

### Frontend
- [ ] Device service URL updated to production
- [ ] API key matches backend
- [ ] Frontend rebuilt and deployed
- [ ] QR generation works from web app
- [ ] Device linking works on login
- [ ] No console errors

### Windows Clients
- [ ] EXE built with production configuration
- [ ] Tested on at least 2 agent computers
- [ ] Desktop shortcuts created
- [ ] Installation guide provided
- [ ] Agents trained on usage
- [ ] Support contact information shared

### Documentation
- [ ] Deployment guide completed
- [ ] Agent training materials ready
- [ ] Troubleshooting guide available
- [ ] Support procedures documented
- [ ] Rollback procedures tested

---

## 🎯 Success Criteria

Deployment is successful when:

✅ **VPS Backend**
- Device service running without errors
- Health endpoint returns 200 OK
- Devices can register successfully
- Commands queue and execute properly

✅ **Frontend**
- QR generation works from web app
- Device linking works on login
- No JavaScript errors in console
- Rotation control works

✅ **Windows Clients**
- At least 3 agents using successfully
- Devices stay connected for full shift
- QR codes display reliably
- Auto-reconnection works after USB disconnect

✅ **End-to-End**
- Complete workflow tested with real agents
- QR codes scannable and payments process
- No critical bugs reported
- Agent feedback is positive

---

## � Configurantion Troubleshooting

### API Key Mismatch Issues

**Symptom**: Windows client shows "Authentication failed" or "401 Unauthorized"

**Solution**: Verify all three API keys match exactly:

```bash
# 1. Check VPS backend
grep "DEVICE_API_KEY" /var/www/nic-callcenter/.env

# 2. Check frontend
grep "DEVICE_API_KEY" /var/www/nic-callcenter/src/services/deviceService.js

# 3. Check Windows client (on dev machine)
grep "api_key" device_client/config.py
```

All three should show: `+uqlz4/syAvctehh7+AV2cThGb1qrO7xqsTM8kYOwlI=`

**If backend still returns 401 after verifying keys match:**

```bash
# Make sure dotenv is installed
cd /var/www/nic-callcenter
npm install dotenv

# Restart the service to reload .env
pm2 restart device-api

# Check logs for any errors
pm2 logs device-api --lines 30
```

### URL Configuration Issues

**Symptom**: Windows client can't connect to VPS

**Solution**: Verify URLs are correct:

```bash
# Frontend should use HTTPS domain
grep "DEVICE_SERVICE_URL" src/services/deviceService.js
# Should show: https://payments.niclmauritius.site

# Windows client should use same HTTPS domain
grep "vps_url" device_client/config.py
# Should show: https://payments.niclmauritius.site
```

### Quick Configuration Verification

Run this on VPS to verify backend is configured:

```bash
cd /var/www/nic-callcenter

echo "=== Backend Configuration ==="
grep "DEVICE_" .env

echo ""
echo "=== Frontend Configuration ==="
head -10 src/services/deviceService.js | grep -E "(DEVICE_SERVICE_URL|DEVICE_API_KEY)"

echo ""
echo "=== Service Status ==="
pm2 status device-api

echo ""
echo "=== Health Check ==="
curl -s https://payments.niclmauritius.site/api/device/health | jq
```

---

## 📞 Support Information

### Technical Contacts
- **VPS Issues**: IT Infrastructure Team
- **Windows Client Issues**: Desktop Support Team
- **Application Issues**: Development Team

### Escalation Path
1. **Level 1**: Agent self-help (INSTALL.txt, QUICKSTART.md)
2. **Level 2**: IT Help Desk (basic troubleshooting)
3. **Level 3**: Development Team (complex issues)

### Emergency Contacts
- **Critical Service Down**: [Emergency Phone]
- **After Hours Support**: [On-Call Number]

---

**Document Version**: 1.0  
**Last Updated**: November 27, 2024  
**Prepared By**: Development Team  
**Status**: Ready for Production Deployment

---

## 🚀 Quick Deployment Commands

**For quick reference, here's the complete deployment in one script:**

```bash
#!/bin/bash
# ESP32 Integration - Quick Deployment Script

echo "🚀 Starting ESP32 Integration Deployment..."
echo ""
echo "⚠️  PREREQUISITES CHECK:"
echo "   1. Have you updated src/services/deviceService.js with production URL and API key?"
echo "   2. Have you updated device_client/config.py with production URL and API key?"
echo "   3. Have you verified DEVICE_API_KEY in .env matches the other two?"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# 1. Pull latest code
cd /var/www/nic-callcenter
git pull origin main

# 2. Install PM2 if needed
npm install -g pm2

# 3. Create device data directory
mkdir -p device_data
chown -R www-data:www-data device_data

# 4. Verify .env has device configuration
echo "✅ Checking .env configuration..."
grep "DEVICE_API_KEY" .env || echo "⚠️  WARNING: DEVICE_API_KEY not found in .env"
grep "DEVICE_SERVICE_PORT" .env || echo "⚠️  WARNING: DEVICE_SERVICE_PORT not found in .env"

# 5. Start device service
pm2 start backend-device-service.cjs --name device-api
pm2 save

# 6. Build frontend
npm install
npm run build

# 7. Reload Nginx
sudo systemctl reload nginx

# 8. Verify deployment
echo ""
echo "✅ Checking device service..."
pm2 status device-api

echo ""
echo "✅ Testing health endpoint..."
curl https://payments.niclmauritius.site/api/device/health

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Build Windows client EXE (on dev machine)"
echo "   2. Distribute to agent computers"
echo "   3. Test with at least 3 agents"
echo "   4. Monitor PM2 logs: pm2 logs device-api"
```

Save this as `deploy-esp32.sh` and run with:
```bash
chmod +x deploy-esp32.sh
sudo ./deploy-esp32.sh
```

---

**End of Deployment Guide**
