# NIC Call Center - Backend Services Documentation

## 🎯 Overview

The NIC Call Center system includes two critical backend services that run continuously on the VPS server to automate payment notifications and reminder workflows. These services operate independently of the frontend application and ensure timely communication with customers.

---

## 📋 Backend Services

### **1. Reminder Service** (`backend-reminder-service.cjs`)
Automated payment and signature reminder system

### **2. Payment Notification Service** (`backend-payment-notification.cjs`)
Automated SMS and email notifications after successful payments

---

## 🔧 Service 1: Reminder Service

### **Purpose**
Automatically sends payment reminders and AOD (Acknowledgment of Debt) signature reminders to customers based on scheduled intervals.

### **Key Features**
- ✅ Payment reminders for overdue installments
- ✅ Signature reminders for pending AOD documents
- ✅ Business hours awareness (9 AM - 5 PM Mauritius time)
- ✅ Multi-channel communication (Email + SMS via Brevo)
- ✅ Configurable reminder intervals
- ✅ Automatic retry and error handling

### **Configuration**
```javascript
CHECK_INTERVAL: 30 minutes        // How often to check for reminders
BUSINESS_HOURS_START: 9 AM        // Start sending reminders
BUSINESS_HOURS_END: 5 PM          // Stop sending reminders
TIMEZONE: Indian/Mauritius        // Local timezone
LOG_FILE: /var/log/nic-reminder-service.log
```

### **Reminder Logic**

#### **Payment Reminders:**
- Checks for overdue installments every 30 minutes
- Sends reminders only during business hours
- Tracks reminder count to avoid spam
- Updates customer records after sending

#### **Signature Reminders:**
- Monitors AOD documents in "pending_signature" status
- Sends reminders every 7 days (max 4 reminders)
- Marks documents as "expired" after 30 days
- Includes QR code links for easy document access

### **Email Templates**
- Professional HTML templates with NIC branding
- Embedded QR codes for document access
- Payment details and balance information
- Clear call-to-action buttons

### **SMS Templates**
- Concise messages under 160 characters
- Mauritius phone number formatting (+230)
- Transaction references included
- Sender ID: "NIC Life"

### **systemd Service Configuration**
```ini
[Unit]
Description=NIC Reminder Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/nic-callcenter
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /var/www/nic-callcenter/backend-reminder-service.cjs
Restart=always
RestartSec=10
StandardOutput=append:/var/log/nic-reminder-service.log
StandardError=append:/var/log/nic-reminder-service.log

[Install]
WantedBy=multi-user.target
```

---

## 📧 Service 2: Payment Notification Service

### **Purpose**
Monitors the payment database for new successful payments and automatically sends confirmation notifications to customers via SMS and email.

### **Key Features**
- ✅ Real-time payment monitoring (checks every 1 minute)
- ✅ Automatic SMS notifications via Brevo
- ✅ Professional email confirmations
- ✅ Duplicate notification prevention
- ✅ Payment status tracking in database
- ✅ Detailed logging for audit trail

### **Configuration**
```javascript
CHECK_INTERVAL: 60 seconds        // How often to check for new payments
PAYMENT_WINDOW: 10 minutes        // Look back window for new payments
LOG_FILE: /var/log/nic-payment-notification.log
BREVO_API_KEY: [from .env]        // Brevo API credentials
XANO_BASE_URL: [from .env]        // Xano database URL
```

### **Workflow**

#### **Step 1: Payment Detection**
```
Every 60 seconds:
1. Query nic_cc_payment table
2. Filter for status = 'success' AND notification_sent = false
3. Process each new payment
```

#### **Step 2: Customer Lookup**
```
For each payment:
1. Get customer ID from payment record
2. Fetch customer details from nic_cc_customer table
3. Retrieve email and mobile number
```

#### **Step 3: Send Notifications**
```
Parallel execution:
1. Send SMS via Brevo API
   - Format phone number (+230)
   - Send payment confirmation
   - Track SMS delivery status

2. Send Email via Brevo API
   - Professional HTML template
   - Payment details included
   - Track email delivery status
```

#### **Step 4: Update Database**
```
Update payment record:
- notification_sent = true
- notification_sent_at = timestamp
- sms_sent = true/false
- email_sent = true/false
```

