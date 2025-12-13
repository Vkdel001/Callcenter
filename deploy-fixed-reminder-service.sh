#!/bin/bash

# NIC Call Center - Deploy Fixed Reminder Service
# This script safely deploys the fixed backend reminder service

set -e  # Exit on any error

echo "🚀 NIC Call Center - Deploying Fixed Reminder Service"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "backend-reminder-service-fixed.cjs" ]; then
    echo "❌ Error: backend-reminder-service-fixed.cjs not found in current directory"
    echo "Please run this script from /var/www/nic-callcenter"
    exit 1
fi

echo "📍 Current directory: $(pwd)"
echo "📋 Checking current processes..."

# Show current processes
CURRENT_PROCESSES=$(ps aux | grep backend-reminder-service | grep -v grep | wc -l)
echo "🔍 Found $CURRENT_PROCESSES running processes"

if [ $CURRENT_PROCESSES -gt 0 ]; then
    echo "📋 Current processes:"
    ps aux | grep backend-reminder-service | grep -v grep
    echo ""
fi

# Step 1: Stop all processes
echo "🛑 Step 1: Stopping all backend-reminder-service processes..."
sudo pkill -f backend-reminder-service || echo "No processes to kill"

echo "⏳ Waiting 5 seconds for graceful shutdown..."
sleep 5

# Check if any processes still exist
REMAINING_PROCESSES=$(ps aux | grep backend-reminder-service | grep -v grep | wc -l)
if [ $REMAINING_PROCESSES -gt 0 ]; then
    echo "⚠️  Some processes still running, force killing..."
    sudo pkill -9 -f backend-reminder-service || echo "Force kill completed"
    sleep 2
fi

# Verify all processes stopped
FINAL_CHECK=$(ps aux | grep backend-reminder-service | grep -v grep | wc -l)
if [ $FINAL_CHECK -gt 0 ]; then
    echo "❌ Error: Could not stop all processes. Manual intervention required."
    ps aux | grep backend-reminder-service | grep -v grep
    exit 1
fi

echo "✅ All processes stopped successfully"

# Step 2: Backup current service
echo "💾 Step 2: Creating backup of current service..."
BACKUP_NAME="backend-reminder-service.cjs.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp backend-reminder-service.cjs "$BACKUP_NAME"
echo "✅ Backup created: $BACKUP_NAME"

# Step 3: Deploy fixed service
echo "🔄 Step 3: Deploying fixed service..."
sudo cp backend-reminder-service-fixed.cjs backend-reminder-service.cjs
echo "✅ Fixed service deployed"

# Verify the deployment
echo "🔍 Verifying deployment..."
if grep -q "Fixed Version" backend-reminder-service.cjs; then
    echo "✅ Fixed version confirmed in deployed file"
else
    echo "❌ Error: Fixed version not found in deployed file"
    exit 1
fi

# Step 4: Clear logs and start service
echo "🧹 Step 4: Clearing logs and starting service..."
sudo truncate -s 0 /var/log/nic-reminder-service.log

echo "🚀 Starting new service..."
sudo -u www-data nohup /usr/bin/node backend-reminder-service.cjs > /var/log/nic-reminder-service.log 2>&1 &

echo "⏳ Waiting 3 seconds for startup..."
sleep 3

# Step 5: Verify new service
echo "✅ Step 5: Verifying new service..."
NEW_PROCESSES=$(ps aux | grep backend-reminder-service | grep -v grep | wc -l)

if [ $NEW_PROCESSES -eq 1 ]; then
    echo "✅ Exactly 1 process running (correct!)"
    echo "📋 Process details:"
    ps aux | grep backend-reminder-service | grep -v grep
elif [ $NEW_PROCESSES -eq 0 ]; then
    echo "❌ Error: No processes running - service failed to start"
    echo "📋 Checking logs for errors..."
    tail -n 20 /var/log/nic-reminder-service.log
    exit 1
else
    echo "⚠️  Warning: $NEW_PROCESSES processes running (should be 1)"
    echo "📋 Process details:"
    ps aux | grep backend-reminder-service | grep -v grep
fi

# Check startup logs
echo "📋 Checking startup logs..."
sleep 2
if [ -s /var/log/nic-reminder-service.log ]; then
    echo "✅ Log file has content"
    echo "📋 Recent logs:"
    tail -n 10 /var/log/nic-reminder-service.log
    
    # Check for fixed version indicators
    if grep -q "Fixed Version" /var/log/nic-reminder-service.log; then
        echo "✅ Fixed version confirmed in logs"
    else
        echo "⚠️  Fixed version not yet visible in logs (may appear in next cycle)"
    fi
else
    echo "⚠️  Log file is empty - service may still be starting"
fi

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo "✅ Old processes stopped"
echo "✅ Fixed service deployed"
echo "✅ New service started"
echo ""
echo "📋 Next Steps:"
echo "1. Monitor logs: tail -f /var/log/nic-reminder-service.log"
echo "2. Wait for next reminder cycle (up to 30 minutes)"
echo "3. Look for 'agentCC' and 'qrCodeIncluded' in logs"
echo ""
echo "🔍 Quick verification commands:"
echo "ps aux | grep backend-reminder-service | grep -v grep"
echo "tail -n 20 /var/log/nic-reminder-service.log"
echo "grep -i 'agentCC\\|qrCodeIncluded' /var/log/nic-reminder-service.log"