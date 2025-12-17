# Railway.com Webhook Integration with Xano Database - Analysis

## Executive Summary

Based on the Railway.com logs provided, the **webhook integration is already implemented and working successfully**. The webhook service is hosted on Railway.com at `callback-production-25f6.up.railway.app` and processes ZwennPay payment confirmations, updating Xano database and sending customer notifications in real-time.

## Current Payment Processing Architecture

### **1. Payment Flow Overview**
```
Customer Payment → ZwennPay → Railway.com Webhook → Xano Database → Email Notification
```

### **2. Railway.com Webhook Details**
- **URL**: `https://callback-production-25f6.up.railway.app`
- **Endpoint**: `POST /api/payment/v1/response-callback`
- **Status**: ✅ **ACTIVE AND WORKING**
- **Function**: Receives ZwennPay payment confirmations and processes them automatically

### **3. Existing Components**

#### **A. ZwennPay Integration**
- **Location**: `src/services/qrService.js`
- **API Endpoint**: `https://api.zwennpay.com:9425/api/v1.0/Common/GetMerchantQR`
- **Merchant IDs**: 
  - Life Insurance: 151
  - Health Insurance: 153  
  - Motor Insurance: 155

#### **B. Payment Database Tables**
1. **`nic_cc_payment`** - Payment transactions
2. **`nic_cc_payment_plan`** - AOD payment plans
3. **`nic_cc_installment`** - Individual installments

#### **C. Payment Notification Service**
- **Location**: `backend-payment-notification.cjs`
- **Function**: Monitors `nic_cc_payment` table for new payments
- **Actions**: Sends SMS + Email notifications automatically
- **Status**: ✅ Currently running on VPS (PID 838458)

## Railway.com Webhook Implementation Analysis

### **✅ What's Working (Based on Logs):**
1. **Railway.com webhook endpoint** - `POST /api/payment/v1/response-callback`
2. **Real-time payment processing** - Webhook receives ZwennPay confirmations instantly
3. **Automatic database updates** - Customer balance updated in Xano
4. **Payment logging** - Transactions recorded in `nic_cc_payment` table
5. **Email notifications** - Confirmation emails sent to customers

### **Webhook Payload Structure (From Logs):**
```json
{
  "paymentStatusCode": "ACSP",
  "endToEndReference": "CMCLMUMU20251213261963", 
  "amount": "2.50",
  "transactionReference": 44678,
  "billNumber": "00921.0003249",
  "mobileNumber": "55022865",
  "customerLabel": "R Ratovonjanahary",
  "referenceLabel": "ZPMQR0000153627",
  "storeLabel": "",
  "loyaltyNumber": "",
  "terminalLabel": "",
  "purposeOfTransaction": "NIC Life"
}
```

## Webhook Implementation Requirements

### **1. Railway.com Webhook Endpoint**
```javascript
// Proposed webhook endpoint structure
POST /api/webhook/railway-payment
Content-Type: application/json

{
  "event": "payment.completed",
  "payment_id": "railway_payment_123",
  "merchant_reference": "LIFE-001-INST-1", 
  "amount": 5000.00,
  "currency": "MUR",
  "status": "success",
  "timestamp": "2025-01-15T10:30:00Z",
  "customer_info": {
    "policy_number": "LIFE-001",
    "installment_id": "123"
  }
}
```

### **2. Required Webhook Handler**
```javascript
// Proposed webhook handler (not implemented)
async function handleRailwayWebhook(webhookData) {
  try {
    // 1. Verify webhook signature
    // 2. Extract payment information
    // 3. Update Xano database
    // 4. Trigger notifications
    // 5. Update installment status
  } catch (error) {
    // Error handling and logging
  }
}
```

### **3. Database Integration Points**

#### **Payment Record Creation:**
```javascript
// Update nic_cc_payment table
const paymentData = {
  customer: customerId,
  policy_number: webhookData.customer_info.policy_number,
  amount: webhookData.amount,
  payment_date: webhookData.timestamp,
  transaction_reference: webhookData.payment_id,
  status: 'success',
  payment_method: 'railway_webhook',
  old_balance: previousBalance,
  new_balance: newBalance,
  notification_sent: false
}
```

#### **Installment Status Update:**
```javascript
// Update nic_cc_installment table
const installmentUpdate = {
  payment_status: 'paid',
  payment_date: webhookData.timestamp,
  payment_reference: webhookData.payment_id
}
```

## Current ZwennPay Integration Analysis

### **QR Code Generation Process:**
1. **Customer selects payment** → System generates QR code via ZwennPay API
2. **QR code contains**: Merchant ID + Policy Number + Amount
3. **Customer scans QR** → Redirected to ZwennPay payment page
4. **Payment completion** → **[MISSING WEBHOOK HANDLER]**

### **ZwennPay API Calls:**
```javascript
// Current QR generation (working)
const payload = {
  MerchantId: merchantId,
  CustomerName: formattedCustomerName,
  TransactionAmount: customerData.amountDue,
  TransactionCurrency: 'MUR',
  MerchantTransactionId: sanitizedPolicyNumber
}

// Response includes QR data and payment URL
const response = await fetch(zwennPayApiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
```

