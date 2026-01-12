# Backend Services Management Guide

## 🎯 Overview
This document provides comprehensive instructions for managing all backend services in the NIC Call Center system running on the VPS server.

---

## 📋 Backend Services Inventory

### **1. AOD Upload Service**
- **File**: `aod-upload-service.cjs`
- **Purpose**: Handles AOD (Acknowledgment of Debt) document uploads and processing
- **Port**: Not specified (internal service)
- **Dependencies**: File system access, Xano API
- **Log Location**: Check PM2 logs or service-specific logs

### **2. Payment Notification Service**
- **File**: `backend-payment-notification.cjs`
- **Purpose**: Processes payment notifications and webhooks from payment providers
- **Port**: Not specified (webhook receiver)
- **Dependencies**: ZwennPay API, Xano API, Email service
- **Log Location**: `/var/log/payment-notification.log` (if configured)

### **3. Reminder Service**
- **File**: `backend-reminder-service.cjs`
- **Purpose**: Sends payment reminders via email and SMS for installments
- **Port**: Not specified (scheduled service)
- **Dependencies**: Brevo API, Xano API, QR generation service
- **Log Location**: `/var/log/nic-reminder-service.log`

### **4. Device Service**
- **File**: `backend-device-service.cjs`
- **Purpose**: Manages ESP32 device communication and QR code routing
- **Port**: Typically 3001 or 3002
- **Dependencies**: ESP32 devices, Xano API
- **Log Location**: Check PM2 logs or console output

---

## 🔍 Service Status Commands

### **Check All Running Services**
```bash
# View all Node.js services with .cjs extension
ps -ef | grep ".cjs" | grep -v grep

# Alternative: View all node processes
ps aux | grep node | grep -v grep

# Check specific service by name
ps -ef | grep "backend-reminder-service.cjs" | grep -v grep
```

### **Get Service PIDs**
```bash
# Get PIDs for all services
AOD_PID=$(ps -ef | grep "aod-upload-service.cjs" | grep -v grep | awk '{print $2}')
PAYMENT_PID=$(ps -ef | grep "backend-payment-notification.cjs" | grep -v grep | awk '{print $2}')
REMINDER_PID=$(ps -ef | grep "backend-reminder-service.cjs" | grep -v grep | awk '{print $2}')
DEVICE_PID=$(ps -ef | grep "backend-device-service.cjs" | grep -v grep | awk '{print $2}')

echo "AOD Service PID: $AOD_PID"
echo "Payment Service PID: $PAYMENT_PID"
echo "Reminder Service PID: $REMINDER_PID"
echo "Device Service PID: $DEVICE_PID"
```

### **Check Service Resource Usage**
```bash
# Check memory and CPU usage
top -p $(pgrep -f ".cjs" | tr '\n' ',' | sed 's/,$//')

# Alternative with htop (if installed)
htop -p $(pgrep -f ".cjs" | tr '\n' ',')
```

---

## 🔄 Manual Service Management

### **Method 1: Individual Service Restart**

#### **Stop Services**
```bash
# Stop by PID (replace with actual PIDs)
kill 918396   # AOD Upload Service
kill 1145239  # Payment Notification Service  
kill 1146988  # Reminder Service
kill 1437615  # Device Service

# Force kill if needed
kill -9 918396 1145239 1146988 1437615
```

#### **Start Services**
```bash
# Navigate to project directory
cd /var/www/nic-callcenter

# Start each service in background
nohup node aod-upload-service.cjs > /dev/null 2>&1 &
nohup node backend-payment-notification.cjs > /dev/null 2>&1 &
nohup node backend-reminder-service.cjs > /dev/null 2>&1 &
nohup node backend-device-service.cjs > /dev/null 2>&1 &

# Verify services started
ps -ef | grep ".cjs" | grep -v grep
```

### **Method 2: Service-by-Service Management**

#### **AOD Upload Service**
```bash
# Stop
kill $(ps -ef | grep "aod-upload-service.cjs" | grep -v grep | awk '{print $2}')

# Start
cd /var/www/nic-callcenter
nohup node aod-upload-service.cjs > /dev/null 2>&1 &

# Check status
ps -ef | grep "aod-upload-service.cjs" | grep -v grep
```

#### **Payment Notification Service**
```bash
# Stop
kill $(ps -ef | grep "backend-payment-notification.cjs" | grep -v grep | awk '{print $2}')

# Start
cd /var/www/nic-callcenter
nohup node backend-payment-notification.cjs > /dev/null 2>&1 &

# Check status
ps -ef | grep "backend-payment-notification.cjs" | grep -v grep
```

#### **Reminder Service**
```bash
# Stop
kill $(ps -ef | grep "backend-reminder-service.cjs" | grep -v grep | awk '{print $2}')

# Start
cd /var/www/nic-callcenter
nohup node backend-reminder-service.cjs > /dev/null 2>&1 &

# Check status
ps -ef | grep "backend-reminder-service.cjs" | grep -v grep

# Check logs
tail -f /var/log/nic-reminder-service.log
```

