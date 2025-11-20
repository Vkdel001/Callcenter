# LOB-Specific Merchant Codes Implementation

## 📋 **Overview**

This document describes the implementation of Line of Business (LOB) specific merchant codes for ZwennPay QR code generation in the NIC Call Center system.

---

## 🎯 **Business Requirement**

Different insurance lines of business require separate merchant codes for proper payment routing and accounting:

| Line of Business | Merchant Code | Purpose |
|------------------|---------------|---------|
| **Life Insurance** | 56 | Life insurance policy payments |
| **Health Insurance** | 153 | Health insurance policy payments |
| **Motor Insurance** | 155 | Motor insurance policy payments |

---

## 🔧 **Implementation Details**

### **Implementation Approach: Database Fetch**

The system fetches the customer's Line of Business (LOB) directly from the Xano database before generating the QR code. This ensures:
- ✅ **Single Source of Truth** - LOB comes from database
- ✅ **Always Accurate** - No guessing or policy number parsing
- ✅ **Centralized Logic** - All LOB handling in qrService
- ✅ **Minimal Component Changes** - Components just pass customer.id

### **1. Environment Variables**

**File: `.env` and `.env.production.template`**

```env
# ZwennPay QR Code Configuration - LOB-Specific Merchant Codes
VITE_ZWENNPAY_MERCHANT_LIFE=56
VITE_ZWENNPAY_MERCHANT_HEALTH=153
VITE_ZWENNPAY_MERCHANT_MOTOR=155
VITE_QR_TEST_MODE=false
```

### **2. QR Service Updates**

**File: `src/services/qrService.js`**

#### **Constructor Changes**
```javascript
constructor() {
  this.zwennPayApiUrl = 'https://api.zwennpay.com:9425/api/v1.0/Common/GetMerchantQR'
  // LOB-specific merchant codes
  this.merchantCodes = {
    life: import.meta.env.VITE_ZWENNPAY_MERCHANT_LIFE || '56',
    health: import.meta.env.VITE_ZWENNPAY_MERCHANT_HEALTH || '153',
    motor: import.meta.env.VITE_ZWENNPAY_MERCHANT_MOTOR || '155'
  }
  // Fallback to old single merchant ID if new ones not configured
  this.defaultMerchantId = import.meta.env.VITE_ZWENNPAY_MERCHANT_ID || '56'
  this.testMode = import.meta.env.VITE_QR_TEST_MODE === 'true' || false
}
```

#### **New Method: getMerchantIdForLOB()**
```javascript
/**
 * Get merchant ID based on Line of Business (LOB)
 * @param {string} lineOfBusiness - 'life', 'health', or 'motor'
 * @returns {string} Merchant ID for the specified LOB
 */
getMerchantIdForLOB(lineOfBusiness) {
  // Normalize LOB to lowercase
  const lob = (lineOfBusiness || 'life').toLowerCase().trim()
  
  // Get merchant code for LOB, default to life if not found
  const merchantId = this.merchantCodes[lob] || this.merchantCodes.life || this.defaultMerchantId
  
  console.log(`🏦 Merchant ID selected: ${merchantId} for LOB: ${lob}`)
  
  return merchantId
}
```

#### **Updated generatePaymentQR()**
```javascript
async generatePaymentQR(customerData) {
  // ✅ STEP 1: Fetch customer from Xano to get LOB
  let lineOfBusiness = 'life' // Default fallback
  
  if (customerData.id) {
    try {
      const { customerApi } = await import('./apiClient')
      const customerResponse = await customerApi.get(`/nic_cc_customer/${customerData.id}`)
      const fullCustomer = customerResponse.data
      lineOfBusiness = fullCustomer?.line_of_business || 'life'
      
      console.log(`📋 Customer ${customerData.id}: LOB = ${lineOfBusiness}`)
    } catch (fetchError) {
      console.warn('Failed to fetch customer LOB, using default (life):', fetchError.message)
      lineOfBusiness = 'life'
    }
  }
  
  // ✅ STEP 2: Get LOB-specific merchant ID
  const merchantId = this.getMerchantIdForLOB(lineOfBusiness)
  
  // ✅ STEP 3: Continue with QR generation
  const payload = {
    "MerchantId": parseInt(merchantId),
    // ... rest of payload
  }
}
```

