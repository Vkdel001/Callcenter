# Backend Reminder Service - Troubleshooting Guide

## 🚨 Current Issue: Multiple Processes & Old Version Running

### Quick Diagnosis Commands

```bash
# 1. Check how many processes are running
ps aux | grep backend-reminder-service | grep -v grep | wc -l

# 2. Show all processes with details
ps aux | grep backend-reminder-service | grep -v grep

# 3. Check recent error logs
tail -n 50 /var/log/nic-reminder-service.log | grep -i error

# 4. Check if fixed version is deployed
head -n 10 /var/www/nic-callcenter/backend-reminder-service.cjs | grep -i "fixed"
```

## 🔧 SOLUTION: Deploy Fixed Version

### Step 1: Stop ALL Processes
```bash
cd /var/www/nic-callcenter

# Kill all processes
sudo pkill -f backend-reminder-service

# Wait and verify
sleep 5
ps aux | grep backend-reminder-service | grep -v grep
# Should show NOTHING

# If still running, force kill
sudo pkill -9 -f backend-reminder-service
```

### Step 2: Deploy Fixed Version
```bash
# Backup current version
sudo cp backend-reminder-service.cjs backend-reminder-service.cjs.backup.$(date +%Y%m%d_%H%M%S)

# Deploy fixed version
sudo cp backend-reminder-service-fixed.cjs backend-reminder-service.cjs

# Verify deployment
head -n 10 backend-reminder-service.cjs | grep -i "fixed"
```

### Step 3: Start Single New Process
```bash
# Clear logs
sudo truncate -s 0 /var/log/nic-reminder-service.log

# Start new service
sudo -u www-data nohup /usr/bin/node backend-reminder-service.cjs > /var/log/nic-reminder-service.log 2>&1 &

# Wait and verify
sleep 3
ps aux | grep backend-reminder-service | grep -v grep
# Should show EXACTLY ONE process
```

### Step 4: Verify It's Working
```bash
# Check startup logs
tail -n 20 /var/log/nic-reminder-service.log

# Look for "Fixed Version" in logs
grep -i "fixed version" /var/log/nic-reminder-service.log

# Monitor for next cycle (up to 30 minutes)
tail -f /var/log/nic-reminder-service.log
```

## 🎯 Expected Results After Fix

### Logs Should Show:
```
[INFO] Starting NIC Reminder Service (Fixed Version)...
[INFO] Data fetched successfully { customersCount: X, agentsCount: Y }
[INFO] Processing installment { agentFound: true, agentEmail: 'agent@email.com' }
[INFO] Payment reminder sent { agentCC: 'agent@email.com', qrCodeIncluded: 'yes' }
```

### Process Check:
```bash
ps aux | grep backend-reminder-service | grep -v grep
# Should show EXACTLY ONE line like:
# www-data 1234567  0.1  2.5 123456 51234 ?  Sl  15:30  0:00 /usr/bin/node backend-reminder-service.cjs
```

## 🚨 If Still Having Issues

### Check for Systemd Service
```bash
# Check if there's a systemd service managing this
sudo systemctl list-units --type=service | grep -i reminder
sudo systemctl list-units --type=service | grep -i nic

# If found, stop the systemd service first
sudo systemctl stop nic-reminder.service
sudo systemctl disable nic-reminder.service
```

### Manual Process Check
```bash
# Find all node processes
ps aux | grep node

# Check what's listening on ports
sudo netstat -tlnp | grep node

# Check process tree
pstree -p | grep node
```

### Log Analysis
```bash
# Check for specific errors
grep -i "error\|failed\|exception" /var/log/nic-reminder-service.log

# Check for successful operations
grep -i "reminder sent\|email sent" /var/log/nic-reminder-service.log

# Check for agent CC activity
grep -i "agent.*cc\|agentCC" /var/log/nic-reminder-service.log
```

## ✅ Success Indicators

- [ ] Exactly 1 process running
- [ ] Logs show "Fixed Version" on startup
- [ ] Logs show "agentsCount: X" (not 0)
- [ ] Logs show "agentCC: email@domain.com" in reminder entries
- [ ] Logs show "qrCodeIncluded: yes" in reminder entries
- [ ] No "Error processing payment reminders | Data: {}" errors

## 🔄 Rollback if Needed

```bash
# Stop new service
sudo pkill -f backend-reminder-service

# Restore backup
sudo cp backend-reminder-service.cjs.backup.YYYYMMDD_HHMMSS backend-reminder-service.cjs

# Start backup version
sudo -u www-data nohup /usr/bin/node backend-reminder-service.cjs > /var/log/nic-reminder-service.log 2>&1 &
```

---

**Execute these commands in order and the backend service should work correctly with agent CC and QR code functionality.**