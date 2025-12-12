# VPS Backend Service Deployment Guide - UPDATED

## Overview
This guide covers deploying the updated `backend-reminder-service.js` to the VPS server with enhanced features including agent CC functionality and improved QR code generation.

**CRITICAL DISCOVERY**: Backend services are running as **standalone processes**, NOT systemd services.

## 📋 Actual VPS Setup Analysis

### **Current Running Processes:**
```
PID     USER     COMMAND                                          STARTED
758264  www-data /usr/bin/node backend-reminder-service.cjs      Nov 20
838458  www-data /usr/bin/node backend-payment-notification.cjs  Nov 25  
875220  root     node backend-device-service.cjs                 Nov 28
```

### **Current Service Configuration:**
- **Process Type**: **Standalone Node.js processes** (NOT systemd services)
- **Reminder Service**: PID 758264 - Running since Nov 20 (stable for weeks)
- **Working Directory**: `/var/www/nic-callcenter`
- **Executable**: `backend-reminder-service.cjs`
- **User**: `www-data` (reminder & payment services)
- **Log File**: `/var/log/nic-reminder-service.log`
- **Management**: Direct process control (kill/restart)
- **Auto-restart**: Unknown mechanism (possibly PM2, cron, or manual)

### **Current Service Features:**
- ✅ Payment reminders (7 days and 3 days before due date)
- ✅ Signature reminders for AOD documents  
- ✅ Business hours awareness (9 AM - 5 PM Mauritius time)
- ✅ Email and SMS notifications via Brevo
- ✅ ZwennPay QR code integration
- ✅ **Proven stability** - running for weeks without issues

## 🔄 What's New in Updated Service

### **Enhanced Features Added:**
- **Agent CC Support**: Automatically CC agents on installment reminder emails
- **Agent Data Fetching**: Retrieves agent information from payment plans
- **Enhanced QR Code Generation**: On-demand QR code creation with fallback API
- **Improved Installment Selection**: Sequential processing by installment number
- **Better Error Handling**: Enhanced logging and debugging information
- **Performance Optimizations**: Improved data processing for large datasets

### **Technical Improvements:**
- Added `getAgents()` method to XanoAPI class
- Enhanced email service with CC parameter support
- Improved QR code generation using external API with fallback
- Better error logging with structured data
- Agent lookup from payment plans for CC functionality

## 🔍 Key Differences: Current vs New Service

### **Current Service (backend-reminder-service.cjs):**
- Sends payment reminders 7 days and 3 days before due date
- No agent CC functionality
- Basic QR code handling (uses existing database QR codes)
- Simple email templates
- Basic error logging

### **New Service (backend-reminder-service.js):**
- ✅ **Agent CC Support**: Fetches agent from payment plan and CCs them on reminders
- ✅ **Enhanced QR Generation**: On-demand QR code creation with fallback API
- ✅ **Better Installment Logic**: Sequential processing by installment number
- ✅ **Improved Error Handling**: Structured logging with detailed debugging
- ✅ **Agent Data Integration**: Retrieves agent information for CC functionality

### **Database Tables Used:**
- `nic_cc_customer` - Customer information
- `nic_cc_installment` - Payment installments
- `nic_cc_payment_plan` - Payment plans (links customers to agents)
- `nic_cc_agent` - Agent information (**NEW**: for CC functionality)

## 🚀 Deployment Options

### **Option 1: Quick Update (Recommended - 5 minutes)**
Safe update of running process with minimal downtime.

### **Option 2: Proper Systemd Setup (Better Long-term - 15 minutes)**
Convert to proper systemd service with auto-restart and management.

---

## 🚀 Option 1: Quick Update Deployment

### **Step 1: Backup Current Service**
```bash
cd /var/www/nic-callcenter

# Create backup with timestamp
cp backend-reminder-service.cjs backend-reminder-service.cjs.backup.$(date +%Y%m%d_%H%M%S)

# Verify backup
ls -la backend-reminder-service.cjs.backup.*
```

### **Step 2: Check Current Process**
```bash
# Find the current process
ps aux | grep backend-reminder-service | grep -v grep

# Note the PID (should be 758264 based on your output)
# Check how long it's been running
ps -eo pid,etime,cmd | grep 758264
```

### **Step 3: Update Service File**
```bash
# Pull latest changes from GitHub (if not already done)
git pull origin main

# Copy the new JavaScript service file to replace the old CJS file
cp backend-reminder-service.js backend-reminder-service.cjs

# Verify the file was updated
ls -la backend-reminder-service.cjs
head -5 backend-reminder-service.cjs
```