#### **Device Service**
```bash
# Stop
kill $(ps -ef | grep "backend-device-service.cjs" | grep -v grep | awk '{print $2}')

# Start
cd /var/www/nic-callcenter
nohup node backend-device-service.cjs > /dev/null 2>&1 &

# Check status
ps -ef | grep "backend-device-service.cjs" | grep -v grep
```

### **Method 3: Batch Operations**

#### **Stop All Services**
```bash
#!/bin/bash
echo "Stopping all backend services..."

# Get all PIDs
PIDS=$(ps -ef | grep ".cjs" | grep -v grep | awk '{print $2}')

if [ -z "$PIDS" ]; then
    echo "No backend services running"
else
    echo "Stopping PIDs: $PIDS"
    kill $PIDS
    sleep 2
    
    # Force kill if still running
    REMAINING=$(ps -ef | grep ".cjs" | grep -v grep | awk '{print $2}')
    if [ ! -z "$REMAINING" ]; then
        echo "Force killing remaining processes: $REMAINING"
        kill -9 $REMAINING
    fi
fi

echo "All backend services stopped"
```

#### **Start All Services**
```bash
#!/bin/bash
echo "Starting all backend services..."

cd /var/www/nic-callcenter

# Start services
nohup node aod-upload-service.cjs > /dev/null 2>&1 &
echo "Started AOD Upload Service (PID: $!)"

nohup node backend-payment-notification.cjs > /dev/null 2>&1 &
echo "Started Payment Notification Service (PID: $!)"

nohup node backend-reminder-service.cjs > /dev/null 2>&1 &
echo "Started Reminder Service (PID: $!)"

nohup node backend-device-service.cjs > /dev/null 2>&1 &
echo "Started Device Service (PID: $!)"

sleep 2

# Verify all services are running
echo "Verifying services..."
ps -ef | grep ".cjs" | grep -v grep

echo "All backend services started"
```

#### **Restart All Services**
```bash
#!/bin/bash
echo "Restarting all backend services..."

# Stop all services
echo "Stopping services..."
PIDS=$(ps -ef | grep ".cjs" | grep -v grep | awk '{print $2}')
if [ ! -z "$PIDS" ]; then
    kill $PIDS
    sleep 2
fi

# Start all services
echo "Starting services..."
cd /var/www/nic-callcenter

nohup node aod-upload-service.cjs > /dev/null 2>&1 &
nohup node backend-payment-notification.cjs > /dev/null 2>&1 &
nohup node backend-reminder-service.cjs > /dev/null 2>&1 &
nohup node backend-device-service.cjs > /dev/null 2>&1 &

sleep 2

# Verify
echo "Services after restart:"
ps -ef | grep ".cjs" | grep -v grep

echo "Restart completed"
```

---

## 📊 Service Monitoring

### **Real-time Monitoring**
```bash
# Monitor all services continuously
watch -n 5 'ps -ef | grep ".cjs" | grep -v grep'

# Monitor with resource usage
watch -n 5 'ps aux | grep node | grep -v grep | head -10'

# Monitor specific service logs
tail -f /var/log/nic-reminder-service.log

# Monitor multiple logs simultaneously (if available)
multitail /var/log/nic-reminder-service.log /var/log/payment-notification.log
```

### **Service Health Checks**
```bash
# Check if all expected services are running
#!/bin/bash
EXPECTED_SERVICES=(
    "aod-upload-service.cjs"
    "backend-payment-notification.cjs"
    "backend-reminder-service.cjs"
    "backend-device-service.cjs"
)

echo "Service Health Check:"
echo "===================="

for service in "${EXPECTED_SERVICES[@]}"; do
    PID=$(ps -ef | grep "$service" | grep -v grep | awk '{print $2}')
    if [ -z "$PID" ]; then
        echo "❌ $service - NOT RUNNING"
    else
        echo "✅ $service - RUNNING (PID: $PID)"
    fi
done
```

### **Port Monitoring (if applicable)**
```bash
# Check which ports are in use by Node.js processes
netstat -tulpn | grep node

# Check specific port
netstat -tulpn | grep :3001
```

---

## 🚨 Troubleshooting

### **Common Issues**

#### **Service Won't Start**
```bash
# Check if port is already in use
netstat -tulpn | grep :PORT_NUMBER

# Check file permissions
ls -la /var/www/nic-callcenter/*.cjs

# Check Node.js version
node --version

# Try starting manually to see errors
cd /var/www/nic-callcenter
node backend-reminder-service.cjs
```

#### **Service Crashes Frequently**
```bash
# Check system resources
free -h
df -h

# Check for memory leaks
ps aux --sort=-%mem | head -10

# Check system logs
journalctl -u your-service-name -f
```

