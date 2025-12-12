#!/bin/bash

# Deploy Updated Backend Reminder Service
# This script safely updates the backend service with new features

echo "🚀 Deploying Updated Backend Reminder Service..."

# Step 1: Navigate to application directory
cd /var/www/nic-callcenter || { echo "❌ Failed to navigate to application directory"; exit 1; }

echo "📍 Current directory: $(pwd)"

# Step 2: Backup current service
BACKUP_FILE="backend-reminder-service.cjs.backup.$(date +%Y%m%d_%H%M%S)"
echo "💾 Creating backup: $BACKUP_FILE"
sudo cp backend-reminder-service.cjs "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ]; then
    echo "✅ Backup created successfully"
else
    echo "❌ Failed to create backup"
    exit 1
fi

# Step 3: Check if updated service file exists
if [ ! -f "backend-reminder-service.js" ]; then
    echo "❌ Updated service file (backend-reminder-service.js) not found"
    echo "Please ensure the updated file is in the application directory"
    exit 1
fi

# Step 4: Copy updated service
echo "📋 Copying updated service file..."
sudo cp backend-reminder-service.js backend-reminder-service.cjs

# Verify the copy
if [ -f "backend-reminder-service.cjs" ]; then
    echo "✅ Service file updated successfully"
else
    echo "❌ Failed to update service file"
    exit 1
fi

# Step 5: Find and stop current process
echo "🔍 Finding current backend service process..."
PID=$(ps aux | grep backend-reminder-service | grep -v grep | awk '{print $2}')

if [ -n "$PID" ]; then
    echo "🛑 Stopping current service (PID: $PID)..."
    sudo kill $PID
    
    # Wait for graceful shutdown
    echo "⏳ Waiting for graceful shutdown..."
    sleep 5
    
    # Check if process is still running
    if ps -p $PID > /dev/null; then
        echo "⚠️ Process still running, forcing termination..."
        sudo kill -9 $PID
        sleep 2
    fi
    
    echo "✅ Service stopped successfully"
else
    echo "⚠️ No running backend service found"
fi

# Step 6: Start updated service
echo "🚀 Starting updated service..."
sudo -u www-data nohup /usr/bin/node backend-reminder-service.cjs > /var/log/nic-reminder-service.log 2>&1 &

# Wait a moment for startup
sleep 3

# Step 7: Verify new service is running
NEW_PID=$(ps aux | grep backend-reminder-service | grep -v grep | awk '{print $2}')

if [ -n "$NEW_PID" ]; then
    echo "✅ Updated service started successfully (PID: $NEW_PID)"
    
    # Show recent logs
    echo "📋 Recent logs:"
    tail -n 10 /var/log/nic-reminder-service.log
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "📊 Service Status:"
    echo "   - New PID: $NEW_PID"
    echo "   - Backup: $BACKUP_FILE"
    echo "   - Log file: /var/log/nic-reminder-service.log"
    echo ""
    echo "🔍 Monitor logs with: tail -f /var/log/nic-reminder-service.log"
    
else
    echo "❌ Failed to start updated service"
    echo "🔄 Attempting to restore backup..."
    
    sudo cp "$BACKUP_FILE" backend-reminder-service.cjs
    sudo -u www-data nohup /usr/bin/node backend-reminder-service.cjs > /var/log/nic-reminder-service.log 2>&1 &
    
    sleep 3
    RESTORE_PID=$(ps aux | grep backend-reminder-service | grep -v grep | awk '{print $2}')
    
    if [ -n "$RESTORE_PID" ]; then
        echo "✅ Backup service restored (PID: $RESTORE_PID)"
    else
        echo "❌ Failed to restore backup service"
    fi
    
    exit 1
fi

echo "✨ Deployment script completed"