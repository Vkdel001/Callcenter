#!/bin/bash

# Backend Service Deployment Troubleshooting Script
# This script helps identify why the old version is still running

echo "🔍 NIC Backend Service Deployment Troubleshooting"
echo "=================================================="
echo ""

# Step 1: Check current running processes
echo "📋 Step 1: Current Running Processes"
echo "------------------------------------"
echo "Looking for backend reminder processes..."
ps aux | grep backend-reminder-service | grep -v grep
echo ""

# Get the PID for further analysis
REMINDER_PID=$(ps aux | grep backend-reminder-service | grep -v grep | awk '{print $2}')
if [ ! -z "$REMINDER_PID" ]; then
    echo "Found reminder service PID: $REMINDER_PID"
    echo "Process details:"
    ps -p $REMINDER_PID -o pid,ppid,etime,cmd
    echo ""
else
    echo "❌ No backend reminder service process found!"
    echo ""
fi

# Step 2: Check file versions and timestamps
echo "📁 Step 2: File Analysis"
echo "------------------------"
cd /var/www/nic-callcenter

echo "Current backend service files:"
ls -la backend-reminder-service* | head -10
echo ""

echo "Checking file content to identify version..."
if [ -f "backend-reminder-service.cjs" ]; then
    echo "Content check of backend-reminder-service.cjs:"
    echo "First 10 lines:"
    head -10 backend-reminder-service.cjs
    echo ""
    
    echo "Looking for new features (agent CC, QR code):"
    if grep -q "agentCC\|agent.*cc\|agent.*email" backend-reminder-service.cjs; then
        echo "✅ Found agent CC functionality in file"
    else
        echo "❌ Agent CC functionality NOT found in file"
    fi
    
    if grep -q "qr.*code\|generateQR\|qrCodeIncluded" backend-reminder-service.cjs; then
        echo "✅ Found QR code functionality in file"
    else
        echo "❌ QR code functionality NOT found in file"
    fi
    echo ""
else
    echo "❌ backend-reminder-service.cjs not found!"
    echo ""
fi

# Step 3: Check if the new version exists
echo "📦 Step 3: New Version Check"
echo "----------------------------"
if [ -f "backend-reminder-service-fixed.cjs" ]; then
    echo "✅ Found backend-reminder-service-fixed.cjs"
    echo "File size and date:"
    ls -la backend-reminder-service-fixed.cjs
    echo ""
    
    echo "Checking new version features:"
    if grep -q "agentCC\|agent.*cc" backend-reminder-service-fixed.cjs; then
        echo "✅ Agent CC functionality found in fixed version"
    fi
    if grep -q "qr.*code\|generateQR" backend-reminder-service-fixed.cjs; then
        echo "✅ QR code functionality found in fixed version"
    fi
    echo ""
else
    echo "❌ backend-reminder-service-fixed.cjs not found!"
    echo ""
fi

# Step 4: Check logs for version identification
echo "📋 Step 4: Log Analysis"
echo "-----------------------"
if [ -f "/var/log/nic-reminder-service.log" ]; then
    echo "Recent log entries (last 10 lines):"
    tail -10 /var/log/nic-reminder-service.log
    echo ""
    
    echo "Looking for new feature logs in recent entries:"
    echo "Agent CC mentions:"
    grep -i "agentCC\|agent.*cc" /var/log/nic-reminder-service.log | tail -3
    echo ""
    
    echo "QR code mentions:"
    grep -i "qr.*code\|qrCodeIncluded" /var/log/nic-reminder-service.log | tail -3
    echo ""
    
    echo "Service start messages:"
    grep -i "service.*start\|reminder.*service" /var/log/nic-reminder-service.log | tail -3
    echo ""
else
    echo "❌ Log file /var/log/nic-reminder-service.log not found!"
    echo ""
fi

# Step 5: Check systemd service (if exists)
echo "🔧 Step 5: Service Management Check"
echo "-----------------------------------"
if systemctl list-units --type=service | grep -q nic-reminder; then
    echo "✅ Found systemd service: nic-reminder"
    echo "Service status:"
    systemctl status nic-reminder --no-pager -l
    echo ""
else
    echo "ℹ️ No systemd service found - running as standalone process"
    echo ""
fi

# Step 6: Provide deployment recommendations
echo "🚀 Step 6: Deployment Recommendations"
echo "====================================="

if [ ! -z "$REMINDER_PID" ]; then
    echo "Current process is running with PID: $REMINDER_PID"
    
    # Check if the running file has new features
    if grep -q "agentCC\|agent.*cc" backend-reminder-service.cjs 2>/dev/null; then
        echo "✅ The current file appears to have new features"
        echo "🔄 Issue might be that the process needs to be restarted to load new code"
        echo ""
        echo "RECOMMENDED ACTION:"
        echo "1. Kill current process: kill $REMINDER_PID"
        echo "2. Wait 5 seconds: sleep 5"
        echo "3. Start new process: nohup /usr/bin/node /var/www/nic-callcenter/backend-reminder-service.cjs > /var/log/nic-reminder-service.log 2>&1 &"
    else
        echo "❌ The current file does NOT have new features"
        echo "🔄 Need to update the file first"
        echo ""
        echo "RECOMMENDED ACTION:"
        if [ -f "backend-reminder-service-fixed.cjs" ]; then
            echo "1. Backup current: cp backend-reminder-service.cjs backend-reminder-service.cjs.backup.\$(date +%Y%m%d_%H%M%S)"
            echo "2. Update file: cp backend-reminder-service-fixed.cjs backend-reminder-service.cjs"
            echo "3. Kill process: kill $REMINDER_PID"
            echo "4. Start new: nohup /usr/bin/node /var/www/nic-callcenter/backend-reminder-service.cjs > /var/log/nic-reminder-service.log 2>&1 &"
        else
            echo "1. First, ensure backend-reminder-service-fixed.cjs exists in the directory"
            echo "2. Then follow the update procedure above"
        fi
    fi
else
    echo "❌ No process is currently running"
    echo ""
    echo "RECOMMENDED ACTION:"
    echo "1. Ensure the correct file exists: ls -la backend-reminder-service.cjs"
    echo "2. Start the service: nohup /usr/bin/node /var/www/nic-callcenter/backend-reminder-service.cjs > /var/log/nic-reminder-service.log 2>&1 &"
fi

echo ""
echo "🔍 Additional Debugging Commands:"
echo "================================="
echo "# Check file differences:"
echo "diff backend-reminder-service.cjs backend-reminder-service-fixed.cjs | head -20"
echo ""
echo "# Monitor logs in real-time:"
echo "tail -f /var/log/nic-reminder-service.log"
echo ""
echo "# Check process after restart:"
echo "ps aux | grep backend-reminder-service | grep -v grep"
echo ""
echo "# Test email functionality:"
echo "grep -i 'email.*sent\|reminder.*sent' /var/log/nic-reminder-service.log | tail -5"

echo ""
echo "✅ Troubleshooting complete!"
echo "Run the recommended actions above to fix the deployment issue."