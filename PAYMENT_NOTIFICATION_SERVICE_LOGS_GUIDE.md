# Payment Notification Service - Log Monitoring Guide

## Log File Location
The payment notification service logs to:
```
/var/log/nic-payment-notification.log
```

## How to Check Logs

### 1. View Recent Logs (Last 50 lines)
```bash
tail -50 /var/log/nic-payment-notification.log
```

### 2. Follow Logs in Real-Time
```bash
tail -f /var/log/nic-payment-notification.log
```

### 3. View All Logs
```bash
cat /var/log/nic-payment-notification.log
```

### 4. Search for Specific Payment
```bash
# Search by policy number
grep "09889" /var/log/nic-payment-notification.log

# Search by transaction reference
grep "47459" /var/log/nic-payment-notification.log

# Search by customer name
grep -i "vikas" /var/log/nic-payment-notification.log
```

### 5. Filter by Date/Time
```bash
# Today's logs
grep "$(date +%Y-%m-%d)" /var/log/nic-payment-notification.log

# Last hour's logs
grep "$(date -d '1 hour ago' +%Y-%m-%d\ %H)" /var/log/nic-payment-notification.log
```

### 6. Check for Errors
```bash
# Look for error messages
grep -i "error\|failed\|❌" /var/log/nic-payment-notification.log

# Look for successful operations
grep -i "success\|✅" /var/log/nic-payment-notification.log
```

## Expected Log Messages

### Service Startup
```
🚀 NIC Payment Notification Service started
📧 Email configuration validated
🔄 Starting payment monitoring (check every 60 seconds)
```

### Payment Detection
```
💳 Processing payment 123:
   Customer: vikas khanna
   Amount: MUR 1.33
   Policy: 09889
   Transaction: 47459
```

### Email Notifications
```
📧 Sending email to vikas.khanna@zwennpay.com
✅ Email sent successfully. Message ID: abc123
📱 Sending SMS to +23057372333
✅ SMS sent successfully. Message ID: def456
```

### Errors to Watch For
```
❌ VITE_BREVO_API_KEY not found in environment variables
❌ Xano configuration not found in environment variables
❌ Failed to fetch payments: [error details]
❌ Failed to send email: [error details]
❌ Failed to send SMS: [error details]
```

## Service Management Commands

### Check if Service is Running
```bash
# If running as systemd service
sudo systemctl status nic-payment-notification

# If running as PM2 process
pm2 status nic-payment-notification

# Check for running process
ps aux | grep "backend-payment-notification"
```

### Start/Stop/Restart Service
```bash
# Systemd
sudo systemctl start nic-payment-notification
sudo systemctl stop nic-payment-notification
sudo systemctl restart nic-payment-notification

# PM2
pm2 start backend-payment-notification.cjs --name nic-payment-notification
pm2 stop nic-payment-notification
pm2 restart nic-payment-notification
```

### View Service Logs (if using systemd)
```bash
# View service logs
sudo journalctl -u nic-payment-notification -f

# View recent service logs
sudo journalctl -u nic-payment-notification --since "1 hour ago"
```

## Troubleshooting Common Issues

### Issue: No logs being written
**Check:**
```bash
# Verify log file exists and is writable
ls -la /var/log/nic-payment-notification.log

# Check if service is running
ps aux | grep backend-payment-notification
```

### Issue: Service not detecting payments
**Check:**
```bash
# Look for database connection errors
grep -i "xano\|database\|connection" /var/log/nic-payment-notification.log

# Verify environment variables
grep -i "environment\|config" /var/log/nic-payment-notification.log
```

### Issue: Emails not being sent
**Check:**
```bash
# Look for email-related errors
grep -i "email\|brevo\|smtp" /var/log/nic-payment-notification.log

# Check API key issues
grep -i "api.*key\|authentication" /var/log/nic-payment-notification.log
```

## Log Rotation
To prevent log files from growing too large:

### Setup Log Rotation
Create `/etc/logrotate.d/nic-payment-notification`:
```
/var/log/nic-payment-notification.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
    postrotate
        # Restart service if needed
        systemctl reload nic-payment-notification || true
    endscript
}
```

## Real-Time Monitoring Commands

### Monitor for New Payments
```bash
# Watch for payment processing
tail -f /var/log/nic-payment-notification.log | grep "💳 Processing payment"
```

### Monitor Email Sending
```bash
# Watch for email notifications
tail -f /var/log/nic-payment-notification.log | grep -E "📧|✅.*Email|❌.*Email"
```

### Monitor Errors Only
```bash
# Watch for any errors
tail -f /var/log/nic-payment-notification.log | grep -i "❌\|error\|failed"
```

## Quick Health Check Script
Create a script to quickly check service health:

```bash
#!/bin/bash
echo "🔍 Payment Notification Service Health Check"
echo "==========================================="

# Check if service is running
if pgrep -f "backend-payment-notification" > /dev/null; then
    echo "✅ Service is running"
else
    echo "❌ Service is not running"
fi

# Check recent activity (last 5 minutes)
recent_logs=$(tail -100 /var/log/nic-payment-notification.log | grep "$(date -d '5 minutes ago' +%Y-%m-%d\ %H:%M)" | wc -l)
echo "📊 Recent activity: $recent_logs log entries in last 5 minutes"

# Check for recent errors
recent_errors=$(tail -100 /var/log/nic-payment-notification.log | grep -i "❌\|error" | wc -l)
if [ $recent_errors -gt 0 ]; then
    echo "⚠️ Found $recent_errors recent errors"
else
    echo "✅ No recent errors"
fi

# Show last few log lines
echo ""
echo "📋 Last 5 log entries:"
tail -5 /var/log/nic-payment-notification.log
```

Save as `check-payment-service.sh` and run with:
```bash
chmod +x check-payment-service.sh
./check-payment-service.sh
```