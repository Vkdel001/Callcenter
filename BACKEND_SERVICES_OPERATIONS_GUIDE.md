# NIC Call Center System - Backend Services Operations Guide

## Overview

This comprehensive guide covers all aspects of managing, monitoring, troubleshooting, and maintaining the backend services running on the VPS. This is the complete reference for backend operations.

---

## Table of Contents

1. [Backend Services Overview](#backend-services-overview)
2. [Service Architecture](#service-architecture)
3. [Initial Setup & Installation](#initial-setup--installation)
4. [Service Management](#service-management)
5. [Checking Service Status](#checking-service-status)
6. [Viewing & Analyzing Logs](#viewing--analyzing-logs)
7. [Restarting Services](#restarting-services)
8. [Troubleshooting Common Issues](#troubleshooting-common-issues)
9. [Performance Monitoring](#performance-monitoring)
10. [Maintenance Procedures](#maintenance-procedures)
11. [Emergency Procedures](#emergency-procedures)
12. [Service Configuration](#service-configuration)

---

## Backend Services Overview

### Services Running on VPS

The NIC Call Center System has **4 main backend services** running on Ubuntu VPS:

| Service Name | File | Purpose | Port | Auto-Start |
|--------------|------|---------|------|------------|
| **nic-reminder** | backend-reminder-service.cjs | Payment & signature reminders | N/A | Yes |
| **nic-payment-notification** | backend-payment-notification.cjs | Payment confirmations | N/A | Yes |
| **nic-device-service** | backend-device-service.cjs | ESP32 device management | 5000 | Yes |
| **nic-aod-upload** | aod-upload-service.cjs | Signed AOD document processing | 8080 | Yes |

### Service Dependencies

```
All Services depend on:
├── Node.js 16+
├── npm packages (axios, node-cron, etc.)
├── Environment variables (.env file)
├── Xano API (external)
├── Brevo API (external)
└── Network connectivity

Device Service additionally depends on:
└── ESP32 devices on network
```

---

## Service Architecture

### Service Communication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         VPS SERVER                           │
│  IP: the-vps-ip                                            │
│  OS: Ubuntu 20.04 LTS                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Reminder Service (nic-reminder.service)           │    │
│  │  - Runs every 5 minutes (configurable)             │    │
│  │  - Checks Xano for due reminders                   │    │
│  │  - Sends emails via Brevo                          │    │
│  │  - Sends SMS via Brevo                             │    │
│  │  - Updates reminder status in Xano                 │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│                    Logs to: /var/log/nic-reminder.log       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Payment Notification (nic-payment-notification)   │    │
│  │  - Listens for payment events                      │    │
│  │  - Sends confirmation emails                       │    │
│  │  - Updates payment status                          │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│                    Logs to: /var/log/nic-payment-notification.log │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Device Service (nic-device-service)               │    │
│  │  - HTTP server on port 5000                        │    │
│  │  - Manages ESP32 device linking                    │    │
│  │  - Sends QR codes to devices                       │    │
│  │  - Monitors device status                          │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│                    Logs to: /var/log/nic-device-service.log │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  AOD Upload Service (nic-aod-upload)               │    │
│  │  - HTTP server on port 8080                        │    │
│  │  - Receives signed AOD documents                   │    │
│  │  - Uploads to Xano storage                         │    │
│  │  - Updates AOD status                              │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│                    Logs to: /var/log/nic-aod-upload.log     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
         ▼                    ▼                    ▼
    ┌────────┐          ┌────────┐          ┌────────┐
    │  Xano  │          │ Brevo  │          │ ESP32  │
    │  API   │          │  API   │          │Devices │
    └────────┘          └────────┘          └────────┘
```

---

## Initial Setup & Installation

### Prerequisites Check

Before installing services, verify:

```bash
# Check Node.js version (must be 16+)
node --version
# Expected: v16.x.x or higher

# Check npm
npm --version

# Check system
uname -a
# Expected: Linux ... Ubuntu

# Check available disk space
df -h
# Should have at least 5GB free

# Check memory
free -h
# Should have at least 2GB RAM
```

### Step 1: Install Node.js (if not installed)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 16
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Create Application Directory

```bash
# Create directory
sudo mkdir -p /opt/nic-callcenter

# Set permissions
sudo chown -R $USER:$USER /opt/nic-callcenter

# Navigate to directory
cd /opt/nic-callcenter
```

### Step 3: Clone Repository

```bash
# Clone from Git
git clone <repository-url> .

# Or upload files via SCP
# scp -r ./backend-services/* user@vps-ip:/opt/nic-callcenter/
```

### Step 4: Install Dependencies

```bash
cd /opt/nic-callcenter

# Install npm packages
npm install

# Verify installation
npm list --depth=0
```

### Step 5: Configure Environment Variables

```bash
# Create .env file
nano /opt/nic-callcenter/.env
```

Add the following content:

```bash
# ============================================
# XANO API CONFIGURATION
# ============================================
XANO_API_URL=https://x8ki-letl-twmt.n7.xano.io/api:the-prod-id
XANO_API_KEY=the-xano-api-key

# ============================================
# BREVO (EMAIL/SMS) CONFIGURATION
# ============================================
BREVO_API_KEY=the-brevo-api-key
BREVO_SENDER_EMAIL=noreply@nic.mu
BREVO_SENDER_NAME=NIC Insurance

# ============================================
# ZWENNPAY CONFIGURATION
# ============================================
ZWENNPAY_API_KEY=the-zwennpay-api-key
ZWENNPAY_MERCHANT_ID=the-merchant-id

# ============================================
# SERVICE CONFIGURATION
# ============================================
NODE_ENV=production
LOG_LEVEL=info

# ============================================
# REMINDER SERVICE CONFIGURATION
# ============================================
REMINDER_CHECK_INTERVAL=5  # minutes
REMINDER_BATCH_SIZE=50

# ============================================
# DEVICE SERVICE CONFIGURATION
# ============================================
DEVICE_SERVICE_PORT=5000

# ============================================
# AOD UPLOAD SERVICE CONFIGURATION
# ============================================
AOD_UPLOAD_PORT=8080
AOD_MAX_FILE_SIZE=10485760  # 10MB in bytes
```

Save and exit (Ctrl+X, Y, Enter)

```bash
# Secure the .env file
chmod 600 /opt/nic-callcenter/.env

# Verify file exists
ls -la /opt/nic-callcenter/.env
```

### Step 6: Create Systemd Service Files

#### Create Reminder Service

```bash
sudo nano /etc/systemd/system/nic-reminder.service
```


Add the following content:

```ini
[Unit]
Description=NIC Reminder Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/nic-callcenter
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /opt/nic-callcenter/backend-reminder-service.cjs
Restart=always
RestartSec=10
StandardOutput=append:/var/log/nic-reminder.log
StandardError=append:/var/log/nic-reminder.log

[Install]
WantedBy=multi-user.target
```

Save and exit (Ctrl+X, Y, Enter)

#### Create Payment Notification Service

```bash
sudo nano /etc/systemd/system/nic-payment-notification.service
```

Add the following content:

```ini
[Unit]
Description=NIC Payment Notification Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/nic-callcenter
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /opt/nic-callcenter/backend-payment-notification.cjs
Restart=always
RestartSec=10
StandardOutput=append:/var/log/nic-payment-notification.log
StandardError=append:/var/log/nic-payment-notification.log

[Install]
WantedBy=multi-user.target
```

Save and exit (Ctrl+X, Y, Enter)


#### Create Device Service

```bash
sudo nano /etc/systemd/system/nic-device-service.service
```

Add the following content:

```ini
[Unit]
Description=NIC Device Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/nic-callcenter
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /opt/nic-callcenter/backend-device-service.cjs
Restart=always
RestartSec=10
StandardOutput=append:/var/log/nic-device-service.log
StandardError=append:/var/log/nic-device-service.log

[Install]
WantedBy=multi-user.target
```

Save and exit (Ctrl+X, Y, Enter)

#### Create AOD Upload Service

```bash
sudo nano /etc/systemd/system/nic-aod-upload.service
```

Add the following content:

```ini
[Unit]
Description=NIC AOD Upload Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/nic-callcenter
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /opt/nic-callcenter/aod-upload-service.cjs
Restart=always
RestartSec=10
StandardOutput=append:/var/log/nic-aod-upload.log
StandardError=append:/var/log/nic-aod-upload.log

[Install]
WantedBy=multi-user.target
```

Save and exit (Ctrl+X, Y, Enter)


### Step 7: Enable and Start Services

```bash
# Reload systemd to recognize new services
sudo systemctl daemon-reload

# Enable services (auto-start on boot)
sudo systemctl enable nic-reminder
sudo systemctl enable nic-payment-notification
sudo systemctl enable nic-device-service
sudo systemctl enable nic-aod-upload

# Start all services
sudo systemctl start nic-reminder
sudo systemctl start nic-payment-notification
sudo systemctl start nic-device-service
sudo systemctl start nic-aod-upload

# Verify all services are running
sudo systemctl status nic-reminder
sudo systemctl status nic-payment-notification
sudo systemctl status nic-device-service
sudo systemctl status nic-aod-upload
```

Expected output for each service:
```
● nic-reminder.service - NIC Reminder Service
   Loaded: loaded (/etc/systemd/system/nic-reminder.service; enabled)
   Active: active (running) since Wed 2026-02-04 10:00:00 UTC; 5s ago
 Main PID: 12345 (node)
   Status: "Running"
    Tasks: 11 (limit: 4915)
   Memory: 45.2M
   CGroup: /system.slice/nic-reminder.service
           └─12345 /usr/bin/node /opt/nic-callcenter/backend-reminder-service.cjs
```

---

## Service Management

### Starting Services

```bash
# Start individual service
sudo systemctl start nic-reminder
sudo systemctl start nic-payment-notification
sudo systemctl start nic-device-service
sudo systemctl start nic-aod-upload

# Start all services at once
sudo systemctl start nic-reminder nic-payment-notification nic-device-service nic-aod-upload
```


### Stopping Services

```bash
# Stop individual service
sudo systemctl stop nic-reminder
sudo systemctl stop nic-payment-notification
sudo systemctl stop nic-device-service
sudo systemctl stop nic-aod-upload

# Stop all services at once
sudo systemctl stop nic-reminder nic-payment-notification nic-device-service nic-aod-upload
```

### Restarting Services

```bash
# Restart individual service
sudo systemctl restart nic-reminder
sudo systemctl restart nic-payment-notification
sudo systemctl restart nic-device-service
sudo systemctl restart nic-aod-upload

# Restart all services at once
sudo systemctl restart nic-reminder nic-payment-notification nic-device-service nic-aod-upload
```

### Reloading Service Configuration

```bash
# After modifying service files in /etc/systemd/system/
sudo systemctl daemon-reload

# Then restart affected services
sudo systemctl restart nic-reminder
```

### Enabling/Disabling Auto-Start

```bash
# Enable auto-start on boot
sudo systemctl enable nic-reminder
sudo systemctl enable nic-payment-notification
sudo systemctl enable nic-device-service
sudo systemctl enable nic-aod-upload

# Disable auto-start
sudo systemctl disable nic-reminder
sudo systemctl disable nic-payment-notification
sudo systemctl disable nic-device-service
sudo systemctl disable nic-aod-upload

# Check if service is enabled
sudo systemctl is-enabled nic-reminder
```

---

## Checking Service Status

### Quick Status Check

```bash
# Check if service is running
sudo systemctl is-active nic-reminder
# Output: active or inactive

# Check all services at once
sudo systemctl is-active nic-reminder nic-payment-notification nic-device-service nic-aod-upload
```


### Detailed Status Check

```bash
# Full status information
sudo systemctl status nic-reminder

# Status for all services
sudo systemctl status nic-reminder nic-payment-notification nic-device-service nic-aod-upload

# Show only failed services
sudo systemctl --failed | grep nic-
```

### Process-Level Status

```bash
# Check if processes are running
ps aux | grep -E "(reminder|payment-notification|device-service|aod-upload)" | grep -v grep

# Check process count (should be 4)
ps aux | grep -E "(reminder|payment-notification|device-service|aod-upload)" | grep -v grep | wc -l

# Check process uptime
ps -eo pid,etime,cmd | grep -E "(reminder|payment-notification|device-service|aod-upload)" | grep -v grep

# Check resource usage
ps aux | grep -E "(reminder|payment-notification|device-service|aod-upload)" | grep -v grep | awk '{print $2, $3, $4, $11}'
```

### Port Status (for HTTP services)

```bash
# Check if device service is listening on port 5000
sudo netstat -tlnp | grep 5000
# Or using ss
sudo ss -tlnp | grep 5000

# Check if AOD upload service is listening on port 8080
sudo netstat -tlnp | grep 8080
# Or using ss
sudo ss -tlnp | grep 8080

# Check all node processes and their ports
sudo netstat -tlnp | grep node
```

### Health Check Script

Create a quick health check script:

```bash
nano ~/check-backend-services.sh
```

Add the following content:

```bash
#!/bin/bash

echo "========================================="
echo "NIC Backend Services Health Check"
echo "========================================="
echo ""

services=("nic-reminder" "nic-payment-notification" "nic-device-service" "nic-aod-upload")

for service in "${services[@]}"; do
    echo "Checking $service..."
    if systemctl is-active --quiet $service; then
        echo "  ✅ Status: RUNNING"
        uptime=$(systemctl show $service --property=ActiveEnterTimestamp --value)
        echo "  ⏱️  Started: $uptime"
    else
        echo "  ❌ Status: NOT RUNNING"
    fi
    echo ""
done

echo "========================================="
echo "Process Information"
echo "========================================="
ps aux | grep -E "(reminder|payment-notification|device-service|aod-upload)" | grep -v grep | awk '{printf "%-30s PID: %-8s CPU: %-6s MEM: %-6s\n", $11, $2, $3"%", $4"%"}'
echo ""

echo "========================================="
echo "Port Status"
echo "========================================="
echo "Device Service (Port 5000):"
sudo ss -tlnp | grep 5000 || echo "  ❌ Not listening"
echo "AOD Upload Service (Port 8080):"
sudo ss -tlnp | grep 8080 || echo "  ❌ Not listening"
echo ""
```

Make it executable and run:

```bash
chmod +x ~/check-backend-services.sh
~/check-backend-services.sh
```

---

## Viewing & Analyzing Logs

### Log File Locations

```bash
/var/log/nic-reminder.log              # Reminder service logs
/var/log/nic-payment-notification.log  # Payment notification logs
/var/log/nic-device-service.log        # Device service logs
/var/log/nic-aod-upload.log            # AOD upload service logs
```


### Viewing Logs

```bash
# View last 50 lines
tail -50 /var/log/nic-reminder.log
tail -50 /var/log/nic-payment-notification.log
tail -50 /var/log/nic-device-service.log
tail -50 /var/log/nic-aod-upload.log

# View last 100 lines
tail -100 /var/log/nic-reminder.log

# Follow logs in real-time (live monitoring)
tail -f /var/log/nic-reminder.log

# Follow multiple logs simultaneously
tail -f /var/log/nic-reminder.log /var/log/nic-payment-notification.log

# View entire log file
cat /var/log/nic-reminder.log

# View logs with less (scrollable)
less /var/log/nic-reminder.log
# Press 'q' to quit
```

### Searching Logs

```bash
# Search for errors
grep -i "error" /var/log/nic-reminder.log
grep -i "error\|failed\|exception" /var/log/nic-reminder.log

# Search for successful operations
grep -i "success\|sent\|completed" /var/log/nic-payment-notification.log

# Search with context (5 lines before and after)
grep -i -C 5 "error" /var/log/nic-reminder.log

# Search for specific customer
grep "customer_id.*123" /var/log/nic-reminder.log

# Search for today's logs
grep "$(date +%Y-%m-%d)" /var/log/nic-reminder.log

# Count occurrences
grep -c "reminder sent" /var/log/nic-reminder.log
grep -c "error" /var/log/nic-reminder.log

# Search across all service logs
grep -i "error" /var/log/nic-*.log
```

### Analyzing Logs

```bash
# View logs from last hour
journalctl -u nic-reminder --since "1 hour ago"

# View logs from specific time range
journalctl -u nic-reminder --since "2026-02-04 09:00:00" --until "2026-02-04 10:00:00"

# View logs from today
journalctl -u nic-reminder --since today

# View logs with priority (errors only)
journalctl -u nic-reminder -p err

# Follow systemd journal in real-time
journalctl -u nic-reminder -f

# View logs for all NIC services
journalctl -u nic-reminder -u nic-payment-notification -u nic-device-service -u nic-aod-upload
```


### Log Patterns to Look For

#### Healthy Reminder Service Logs:
```
[INFO] Starting reminder cycle...
[INFO] Processing payment reminders...
[INFO] Found 3 installments needing reminders
[INFO] ✅ Payment reminder sent to customer 123
[INFO] Processing signature reminders...
[INFO] ✅ Signature reminder sent to customer 456
[INFO] Reminder cycle completed successfully
```

#### Healthy Payment Notification Logs:
```
[INFO] 🔍 Checking for new payments...
[INFO] 📋 Found 2 new payment(s) to notify
[INFO] 💳 Processing payment 789
[INFO] ✅ SMS sent successfully. Message ID: abc123
[INFO] ✅ Email sent successfully. Message ID: def456
[INFO] ✅ Payment notification complete
```

#### Healthy Device Service Logs:
```
[INFO] Device service listening on port 5000
[INFO] Device linked: ESP32-ABC123
[INFO] QR code sent to device: ESP32-ABC123
[INFO] Device status updated: ESP32-ABC123
```

#### Healthy AOD Upload Logs:
```
[INFO] AOD upload service listening on port 8080
[INFO] Received AOD upload for customer 123
[INFO] File uploaded to Xano successfully
[INFO] AOD status updated: signed
```

### Log File Management

```bash
# Check log file sizes
ls -lh /var/log/nic-*.log

# Check disk space used by logs
du -sh /var/log/nic-*.log

# Clear log file (use with caution!)
sudo truncate -s 0 /var/log/nic-reminder.log

# Archive old logs
sudo cp /var/log/nic-reminder.log /var/log/archive/nic-reminder-$(date +%Y%m%d).log
sudo truncate -s 0 /var/log/nic-reminder.log

# Rotate logs (keep last 7 days)
sudo logrotate -f /etc/logrotate.conf
```

---

## Restarting Services

### Safe Restart Procedure

```bash
# 1. Check current status
sudo systemctl status nic-reminder

# 2. Stop the service
sudo systemctl stop nic-reminder

# 3. Wait for graceful shutdown (5 seconds)
sleep 5

# 4. Verify service stopped
sudo systemctl is-active nic-reminder
# Should output: inactive

# 5. Start the service
sudo systemctl start nic-reminder

# 6. Verify service started
sudo systemctl status nic-reminder

# 7. Check logs for startup messages
tail -20 /var/log/nic-reminder.log
```


### Quick Restart (Single Command)

```bash
# Restart with verification
sudo systemctl restart nic-reminder && sudo systemctl status nic-reminder

# Restart all services
sudo systemctl restart nic-reminder nic-payment-notification nic-device-service nic-aod-upload
```

### Restart After Code Updates

```bash
# Navigate to application directory
cd /opt/nic-callcenter

# Pull latest code
git pull origin main

# Install any new dependencies
npm install

# Restart all services
sudo systemctl restart nic-reminder nic-payment-notification nic-device-service nic-aod-upload

# Verify all services restarted successfully
sudo systemctl status nic-reminder nic-payment-notification nic-device-service nic-aod-upload

# Check logs for any errors
tail -20 /var/log/nic-reminder.log
tail -20 /var/log/nic-payment-notification.log
tail -20 /var/log/nic-device-service.log
tail -20 /var/log/nic-aod-upload.log
```

### Force Restart (if service is stuck)

```bash
# Kill the process forcefully
sudo systemctl kill -s SIGKILL nic-reminder

# Or use pkill
sudo pkill -9 -f backend-reminder-service

# Wait a moment
sleep 2

# Start the service
sudo systemctl start nic-reminder

# Verify
sudo systemctl status nic-reminder
```

### Restart Script

Create a restart script for convenience:

```bash
nano ~/restart-backend-services.sh
```

Add the following content:

```bash
#!/bin/bash

echo "========================================="
echo "Restarting NIC Backend Services"
echo "========================================="
echo ""

services=("nic-reminder" "nic-payment-notification" "nic-device-service" "nic-aod-upload")

for service in "${services[@]}"; do
    echo "Restarting $service..."
    sudo systemctl restart $service
    
    if systemctl is-active --quiet $service; then
        echo "  ✅ $service restarted successfully"
    else
        echo "  ❌ $service failed to restart"
        sudo systemctl status $service
    fi
    echo ""
done

echo "========================================="
echo "Checking logs for errors..."
echo "========================================="
for service in "${services[@]}"; do
    logfile="/var/log/${service}.log"
    if [ -f "$logfile" ]; then
        errors=$(tail -20 "$logfile" | grep -i "error" | wc -l)
        if [ $errors -gt 0 ]; then
            echo "⚠️  $service has $errors error(s) in recent logs"
        else
            echo "✅ $service logs look clean"
        fi
    fi
done
echo ""

echo "Restart complete!"
```

Make it executable:

```bash
chmod +x ~/restart-backend-services.sh
```

Run it:

```bash
~/restart-backend-services.sh
```

---

## Troubleshooting Common Issues

### Issue 1: Service Won't Start

**Symptoms:**
- `systemctl start` fails
- Service shows "failed" status
- Process not running

**Diagnosis:**
```bash
# Check service status
sudo systemctl status nic-reminder

# Check for syntax errors
node -c /opt/nic-callcenter/backend-reminder-service.cjs

# Check file permissions
ls -la /opt/nic-callcenter/backend-reminder-service.cjs

# Check environment variables
sudo -u www-data printenv | grep -E "(XANO|BREVO)"

# View detailed error logs
journalctl -u nic-reminder -n 50 --no-pager
```

**Solutions:**
```bash
# Fix file permissions
sudo chown www-data:www-data /opt/nic-callcenter/backend-reminder-service.cjs
sudo chmod 755 /opt/nic-callcenter/backend-reminder-service.cjs

# Verify .env file exists and is readable
ls -la /opt/nic-callcenter/.env
sudo chmod 600 /opt/nic-callcenter/.env

# Try running manually to see errors
cd /opt/nic-callcenter
sudo -u www-data node backend-reminder-service.cjs
# Press Ctrl+C to stop

# Check systemd service file syntax
sudo systemd-analyze verify /etc/systemd/system/nic-reminder.service

# Reload systemd and try again
sudo systemctl daemon-reload
sudo systemctl start nic-reminder
```


### Issue 2: Service Keeps Crashing

**Symptoms:**
- Service starts but stops after a few seconds/minutes
- Restart count keeps increasing
- "Restart limit hit" error

**Diagnosis:**
```bash
# Check crash logs
journalctl -u nic-reminder --since "1 hour ago" | grep -i "error\|crash\|exit"

# Check system resources
free -h
df -h
top -bn1 | head -20

# Check for port conflicts (device/AOD services)
sudo netstat -tlnp | grep -E "(5000|8080)"

# Check for memory leaks
ps aux | grep backend-reminder-service | awk '{print $6/1024 " MB"}'
```

**Solutions:**
```bash
# Increase restart delay in service file
sudo nano /etc/systemd/system/nic-reminder.service
# Change: RestartSec=10 to RestartSec=30

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart nic-reminder

# Check for uncaught exceptions in code
tail -100 /var/log/nic-reminder.log | grep -i "uncaught\|unhandled"

# Clear old logs if disk is full
sudo truncate -s 0 /var/log/nic-reminder.log

# Check for zombie processes
ps aux | grep defunct
```

### Issue 3: No Logs Being Written

**Symptoms:**
- Log files empty or not updating
- Can't see service output

**Diagnosis:**
```bash
# Check if log files exist
ls -la /var/log/nic-*.log

# Check log file permissions
ls -la /var/log/nic-reminder.log

# Check disk space
df -h /var/log

# Check if service is actually running
ps aux | grep backend-reminder-service
```

**Solutions:**
```bash
# Create log files if missing
sudo touch /var/log/nic-reminder.log
sudo touch /var/log/nic-payment-notification.log
sudo touch /var/log/nic-device-service.log
sudo touch /var/log/nic-aod-upload.log

# Fix permissions
sudo chown www-data:www-data /var/log/nic-*.log
sudo chmod 644 /var/log/nic-*.log

# Restart services
sudo systemctl restart nic-reminder nic-payment-notification nic-device-service nic-aod-upload

# Check systemd journal instead
journalctl -u nic-reminder -f
```

### Issue 4: Emails/SMS Not Sending

**Symptoms:**
- Service running but no notifications sent
- Brevo API errors in logs
- Customers not receiving messages

**Diagnosis:**
```bash
# Check for Brevo errors
grep -i "brevo\|api.*error\|401\|403" /var/log/nic-reminder.log

# Test Brevo API key
curl -X GET "https://api.brevo.com/v3/account" \
  -H "api-key: the_BREVO_API_KEY"

# Check environment variables
grep BREVO /opt/nic-callcenter/.env

# Check network connectivity
ping -c 3 api.brevo.com
curl -I https://api.brevo.com
```

**Solutions:**
```bash
# Verify Brevo API key in .env
sudo nano /opt/nic-callcenter/.env
# Check: BREVO_API_KEY=the-actual-key

# Test API key validity
curl -X GET "https://api.brevo.com/v3/account" \
  -H "api-key: $(grep BREVO_API_KEY /opt/nic-callcenter/.env | cut -d'=' -f2)"

# Check Brevo account limits
# Login to Brevo dashboard and check:
# - Daily sending limit
# - Account status
# - Blocked contacts

# Restart service after fixing .env
sudo systemctl restart nic-reminder
```


### Issue 5: Database Connection Errors

**Symptoms:**
- "Cannot connect to Xano" errors
- "API request failed" messages
- Service running but not processing data

**Diagnosis:**
```bash
# Check for Xano errors
grep -i "xano\|api.*error\|connection" /var/log/nic-reminder.log

# Test Xano API connectivity
curl -I https://x8ki-letl-twmt.n7.xano.io/api:the-prod-id/health

# Check environment variables
grep XANO /opt/nic-callcenter/.env

# Check DNS resolution
nslookup x8ki-letl-twmt.n7.xano.io
```

**Solutions:**
```bash
# Verify Xano credentials
sudo nano /opt/nic-callcenter/.env
# Check: XANO_API_URL and XANO_API_KEY

# Test API endpoint
curl -X GET "the_XANO_API_URL/customers" \
  -H "Authorization: Bearer the_XANO_API_KEY"

# Check firewall rules
sudo ufw status
sudo iptables -L -n

# Restart service
sudo systemctl restart nic-reminder
```

### Issue 6: Multiple Processes Running

**Symptoms:**
- Multiple instances of same service
- Duplicate notifications sent
- High resource usage

**Diagnosis:**
```bash
# Count running processes
ps aux | grep backend-reminder-service | grep -v grep | wc -l
# Should be 1, not more

# Show all processes
ps aux | grep backend-reminder-service | grep -v grep

# Check for manual processes
ps aux | grep "nohup.*backend-reminder" | grep -v grep
```

**Solutions:**
```bash
# Stop systemd service
sudo systemctl stop nic-reminder

# Kill all manual processes
sudo pkill -f backend-reminder-service

# Wait for cleanup
sleep 5

# Verify no processes running
ps aux | grep backend-reminder-service | grep -v grep
# Should show nothing

# Start only systemd service
sudo systemctl start nic-reminder

# Verify only one process
ps aux | grep backend-reminder-service | grep -v grep | wc -l
# Should be 1
```

### Issue 7: Port Already in Use

**Symptoms:**
- Device service or AOD service won't start
- "EADDRINUSE" error in logs
- Port conflict messages

**Diagnosis:**
```bash
# Check what's using port 5000
sudo netstat -tlnp | grep 5000
sudo ss -tlnp | grep 5000

# Check what's using port 8080
sudo netstat -tlnp | grep 8080
sudo ss -tlnp | grep 8080

# Find process using the port
sudo lsof -i :5000
sudo lsof -i :8080
```

**Solutions:**
```bash
# Kill process using the port
sudo kill $(sudo lsof -t -i:5000)
sudo kill $(sudo lsof -t -i:8080)

# Or change port in .env file
sudo nano /opt/nic-callcenter/.env
# Change: DEVICE_SERVICE_PORT=5001
# Change: AOD_UPLOAD_PORT=8081

# Restart services
sudo systemctl restart nic-device-service
sudo systemctl restart nic-aod-upload
```

---

## Performance Monitoring

### Resource Usage

```bash
# Check CPU and memory usage
ps aux | grep -E "(reminder|payment-notification|device-service|aod-upload)" | grep -v grep

# Monitor in real-time
top -p $(pgrep -d',' -f 'backend-reminder-service|backend-payment-notification|backend-device-service|aod-upload-service')

# Check memory usage specifically
ps aux | grep backend-reminder-service | awk '{print $6/1024 " MB"}'

# Check all services memory
for service in reminder payment-notification device-service aod-upload; do
    mem=$(ps aux | grep "backend-$service\|$service-service" | grep -v grep | awk '{print $6/1024}')
    echo "$service: ${mem} MB"
done
```


### Service Uptime

```bash
# Check how long services have been running
systemctl show nic-reminder --property=ActiveEnterTimestamp
systemctl show nic-payment-notification --property=ActiveEnterTimestamp
systemctl show nic-device-service --property=ActiveEnterTimestamp
systemctl show nic-aod-upload --property=ActiveEnterTimestamp

# Check uptime in human-readable format
ps -eo pid,etime,cmd | grep -E "(reminder|payment-notification|device-service|aod-upload)" | grep -v grep

# Example output:
# 12345  5-12:34:56  /usr/bin/node backend-reminder-service.cjs
# (Running for 5 days, 12 hours, 34 minutes, 56 seconds)
```

### Performance Metrics

```bash
# Count successful operations (last hour)
journalctl -u nic-reminder --since "1 hour ago" | grep -c "✅"

# Count errors (last hour)
journalctl -u nic-reminder --since "1 hour ago" | grep -c -i "error"

# Calculate success rate
total=$(journalctl -u nic-reminder --since "1 hour ago" | grep -c "reminder sent")
errors=$(journalctl -u nic-reminder --since "1 hour ago" | grep -c "error")
success=$((total - errors))
echo "Success rate: $success/$total"

# Check reminder cycles completed today
grep "$(date +%Y-%m-%d)" /var/log/nic-reminder.log | grep -c "cycle completed"

# Check payment notifications sent today
grep "$(date +%Y-%m-%d)" /var/log/nic-payment-notification.log | grep -c "notification complete"
```

### Log File Sizes

```bash
# Check log file sizes
ls -lh /var/log/nic-*.log

# Check total size
du -sh /var/log/nic-*.log

# Check disk usage
df -h /var/log

# Find large log files (>100MB)
find /var/log -name "nic-*.log" -size +100M -ls
```

### Network Monitoring

```bash
# Check active connections
sudo netstat -an | grep -E "(5000|8080)"

# Monitor network traffic
sudo iftop -i eth0

# Check API response times (sample)
time curl -X GET "the_XANO_API_URL/customers" -H "Authorization: Bearer the_KEY"
```

---

## Maintenance Procedures

### Daily Maintenance

```bash
# Daily health check script
nano ~/daily-backend-check.sh
```

Add the following content:

```bash
#!/bin/bash

echo "========================================="
echo "Daily Backend Services Check"
echo "Date: $(date)"
echo "========================================="
echo ""

# Check all services are running
echo "Service Status:"
for service in nic-reminder nic-payment-notification nic-device-service nic-aod-upload; do
    if systemctl is-active --quiet $service; then
        echo "  ✅ $service: RUNNING"
    else
        echo "  ❌ $service: NOT RUNNING"
    fi
done
echo ""

# Check for errors in last 24 hours
echo "Error Count (Last 24 hours):"
for service in nic-reminder nic-payment-notification nic-device-service nic-aod-upload; do
    errors=$(journalctl -u $service --since "24 hours ago" | grep -c -i "error")
    echo "  $service: $errors errors"
done
echo ""

# Check log file sizes
echo "Log File Sizes:"
ls -lh /var/log/nic-*.log | awk '{print "  " $9 ": " $5}'
echo ""

# Check disk space
echo "Disk Space:"
df -h / | tail -1 | awk '{print "  Used: " $3 " / " $2 " (" $5 ")"}'
echo ""

# Check memory usage
echo "Memory Usage:"
free -h | grep Mem | awk '{print "  Used: " $3 " / " $2}'
echo ""

echo "Daily check complete!"
```

Make it executable:

```bash
chmod +x ~/daily-backend-check.sh
```

Run it:

```bash
~/daily-backend-check.sh
```

### Weekly Maintenance

```bash
# Check service uptime
systemctl show nic-reminder --property=ActiveEnterTimestamp

# Review error patterns
journalctl -u nic-reminder --since "7 days ago" | grep -i "error" | sort | uniq -c | sort -rn

# Check log file growth
ls -lh /var/log/nic-*.log

# Rotate logs if needed (>100MB)
for log in /var/log/nic-*.log; do
    size=$(stat -f%z "$log" 2>/dev/null || stat -c%s "$log")
    if [ $size -gt 104857600 ]; then
        echo "Rotating $log (size: $((size/1024/1024))MB)"
        sudo cp "$log" "${log}.$(date +%Y%m%d)"
        sudo truncate -s 0 "$log"
    fi
done

# Check for updates
cd /opt/nic-callcenter
git fetch
git status
```


### Monthly Maintenance

```bash
# Review service performance
journalctl -u nic-reminder --since "30 days ago" | grep -c "✅"
journalctl -u nic-reminder --since "30 days ago" | grep -c -i "error"

# Archive old logs
sudo mkdir -p /var/log/archive
sudo mv /var/log/nic-*.log.* /var/log/archive/ 2>/dev/null

# Update dependencies
cd /opt/nic-callcenter
npm outdated
# Review and update if needed
# npm update

# Check system updates
sudo apt update
sudo apt list --upgradable

# Review and clean old backups
ls -lh /opt/nic-callcenter/*.backup.*
# Delete backups older than 30 days
find /opt/nic-callcenter -name "*.backup.*" -mtime +30 -delete

# Test service restart procedures
sudo systemctl restart nic-reminder
sudo systemctl status nic-reminder
```

### Log Rotation Configuration

Create a logrotate configuration:

```bash
sudo nano /etc/logrotate.d/nic-backend
```

Add the following content:

```
/var/log/nic-*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 www-data www-data
    sharedscripts
    postrotate
        systemctl reload nic-reminder nic-payment-notification nic-device-service nic-aod-upload > /dev/null 2>&1 || true
    endscript
}
```

Test the configuration:

```bash
sudo logrotate -d /etc/logrotate.d/nic-backend
sudo logrotate -f /etc/logrotate.d/nic-backend
```

---

## Emergency Procedures

### Complete Service Recovery

```bash
# 1. Stop all services
sudo systemctl stop nic-reminder nic-payment-notification nic-device-service nic-aod-upload

# 2. Kill any remaining processes
sudo pkill -f "backend-reminder-service|backend-payment-notification|backend-device-service|aod-upload-service"

# 3. Wait for cleanup
sleep 10

# 4. Verify no processes running
ps aux | grep -E "(reminder|payment-notification|device-service|aod-upload)" | grep -v grep
# Should show nothing

# 5. Check system resources
free -h
df -h

# 6. Clear logs if needed (backup first!)
sudo cp /var/log/nic-reminder.log /var/log/nic-reminder.log.emergency.$(date +%Y%m%d_%H%M%S)
sudo truncate -s 0 /var/log/nic-reminder.log
# Repeat for other logs

# 7. Reload systemd
sudo systemctl daemon-reload

# 8. Start services one by one
sudo systemctl start nic-reminder
sleep 5
sudo systemctl status nic-reminder

sudo systemctl start nic-payment-notification
sleep 5
sudo systemctl status nic-payment-notification

sudo systemctl start nic-device-service
sleep 5
sudo systemctl status nic-device-service

sudo systemctl start nic-aod-upload
sleep 5
sudo systemctl status nic-aod-upload

# 9. Verify all services running
sudo systemctl status nic-reminder nic-payment-notification nic-device-service nic-aod-upload

# 10. Monitor logs
tail -f /var/log/nic-reminder.log
```

### Rollback to Previous Version

```bash
# 1. Stop all services
sudo systemctl stop nic-reminder nic-payment-notification nic-device-service nic-aod-upload

# 2. Navigate to application directory
cd /opt/nic-callcenter

# 3. Check git history
git log --oneline -10

# 4. Rollback to previous commit
git checkout <previous-commit-hash>
# Or rollback to specific tag
git checkout v1.2.3

# 5. Install dependencies
npm install

# 6. Restart services
sudo systemctl start nic-reminder nic-payment-notification nic-device-service nic-aod-upload

# 7. Verify services running
sudo systemctl status nic-reminder nic-payment-notification nic-device-service nic-aod-upload

# 8. Check logs for errors
tail -20 /var/log/nic-reminder.log
tail -20 /var/log/nic-payment-notification.log
tail -20 /var/log/nic-device-service.log
tail -20 /var/log/nic-aod-upload.log
```


### Emergency Contact Procedure

If services are down and you cannot recover:

1. **Check system status:**
   ```bash
   uptime
   free -h
   df -h
   ```

2. **Collect diagnostic information:**
   ```bash
   # Save service status
   sudo systemctl status nic-reminder > ~/emergency-status.txt
   
   # Save recent logs
   tail -100 /var/log/nic-reminder.log > ~/emergency-logs.txt
   
   # Save system info
   uname -a >> ~/emergency-status.txt
   free -h >> ~/emergency-status.txt
   df -h >> ~/emergency-status.txt
   ```

3. **Contact system administrator with:**
   - Service status output
   - Recent log entries
   - System resource information
   - Description of what happened before failure

---

## Service Configuration

### Environment Variables

Location: `/opt/nic-callcenter/.env`

```bash
# View environment variables (safely)
grep -v "API_KEY\|PASSWORD" /opt/nic-callcenter/.env

# Edit environment variables
sudo nano /opt/nic-callcenter/.env

# After editing, restart services
sudo systemctl restart nic-reminder nic-payment-notification nic-device-service nic-aod-upload
```

### Key Configuration Parameters

#### Reminder Service:
```bash
REMINDER_CHECK_INTERVAL=5          # Check every 5 minutes
REMINDER_BATCH_SIZE=50             # Process 50 reminders per batch
BUSINESS_HOURS_START=9             # Start at 9 AM
BUSINESS_HOURS_END=17              # End at 5 PM
```

#### Payment Notification Service:
```bash
PAYMENT_CHECK_INTERVAL=60          # Check every 60 seconds
PAYMENT_WINDOW=600                 # Look back 10 minutes
```

#### Device Service:
```bash
DEVICE_SERVICE_PORT=5000           # HTTP server port
DEVICE_TIMEOUT=30000               # 30 second timeout
```

#### AOD Upload Service:
```bash
AOD_UPLOAD_PORT=8080               # HTTP server port
AOD_MAX_FILE_SIZE=10485760         # 10MB max file size
```

### Tuning Service Performance

#### Increase Reminder Frequency:
```bash
# Edit .env file
sudo nano /opt/nic-callcenter/.env

# Change from 5 to 3 minutes
REMINDER_CHECK_INTERVAL=3

# Restart service
sudo systemctl restart nic-reminder
```

#### Increase Batch Size:
```bash
# Edit .env file
sudo nano /opt/nic-callcenter/.env

# Change from 50 to 100
REMINDER_BATCH_SIZE=100

# Restart service
sudo systemctl restart nic-reminder
```

#### Adjust Business Hours:
```bash
# Edit .env file
sudo nano /opt/nic-callcenter/.env

# Change hours (24-hour format)
BUSINESS_HOURS_START=8
BUSINESS_HOURS_END=18

# Restart service
sudo systemctl restart nic-reminder
```

### Systemd Service Tuning

#### Increase Restart Delay:
```bash
# Edit service file
sudo nano /etc/systemd/system/nic-reminder.service

# Change RestartSec value
RestartSec=30

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart nic-reminder
```

#### Change Service User:
```bash
# Edit service file
sudo nano /etc/systemd/system/nic-reminder.service

# Change User value
User=the-user

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart nic-reminder
```

#### Add Resource Limits:9
```bash
# Edit service file
sudo nano /etc/systemd/system/nic-reminder.service

# Add under [Service] section
MemoryLimit=512M
CPUQuota=50%

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart nic-reminder
```

---

## Quick Reference Commands

### Service Management
```bash
# Start all services
sudo systemctl start nic-reminder nic-payment-notification nic-device-service nic-aod-upload

# Stop all services
sudo systemctl stop nic-reminder nic-payment-notification nic-device-service nic-aod-upload

# Restart all services
sudo systemctl restart nic-reminder nic-payment-notification nic-device-service nic-aod-upload

# Check status
sudo systemctl status nic-reminder nic-payment-notification nic-device-service nic-aod-upload
```

### Log Viewing
```bash
# View recent logs
tail -50 /var/log/nic-reminder.log

# Follow logs
tail -f /var/log/nic-reminder.log

# Search for errors
grep -i "error" /var/log/nic-reminder.log

# View systemd journal
journalctl -u nic-reminder -f
```

### Health Checks
```bash
# Check if services are running
ps aux | grep -E "(reminder|payment-notification|device-service|aod-upload)" | grep -v grep

# Check service status
sudo systemctl is-active nic-reminder nic-payment-notification nic-device-service nic-aod-upload

# Check ports
sudo netstat -tlnp | grep -E "(5000|8080)"
```

### Troubleshooting
```bash
# View errors
journalctl -u nic-reminder -p err

# Kill stuck process
sudo pkill -f backend-reminder-service

# Clear logs
sudo truncate -s 0 /var/log/nic-reminder.log

# Test service manually
cd /opt/nic-callcenter
sudo -u www-data node backend-reminder-service.cjs
```

---

## Appendix

### Service File Locations
- **Application Directory**: `/opt/nic-callcenter`
- **Service Files**: `/etc/systemd/system/nic-*.service`
- **Log Files**: `/var/log/nic-*.log`
- **Environment File**: `/opt/nic-callcenter/.env`

### Important Files
- `backend-reminder-service.cjs` - Reminder service code
- `backend-payment-notification.cjs` - Payment notification code
- `backend-device-service.cjs` - Device service code
- `aod-upload-service.cjs` - AOD upload service code
- `.env` - Environment configuration

### External Dependencies
- **Xano API**: Database and backend
- **Brevo API**: Email and SMS delivery
- **ZwennPay API**: Payment processing
- **ESP32 Devices**: Hardware integration

### Support Resources
- **Documentation**: This guide
- **Log Files**: `/var/log/nic-*.log`
- **System Logs**: `journalctl -u nic-*`
- **Service Status**: `systemctl status nic-*`

---