#### **Service Not Responding**
```bash
# Check if process is zombie
ps aux | grep defunct

# Check system load
uptime

# Restart the specific service
kill PID && nohup node service-file.cjs > /dev/null 2>&1 &
```

### **Emergency Recovery**
```bash
# Kill all Node.js processes (DANGEROUS - use with caution)
pkill -f node

# Restart all services
cd /var/www/nic-callcenter
nohup node aod-upload-service.cjs > /dev/null 2>&1 &
nohup node backend-payment-notification.cjs > /dev/null 2>&1 &
nohup node backend-reminder-service.cjs > /dev/null 2>&1 &
nohup node backend-device-service.cjs > /dev/null 2>&1 &
```

---

## 📝 Log Management

### **Log Locations**
```bash
# Reminder service logs
tail -f /var/log/nic-reminder-service.log

# System logs
journalctl -f

# Application logs (if using PM2)
pm2 logs

# Custom log locations (check each service)
ls -la /var/log/ | grep nic
```

### **Log Rotation**
```bash
# Check log sizes
du -sh /var/log/*.log

# Rotate logs manually
logrotate -f /etc/logrotate.conf

# Archive old logs
gzip /var/log/nic-reminder-service.log.1
```

---

## 🔧 Maintenance Scripts

### **Daily Health Check Script**
```bash
#!/bin/bash
# Save as: daily-health-check.sh

echo "Daily Backend Services Health Check - $(date)"
echo "=============================================="

# Check all services
SERVICES=("aod-upload-service.cjs" "backend-payment-notification.cjs" "backend-reminder-service.cjs" "backend-device-service.cjs")

for service in "${SERVICES[@]}"; do
    PID=$(ps -ef | grep "$service" | grep -v grep | awk '{print $2}')
    if [ -z "$PID" ]; then
        echo "❌ $service - RESTARTING"
        cd /var/www/nic-callcenter
        nohup node $service > /dev/null 2>&1 &
        echo "✅ $service - RESTARTED (PID: $!)"
    else
        echo "✅ $service - OK (PID: $PID)"
    fi
done

# Check disk space
echo ""
echo "Disk Usage:"
df -h | grep -E "(Filesystem|/dev/)"

# Check memory
echo ""
echo "Memory Usage:"
free -h

echo ""
echo "Health check completed at $(date)"
```

### **Service Restart Script**
```bash
#!/bin/bash
# Save as: restart-all-services.sh

echo "Restarting all backend services..."

# Use the restart-backend-services.sh script we created earlier
./restart-backend-services.sh
```

---

## 📋 Quick Reference Commands

### **Essential Commands**
```bash
# Check all services
ps -ef | grep ".cjs" | grep -v grep

# Stop all services
kill $(ps -ef | grep ".cjs" | grep -v grep | awk '{print $2}')

# Start all services
cd /var/www/nic-callcenter && \
nohup node aod-upload-service.cjs > /dev/null 2>&1 & \
nohup node backend-payment-notification.cjs > /dev/null 2>&1 & \
nohup node backend-reminder-service.cjs > /dev/null 2>&1 & \
nohup node backend-device-service.cjs > /dev/null 2>&1 &

# Check logs
tail -f /var/log/nic-reminder-service.log

# System status
uptime && free -h && df -h
```

### **Service-Specific Quick Commands**
```bash
# Reminder Service
kill $(pgrep -f "backend-reminder-service.cjs") && cd /var/www/nic-callcenter && nohup node backend-reminder-service.cjs > /dev/null 2>&1 &

# Device Service  
kill $(pgrep -f "backend-device-service.cjs") && cd /var/www/nic-callcenter && nohup node backend-device-service.cjs > /dev/null 2>&1 &

# Payment Service
kill $(pgrep -f "backend-payment-notification.cjs") && cd /var/www/nic-callcenter && nohup node backend-payment-notification.cjs > /dev/null 2>&1 &

# AOD Service
kill $(pgrep -f "aod-upload-service.cjs") && cd /var/www/nic-callcenter && nohup node aod-upload-service.cjs > /dev/null 2>&1 &
```

---

## 🎯 Best Practices

1. **Always check service status** before and after operations
2. **Use graceful shutdown** (kill) before force kill (kill -9)
3. **Monitor logs** during restart operations
4. **Verify all services** are running after batch operations
5. **Keep backups** of service files before updates
6. **Document any custom configurations** or environment variables
7. **Set up automated monitoring** for production environments
8. **Regular health checks** to prevent service failures

---

## 📞 Emergency Contacts

- **System Administrator**: [Your contact info]
- **Development Team**: [Team contact info]
- **VPS Provider Support**: [Provider support info]

---

**Last Updated**: January 11, 2026  
**Version**: 1.0  
**Maintainer**: System Administrator