### **SMS Notification Format**
```
NIC Life Insurance
Payment Received: MUR 5,000
Policy: LIFE/001
New Balance: MUR 3,800
Thank you!
Ref: TXN123456
```

### **Email Notification**
- Professional HTML template with NIC branding
- Payment confirmation header
- Detailed payment information:
  - Amount paid
  - Policy number
  - Payment date
  - Transaction reference
  - Previous balance
  - New balance
- Success confirmation box
- Contact information footer

### **Phone Number Formatting**
```javascript
// Mauritius phone number handling
57123456    → +23057123456
5123456     → +2305123456
23057123456 → +23057123456
```

### **systemd Service Configuration**
```ini
[Unit]
Description=NIC Payment Notification Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/nic-callcenter
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /var/www/nic-callcenter/backend-payment-notification.cjs
Restart=always
RestartSec=10
StandardOutput=append:/var/log/nic-payment-notification.log
StandardError=append:/var/log/nic-payment-notification.log

[Install]
WantedBy=multi-user.target
```

---

## 🚀 Installation & Setup

### **Prerequisites**
```bash
# Ensure Node.js is installed
node --version  # Should be v18.x or higher

# Ensure log directory exists
sudo mkdir -p /var/log
sudo touch /var/log/nic-reminder-service.log
sudo touch /var/log/nic-payment-notification.log
sudo chown www-data:www-data /var/log/nic-*.log
sudo chmod 644 /var/log/nic-*.log
```

### **Step 1: Create systemd Service Files**

#### **Reminder Service:**
```bash
sudo nano /etc/systemd/system/nic-reminder.service
```
Paste the reminder service configuration (see above)

#### **Payment Notification Service:**
```bash
sudo nano /etc/systemd/system/nic-payment-notification.service
```
Paste the payment notification service configuration (see above)

### **Step 2: Enable and Start Services**
```bash
# Reload systemd to recognize new services
sudo systemctl daemon-reload

# Enable services (auto-start on boot)
sudo systemctl enable nic-reminder
sudo systemctl enable nic-payment-notification

# Start services
sudo systemctl start nic-reminder
sudo systemctl start nic-payment-notification

# Verify services are running
sudo systemctl status nic-reminder
sudo systemctl status nic-payment-notification
```

### **Step 3: Verify Services**
```bash
# Check processes
ps -ef | grep -E "(reminder|payment-notification)" | grep -v grep

# Expected output (2 processes):
# www-data  [PID]  1  ... backend-reminder-service.cjs
# www-data  [PID]  1  ... backend-payment-notification.cjs

# Check logs
tail -20 /var/log/nic-reminder-service.log
tail -20 /var/log/nic-payment-notification.log
```

---

## 📊 Service Management

### **Start Services**
```bash
sudo systemctl start nic-reminder
sudo systemctl start nic-payment-notification
```

### **Stop Services**
```bash
sudo systemctl stop nic-reminder
sudo systemctl stop nic-payment-notification
```

### **Restart Services**
```bash
sudo systemctl restart nic-reminder
sudo systemctl restart nic-payment-notification
```

### **Check Status**
```bash
sudo systemctl status nic-reminder
sudo systemctl status nic-payment-notification
```

### **View Logs**
```bash
# View last 50 lines
tail -50 /var/log/nic-reminder-service.log
tail -50 /var/log/nic-payment-notification.log

# Monitor in real-time
tail -f /var/log/nic-reminder-service.log
tail -f /var/log/nic-payment-notification.log

# View systemd journal
sudo journalctl -u nic-reminder -n 50
sudo journalctl -u nic-payment-notification -n 50

# Follow systemd journal
sudo journalctl -u nic-reminder -f
sudo journalctl -u nic-payment-notification -f
```

### **Enable/Disable Auto-Start**
```bash
# Enable auto-start on boot
sudo systemctl enable nic-reminder
sudo systemctl enable nic-payment-notification

# Disable auto-start
sudo systemctl disable nic-reminder
sudo systemctl disable nic-payment-notification
```

---

## 🔍 Monitoring & Troubleshooting

### **Health Check Commands**
```bash
# Quick health check
ps -ef | grep -E "(reminder|payment-notification)" | grep -v grep && echo "✅ Services running" || echo "❌ Services not running"

# Check service status
sudo systemctl is-active nic-reminder
sudo systemctl is-active nic-payment-notification

# Check if services are enabled
sudo systemctl is-enabled nic-reminder
sudo systemctl is-enabled nic-payment-notification
```