#### **Updated generateTestQR()**
```javascript
async generateTestQR(customerData) {
  // Get LOB-specific merchant ID
  const merchantId = this.getMerchantIdForLOB(customerData.lineOfBusiness)
  
  // ... rest of the function uses merchantId
}
```

---

## 📊 **Data Flow**

```
User clicks "Generate QR"
         ↓
Component passes: { id: 123, name: "Mary", policyNumber: "HEALTH/2024/001", amountDue: 1200 }
         ↓
qrService.generatePaymentQR(customerData)
         ↓
STEP 1: Fetch from Xano
GET /nic_cc_customer/123
Response: { id: 123, line_of_business: "health", ... }
         ↓
STEP 2: Extract LOB
lineOfBusiness = "health"
         ↓
STEP 3: Get Merchant Code
getMerchantIdForLOB("health") → Returns: "153"
         ↓
STEP 4: Build ZwennPay Payload
├── MerchantId: 153
├── TransactionAmount: "1200"
└── AdditionalBillNumber: "HEALTH.2024.001"
         ↓
STEP 5: Generate QR Code
QR Code Generated with Health Insurance Merchant Code (153) ✅
```

---

## ✅ **Testing**

### **Test Script**
Run the test script to verify merchant code selection:

```bash
node test-lob-merchant-codes.js
```

### **Expected Output**
```
🧪 Testing LOB-Specific Merchant Code Selection

✅ Test 1: Life Insurance
   Input: "life" → Merchant: 56

✅ Test 2: Health Insurance
   Input: "health" → Merchant: 153

✅ Test 3: Motor Insurance
   Input: "motor" → Merchant: 155

📊 Test Results: 10/10 passed, 0 failed

🎉 All tests passed!
```

### **Manual Testing Checklist**

- [ ] **Life Insurance Customer**
  - Generate QR code
  - Verify merchant code 56 in console logs
  - Verify QR code scans correctly
  
- [ ] **Health Insurance Customer**
  - Generate QR code
  - Verify merchant code 153 in console logs
  - Verify QR code scans correctly
  
- [ ] **Motor Insurance Customer**
  - Generate QR code
  - Verify merchant code 155 in console logs
  - Verify QR code scans correctly
  
- [ ] **Customer with Missing LOB**
  - Generate QR code
  - Verify defaults to merchant code 56 (Life)
  - Verify QR code scans correctly

---

## 🚀 **Deployment Steps**

### **1. Local Testing**
```bash
# Update .env with new merchant codes
# Already done in .env file

# Test locally
npm run dev

# Generate QR codes for different LOBs
# Verify console logs show correct merchant codes
```

### **2. Push to GitHub**
```bash
git add .env .env.production.template src/services/qrService.js
git add test-lob-merchant-codes.js LOB_MERCHANT_CODES.md
git commit -m "Add LOB-specific merchant codes for ZwennPay QR generation"
git push origin main
```

### **3. Deploy to VPS**
```bash
# SSH to VPS
ssh root@your-vps-ip

# Navigate to project
cd /var/www/nic-callcenter

# Pull latest code
git pull origin main

# Update .env file with new merchant codes
nano .env

# Add these lines (replace old VITE_ZWENNPAY_MERCHANT_ID):
VITE_ZWENNPAY_MERCHANT_LIFE=56
VITE_ZWENNPAY_MERCHANT_HEALTH=153
VITE_ZWENNPAY_MERCHANT_MOTOR=155

# Build application
npm run build

# Reload Nginx
sudo systemctl reload nginx

# Verify deployment
curl -I https://payments.niclmauritius.site
```

