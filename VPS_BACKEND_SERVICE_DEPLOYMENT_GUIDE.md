# VPS Backend Service Deployment Guide

## Overview
This guide covers deploying the updated `backend-reminder-service.js` to the VPS server with enhanced features including agent CC functionality and improved QR code generation.

## � CurreCnt VPS Setup Analysis

Based on existing documentation, the backend reminder service is currently running as:

### **Current Service Configuration:**
- **Service Name**: `nic-reminder` (systemd service)
- **Service File**: `/etc/systemd/system/nic-reminder.service`
- **Working Directory**: `/var/www/nic-callcenter`
- **Executable**: `/var/www/nic-callcenter/backend-reminder-service.cjs`
- **User**: `www-data`
- **Log File**: `/var/log/nic-reminder-service.log`
- **Management Script**: `reminder-service-manager.sh` (available in project root)

### **Current Service Features:**
- ✅ Payment reminders (7 days and 3 days before due date)
- ✅ Signature reminders for AOD documents
- ✅ Business hours awareness (9 AM - 5 PM Mauritius time)
- ✅ Email and SMS notifications via Brevo
- ✅ ZwennPay QR code integration
- ✅ Comprehensive logging and error handling

## 🔄 What's New in Updated Service

### **Enhanced Features Added:**
- **Agent CC Support**: Automatically CC agents on installment reminder emails
- **Agent Data Fetching**: Retrieves agent information from payment plans
- **Enhanced QR Code Generation**: On-demand QR code creation with fallback
- **Improved Installment Selection**: Sequential processing by installment number
- **Better Error Handling**: Enhanced logging and debugging information
- **Performance Optimizations**: Improved data processing for large datasets

### **Technical Improvements:**
- Added `getAgents()` method to XanoAPI class
- Enhanced email service with CC parameter support
- Improved QR code generation using external API with fallback
- Better error logging with structured data
- Agent lookup from payment plans for CC functionality

## � Key Dyifferences: Current vs New Service

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
- `nic_cc_agent` - Agent information (NEW: for CC functionality)

## 🚀 Deployment Steps

### Step 1: Backup Current Service
```bash
# Connect to VPS
ssh user@your-vps-server

# Create backup directory if it doesn't exist
sudo mkdir -p /opt/nic-reminder-service/backup

# Backup current service file
sudo cp /var/www/nic-callcenter/backend-reminder-service.cjs /opt/nic-reminder-service/backup/backend-reminder-service.cjs.backup.$(date +%Y%m%d_%H%M%S)

# Backup current logs
sudo cp /var/log/nic-reminder-service.log /opt/nic-reminder-service/backup/nic-reminder-service.log.backup.$(date +%Y%m%d_%H%M%S)
```

### Step 2: Stop Current Service
```bash
# Stop the service gracefully
sudo systemctl stop nic-reminder-service

# Verify it's stopped
sudo systemctl status nic-reminder-service
```

### Step 3: Update Service File
```bash
# Navigate to application directory
cd /var/www/nic-callcenter

# Pull latest changes from GitHub (if not already done)
git pull origin main

# Copy the new JavaScript service file to replace the old CJS file
sudo cp backend-reminder-service.js backend-reminder-service.cjs

# Set proper permissions
sudo chown www-data:www-data backend-reminder-service.cjs
sudo chmod 755 backend-reminder-service.cjs

# Verify the file was updated
ls -la backend-reminder-service.cjs
```

### Alternative: Use Deployment Script
```bash
# If you prefer to use the existing deployment script
sudo ./deploy.sh pull

# Then copy the updated service file
sudo cp backend-reminder-service.js backend-reminder-service.cjs
sudo chown www-data:www-data backend-reminder-service.cjs
sudo chmod 755 backend-reminder-service.cjs
```

### Step 4: Update Environment Variables (if needed)
```bash
# Check current environment file
sudo cat /var/www/nic-callcenter/.env

# Ensure these variables are set:
# VITE_XANO_BASE_URL=https://xbde-ekcn-8kg2.n7e.xano.io
# VITE_XANO_CUSTOMER_API=Q4jDYUWL
# VITE_XANO_PAYMENT_API=05i62DIx
# VITE_BREVO_API_KEY=your_brevo_api_key
# VITE_SENDER_EMAIL=arrears@niclmauritius.site
# VITE_SENDER_NAME=NIC Life Insurance Mauritius
```

