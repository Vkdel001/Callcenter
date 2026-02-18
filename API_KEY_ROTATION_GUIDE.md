# API Key Rotation and Backend Service Management Guide

## Overview
This guide covers the complete process for rotating API keys (especially Brevo API keys) and properly restarting backend services on the VPS to ensure all services use the updated credentials.

---

## When to Rotate API Keys

- **Security breach**: API key exposed in public repository or logs
- **Scheduled rotation**: Regular security practice (every 90 days recommended)
- **Suspicious activity**: Unusual API usage patterns detected
- **Team member departure**: When someone with key access leaves

---

## Part 1: Generate New API Key

### Brevo API Key Generation

1. Log in to Brevo dashboard: https://app.brevo.com
2. Navigate to **Settings** → **SMTP & API** → **API Keys**
3. Click **Generate a new API key**
4. Give it a descriptive name (e.g., "NIC CallCenter Production - Jan 2026")
5. Copy the new API key immediately (it won't be shown again)
6. **DO NOT delete the old key yet** - keep it active until new one is verified

---

## Part 2: Update Environment Variables

### 2.1 Update VPS Production Environment

SSH into your VPS and update the `.env.production` file:

```bash
# Connect to VPS
ssh root@your-vps-ip

# Navigate to project directory
cd /var/www/nic-callcenter

# Edit the environment file
nano .env.production
```

Update the following variables:
```env
VITE_BREVO_API_KEY=your-new-api-key-here
VITE_BREVO_SENDER_EMAIL=noreply@nic.mu
VITE_BREVO_SENDER_NAME=NIC Life Insurance
```

Save and exit (Ctrl+X, then Y, then Enter)

### 2.2 Verify the Update

```bash
# Check that the new key is in place (shows last 10 characters)
grep VITE_BREVO_API_KEY .env.production | tail -c 15
```

---

## Part 3: Identify Running Backend Services

### 3.1 List All Backend Services

```bash
ps -ef | grep "\.cjs" | grep -v grep
```

### 3.2 Services That Use Brevo API Key

The following services need to be restarted after API key rotation:

1. **backend-reminder-service.cjs** - Sends payment reminder emails
2. **backend-payment-notification.cjs** - Sends payment confirmation emails
3. **aod-upload-service.cjs** - Sends AOD document emails
4. **backend-device-service.cjs** - May send device-related notifications

---

## Part 4: Restart Backend Services (Proper Method)

### 4.1 Stop All Services First

```bash
# Find all running .cjs processes
ps -ef | grep "\.cjs" | grep -v grep

# Kill each service by PID (replace PID with actual process ID)
sudo kill <PID1> <PID2> <PID3> <PID4>

# Verify all stopped
ps -ef | grep "\.cjs" | grep -v grep
```

### 4.2 Start Services with New Environment

Start each service individually to ensure clean startup:

```bash
# Navigate to project directory
cd /var/www/nic-callcenter

# Start reminder service
sudo -u www-data nohup node backend-reminder-service.cjs > /dev/null 2>&1 &

# Wait 2 seconds
sleep 2

# Start payment notification service
sudo -u www-data nohup node backend-payment-notification.cjs > /dev/null 2>&1 &

# Wait 2 seconds
sleep 2

# Start AOD upload service
sudo -u www-data nohup node aod-upload-service.cjs > /dev/null 2>&1 &

# Wait 2 seconds
sleep 2

# Start device service
sudo -u www-data nohup node backend-device-service.cjs > /dev/null 2>&1 &
```

### 4.3 Verify Clean Startup

```bash
# Check all services are running
ps -ef | grep "\.cjs" | grep -v grep
```

**Expected output** (4 clean processes):
```
www-data <PID1>  1  0 <TIME> ?  00:00:00 /usr/bin/node /var/www/nic-callcenter/backend-reminder-service.cjs
www-data <PID2>  1  0 <TIME> ?  00:00:00 /usr/bin/node /var/www/nic-callcenter/backend-payment-notification.cjs
www-data <PID3>  1  0 <TIME> ?  00:00:00 /usr/bin/node /var/www/nic-callcenter/aod-upload-service.cjs
www-data <PID4>  1  0 <TIME> ?  00:00:00 /usr/bin/node /var/www/nic-callcenter/backend-device-service.cjs
```

**Key indicators of healthy processes:**
- User is `www-data` (not `root`)
- Parent PID is `1` (systemd managed)
- No duplicate processes
- No `sudo` wrapper processes

---

## Part 5: Handle Duplicate Processes

### 5.1 Identify Duplicates

If you see multiple processes for the same service:

```bash
ps -ef | grep "backend-payment-notification.cjs" | grep -v grep
```

Example of duplicates:
```
www-data 1848212  1  0 14:00 ?  00:00:00 /usr/bin/node backend-payment-notification.cjs  ← KEEP
root     1848253  ... sudo -u www-data nohup node backend-payment-notification.cjs  ← KILL
root     1848254  ... sudo -u www-data nohup node backend-payment-notification.cjs  ← KILL
www-data 1848255  ... node backend-payment-notification.cjs  ← KILL
```

### 5.2 Kill Duplicate Processes

```bash
# Kill all duplicate PIDs (replace with actual PIDs)
sudo kill 1848253 1848254 1848255

# Verify cleanup
ps -ef | grep "backend-payment-notification.cjs" | grep -v grep
```

### 5.3 Kill All Duplicates at Once

If multiple services have duplicates:

```bash
# List all PIDs to kill
ps -ef | grep "\.cjs" | grep -v grep

# Kill specific duplicate PIDs
sudo kill <PID1> <PID2> <PID3> <PID4> <PID5> <PID6>

# Verify only 4 clean processes remain
ps -ef | grep "\.cjs" | grep -v grep
```

---

## Part 6: Test Email Functionality

### 6.1 Monitor Logs

Open log files in separate terminal windows:

```bash
# Terminal 1: Payment notification logs
tail -f /var/log/payment-notification.log

# Terminal 2: Reminder service logs
tail -f /var/log/nic-reminder-service.log

# Terminal 3: AOD service logs
tail -f /var/log/aod-upload.log
```

### 6.2 Test Payment Confirmation Email

1. Log in to the application
2. Navigate to **Customer Detail** page
3. Record a test payment (small amount like MUR 1)
4. Check logs for email sending confirmation
5. Verify email received in customer inbox
6. Check Brevo dashboard for sent email

### 6.3 Test OTP Email

1. Log out of the application
2. Try to log in with a test account
3. Check that OTP email is received
4. Verify in Brevo dashboard

### 6.4 Test Reminder Email

1. Navigate to **Installment Reminder** page
2. Generate a reminder for a test customer
3. Check logs for email sending
4. Verify email received

---

## Part 7: Update Frontend Application

### 7.1 Rebuild Frontend with New API Key

On your local development machine:

```bash
# Pull latest .env.production from VPS (if needed)
# Or update local .env.production with new key

# Build production bundle
npm run build

# The build will use VITE_BREVO_API_KEY from .env.production
```

### 7.2 Deploy to Netlify

```bash
# If using Netlify CLI
netlify deploy --prod

# Or push to GitHub (if auto-deploy is configured)
git add .
git commit -m "Update Brevo API key"
git push origin main
```

### 7.3 Update Netlify Environment Variables

1. Log in to Netlify dashboard
2. Go to **Site settings** → **Environment variables**
3. Update `VITE_BREVO_API_KEY` with new value
4. Trigger a new deployment

---

## Part 8: Revoke Old API Key

**ONLY after confirming new key works:**

1. Log in to Brevo dashboard
2. Navigate to **Settings** → **SMTP & API** → **API Keys**
3. Find the old API key
4. Click **Delete** or **Revoke**
5. Confirm deletion

---

## Part 9: Troubleshooting

### Issue: Services Won't Start

**Symptoms:**
- Process starts but immediately dies
- No PID shown in `ps` output

**Solution:**
```bash
# Check for syntax errors
node backend-reminder-service.cjs

# Check file permissions
ls -la backend-*.cjs

# Ensure www-data can read files
sudo chown www-data:www-data backend-*.cjs
```

### Issue: Emails Not Sending

**Symptoms:**
- Services running but no emails received
- Logs show API errors

**Solution:**
```bash
# Verify environment variables loaded
node -e "require('dotenv').config({path:'.env.production'}); console.log(process.env.VITE_BREVO_API_KEY?.slice(-10))"

# Check Brevo API key is valid
curl -X GET "https://api.brevo.com/v3/account" \
  -H "api-key: your-new-api-key"

# Check service logs for errors
tail -100 /var/log/payment-notification.log
```

### Issue: Duplicate Processes Keep Appearing

**Symptoms:**
- Kill processes but they reappear
- Multiple processes with same name

**Solution:**
```bash
# Check for systemd services
systemctl list-units | grep nic

# Check for cron jobs
crontab -l
sudo crontab -l

# Check for PM2 processes
pm2 list

# Kill all and restart cleanly
sudo killall node
# Then restart services one by one
```

### Issue: Wrong User Running Service

**Symptoms:**
- Services running as `root` instead of `www-data`

**Solution:**
```bash
# Kill the root process
sudo kill <PID>

# Restart with correct user
sudo -u www-data nohup node backend-reminder-service.cjs > /dev/null 2>&1 &
```

---

## Part 10: Quick Reference Commands

### Check Service Status
```bash
ps -ef | grep "\.cjs" | grep -v grep
```

### Stop All Services
```bash
sudo killall -9 node
```

### Start All Services (Clean)
```bash
cd /var/www/nic-callcenter
sudo -u www-data nohup node backend-reminder-service.cjs > /dev/null 2>&1 &
sleep 2
sudo -u www-data nohup node backend-payment-notification.cjs > /dev/null 2>&1 &
sleep 2
sudo -u www-data nohup node aod-upload-service.cjs > /dev/null 2>&1 &
sleep 2
sudo -u www-data nohup node backend-device-service.cjs > /dev/null 2>&1 &
```

### View Logs
```bash
tail -f /var/log/payment-notification.log
tail -f /var/log/nic-reminder-service.log
tail -f /var/log/aod-upload.log
```

### Check Brevo API Key (Last 10 chars)
```bash
grep VITE_BREVO_API_KEY .env.production | tail -c 15
```

---

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate keys regularly** (every 90 days)
4. **Monitor API usage** in Brevo dashboard for anomalies
5. **Use descriptive key names** to track which key is used where
6. **Keep old key active** until new one is verified working
7. **Document rotation dates** for audit trail
8. **Limit key permissions** to only what's needed
9. **Use separate keys** for development and production
10. **Set up alerts** for unusual API activity

---

## Checklist for API Key Rotation

- [ ] Generate new API key in Brevo dashboard
- [ ] Update `.env.production` on VPS
- [ ] Stop all backend services
- [ ] Start services with new environment
- [ ] Verify 4 clean processes running
- [ ] Kill any duplicate processes
- [ ] Test payment confirmation email
- [ ] Test OTP email
- [ ] Test reminder email
- [ ] Check Brevo dashboard for sent emails
- [ ] Rebuild frontend application
- [ ] Deploy frontend to Netlify
- [ ] Update Netlify environment variables
- [ ] Verify frontend emails working
- [ ] Revoke old API key in Brevo
- [ ] Document rotation date and new key name
- [ ] Update team documentation

---

## Related Documentation

- `BACKEND_SERVICES.md` - Overview of all backend services
- `BACKEND_SERVICE_TROUBLESHOOTING.md` - Detailed troubleshooting guide
- `VPS_BACKEND_SERVICE_DEPLOYMENT_GUIDE.md` - Initial deployment guide
- `PAYMENT_NOTIFICATION_SERVICE_LOGS_GUIDE.md` - Log monitoring guide
- `OTP_EMAIL_BLOCKING_DIAGNOSIS_COMPLETE.md` - Email delivery troubleshooting

---

## Support

If you encounter issues not covered in this guide:

1. Check service logs for specific error messages
2. Verify Brevo API key is valid using their API
3. Check Brevo dashboard for email delivery status
4. Review process list for duplicate or zombie processes
5. Ensure file permissions are correct (www-data ownership)

---

**Last Updated:** January 20, 2026
**Version:** 1.0