### **Log Analysis**
```bash
# Search for errors
grep -i error /var/log/nic-reminder-service.log
grep -i error /var/log/nic-payment-notification.log

# Check successful operations
grep "✅" /var/log/nic-payment-notification.log

# View today's logs
grep "$(date +%Y-%m-%d)" /var/log/nic-reminder-service.log

# Count reminder cycles
grep "Starting reminder cycle" /var/log/nic-reminder-service.log | wc -l

# Count payment notifications sent
grep "Payment.*notification complete" /var/log/nic-payment-notification.log | wc -l
```

### **Common Issues**

#### **Service Won't Start**
```bash
# Check for syntax errors
cd /var/www/nic-callcenter
node backend-reminder-service.cjs
# (Ctrl+C to stop if it starts)

# Check environment variables
grep -E "(BREVO|XANO)" /var/www/nic-callcenter/.env

# Check systemd service file
sudo systemd-analyze verify /etc/systemd/system/nic-reminder.service

# View detailed error logs
sudo journalctl -u nic-reminder -n 100 --no-pager
```

#### **Service Keeps Crashing**
```bash
# Check recent crashes
sudo journalctl -u nic-reminder --since "1 hour ago"

# Check system resources
htop
df -h
free -h

# Check for port conflicts
netstat -tulpn | grep node
```

#### **No Logs Being Written**
```bash
# Check log file permissions
ls -la /var/log/nic-*.log

# Fix permissions if needed
sudo chown www-data:www-data /var/log/nic-*.log
sudo chmod 644 /var/log/nic-*.log

# Restart services
sudo systemctl restart nic-reminder
sudo systemctl restart nic-payment-notification
```

#### **Notifications Not Sending**
```bash
# Check Brevo API key
grep VITE_BREVO_API_KEY /var/www/nic-callcenter/.env

# Test Brevo API manually
curl -X GET "https://api.brevo.com/v3/account" \
  -H "api-key: YOUR_API_KEY"

# Check for API errors in logs
grep -i "brevo\|sms\|email" /var/log/nic-payment-notification.log
```

---

## 🔄 After Code Updates

When you deploy new code that affects backend services:

```bash
# 1. Navigate to project directory
cd /var/www/nic-callcenter

# 2. Pull latest code
git pull origin main

# 3. Restart services
sudo systemctl restart nic-reminder
sudo systemctl restart nic-payment-notification

# 4. Verify services restarted
sudo systemctl status nic-reminder
sudo systemctl status nic-payment-notification

# 5. Check logs for any errors
tail -20 /var/log/nic-reminder-service.log
tail -20 /var/log/nic-payment-notification.log
```

---

## 📈 Performance Monitoring

### **Service Uptime**
```bash
# Check how long services have been running
ps -eo pid,etime,cmd | grep -E "(reminder|payment-notification)"

# Example output:
# 758264  5-12:34:56  /usr/bin/node backend-reminder-service.cjs
# (Running for 5 days, 12 hours, 34 minutes, 56 seconds)
```

### **Resource Usage**
```bash
# Check CPU and memory usage
ps aux | grep -E "(reminder|payment-notification)"

# Monitor in real-time
top -p $(pgrep -d',' -f 'backend-reminder-service|backend-payment-notification')
```

### **Log File Sizes**
```bash
# Check log file sizes
ls -lh /var/log/nic-*.log

# Rotate logs if too large (>100MB)
sudo logrotate -f /etc/logrotate.conf
```

---

## 🔒 Security Considerations

### **Service User**
- Services run as `www-data` user (non-root)
- Limited file system access
- No shell access

### **Environment Variables**
- API keys stored in `.env` file
- File permissions: 600 (owner read/write only)
- Never commit `.env` to Git

### **Log Files**
- Contain sensitive customer data
- Permissions: 644 (owner write, others read)
- Regular rotation recommended
- Secure deletion when no longer needed

### **Network Security**
- Services communicate over HTTPS only
- Brevo API uses API key authentication
- Xano API uses secure endpoints

---

## 📋 Maintenance Checklist