### Step 5: Start and Enable Service
```bash
# Start the service
sudo systemctl start nic-reminder-service

# Enable auto-start on boot
sudo systemctl enable nic-reminder-service

# Check status
sudo systemctl status nic-reminder-service
```

### Step 6: Verify Service is Running
```bash
# Navigate to application directory first
cd /var/www/nic-callcenter

# Check service status using management script
./reminder-service-manager.sh status

# Follow live logs for a few minutes to verify new features
./reminder-service-manager.sh follow
# Press Ctrl+C to exit log following

# Check recent logs for any errors
./reminder-service-manager.sh logs 50

# Alternative: Direct systemctl commands
sudo systemctl status nic-reminder
sudo journalctl -u nic-reminder -n 20 --no-pager
```

## 🔍 Post-Deployment Verification

### Immediate Checks (0-5 minutes):
```bash
# 1. Service is active and running
sudo systemctl is-active nic-reminder-service
# Should return: active

# 2. No immediate errors in logs
sudo journalctl -u nic-reminder-service -n 20 --no-pager

# 3. Process is running
ps aux | grep backend-reminder-service

# 4. Log file is being written
sudo tail -f /var/log/nic-reminder-service.log
```

### Functional Tests (5-15 minutes):
```bash
# 1. Test API connectivity
curl -s "https://xbde-ekcn-8kg2.n7e.xano.io/api:Q4jDYUWL/nic_cc_customer" | head -c 100

# 2. Check if service can fetch data
sudo journalctl -u nic-reminder-service -n 50 | grep -i "processing\|found\|customers"

# 3. Verify business hours logic
# Service should log "Outside business hours" if run outside 9 AM - 5 PM Mauritius time
```

### Email Functionality Test:
```bash
# Create a test script to verify email functionality
cat > /tmp/test-reminder-email.js << 'EOF'
const https = require('https');

// Test Brevo API connectivity
const options = {
  hostname: 'api.brevo.com',
  port: 443,
  path: '/v3/account',
  method: 'GET',
  headers: {
    'accept': 'application/json',
    'api-key': process.env.VITE_BREVO_API_KEY
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  if (res.statusCode === 200) {
    console.log('✅ Brevo API connection successful');
  } else {
    console.log('❌ Brevo API connection failed');
  }
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.end();
EOF

# Run the test
cd /var/www/nic-callcenter && node /tmp/test-reminder-email.js
```

## 🛠️ Service Management Commands

### Using the Management Script:
```bash
# Navigate to application directory first
cd /var/www/nic-callcenter

# Check service status
./reminder-service-manager.sh status

# Restart service (recommended after updates)
./reminder-service-manager.sh restart

# View recent logs
./reminder-service-manager.sh logs 30

# Follow live logs (great for monitoring new features)
./reminder-service-manager.sh follow

# Stop service
./reminder-service-manager.sh stop

# Start service
./reminder-service-manager.sh start

# Enable service for auto-start on boot
./reminder-service-manager.sh enable

# Disable auto-start
./reminder-service-manager.sh disable
```

### Direct systemctl Commands:
```bash
# Service status
sudo systemctl status nic-reminder-service

# Start service
sudo systemctl start nic-reminder-service

# Stop service
sudo systemctl stop nic-reminder-service

# Restart service
sudo systemctl restart nic-reminder-service

# Enable auto-start
sudo systemctl enable nic-reminder-service

# Disable auto-start
sudo systemctl disable nic-reminder-service

# View logs
sudo journalctl -u nic-reminder-service -f
```

## 🚨 Troubleshooting

### Common Issues and Solutions:

#### 1. Service Won't Start
```bash
# Check for syntax errors
node -c /var/www/nic-callcenter/backend-reminder-service.cjs

# Check permissions
ls -la /var/www/nic-callcenter/backend-reminder-service.cjs

# Check environment variables
sudo systemctl show nic-reminder-service --property=Environment
```

#### 2. Permission Errors
```bash
# Fix file permissions
sudo chown www-data:www-data /var/www/nic-callcenter/backend-reminder-service.cjs
sudo chmod 755 /var/www/nic-callcenter/backend-reminder-service.cjs

# Fix log file permissions
sudo chown www-data:www-data /var/log/nic-reminder-service.log
sudo chmod 644 /var/log/nic-reminder-service.log
```