### **Step 4: Restart Process**
```bash
# Kill the current process (it should restart automatically)
kill 758264

# Wait a moment
sleep 5

# Check if it restarted automatically
ps aux | grep backend-reminder-service | grep -v grep

# If it didn't restart automatically, start it manually
if ! ps aux | grep backend-reminder-service | grep -v grep; then
    echo "Starting service manually..."
    nohup /usr/bin/node /var/www/nic-callcenter/backend-reminder-service.cjs > /var/log/nic-reminder-service.log 2>&1 &
    echo "Service started with PID: $!"
fi
```

### **Step 5: Verify New Service**
```bash
# Check process is running
ps aux | grep backend-reminder-service | grep -v grep

# Check recent logs for new features
tail -20 /var/log/nic-reminder-service.log

# Look for new log patterns indicating agent CC functionality
grep -i "agent" /var/log/nic-reminder-service.log | tail -5
```

---

## 🚀 Option 2: Proper Systemd Setup

### **Step 1: Stop Current Process**
```bash
# Kill current standalone process
kill 758264
kill 838458  # payment notification if updating that too

# Verify processes stopped
ps aux | grep -E "(backend-reminder|backend-payment)" | grep -v grep
```

### **Step 2: Create Systemd Service File**
```bash
# Create reminder service file
sudo tee /etc/systemd/system/nic-reminder.service > /dev/null <<EOF
[Unit]
Description=NIC Call Center Reminder Service
Documentation=https://github.com/Vkdel001/Callcenter
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/nic-callcenter
ExecStart=/usr/bin/node /var/www/nic-callcenter/backend-reminder-service.cjs
Restart=always
RestartSec=10
StandardOutput=append:/var/log/nic-reminder-service.log
StandardError=append:/var/log/nic-reminder-service.log
SyslogIdentifier=nic-reminder

# Environment variables
Environment=NODE_ENV=production
EnvironmentFile=/var/www/nic-callcenter/.env

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log /var/www/nic-callcenter

# Resource limits
LimitNOFILE=65536
MemoryMax=512M

[Install]
WantedBy=multi-user.target
EOF
```

### **Step 3: Install and Start Service**
```bash
# Update service file
cp backend-reminder-service.js backend-reminder-service.cjs

# Reload systemd
sudo systemctl daemon-reload

# Enable service for auto-start
sudo systemctl enable nic-reminder

# Start service
sudo systemctl start nic-reminder

# Check status
sudo systemctl status nic-reminder
```

### **Step 4: Update Management Script**
```bash
# Make management script executable
chmod +x reminder-service-manager.sh

# Test management script
./reminder-service-manager.sh status
./reminder-service-manager.sh logs 10
```

---

## 🔍 Post-Deployment Verification

### **Immediate Checks (0-5 minutes):**
```bash
# 1. Process is running
ps aux | grep backend-reminder-service | grep -v grep

# 2. Check recent logs
tail -20 /var/log/nic-reminder-service.log

# 3. Look for new features in logs
grep -i "agent\|cc\|debug" /var/log/nic-reminder-service.log | tail -10

# 4. Check service responds to signals (if systemd)
sudo systemctl status nic-reminder 2>/dev/null || echo "Not a systemd service"
```

### **Functional Tests (5-15 minutes):**
```bash
# 1. Check if service can fetch data
grep -i "processing\|found\|customers" /var/log/nic-reminder-service.log | tail -5

# 2. Verify agent data fetching (new feature)
grep -i "agent.*found\|agent.*lookup" /var/log/nic-reminder-service.log | tail -3

# 3. Check QR code generation (enhanced feature)
grep -i "qr.*code\|qr.*generated" /var/log/nic-reminder-service.log | tail -3

# 4. Monitor for next 10 minutes
tail -f /var/log/nic-reminder-service.log
# Press Ctrl+C to exit
```

### **Email Functionality Test:**
```bash
# Test API connectivity
curl -s "https://xbde-ekcn-8kg2.n7e.xano.io/api:Q4jDYUWL/nic_cc_customer" | head -c 100

# Check Brevo API (replace with actual API key)
curl -v -H "api-key: YOUR_API_KEY" "https://api.brevo.com/v3/account" 2>&1 | grep -E "(200|401|403)"
```

## 🛠️ Service Management Commands

### **For Standalone Process:**
```bash
# Check process
ps aux | grep backend-reminder-service | grep -v grep

# Kill process
kill $(pgrep -f backend-reminder-service)

# Start process manually
cd /var/www/nic-callcenter
nohup /usr/bin/node backend-reminder-service.cjs > /var/log/nic-reminder-service.log 2>&1 &

# Check logs
tail -f /var/log/nic-reminder-service.log
```

### **For Systemd Service (if converted):**
```bash
# Navigate to application directory first
cd /var/www/nic-callcenter

# Check service status
sudo systemctl status nic-reminder

# Restart service (recommended after updates)
sudo systemctl restart nic-reminder

# View recent logs
sudo journalctl -u nic-reminder -n 30 --no-pager

# Follow live logs
sudo journalctl -u nic-reminder -f

# Stop service
sudo systemctl stop nic-reminder

# Start service
sudo systemctl start nic-reminder

# Enable service for auto-start on boot
sudo systemctl enable nic-reminder

# Disable auto-start
sudo systemctl disable nic-reminder
```

