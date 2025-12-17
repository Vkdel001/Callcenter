# Payment Notification Service Fix - Deployment Guide

## What Was Fixed
The payment notification service now handles **Quick QR payments** where the customer exists only in `nic_qr_transactions` but not in `nic_cc_customer`.

### Before (Broken):
```javascript
// Always tried to fetch from nic_cc_customer
const customerResponse = await customerApi.get(`/nic_cc_customer/${payment.customer}`)
// Failed when payment.customer was null (Quick QR payments)
```

### After (Fixed):
```javascript
if (payment.customer) {
  // Regular payment - fetch from nic_cc_customer
  const customerResponse = await customerApi.get(`/nic_cc_customer/${payment.customer}`)
  customer = customerResponse.data
} else {
  // Quick QR payment - use data from payment record
  customer = {
    name: payment.customer_name,
    email: payment.customer_email
  }
}
```

## Files Changed
- ✅ `backend-payment-notification.cjs` - Updated customer lookup logic

## Deployment Steps

### 1. Backup Current Service
```bash
# Create backup of current service
cp backend-payment-notification.cjs backend-payment-notification.cjs.backup
```

### 2. Deploy Updated Service
```bash
# Copy the updated file to your server
# (Replace with your actual deployment method)
scp backend-payment-notification.cjs user@server:/path/to/service/
```

### 3. Restart Payment Notification Service

#### If using systemd:
```bash
sudo systemctl restart nic-payment-notification
sudo systemctl status nic-payment-notification
```

#### If using PM2:
```bash
pm2 restart nic-payment-notification
pm2 status nic-payment-notification
```

#### If running manually:
```bash
# Stop current process
pkill -f "backend-payment-notification"

# Start new process
nohup node backend-payment-notification.cjs > /dev/null 2>&1 &
```

### 4. Verify Deployment

#### Check Service Status:
```bash
# Verify service is running
ps aux | grep "backend-payment-notification"
```

#### Monitor Logs:
```bash
# Watch logs in real-time
tail -f /var/log/nic-payment-notification.log
```

#### Expected Startup Logs:
```
🚀 NIC Payment Notification Service started
📧 Email configuration validated
🔄 Starting payment monitoring (check every 60 seconds)
```

## Testing the Fix

### 1. Check Failed Payment (ID 50)
The service should now process payment ID 50 successfully:
```bash
# Look for payment 50 in logs
grep "payment 50" /var/log/nic-payment-notification.log
```

### Expected Success Logs:
```
💳 Processing payment 50:
   Customer: vikas khanna
   Amount: MUR 1.62
   Policy: 22228888
   Using customer data from payment record (Quick QR payment)
   Customer: vikas khanna (vikas.khanna@zwennpay.com)
📧 Sending email to vikas.khanna@zwennpay.com for payment 50
✅ Email sent successfully. Message ID: abc123
```

### 2. Test New Quick QR Payment
Make a new Quick QR payment and verify:
1. Webhook logs payment successfully
2. Payment notification service processes it
3. Email is sent to customer and agent

## Rollback Plan (If Needed)

If there are any issues:
```bash
# Stop current service
sudo systemctl stop nic-payment-notification  # or pm2 stop

# Restore backup
cp backend-payment-notification.cjs.backup backend-payment-notification.cjs

# Restart with old version
sudo systemctl start nic-payment-notification  # or pm2 start
```

## Monitoring After Deployment

### 1. Watch for Errors:
```bash
tail -f /var/log/nic-payment-notification.log | grep -i "error\|failed\|❌"
```

### 2. Monitor Email Success:
```bash
tail -f /var/log/nic-payment-notification.log | grep -i "✅.*email"
```

### 3. Check Payment Processing:
```bash
tail -f /var/log/nic-payment-notification.log | grep "💳 Processing payment"
```

## Expected Behavior After Fix

### ✅ Regular Payments (Customer in nic_cc_customer):
- Fetch customer details from nic_cc_customer table
- Send email notifications as before
- No change in behavior

### ✅ Quick QR Payments (Customer only in nic_qr_transactions):
- Use customer data from payment record
- Send email notifications successfully
- No more "Request failed with status code 400" errors

### ✅ Both Payment Types:
- Customer payment confirmations sent
- Agent payment notifications sent (if agent_email available)
- SMS notifications sent (if phone number available)

## Success Indicators

After deployment, you should see:
- ✅ No more HTTP 400 errors in logs
- ✅ Payment ID 50 processes successfully on next cycle
- ✅ Quick QR payments receive email notifications
- ✅ Regular payments continue working as before

## Support

If you encounter issues:
1. Check service logs: `/var/log/nic-payment-notification.log`
2. Verify service is running: `ps aux | grep backend-payment-notification`
3. Check environment variables are loaded correctly
4. Use rollback plan if needed

**The fix is minimal and low-risk - it only adds a condition check without changing existing functionality.**