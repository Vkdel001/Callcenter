# Railway Webhook Deployment Checklist

## Pre-Deployment Checklist

### ✅ Files Ready
- [ ] `webhookcode-enhanced.js` - Enhanced webhook with QR support
- [ ] `package.json` - Dependencies configured
- [ ] `verify-railway-env.cjs` - Environment verification script

### ✅ Environment Variables to Set on Railway
- [ ] `XANO_BASE_URL` = `https://xbde-ekcn-8kg2.n7e.xano.io`
- [ ] `XANO_CUSTOMER_API_KEY` = `Q4jDYUWL`
- [ ] `XANO_PAYMENT_API_KEY` = `05i62DIx`
- [ ] `XANO_QR_TRANSACTIONS_API_KEY` = `6MaKDJBx`

## Deployment Steps

### 1. Set Environment Variables on Railway
```bash
# Method 1: Railway CLI
railway variables set XANO_BASE_URL=https://xbde-ekcn-8kg2.n7e.xano.io
railway variables set XANO_CUSTOMER_API_KEY=Q4jDYUWL
railway variables set XANO_PAYMENT_API_KEY=05i62DIx
railway variables set XANO_QR_TRANSACTIONS_API_KEY=6MaKDJBx

# Method 2: Railway Dashboard
# Go to Variables tab and add each variable manually
```

### 2. Deploy Webhook
```bash
railway up
```

### 3. Verify Deployment
- [ ] Check Railway logs for startup messages
- [ ] Test health endpoint: `https://your-service.railway.app/health`
- [ ] Run environment verification: `node verify-railway-env.cjs`

## Post-Deployment Testing

### ✅ Health Check
```bash
curl https://your-service.railway.app/health
```
Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-12-17T..."
}
```

### ✅ Environment Variables Check
Look for these logs on Railway:
```
🔧 Configuration:
   XANO_BASE_URL: https://xbde-ekcn-8kg2.n7e.xano.io
   QR_TRANSACTIONS_API: 6MaKDJBx
```

### ✅ Webhook Endpoint
Your webhook URL will be:
```
https://your-service.railway.app/api/payment/v1/response-callback
```

## Expected Features After Deployment

### ✅ Payment Processing
- [x] Regular payments (customer balance updates)
- [x] Customer Detail QR payments (customer balance updates)
- [x] Quick QR payments (fallback logic for policies not in nic_cc_customer)
- [x] Multi-month policy handling (Latest Month Priority)

### ✅ QR Transaction Integration
- [x] QR transaction status updates (pending → paid)
- [x] QR transaction data logging
- [x] Agent attribution tracking

### ✅ Email Notifications
- [x] Payment logging triggers email service
- [x] Customer payment confirmations
- [x] Agent payment notifications
- [x] Works for both regular and Quick QR payments

## Troubleshooting

### Issue: "Missing API Key" in logs
**Solution**: Verify `VITE_XANO_QR_TRANSACTIONS_API` is set on Railway

### Issue: "Customer not found" for all payments
**Solution**: Check `VITE_XANO_CUSTOMER_API` and `VITE_XANO_BASE_URL`

### Issue: No email notifications
**Solution**: Ensure payment notification service is running and monitoring nic_cc_payment table

## Success Indicators

### ✅ Webhook Logs Should Show:
```
✅ Payment successful, processing...
✅ Found QR transaction: ID=X, Type=quick_qr, Agent=...
✅ QR transaction X marked as paid
✅ Quick QR payment logged successfully
📧 Email notifications will be handled by payment notification service
```

### ✅ Payment Notification Service Should:
- Detect new payments in nic_cc_payment table
- Send emails to customers and agents
- Log successful email deliveries

## Final Verification

Run a test payment and verify:
- [ ] Payment callback received
- [ ] Customer balance updated (if customer exists)
- [ ] QR transaction status updated (if QR payment)
- [ ] Payment logged in nic_cc_payment table
- [ ] Email notifications sent by payment service

**Deployment Complete! 🚀**