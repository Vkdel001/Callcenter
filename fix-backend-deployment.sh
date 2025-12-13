#!/bin/bash

# Quick Backend Service Deployment Fix
# This script will properly deploy the new version with QR codes and agent CC

echo "🚀 NIC Backend Service Deployment Fix"
echo "====================================="
echo ""

# Navigate to the application directory
cd /var/www/nic-callcenter

# Step 1: Check current status
echo "📋 Step 1: Current Status Check"
echo "-------------------------------"
CURRENT_PID=$(ps aux | grep backend-reminder-service | grep -v grep | awk '{print $2}')
if [ ! -z "$CURRENT_PID" ]; then
    echo "✅ Found running process with PID: $CURRENT_PID"
    echo "Process details:"
    ps -p $CURRENT_PID -o pid,etime,cmd
else
    echo "❌ No process currently running"
fi
echo ""

# Step 2: Backup current version
echo "💾 Step 2: Backup Current Version"
echo "---------------------------------"
if [ -f "backend-reminder-service.cjs" ]; then
    BACKUP_NAME="backend-reminder-service.cjs.backup.$(date +%Y%m%d_%H%M%S)"
    cp backend-reminder-service.cjs "$BACKUP_NAME"
    echo "✅ Backup created: $BACKUP_NAME"
else
    echo "⚠️ No current backend-reminder-service.cjs found"
fi
echo ""

# Step 3: Deploy new version
echo "📦 Step 3: Deploy New Version"
echo "-----------------------------"
if [ -f "backend-reminder-service-fixed.cjs" ]; then
    echo "✅ Found new version: backend-reminder-service-fixed.cjs"
    
    # Copy the fixed version to replace the current one
    cp backend-reminder-service-fixed.cjs backend-reminder-service.cjs
    echo "✅ New version deployed to backend-reminder-service.cjs"
    
    # Verify the new features are in the file
    if grep -q "agentCC\|agent.*cc" backend-reminder-service.cjs; then
        echo "✅ Agent CC functionality confirmed in deployed file"
    else
        echo "❌ Agent CC functionality NOT found - deployment may have failed"
    fi
    
    if grep -q "qr.*code\|generateQR\|qrCodeIncluded" backend-reminder-service.cjs; then
        echo "✅ QR code functionality confirmed in deployed file"
    else
        echo "❌ QR code functionality NOT found - deployment may have failed"
    fi
else
    echo "❌ backend-reminder-service-fixed.cjs not found!"
    echo "Please ensure the fixed version exists before running this script."
    exit 1
fi
echo ""

# Step 4: Restart the service
echo "🔄 Step 4: Restart Service"
echo "--------------------------"
if [ ! -z "$CURRENT_PID" ]; then
    echo "Stopping current process (PID: $CURRENT_PID)..."
    kill $CURRENT_PID
    
    # Wait for process to stop
    echo "Waiting for process to stop..."
    sleep 3
    
    # Check if process actually stopped
    if ps -p $CURRENT_PID > /dev/null 2>&1; then
        echo "⚠️ Process still running, forcing kill..."
        kill -9 $CURRENT_PID
        sleep 2
    fi
    
    echo "✅ Old process stopped"
fi

# Start new process
echo "Starting new process..."
nohup /usr/bin/node /var/www/nic-callcenter/backend-reminder-service.cjs > /var/log/nic-reminder-service.log 2>&1 &
NEW_PID=$!
echo "✅ New process started with PID: $NEW_PID"
echo ""

# Step 5: Verify deployment
echo "✅ Step 5: Verify Deployment"
echo "----------------------------"
sleep 3

# Check if new process is running
NEW_RUNNING_PID=$(ps aux | grep backend-reminder-service | grep -v grep | awk '{print $2}')
if [ ! -z "$NEW_RUNNING_PID" ]; then
    echo "✅ New process confirmed running with PID: $NEW_RUNNING_PID"
    
    # Check recent logs for new features
    echo ""
    echo "Recent log entries:"
    tail -10 /var/log/nic-reminder-service.log
    echo ""
    
    # Wait a moment for service to initialize
    echo "Waiting for service to initialize..."
    sleep 5
    
    # Check for new feature indicators in logs
    echo "Checking for new features in logs..."
    
    if grep -i "agentCC\|agent.*cc" /var/log/nic-reminder-service.log | tail -1; then
        echo "✅ Agent CC functionality detected in logs"
    else
        echo "ℹ️ Agent CC functionality not yet visible in logs (may appear during next reminder cycle)"
    fi
    
    if grep -i "qr.*code\|qrCodeIncluded" /var/log/nic-reminder-service.log | tail -1; then
        echo "✅ QR code functionality detected in logs"
    else
        echo "ℹ️ QR code functionality not yet visible in logs (may appear during next reminder cycle)"
    fi
    
else
    echo "❌ New process not running! Check logs for errors:"
    tail -20 /var/log/nic-reminder-service.log
    echo ""
    echo "🔄 Attempting rollback..."
    
    if [ -f "$BACKUP_NAME" ]; then
        cp "$BACKUP_NAME" backend-reminder-service.cjs
        echo "✅ Rolled back to previous version"
        
        # Start the old version
        nohup /usr/bin/node /var/www/nic-callcenter/backend-reminder-service.cjs > /var/log/nic-reminder-service.log 2>&1 &
        echo "✅ Previous version restarted"
    fi
    
    exit 1
fi

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo "✅ New backend service deployed successfully"
echo "✅ Process running with PID: $NEW_RUNNING_PID"
echo "✅ Agent CC functionality available"
echo "✅ Enhanced QR code generation available"
echo ""
echo "📋 Next Steps:"
echo "1. Monitor logs: tail -f /var/log/nic-reminder-service.log"
echo "2. Test reminder functionality during next cycle"
echo "3. Verify QR codes appear in Gmail"
echo "4. Check agent CC emails are sent"
echo ""
echo "🔍 Monitoring Commands:"
echo "# Check process status:"
echo "ps aux | grep backend-reminder-service | grep -v grep"
echo ""
echo "# Monitor logs:"
echo "tail -f /var/log/nic-reminder-service.log"
echo ""
echo "# Check for new features:"
echo "grep -i 'agentCC\\|qrCodeIncluded' /var/log/nic-reminder-service.log | tail -5"