## 🚨 Troubleshooting

### **Common Issues and Solutions:**

#### **1. Process Won't Start**
```bash
# Check for syntax errors
cd /var/www/nic-callcenter
node -c backend-reminder-service.cjs

# Check environment variables
grep -E "(BREVO|XANO)" .env | head -5

# Check permissions
ls -la backend-reminder-service.cjs
```

#### **2. Process Keeps Dying**
```bash
# Check system resources
free -h
df -h

# Check for port conflicts
netstat -tulpn | grep node

# Check recent crashes in logs
grep -i "error\|crash\|exit" /var/log/nic-reminder-service.log | tail -10
```

#### **3. New Features Not Working**
```bash
# Check if new code is actually running
grep -i "agent.*cc\|enhanced.*qr" /var/log/nic-reminder-service.log | tail -5

# Verify file was updated
head -20 backend-reminder-service.cjs | grep -i "agent\|cc"

# Check database connectivity for agent table
curl -s "https://xbde-ekcn-8kg2.n7e.xano.io/api:Q4jDYUWL/nic_cc_agent" | head -c 200
```

#### **4. Agent CC Not Working**
```bash
# Check agent data in logs
grep -i "agent.*found\|agent.*email" /var/log/nic-reminder-service.log | tail -5

# Verify payment plan to agent relationship
grep -i "payment.*plan.*agent" /var/log/nic-reminder-service.log | tail -3
```

## 🔄 Rollback Procedure

### **If Issues Occur:**
```bash
# 1. Stop current process
kill $(pgrep -f backend-reminder-service)

# 2. Restore backup (find latest backup)
ls -la backend-reminder-service.cjs.backup.*
cp backend-reminder-service.cjs.backup.YYYYMMDD_HHMMSS backend-reminder-service.cjs

# 3. Start old version
nohup /usr/bin/node backend-reminder-service.cjs > /var/log/nic-reminder-service.log 2>&1 &

# 4. Verify rollback
ps aux | grep backend-reminder-service | grep -v grep
tail -10 /var/log/nic-reminder-service.log
```

## 📊 Success Indicators

### **Service is Working Correctly When:**
- [x] Process shows in `ps aux | grep backend-reminder-service`
- [x] Logs show "NIC Reminder Service started successfully"
- [x] No error messages in recent logs
- [x] Memory usage is reasonable (under 100MB typically)
- [x] **NEW**: Logs show agent CC functionality: `agentCC: agent@email.com`
- [x] **NEW**: Logs show QR code status: `qrCodeIncluded: yes/no`
- [x] **NEW**: Enhanced debugging information in logs

### **Expected Log Messages (New Features):**
```
[INFO] Starting NIC Reminder Service...
[INFO] NIC Reminder Service started successfully
[INFO] Starting reminder cycle...
[INFO] Processing payment reminders...
[INFO] Found X installments needing reminders
[INFO] DEBUG: Processing installment | installmentId: 123 | customerFound: true | customerEmail: customer@email.com
[INFO] Payment reminder sent | customerId: 123 | email: customer@email.com | installmentId: 456 | agentCC: agent@email.com | qrCodeIncluded: yes
[INFO] Processing signature reminders...
[INFO] Reminder cycle completed successfully
```

### **New Features to Look For:**
- **Agent CC Logs**: Look for `agentCC: agent@email.com` in reminder logs
- **QR Code Status**: Check for `qrCodeIncluded: yes/no` in email logs  
- **Debug Information**: Enhanced debugging with installment and customer details
- **Agent Data Fetching**: Logs showing agent lookup from payment plans

## 📞 Support and Escalation

### **For Issues Contact:**
1. **Development Team**: Code-related issues
2. **System Administrator**: VPS server issues  
3. **Database Team**: Data access problems
4. **Email Service**: Brevo API issues

### **Emergency Procedures:**
- **Critical Service Failure**: Immediate rollback to backup
- **Email System Down**: Check Brevo status and API keys
- **Database Issues**: Verify Xano API connectivity
- **High Memory Usage**: Restart process and monitor

---

## Deployment Status: READY FOR EXECUTION ✅

**Recommended Approach**: Option 1 (Quick Update) - 5 minutes, minimal risk
**Alternative**: Option 2 (Systemd Setup) - 15 minutes, better long-term management

**Estimated Deployment Time**: 5-15 minutes depending on option chosen
**Risk Level**: LOW (comprehensive backup and rollback procedures)
**Business Impact**: Minimal (brief service restart, auto-recovery)

**Next Steps**: Choose deployment option and execute during maintenance window or off-peak hours.