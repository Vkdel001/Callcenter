# AOD Installment Reminder QR Code Inconsistency Analysis

## Issue Summary
When AOD installment reminders are sent, **sometimes emails include QR codes and sometimes they don't**. This creates an inconsistent user experience.

## Evidence from Email Samples

### Email 1 (With QR Code) ✅
- Policy: LIFE/PL/001
- Amount: MUR 500
- **Has QR Code**: Shows MauCas QR code with "Quick Payment via QR Code" section

### Email 2 (Without QR Code) ❌  
- Policy: 005500008518
- Amount: MUR 4,033.33
- **No QR Code**: Only shows "View Payment Details" button

## Root Cause Analysis

### **The Issue: QR Code Generation Timing**

From analyzing the code, I found the root cause:

#### **1. QR Code Generation Logic (reminderService.js)**
```javascript
// Ensure installment has QR code - generate if missing
if (!installment.qr_code_url) {
  console.log('Generating QR code for installment reminder...')
  try {
    const qrResult = await qrService.generatePaymentQR(qrCustomerData)
    if (qrResult.success) {
      installment.qr_code_url = qrResult.qrCodeUrl
      // Save to database
    } else {
      console.warn('⚠️ Failed to generate QR code for installment:', qrResult.error)
    }
  } catch (qrError) {
    console.error('❌ Error generating QR code for installment:', qrError)
    // Continue without QR code - don't fail the reminder
  }
}
```

#### **2. Email Template Logic (emailService.js)**
```javascript
if (installment.qr_code_url) {
  // Include QR code in email
} else {
  // No QR code section
}
```

#### **3. Backend Service Logic (backend-reminder-service.cjs)**
```javascript
static generateQRSection(customer, installment) {
  if (installment.qr_code_url) {
    return `<div>QR Code Section</div>`;
  } else {
    Logger.warn('No QR code available for installment');
    return '';
  }
}
```

## **Why Some Emails Have QR and Others Don't**

### **Scenario A: QR Code Present** ✅
1. **Installment created** → QR code generated during creation
2. **QR saved to database** → `installment.qr_code_url` exists
3. **Reminder sent** → Email includes QR code section

### **Scenario B: QR Code Missing** ❌
1. **Installment created** → QR generation **failed** during creation
2. **No QR in database** → `installment.qr_code_url` is null/empty
3. **Reminder sent** → Attempts to generate QR but **fails again**
4. **Email sent without QR** → Only "View Payment Details" button

## **Potential Failure Points**

### **1. ZwennPay API Issues**
- **Network timeouts** during QR generation
- **API rate limiting** when creating multiple installments
- **Invalid merchant configuration** for certain amounts
- **API downtime** during installment creation

### **2. Data Issues**
- **Missing customer data** (policy number, mobile, etc.)
- **Invalid amount formats** that ZwennPay rejects
- **Policy number format issues** (LIFE/PL/001 vs 005500008518)

### **3. Timing Issues**
- **Concurrent installment creation** overwhelming QR service
- **Database transaction failures** during QR save
- **Memory/resource constraints** during bulk operations

### **4. Configuration Issues**
- **Different merchant IDs** for different policy types
- **Amount thresholds** that prevent QR generation
- **Test mode vs production mode** inconsistencies

## **Evidence Supporting This Theory**

### **Policy Number Patterns**
- **With QR**: `LIFE/PL/001` (shorter, simpler format)
- **Without QR**: `005500008518` (longer, numeric format)

This suggests **policy number format** might affect QR generation success.

### **Amount Differences**
- **With QR**: MUR 500 (smaller amount)
- **Without QR**: MUR 4,033.33 (larger amount)

This suggests **amount validation** might be failing for larger amounts.

## **Debugging Steps (No Code Changes)**

### **Step 1: Check Installment Database**
```bash
# Check if installments have QR codes stored
curl -H "X-API-Key: YOUR_KEY" "https://xano-api/nic_cc_installment" | jq '.[] | {id, amount, qr_code_url, policy_number}'
```

### **Step 2: Check QR Generation Logs**
```bash
# Check reminder service logs for QR generation failures
tail -f /var/log/nic-reminder-service.log | grep -i "qr\|zwennpay"
```

### **Step 3: Test QR Generation Manually**
```bash
# Test QR generation for different amounts and policy formats
curl -X POST "https://api.zwennpay.com:9425/api/v1.0/Common/GetMerchantQR" \
  -H "Content-Type: application/json" \
  -d '{"MerchantId": 56, "TransactionAmount": "500", "AdditionalBillNumber": "LIFE/PL/001"}'

curl -X POST "https://api.zwennpay.com:9425/api/v1.0/Common/GetMerchantQR" \
  -H "Content-Type: application/json" \
  -d '{"MerchantId": 56, "TransactionAmount": "4033.33", "AdditionalBillNumber": "005500008518"}'
```

### **Step 4: Check Frontend QR Generation**
```javascript
// Test QR generation in browser console for both policy types
const testData1 = {
  name: "Test Customer",
  policyNumber: "LIFE/PL/001", 
  amountDue: 500,
  lineOfBusiness: "life"
};

const testData2 = {
  name: "Test Customer",
  policyNumber: "005500008518",
  amountDue: 4033.33,
  lineOfBusiness: "life"
};

// Test both and compare results
```

## **Likely Root Causes (In Order of Probability)**

### **1. Policy Number Format Issues** (Most Likely)
- ZwennPay API might reject certain policy number formats
- `005500008518` might be too long or invalid format
- `LIFE/PL/001` follows expected pattern

### **2. Amount Validation Issues**
- Large amounts (4033.33) might exceed limits
- Decimal amounts might cause validation errors
- Currency formatting issues

### **3. ZwennPay API Rate Limiting**
- Multiple QR generations in short time get throttled
- Some succeed, others fail silently

### **4. Merchant Configuration Issues**
- Different merchant IDs for different policy types
- Configuration mismatch for certain amounts

## **Recommended Investigation Priority**

1. **Check installment database** for QR code presence patterns
2. **Test QR generation** with both policy number formats
3. **Review ZwennPay API logs** for failed requests
4. **Check amount limits** in ZwennPay configuration
5. **Verify merchant ID** consistency across policy types

## **Expected Findings**

Based on the evidence, I expect to find:
- **Policy number format validation** failing for numeric-only formats
- **Amount limits** preventing QR generation for larger amounts
- **Inconsistent merchant configuration** for different policy types
- **API failures** during bulk installment creation not being handled properly

## **Next Steps**

1. **Investigate database** to confirm QR code presence patterns
2. **Test QR API** with both policy formats to identify validation issues
3. **Review configuration** for amount limits and merchant settings
4. **Implement retry logic** for failed QR generations
5. **Add fallback QR generation** during reminder sending if missing