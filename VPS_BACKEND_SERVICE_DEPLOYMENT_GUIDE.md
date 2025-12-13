# VPS Backend Reminder Service - Deployment Guide

## ⚠️ IMPORTANT: Systemd Service Management

**CRITICAL DISCOVERY**: The backend reminder service is managed by **systemd**, not manual processes!

**Service Details:**
- **Service Name**: `nic-reminder.service`
- **Service File**: `/etc/systemd/system/nic-reminder.service`
- **Status**: `loaded active running NIC Call Center Reminder Service`
- **Management**: Use `systemctl` commands, NOT manual `nohup` commands

## 🔍 Service Discovery Commands

```bash
# Check if systemd services exist
sudo systemctl list-units --type=service | grep -i reminder
sudo systemctl list-units --type=service | grep -i nic

# Find service files
sudo find /etc/systemd/system/ -name "*reminder*" -o -name "*nic*"
```

**Expected Output:**
```
nic-reminder.service                           loaded active running NIC Call Center Reminder Service
/etc/systemd/system/nic-reminder.service
```

## 🔍 How to Check Logs

### Method 1: Application Log File
```bash
# Check if log file exists
ls -la /var/log/nic-reminder-service.log

# View recent logs (last 50 lines)
tail -n 50 /var/log/nic-reminder-service.log

# Follow live logs
tail -f /var/log/nic-reminder-service.log

# Search for specific patterns
grep -i "error" /var/log/nic-reminder-service.log
grep -i "email sent" /var/log/nic-reminder-service.log
grep -i "agent" /var/log/nic-reminder-service.log
```

### Method 2: Process Output (if no log file)
```bash
# Check if the process is writing to stdout/stderr
ls -la /proc/1081338/fd/

# If running with PM2 or similar, check those logs
pm2 logs backend-reminder-service

# Check system logs for the process
journalctl _PID=1081338 -f
```

### Method 3: Manual Log Check
```bash
# Check common log locations
ls -la /var/log/ | grep -i reminder
ls -la /var/log/ | grep -i nic

# Check application directory for logs
ls -la /var/www/nic-callcenter/*.log
ls -la /var/www/nic-callcenter/logs/
```

## 🚀 CRITICAL: Deployment Process for Updated Service

### ⚠️ IMPORTANT: Stop ALL Running Processes First

**The issue you're experiencing is due to multiple processes running simultaneously. You must stop ALL processes before starting the new one.**

### Step 1: Stop ALL Running Processes
```bash
# Navigate to application directory
cd /var/www/nic-callcenter

# Kill ALL backend-reminder-service processes
sudo pkill -f backend-reminder-service

# Wait for graceful shutdown
sleep 5

# Verify NO processes are running
ps aux | grep backend-reminder-service | grep -v grep
# This should return NOTHING

# If processes still exist, force kill them
sudo pkill -9 -f backend-reminder-service

# Double check - this should be empty
ps aux | grep backend-reminder-service | grep -v grep
```

### Step 2: Backup Current Service
```bash
# Create backup of current service
sudo cp backend-reminder-service.cjs backend-reminder-service.cjs.backup.$(date +%Y%m%d_%H%M%S)

# Verify backup
ls -la backend-reminder-service.cjs.backup.*
```

### Step 3: Deploy Fixed Service
```bash
# Copy the FIXED version (this is the key!)
sudo cp backend-reminder-service-fixed.cjs backend-reminder-service.cjs

# Verify the file was updated - should show "Fixed Version" in header
head -n 10 backend-reminder-service.cjs

# Check file size - fixed version should be larger
ls -la backend-reminder-service*
```

### Step 4: Start SINGLE New Process
```bash
# Clear the log file to start fresh
sudo truncate -s 0 /var/log/nic-reminder-service.log

# Start the new service (ONLY ONE PROCESS)
sudo -u www-data nohup /usr/bin/node backend-reminder-service.cjs > /var/log/nic-reminder-service.log 2>&1 &

# Wait for startup
sleep 3

# Verify ONLY ONE process is running
ps aux | grep backend-reminder-service | grep -v grep
# Should show EXACTLY ONE process

# Check startup logs
tail -n 20 /var/log/nic-reminder-service.log
```

### Step 5: Verify New Service is Working
```bash
# Check if EXACTLY ONE process is running
ps aux | grep backend-reminder-service | grep -v grep
# Should show exactly one line with "Fixed Version" features

# Check logs for startup messages - should show "Fixed Version"
tail -n 20 /var/log/nic-reminder-service.log

# Look for key indicators of the fixed version
grep -i "fixed version\|agent.*cc\|features.*agent_cc" /var/log/nic-reminder-service.log

# Monitor for a few minutes to ensure stability
tail -f /var/log/nic-reminder-service.log
# Press Ctrl+C to stop following

# Test that it's processing correctly (wait for next cycle)
# Should see logs like:
# [INFO] Starting NIC Reminder Service (Fixed Version)...
# [INFO] Data fetched successfully { customersCount: X, agentsCount: Y }
# [INFO] Payment reminder sent { agentCC: 'agent@email.com', qrCodeIncluded: 'yes' }
```

### Step 6: Verify Agent CC and QR Features
```bash
# Wait for the next reminder cycle (up to 30 minutes) or trigger manually
# Look for these specific log entries that confirm the fix:

# 1. Service startup with fixed version
grep -i "fixed version" /var/log/nic-reminder-service.log

# 2. Agent data being fetched
grep -i "agentsCount" /var/log/nic-reminder-service.log

# 3. Agent CC being included in emails
grep -i "agentCC.*@" /var/log/nic-reminder-service.log

# 4. QR codes being included
grep -i "qrCodeIncluded.*yes" /var/log/nic-reminder-service.log

# If you don't see these, the old version is still running!
```