### **Payment Status Checking:**
```javascript
// Currently not implemented - placeholder code
async getPaymentStatus(transactionId) {
  // This would be the actual ZwennPay status endpoint
  // const response = await fetch(`https://api.zwennpay.com:9425/api/v1.0/Transaction/Status/${transactionId}`)
  
  return {
    status: 'pending', // Placeholder
    message: 'Payment status check not implemented yet'
  }
}
```

## Notification Service Analysis

### **Current Notification Flow:**
```
Payment Entry → nic_cc_payment table → Backend Service → SMS/Email
```

### **Backend Payment Notification Service:**
- **File**: `backend-payment-notification.cjs`
- **Status**: ✅ Running (PID 838458)
- **Function**: Polls `nic_cc_payment` table every 60 seconds
- **Actions**: 
  - Finds payments with `status: 'success'` and `notification_sent: false`
  - Sends SMS via Brevo API
  - Sends Email confirmation
  - Updates `notification_sent: true`

### **Notification Triggers:**
```javascript
// Current polling-based approach
const newPayments = allPayments.filter(payment => 
  payment.status === 'success' &&
  payment.notification_sent === false
)
```

## Railway.com Webhook Implementation Plan

### **Phase 1: Webhook Endpoint Creation**
1. **Create webhook receiver service**
2. **Deploy to VPS alongside existing services**
3. **Configure Railway.com webhook URL**
4. **Implement signature verification**

### **Phase 2: Database Integration**
1. **Map Railway.com payment data to Xano schema**
2. **Update `nic_cc_payment` table automatically**
3. **Update `nic_cc_installment` status**
4. **Handle duplicate payment prevention**

### **Phase 3: Notification Integration**
1. **Webhook triggers immediate notifications** (vs current 60-second polling)
2. **Real-time SMS/Email sending**
3. **Enhanced logging and monitoring**

### **Phase 4: Error Handling & Recovery**
1. **Webhook retry mechanism**
2. **Failed payment handling**
3. **Manual reconciliation tools**

## Technical Requirements

### **1. Webhook Service Architecture**
```javascript
// Proposed service structure
class RailwayWebhookService {
  async handlePaymentWebhook(req, res) {
    // 1. Verify signature
    // 2. Parse webhook data  
    // 3. Update database
    // 4. Trigger notifications
    // 5. Return success response
  }
  
  async verifyWebhookSignature(payload, signature) {
    // Railway.com signature verification
  }
  
  async updatePaymentRecord(webhookData) {
    // Update Xano database
  }
}
```

### **2. Environment Configuration**
```bash
# Additional environment variables needed
RAILWAY_WEBHOOK_SECRET=your-webhook-secret
RAILWAY_WEBHOOK_URL=https://yourdomain.com/api/webhook/railway
RAILWAY_API_KEY=your-railway-api-key
```

### **3. VPS Deployment**
```bash
# New service file needed
/var/www/nic-callcenter/railway-webhook-service.cjs

# Systemd service configuration
/etc/systemd/system/nic-railway-webhook.service

# Nginx configuration for webhook endpoint
location /api/webhook/railway {
  proxy_pass http://localhost:3001;
}
```

## Integration with Existing Services

### **1. Payment Notification Service Enhancement**
- **Current**: Polls database every 60 seconds
- **Enhanced**: Immediate notification on webhook receipt
- **Benefit**: Real-time customer notifications

### **2. Reminder Service Integration**
- **Current**: Sends reminders based on due dates
- **Enhanced**: Automatically stops reminders when payment received
- **Benefit**: No duplicate reminders after payment

### **3. Customer Dashboard Updates**
- **Current**: Shows payment status from database
- **Enhanced**: Real-time payment status updates
- **Benefit**: Immediate UI updates

## Security Considerations

### **1. Webhook Security**
- **Signature Verification**: Validate Railway.com webhook signatures
- **IP Whitelisting**: Restrict webhook endpoint to Railway.com IPs
- **Rate Limiting**: Prevent webhook abuse
- **HTTPS Only**: Secure webhook transmission

### **2. Data Validation**
- **Payment Amount Validation**: Verify amounts match expected values
- **Policy Number Validation**: Ensure policy exists in system
- **Duplicate Prevention**: Handle duplicate webhook deliveries

### **3. Error Handling**
- **Webhook Retry Logic**: Handle temporary failures gracefully
- **Dead Letter Queue**: Store failed webhook processing attempts
- **Manual Reconciliation**: Tools for handling edge cases

## Current Status & Next Steps

### **✅ What's Working:**
1. ZwennPay QR code generation
2. Payment notification service (polling-based)
3. Database schema for payments
4. SMS/Email notification infrastructure

### **❌ What's Missing:**
1. Railway.com webhook endpoint
2. Real-time payment processing
3. Webhook signature verification
4. Automatic database updates from webhooks

### **🔄 Immediate Actions Needed:**
1. **Clarify Railway.com Integration**: Confirm if Railway.com is the payment processor or if it's ZwennPay
2. **Get Webhook Documentation**: Obtain Railway.com webhook specification
3. **Design Webhook Handler**: Create webhook processing service
4. **Test Integration**: Set up webhook testing environment

## Questions for Clarification

1. **Is Railway.com the payment processor** or is it ZwennPay? The code shows ZwennPay integration but you mentioned Railway.com webhooks.

2. **What is Railway.com's role** in the payment flow? Is it:
   - A payment gateway that processes ZwennPay payments?
   - A separate payment processor?
   - A webhook relay service?

3. **Do you have Railway.com webhook documentation** including:
   - Webhook payload format
   - Signature verification method
   - Webhook endpoint requirements

4. **What triggers the webhook**? Is it:
   - Successful payment completion
   - Payment status changes
   - Both success and failure events

5. **Current payment entry method**: How are payments currently being added to the `nic_cc_payment` table?
   - Manual entry by agents?
   - Batch import?
   - Another automated process?

---

**Analysis Date**: December 13, 2025  
**Status**: 🔍 Analysis Complete - Awaiting Clarification on Railway.com Integration  
**Next Steps**: Clarify Railway.com role and obtain webhook documentation