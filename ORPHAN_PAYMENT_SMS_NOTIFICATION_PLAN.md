# Orphan Payment SMS Notification - Implementation Plan

**Date:** January 23, 2026  
**Status:** Planning Phase  
**Priority:** Medium  
**SMS Service:** ✅ Already Implemented in `backend-payment-notification.cjs`

---

## Problem Statement

When the payment webhook receives a successful payment callback, but the policy number is not found in either:
- `nic_qr_transactions` table (no QR transaction)
- `nic_cc_customer` table (no customer record)

The payment is currently logged as failed with error "Customer not found", leaving the customer without confirmation.

### Example from Production Logs:
```
Policy: MED/2024/230/2/557/1
Amount: MUR 27,256.00
Customer: T Teeluck
Mobile: 57538294
Transaction Ref: 85018

Result: ❌ No customer found - Payment processing failed
```

---

## Proposed Solution: SMS Notification for Orphan Payments

Send an immediate SMS confirmation to the customer using Brevo SMS service when payment cannot be matched to existing records.

---

## Solution Architecture

### Simple SMS Notification Strategy

#### 1. **Orphan Payments** (No QR Transaction, No Customer Record)
- ✅ Send SMS confirmation to customer (immediate)
- ✅ Log to new `nic_orphan_payments` table (audit trail)
- ❌ No customer email (we don't have it)

#### 2. **Quick QR Payments** (Has QR Transaction, No Customer Record)
- ✅ Send SMS confirmation to customer (immediate)
- ✅ Send email to customer (from QR transaction data)
- ✅ Send email to agent (from QR transaction data)
- ✅ Log payment normally

#### 3. **Regular Payments** (Has Customer Record)
- ✅ Update customer balance
- ✅ Send email notifications (existing flow)
- ✅ Log payment normally

---

## SMS Message Options

### Option 1: Short & Simple (1 SMS - 97 characters)
```
NIC Life: Payment of MUR 27,256.00 received for Policy MED/2024/230/2/557/1. Ref: 85018. Thank you.
```

**Pros:**
- Fits in 1 SMS (cost-effective)
- Clear and concise
- Includes all essential info

**Cons:**
- Less friendly tone
- No contact information

---

### Option 2: Detailed (2 SMS - 189 characters)
```
Dear Customer, we have received your payment of MUR 27,256.00 toward Policy MED/2024/230/2/557/1. Transaction Ref: 85018. For queries, contact us at info@nic.mu. Thank you - NIC Life
```

**Pros:**
- Professional and friendly
- Includes contact information
- More reassuring

**Cons:**
- Costs 2 SMS (~€0.08 vs €0.04)
- Longer message

---

### Option 3: With Action Item (1 SMS - 157 characters)
```
NIC Life: Payment MUR 27,256.00 received for Policy MED/2024/230/2/557/1. Please contact your agent or call 210-9500 to update your records. Ref: 85018
```

**Pros:**
- Fits in 1 SMS
- Prompts customer to follow up
- Includes phone number

**Cons:**
- Slightly longer
- May cause unnecessary calls

---

## Recommended Message (Option 1 - Modified)

```
NIC Life: Payment MUR {amount} received for Policy {policy_number}. Ref: {transaction_ref}. Thank you.
```

**Character count:** ~90-100 characters (depending on values)  
**Cost:** 1 SMS per notification  
**Tone:** Professional and clear

---

## Existing SMS Infrastructure

### ✅ SMS Service Already Implemented!

Good news: You already have a complete SMS service in `backend-payment-notification.cjs` that we can reuse.

**Current Implementation:**
- File: `backend-payment-notification.cjs`
- Function: `sendPaymentSMS(payment, customer)` (lines 106-147)
- Phone Formatter: `formatPhoneForSMS(phoneNumber)` (lines 84-103)
- Brevo API: Already configured and working
- Sender Name: "NIC Life"
- API Key: `VITE_BREVO_API_KEY` (already in environment)

**Existing SMS Message Template:**
```
NIC Life Insurance
Payment Received: MUR {amount}
Policy: {policy_number}
New Balance: MUR {new_balance}
Thank you!
Ref: {transaction_reference}
```

**What This Means:**
- ✅ No need to set up Brevo SMS from scratch
- ✅ No need to purchase new SMS credits (already have them)
- ✅ No need to get sender name approved (already approved)
- ✅ Just need to adapt existing code for orphan payments

---

## Technical Implementation

### 1. Reuse Existing SMS Functions

**Copy from `backend-payment-notification.cjs` to webhook:**

#### Phone Number Formatting (Already Working)
```javascript
// Format phone number for SMS (Mauritius +230)
// Source: backend-payment-notification.cjs lines 84-103
function formatPhoneForSMS(phoneNumber) {
  if (!phoneNumber) return null
  
  const cleaned = phoneNumber.toString().replace(/\D/g, '')
  
  // Already has country code
  if (cleaned.startsWith('230')) {
    return `+${cleaned}`
  }
  
  // 8 digit number
  if (cleaned.length === 8) {
    return `+230${cleaned}`
  }
  
  // 7 digit number (add 5 prefix)
  if (cleaned.length === 7) {
    return `+2305${cleaned}`
  }
  
  // Default: add 230
  return `+230${cleaned}`
}
```

#### Brevo API Configuration (Already Set Up)
```javascript
// Brevo API client - already configured in webhook
const brevoApi = axios.create({
  baseURL: 'https://api.brevo.com/v3',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'api-key': process.env.VITE_BREVO_API_KEY  // Already exists
  }
})
```


#### SMS Sending Function (Adapted for Orphan Payments)
```javascript
// Adapted from backend-payment-notification.cjs lines 106-147
async function sendOrphanPaymentSMS(policyNumber, amount, mobileNumber, transactionRef) {
  try {
    const formattedPhone = formatPhoneForSMS(mobileNumber)
    
    if (!formattedPhone) {
      throw new Error('Invalid phone number')
    }
    
    // Simplified message for orphan payments (no balance info)
    const message = `NIC Life Insurance
Payment Received: MUR ${parseFloat(amount).toLocaleString()}
Policy: ${policyNumber}
Thank you!
Ref: ${transactionRef}`

    const payload = {
      type: 'transactional',
      unicodeEnabled: false,
      sender: 'NIC Life',  // Already approved sender name
      recipient: formattedPhone,
      content: message
    }

    console.log(`📱 Sending SMS to ${formattedPhone} for orphan payment`)
    
    const response = await brevoApi.post('/transactionalSMS/sms', payload)
    
    console.log(`✅ SMS sent successfully. Message ID: ${response.data.reference}`)
    
    return {
      success: true,
      messageId: response.data.reference
    }
    
  } catch (error) {
    console.error(`❌ SMS sending failed: ${error.message}`)
    return {
      success: false,
      error: error.message
    }
  }
}
```

---

### 2. New Xano Table: `nic_orphan_payments`

**Purpose:** Track unmatched payments for audit trail and logging

**Fields:**
| Field Name | Type | Description |
|------------|------|-------------|
| id | Integer | Auto-increment primary key |
| policy_number | Text | Policy number (reverse-sanitized) |
| amount | Decimal | Payment amount |
| mobile_number | Text | Customer mobile number |
| customer_label | Text | Customer name from webhook |
| transaction_reference | Text | Payment gateway transaction ref |
| end_to_end_reference | Text | Bank reference |
| payment_status_code | Text | Payment status (ACSP) |
| payment_date | DateTime | When payment was received |
| sms_sent | Boolean | Whether SMS was sent successfully |
| sms_sent_at | DateTime | When SMS was sent |
| sms_error | Text | Error message if SMS failed |
| created_at | DateTime | Record creation timestamp |


---

### 3. Webhook Code Changes


**File:** `webhookcode-enhanced.js`

**Functions to Add (Adapted from existing SMS service):**

```javascript
// 1. Copy formatPhoneForSMS from backend-payment-notification.cjs
function formatPhoneForSMS(phoneNumber) {
  if (!phoneNumber) return null
  
  const cleaned = phoneNumber.toString().replace(/\D/g, '')
  
  if (cleaned.startsWith('230')) {
    return `+${cleaned}`
  }
  
  if (cleaned.length === 8) {
    return `+230${cleaned}`
  }
  
  if (cleaned.length === 7) {
    return `+2305${cleaned}`
  }
  
  return `+230${cleaned}`
}

// 2. Adapted SMS function for orphan payments
async function sendOrphanPaymentSMS(policyNumber, amount, mobileNumber, transactionRef) {
  try {
    const formattedPhone = formatPhoneForSMS(mobileNumber)
    
    if (!formattedPhone) {
      throw new Error('Invalid phone number')
    }
    
    const message = `NIC Life Insurance
Payment Received: MUR ${parseFloat(amount).toLocaleString()}
Policy: ${policyNumber}
Thank you!
Ref: ${transactionRef}`

    const payload = {
      type: 'transactional',
      unicodeEnabled: false,
      sender: 'NIC Life',
      recipient: formattedPhone,
      content: message
    }

    console.log(`📱 Sending SMS to ${formattedPhone}`)
    
    // Use existing Brevo API configuration
    const response = await axios.post(
      'https://api.brevo.com/v3/transactionalSMS/sms',
      payload,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': process.env.VITE_BREVO_API_KEY
        }
      }
    )
    
    console.log(`✅ SMS sent successfully. Message ID: ${response.data.reference}`)
    
    return {
      success: true,
      messageId: response.data.reference
    }
    
  } catch (error) {
    console.error(`❌ SMS sending failed: ${error.message}`)
    return {
      success: false,
      error: error.message
    }
  }
}

// 3. Log orphan payment
async function logOrphanPayment(paymentData, smsResult) {
  try {
    const orphanData = {
      policy_number: paymentData.policyNumber,
      amount: parseFloat(paymentData.amount),
      mobile_number: paymentData.mobileNumber,
      customer_label: paymentData.customerLabel,
      transaction_reference: paymentData.transactionReference,
      end_to_end_reference: paymentData.endToEndReference,
      payment_status_code: paymentData.paymentStatusCode,
      payment_date: new Date().toISOString(),
      sms_sent: smsResult.success,
      sms_sent_at: smsResult.success ? new Date().toISOString() : null,
      sms_error: smsResult.error || null
    };
    
    await axios.post(
      `${XANO_BASE_URL}/api:${XANO_ORPHAN_PAYMENTS_API_KEY}/nic_orphan_payments`,
      orphanData
    );
    
    console.log('✅ Orphan payment logged successfully');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Failed to log orphan payment:', error.message);
    return { success: false, error: error.message };
  }
}
```

**Modified Webhook Flow:**

```javascript
// In the main callback endpoint, after customer lookup fails:
if (!updateResult.success && updateResult.error === 'Customer not found') {
  console.log(`🔄 Orphan Payment Detected - No matching records found`);
  
  // 1. Send SMS to customer (using existing SMS infrastructure)
  const smsResult = await sendOrphanPaymentSMS(
    originalPolicyNumber,
    amount,
    mobileNumber,
    transactionReference
  );
  
  // 2. Log orphan payment
  await logOrphanPayment({
    policyNumber: originalPolicyNumber,
    amount,
    mobileNumber,
    customerLabel,
    transactionReference,
    endToEndReference,
    paymentStatusCode
  }, smsResult);
  
  console.log(`✅ Orphan payment processed - Customer notified via SMS`);
}
```

---

## Environment Variables

**Good News:** All required environment variables already exist!

```bash
# Already in .env and Railway
VITE_BREVO_API_KEY=your_existing_brevo_api_key  # ✅ Already configured
VITE_XANO_BASE_URL=your_xano_url                # ✅ Already configured
VITE_SENDER_EMAIL=arrears@niclmauritius.site    # ✅ Already configured
VITE_SENDER_NAME=NIC                             # ✅ Already configured

# Only need to add:
XANO_ORPHAN_PAYMENTS_API_KEY=your_new_api_key   # ⚠️ New - for orphan payments table
```

**Note:** No need for separate `BREVO_SMS_API_KEY` - the existing `VITE_BREVO_API_KEY` works for both email and SMS!

---

## Cost Analysis

### Brevo SMS Pricing (Mauritius):
- Cost per SMS: ~€0.04 (approximately MUR 2.00)
- 2-part SMS: ~€0.08 (approximately MUR 4.00)

### Estimated Monthly Cost:
| Scenario | SMS/Month | Cost/Month |
|----------|-----------|------------|
| Low (5 orphan payments) | 5 | €0.20 (~MUR 10) |
| Medium (20 orphan payments) | 20 | €0.80 (~MUR 40) |
| High (50 orphan payments) | 50 | €2.00 (~MUR 100) |

**Conclusion:** Very affordable for peace of mind and customer satisfaction.

---

## Benefits

1. **Customer Satisfaction**
   - Immediate payment confirmation
   - Reduces anxiety about "lost" payments
   - Professional customer service

2. **Audit Trail**
   - All orphan payments tracked in database
   - SMS delivery status recorded
   - Available for manual review via logs

3. **Reliability**
   - SMS more reliable than email
   - Works even without customer email
   - Instant delivery

4. **Transparency**
   - All orphan payments logged for review
   - No payments lost in the system
   - Clear audit trail

---

## Implementation Checklist

### Phase 1: Verification (No Setup Needed!)
- [x] SMS service already implemented in `backend-payment-notification.cjs`
- [x] Brevo API key already configured (`VITE_BREVO_API_KEY`)
- [x] SMS sender name "NIC Life" already approved
- [x] Phone formatting function already working
- [x] SMS credits already purchased (check balance in Brevo dashboard)

### Phase 2: Xano Table Setup
- [ ] Create `nic_orphan_payments` table in Xano
- [ ] Set up API endpoint for orphan payments
- [ ] Create API key for orphan payments endpoint
- [ ] Test CRUD operations

### Phase 3: Code Implementation (Reuse Existing)
- [ ] Copy `formatPhoneForSMS()` from `backend-payment-notification.cjs` to webhook
- [ ] Adapt `sendPaymentSMS()` for orphan payments (remove balance info)
- [ ] Add orphan payment logging function
- [ ] Update webhook flow to handle orphan payments
- [ ] Add new environment variable (XANO_ORPHAN_PAYMENTS_API_KEY)

### Phase 4: Testing
- [ ] Test SMS sending with test mobile number (reuse existing test)
- [ ] Test orphan payment logging
- [ ] Test full flow with simulated orphan payment
- [ ] Verify SMS delivery and content

### Phase 5: Deployment
- [ ] Add new environment variable to Railway
- [ ] Deploy updated webhook code
- [ ] Monitor logs for first orphan payment
- [ ] Verify SMS delivery in production

---

## Testing Plan

### Test Case 1: Orphan Payment (No QR, No Customer)
```javascript
// Simulate webhook callback
POST /api/payment/v1/response-callback
{
  "paymentStatusCode": "ACSP",
  "billNumber": "TEST.2026.001.1.1",
  "amount": "1000.00",
  "mobileNumber": "57123456",
  "customerLabel": "Test Customer",
  "transactionReference": "TEST123",
  "endToEndReference": "TESTREF123"
}

// Expected Results:
// 1. SMS sent to +23057123456
// 2. Record created in nic_orphan_payments
// 3. Webhook returns success
```

### Test Case 2: Quick QR Payment (Has QR, No Customer)
```javascript
// Should use existing Quick QR flow
// SMS + Email to customer + Email to agent
```

### Test Case 3: Regular Payment (Has Customer)
```javascript
// Should use existing regular flow
// No SMS, only email notifications
```

---

## Monitoring & Alerts

### Metrics to Track:
1. Number of orphan payments per day/week/month
2. SMS delivery success rate
3. SMS cost per month

### Log Messages to Monitor:
```
📱 SMS sent successfully to +23057538294
✅ Orphan payment logged successfully
🔄 Orphan Payment Detected - No matching records found
```

---

## Future Enhancements

1. **Automated Matching**
   - Periodic job to re-check orphan payments
   - Auto-match if customer record added later
   - Send follow-up notifications

2. **SMS Templates**
   - Multiple message templates
   - Language support (English/French)
   - Customizable per LOB

3. **Reporting**
   - Monthly orphan payment report
   - SMS cost tracking
   - Payment pattern analytics

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SMS delivery failure | Medium | Low | Log errors, send admin alert anyway |
| Wrong mobile number | Low | Medium | Validate format, log for review |
| High SMS costs | Low | Low | Monitor usage, set alerts |
| Brevo API downtime | Medium | Low | Graceful error handling, retry logic |
| Spam complaints | Low | Low | Use transactional SMS, clear sender ID |

---

## Success Criteria

1. ✅ All orphan payments receive SMS confirmation
2. ✅ SMS delivery rate > 95%
3. ✅ All orphan payments logged in database
4. ✅ No customer complaints about missing payment confirmation
5. ✅ Clear audit trail for all orphan payments

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Confirm SMS message** content and format
3. **Set up Brevo SMS** account and get approval
4. **Create Xano table** for orphan payments
5. **Implement code changes** in webhook
6. **Test thoroughly** before production deployment
7. **Deploy to production** and monitor

---

## Questions for Decision

1. **Which SMS message format do you prefer?** (Option 1, 2, or 3)
   - Recommendation: Keep existing format from `backend-payment-notification.cjs` (already working)

2. **Check SMS credit balance in Brevo** - Do you have enough credits?
   - Login to Brevo dashboard
   - Check SMS credits remaining
   - Purchase more if needed (recommend 100-200 credits)

3. **Verify sender name** - Is "NIC Life" the approved sender name?
   - Check in Brevo SMS settings
   - Confirm it's active and approved

---

**Document Status:** Updated - Ready for Implementation  
**Next Review Date:** TBD  
**Owner:** Development Team  
**Key Advantage:** ✅ SMS infrastructure already exists - just need to adapt for orphan payments!