## 🔧 Service Management Commands

### Check Service Status
```bash
# Check if service is running
ps aux | grep backend-reminder-service | grep -v grep

# Check memory and CPU usage
top -p $(pgrep -f backend-reminder-service)

# Check how long it's been running
ps -o pid,etime,cmd -p $(pgrep -f backend-reminder-service)
```

### View Logs
```bash
# Recent logs (last 50 lines)
tail -n 50 /var/log/nic-reminder-service.log

# Live log monitoring
tail -f /var/log/nic-reminder-service.log

# Search for errors
grep -i "error\|failed\|exception" /var/log/nic-reminder-service.log

# Search for successful operations
grep -i "reminder sent\|email sent\|success" /var/log/nic-reminder-service.log

# Search for agent CC activity
grep -i "agent.*cc\|cc.*agent" /var/log/nic-reminder-service.log
```

### Restart Service
```bash
# Quick restart script
#!/bin/bash
echo "Stopping backend reminder service..."
sudo pkill -f backend-reminder-service

echo "Waiting for graceful shutdown..."
sleep 5

echo "Starting updated service..."
cd /var/www/nic-callcenter
sudo -u www-data nohup /usr/bin/node backend-reminder-service.cjs > /var/log/nic-reminder-service.log 2>&1 &

echo "Verifying service started..."
sleep 3
ps aux | grep backend-reminder-service | grep -v grep

echo "Service restart complete!"
```

## 📊 Monitoring New Features

### Check Agent CC Functionality
```bash
# Look for agent CC logs
grep -i "agentCC\|agent.*email" /var/log/nic-reminder-service.log

# Check for QR code generation
grep -i "qr.*code\|qr.*generated" /var/log/nic-reminder-service.log

# Monitor email sending
grep -i "email sent\|brevo\|reminder sent" /var/log/nic-reminder-service.log
```

### Performance Monitoring
```bash
# Check memory usage
ps aux | grep backend-reminder-service | awk '{print $6/1024 " MB"}'

# Monitor CPU usage
top -p $(pgrep -f backend-reminder-service) -n 1

# Check if service is responding
curl -f http://localhost:3000/health 2>/dev/null || echo "No health endpoint"
```

## 🚨 Troubleshooting

### Service Won't Start
```bash
# Check for syntax errors
node -c /var/www/nic-callcenter/backend-reminder-service.cjs

# Check permissions
ls -la /var/www/nic-callcenter/backend-reminder-service.cjs

# Try running manually to see errors
cd /var/www/nic-callcenter
sudo -u www-data node backend-reminder-service.cjs
```

### Service Crashes
```bash
# Check recent logs for errors
tail -n 100 /var/log/nic-reminder-service.log | grep -i error

# Check system logs
journalctl -u nginx -n 50
dmesg | tail -n 20

# Check disk space
df -h
```

### Email Issues
```bash
# Check for email-related errors
grep -i "email\|brevo\|smtp" /var/log/nic-reminder-service.log

# Check network connectivity
curl -I https://api.brevo.com/v3/smtp/email

# Verify environment variables
sudo -u www-data printenv | grep -i brevo
```

## 🔄 Rollback Procedure

### If New Service Has Issues
```bash
# Stop current service
sudo pkill -f backend-reminder-service

# Restore backup
sudo cp backend-reminder-service.cjs.backup.YYYYMMDD_HHMMSS backend-reminder-service.cjs

# Start backup service
cd /var/www/nic-callcenter
sudo -u www-data nohup /usr/bin/node backend-reminder-service.cjs > /var/log/nic-reminder-service.log 2>&1 &

# Verify rollback successful
ps aux | grep backend-reminder-service | grep -v grep
tail -n 20 /var/log/nic-reminder-service.log
```

## 📋 Quick Reference Commands

```bash
# Check if service is running
ps aux | grep backend-reminder-service | grep -v grep

# View recent logs
tail -n 50 /var/log/nic-reminder-service.log

# Follow live logs
tail -f /var/log/nic-reminder-service.log

# Restart service
sudo pkill -f backend-reminder-service && sleep 3 && cd /var/www/nic-callcenter && sudo -u www-data nohup /usr/bin/node backend-reminder-service.cjs > /var/log/nic-reminder-service.log 2>&1 &

# Check service health
ps aux | grep backend-reminder-service | grep -v grep && echo "Service is running" || echo "Service is not running"
```

## 🎯 Expected Log Entries After Update

After deploying the updated service, you should see logs like:
```
[INFO] Starting NIC Reminder Service...
[INFO] Processing payment reminders...
[INFO] Found X overdue installments
[INFO] Payment reminder sent { customerId: 123, email: 'customer@email.com', agentCC: 'agent@email.com', qrCodeIncluded: 'yes' }
[INFO] Reminder cycle completed successfully
```

## ✅ Deployment Success Indicators

- [ ] Service process running with new PID
- [ ] No error messages in logs
- [ ] Log entries show "agentCC" field populated
- [ ] Log entries show "qrCodeIncluded: yes"
- [ ] Memory usage stable (50-100MB normal)
- [ ] Service processes reminders every 30 minutes

---

**Next Steps**: Execute the deployment process above to update your backend reminder service with the new agent CC and QR code functionality.