### **4. Verify in Production**
```bash
# Open browser console
# Generate QR codes for different LOBs
# Check console logs for merchant code selection:
# 🏦 Merchant ID selected: 56 for LOB: life
# 🏦 Merchant ID selected: 153 for LOB: health
# 🏦 Merchant ID selected: 155 for LOB: motor
```

---

## 🔍 **Monitoring**

### **Console Logs**
Every QR generation logs the selected merchant code:
```javascript
console.log(`🏦 Merchant ID selected: ${merchantId} for LOB: ${lob}`)
```

### **QR Response Data**
The QR generation response includes LOB information:
```javascript
{
  success: true,
  qrData: "...",
  qrCodeUrl: "...",
  merchantId: "153",
  lineOfBusiness: "health",
  transactionAmount: 1200
}
```

---

## 🛡️ **Backward Compatibility**

### **Existing QR Codes**
- ✅ **No impact** - Existing QR codes remain valid
- ✅ **Old merchant code (56)** - Still works for Life insurance
- ✅ **No breaking changes** - System gracefully handles missing LOB data

### **Fallback Behavior**
```javascript
// If LOB is missing, null, undefined, or unknown
getMerchantIdForLOB(null)        // Returns: '56' (Life)
getMerchantIdForLOB(undefined)   // Returns: '56' (Life)
getMerchantIdForLOB('')          // Returns: '56' (Life)
getMerchantIdForLOB('unknown')   // Returns: '56' (Life)
```

---

## 📝 **Benefits**

### **Business Benefits**
1. ✅ **Proper Payment Routing** - Each LOB's payments go to correct merchant account
2. ✅ **Better Accounting** - Separate financial tracking per LOB
3. ✅ **Regulatory Compliance** - Proper segregation of insurance types
4. ✅ **Easier Reconciliation** - Match payments to correct business line

### **Technical Benefits**
1. ✅ **Clean Implementation** - Simple, maintainable code
2. ✅ **Backward Compatible** - No breaking changes
3. ✅ **Well Tested** - Comprehensive test coverage
4. ✅ **Logged** - Easy to debug and monitor

---

## 🐛 **Troubleshooting**

### **Issue: Wrong Merchant Code Used**

**Symptoms:**
- QR code generated with incorrect merchant code
- Payments going to wrong account

**Diagnosis:**
```javascript
// Check console logs
// Look for: 🏦 Merchant ID selected: X for LOB: Y

// Verify customer data has lineOfBusiness field
console.log(customerData.lineOfBusiness)
```

**Solution:**
1. Verify customer has `lineOfBusiness` field populated
2. Check environment variables are set correctly
3. Verify `.env` file has all three merchant codes
4. Rebuild application after .env changes

### **Issue: Missing LOB Data**

**Symptoms:**
- All QR codes use merchant code 56
- Console shows: `🏦 Merchant ID selected: 56 for LOB: undefined`

**Diagnosis:**
```javascript
// Check if customer data includes lineOfBusiness
console.log('Customer data:', customerData)
```

**Solution:**
1. Ensure customer data includes `lineOfBusiness` field
2. Update database to populate missing LOB data
3. System defaults to Life (56) as fallback - safe behavior

---

## 📞 **Support**

### **Questions?**
- Check console logs for merchant code selection
- Run test script: `node test-lob-merchant-codes.js`
- Verify environment variables are set correctly
- Check customer data includes `lineOfBusiness` field

### **ZwennPay Integration**
- Verify merchant codes 153 and 155 are activated in ZwennPay
- Test QR codes with actual payment gateway
- Monitor payment routing to correct accounts

---

**Last Updated**: November 19, 2025  
**Version**: 1.0  
**Status**: ✅ Implemented and Ready for Testing  
**Impact**: 🟢 Low Risk, High Business Value
