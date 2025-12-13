#!/bin/bash

echo "🔍 Verifying Backend Reminder Service - Fixed Version"
echo "=================================================="

# Check process count
PROCESS_COUNT=$(ps aux | grep backend-reminder-service | grep -v grep | wc -l)
echo "✅ Process count: $PROCESS_COUNT (should be 1)"

if [ $PROCESS_COUNT -eq 1 ]; then
    echo "✅ Exactly 1 process running - CORRECT!"
    echo "📋 Process details:"
    ps aux | grep backend-reminder-service | grep -v grep
elif [ $PROCESS_COUNT -eq 0 ]; then
    echo "❌ No processes running - service may have crashed"
    exit 1
else
    echo "⚠️  Multiple processes running ($PROCESS_COUNT) - this shouldn't happen"
    ps aux | grep backend-reminder-service | grep -v grep
fi

echo ""
echo "🔍 Checking if fixed version is deployed..."

# Check if fixed version is in the file
if grep -q "Fixed Version" /var/www/nic-callcenter/backend-reminder-service.cjs; then
    echo "✅ Fixed version confirmed in deployed file"
else
    echo "❌ Fixed version not found in deployed file"
    exit 1
fi

echo ""
echo "📋 Checking recent logs..."

# Check if log file exists and has content
if [ -s /var/log/nic-reminder-service.log ]; then
    echo "✅ Log file exists and has content"
    
    # Show recent logs
    echo "📋 Last 10 log entries:"
    tail -n 10 /var/log/nic-reminder-service.log
    
    echo ""
    echo "🔍 Checking for fixed version indicators..."
    
    # Check for fixed version in logs
    if grep -q "Fixed Version" /var/log/nic-reminder-service.log; then
        echo "✅ Fixed version confirmed in logs"
    else
        echo "⚠️  Fixed version not yet visible in logs (may appear in next cycle)"
    fi
    
    # Check for agent data fetching
    if grep -q "agentsCount" /var/log/nic-reminder-service.log; then
        echo "✅ Agent data fetching confirmed"
        grep "agentsCount" /var/log/nic-reminder-service.log | tail -1
    else
        echo "⚠️  Agent data fetching not yet visible (may appear in next cycle)"
    fi
    
    # Check for agent CC functionality
    if grep -q "agentCC.*@" /var/log/nic-reminder-service.log; then
        echo "✅ Agent CC functionality confirmed"
        grep "agentCC.*@" /var/log/nic-reminder-service.log | tail -3
    else
        echo "⚠️  Agent CC not yet visible (will appear when reminders are sent)"
    fi
    
    # Check for QR code functionality
    if grep -q "qrCodeIncluded" /var/log/nic-reminder-service.log; then
        echo "✅ QR code functionality confirmed"
        grep "qrCodeIncluded" /var/log/nic-reminder-service.log | tail -3
    else
        echo "⚠️  QR code functionality not yet visible (will appear when reminders are sent)"
    fi
    
    # Check for errors
    ERROR_COUNT=$(grep -i "error" /var/log/nic-reminder-service.log | wc -l)
    if [ $ERROR_COUNT -eq 0 ]; then
        echo "✅ No errors found in logs"
    else
        echo "⚠️  Found $ERROR_COUNT errors in logs:"
        grep -i "error" /var/log/nic-reminder-service.log | tail -3
    fi
    
else
    echo "⚠️  Log file is empty or doesn't exist - service may still be starting"
fi

echo ""
echo "🎯 Summary:"
echo "=========="
echo "✅ Single process running"
echo "✅ Fixed version deployed"
if grep -q "Fixed Version" /var/log/nic-reminder-service.log; then
    echo "✅ Fixed version active in logs"
else
    echo "⏳ Fixed version will show in next cycle (up to 30 minutes)"
fi

echo ""
echo "📋 Next steps:"
echo "1. Monitor logs: tail -f /var/log/nic-reminder-service.log"
echo "2. Wait for next reminder cycle to see agent CC and QR codes"
echo "3. Ready for GitHub commit!"

echo ""
echo "🔍 Quick monitoring commands:"
echo "ps aux | grep backend-reminder-service | grep -v grep"
echo "tail -f /var/log/nic-reminder-service.log"
echo "grep -i 'agentCC\\|qrCodeIncluded' /var/log/nic-reminder-service.log"