#### 3. API Connection Issues
```bash
# Test Xano API connectivity
curl -v "https://xbde-ekcn-8kg2.n7e.xano.io/api:Q4jDYUWL/nic_cc_customer"

# Test Brevo API connectivity
curl -v -H "api-key: YOUR_API_KEY" "https://api.brevo.com/v3/account"
```

#### 4. Memory Issues
```bash
# Check memory usage
ps aux | grep backend-reminder-service
free -h

# Check service limits
sudo systemctl show nic-reminder-service --property=MemoryMax
```

### Log Analysis:
```bash
# Check for errors
sudo journalctl -u nic-reminder-service | grep -i error

# Check for successful operations
sudo journalctl -u nic-reminder-service | grep -i "sent successfully\|completed successfully"

# Check for API issues
sudo journalctl -u nic-reminder-service | grep -i "api\|request\|response"

# Check for email issues
sudo journalctl -u nic-reminder-service | grep -i "email\|brevo"
```

## 🔄 Rollback Procedure

### If Issues Occur:
```bash
# 1. Stop current service
sudo systemctl stop nic-reminder-service

# 2. Restore backup
sudo cp /opt/nic-reminder-service/backup/backend-reminder-service.cjs.backup.YYYYMMDD_HHMMSS /var/www/nic-callcenter/backend-reminder-service.cjs

# 3. Set permissions
sudo chown www-data:www-data /var/www/nic-callcenter/backend-reminder-service.cjs
sudo chmod 755 /var/www/nic-callcenter/backend-reminder-service.cjs

# 4. Start service
sudo systemctl start nic-reminder-service

# 5. Verify rollback
sudo systemctl status nic-reminder-service
```

## 📊 Monitoring and Maintenance

### Daily Checks:
```bash
# Service health
./reminder-service-manager.sh status

# Recent activity
./reminder-service-manager.sh logs 20

# System resources
top -p $(pgrep -f backend-reminder-service)
```

### Weekly Maintenance:
```bash
# Rotate logs (if not using logrotate)
sudo cp /var/log/nic-reminder-service.log /var/log/nic-reminder-service.log.$(date +%Y%m%d)
sudo truncate -s 0 /var/log/nic-reminder-service.log

# Clean old backups (keep last 5)
sudo find /opt/nic-reminder-service/backup -name "*.backup.*" -type f | sort | head -n -5 | xargs sudo rm -f
```

### Performance Monitoring:
```bash
# Check email delivery rates
sudo journalctl -u nic-reminder-service --since "1 day ago" | grep -c "Email sent successfully"

# Check error rates
sudo journalctl -u nic-reminder-service --since "1 day ago" | grep -c "ERROR"

# Check processing times
sudo journalctl -u nic-reminder-service --since "1 day ago" | grep "Reminder cycle completed"
```

## 🎯 Success Indicators

### Service is Working Correctly When:
- [x] `systemctl status nic-reminder-service` shows "active (running)"
- [x] Logs show "NIC Reminder Service started successfully"
- [x] No error messages in recent logs
- [x] Service responds to start/stop/restart commands
- [x] Memory usage is stable (under 512MB limit)
- [x] Email delivery logs show successful sends
- [x] Agent CC emails are being sent
- [x] QR codes are being generated and included

### Expected Log Messages:
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

### New Features to Look For:
- **Agent CC Logs**: Look for `agentCC: agent@email.com` in reminder logs
- **QR Code Status**: Check for `qrCodeIncluded: yes/no` in email logs
- **Debug Information**: Enhanced debugging with installment and customer details
- **Agent Data Fetching**: Logs showing agent lookup from payment plans

## 📞 Support and Escalation

### For Issues Contact:
1. **Development Team**: Code-related issues
2. **System Administrator**: VPS server issues
3. **Database Team**: Data access problems
4. **Email Service**: Brevo API issues

### Emergency Procedures:
- **Critical Service Failure**: Immediate rollback
- **Email System Down**: Check Brevo status and API keys
- **Database Issues**: Verify Xano API connectivity
- **High Memory Usage**: Restart service and monitor

---

## Deployment Status: READY FOR EXECUTION ✅

**Estimated Deployment Time**: 10-15 minutes
**Risk Level**: LOW (comprehensive backup and rollback procedures)
**Business Impact**: Minimal (service restart during off-peak hours recommended)

**Next Steps**: Execute deployment during maintenance window or off-peak hours for minimal disruption.