### **Daily**
- [ ] Check services are running
- [ ] Review error logs
- [ ] Verify notifications being sent

### **Weekly**
- [ ] Check log file sizes
- [ ] Review service uptime
- [ ] Check resource usage

### **Monthly**
- [ ] Rotate log files
- [ ] Review notification success rates
- [ ] Update dependencies if needed
- [ ] Test service restart procedures

---

## 🎯 Expected Log Output

### **Reminder Service (Healthy)**
```
2025-11-25T09:00:00.000Z [INFO] Starting reminder cycle...
2025-11-25T09:00:00.000Z [INFO] Processing payment reminders...
2025-11-25T09:00:01.000Z [INFO] Found 3 installments needing reminders
2025-11-25T09:00:02.000Z [INFO] ✅ Payment reminder sent to customer 123
2025-11-25T09:00:03.000Z [INFO] ✅ Payment reminder sent to customer 456
2025-11-25T09:00:04.000Z [INFO] ✅ Payment reminder sent to customer 789
2025-11-25T09:00:05.000Z [INFO] Processing signature reminders...
2025-11-25T09:00:06.000Z [INFO] Found 1 pending signatures
2025-11-25T09:00:07.000Z [INFO] ✅ Signature reminder sent to customer 321
2025-11-25T09:00:08.000Z [INFO] Reminder cycle completed successfully
```

### **Payment Notification Service (Healthy)**
```
2025-11-25T12:00:00.000Z [INFO] 🔍 Checking for new payments...
2025-11-25T12:00:01.000Z [INFO] 📋 Found 2 new payment(s) to notify
2025-11-25T12:00:02.000Z [INFO] 💳 Processing payment 123:
2025-11-25T12:00:02.000Z [INFO]    Customer: John Doe
2025-11-25T12:00:02.000Z [INFO]    Amount: MUR 5,000
2025-11-25T12:00:02.000Z [INFO]    Policy: LIFE/001
2025-11-25T12:00:03.000Z [INFO] Sending SMS to +23057123456 for payment 123
2025-11-25T12:00:04.000Z [INFO] ✅ SMS sent successfully. Message ID: abc123
2025-11-25T12:00:05.000Z [INFO] Sending email to john@example.com for payment 123
2025-11-25T12:00:06.000Z [INFO] ✅ Email sent successfully. Message ID: def456
2025-11-25T12:00:07.000Z [INFO] ✅ Payment 123 notification complete
2025-11-25T12:00:07.000Z [INFO]    SMS: ✅ Sent
2025-11-25T12:00:07.000Z [INFO]    Email: ✅ Sent
2025-11-25T12:00:08.000Z [INFO] ✅ Payment notification cycle completed
```

---

## 🆘 Emergency Procedures

### **Service Recovery**
```bash
# Stop all services
sudo systemctl stop nic-reminder nic-payment-notification

# Check system resources
df -h
free -h

# Clear old logs if needed
sudo truncate -s 0 /var/log/nic-reminder-service.log
sudo truncate -s 0 /var/log/nic-payment-notification.log

# Start services
sudo systemctl start nic-reminder nic-payment-notification

# Verify
sudo systemctl status nic-reminder nic-payment-notification
```

### **Rollback Services**
```bash
# If new code causes issues
cd /var/www/nic-callcenter
git log --oneline -5
git checkout <previous-commit-hash>

# Restart services
sudo systemctl restart nic-reminder nic-payment-notification
```

---

## 📞 Support Information

### **Service Files Location**
- Reminder Service: `/var/www/nic-callcenter/backend-reminder-service.cjs`
- Payment Notification: `/var/www/nic-callcenter/backend-payment-notification.cjs`
- systemd Configs: `/etc/systemd/system/nic-*.service`
- Log Files: `/var/log/nic-*.log`

### **Environment Configuration**
- `.env` file: `/var/www/nic-callcenter/.env`
- Required variables:
  - `VITE_BREVO_API_KEY`
  - `VITE_XANO_BASE_URL`
  - `VITE_XANO_CUSTOMER_API`
  - `VITE_XANO_PAYMENT_API`
  - `VITE_SENDER_EMAIL`
  - `VITE_SENDER_NAME`

---

**Document Version**: 1.0  
**Last Updated**: November 25, 2025  
**Status**: Production Services Running  
**Maintained By**: Development Team
