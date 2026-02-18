# QR Transaction Auto-Expire Implementation Plan

## 🎯 Objective

Implement auto-expiry of old QR transactions when generating new QRs for the same policy to prevent payment confirmation emails going to wrong email addresses.

---

## 🔍 Problem Analysis

### **Current Issue**
When multiple QR codes are generated for the same policy number:
1. **Multiple Pending QRs**: Same policy has multiple `status = 'pending'` records
2. **Wrong Email Selection**: Webhook picks most recent QR, but may use wrong customer email
3. **Payment Confusion**: Customer payments trigger emails to incorrect recipients

### **Example Scenario**
```
Policy: ABC123/2023/12
QR #1: customer_email = "vikas.khanna@zwennpay.com" (status: pending)
QR #2: customer_email = "real.customer@email.com" (status: pending)
Payment: Webhook finds QR #1 → Wrong email used
```

---

## 🔧 Solution: Auto-Expire Old QRs

### **Core Logic**
When generating a new QR for a policy:
1. **Find existing pending QRs** for the same policy
2. **Mark them as 'expired'** before creating new QR
3. **Ensure only one pending QR** per policy at any time

### **Benefits**
- ✅ **Single Source of Truth**: Only one pending QR per policy
- ✅ **Correct Email**: Always uses latest customer data
- ✅ **Clean Audit Trail**: Clear status progression
- ✅ **No Confusion**: Eliminates wrong email scenarios

---

## 📂 Files Requiring Changes

### **🔴 Primary Changes (Required)**

#### **1. src/services/qrTransactionService.js**
**Function:** `logQRGeneration()`
**Change:** Add logic to expire old QRs before creating new one

**Current Flow:**
```javascript
async logQRGeneration(qrData, customerData, agentData, qrType) {
  // Create new transaction directly
  const transaction = { ... }
  const response = await qrTransactionsApi.post(this.baseUrl, transaction)
}
```

**New Flow:**
```javascript
async logQRGeneration(qrData, customerData, agentData, qrType) {
  // STEP 1: Expire old QRs for same policy
  await this.expireOldQRs(customerData.policyNumber)
  
  // STEP 2: Create new transaction
  const transaction = { ... }
  const response = await qrTransactionsApi.post(this.baseUrl, transaction)
}
```

**New Method Needed:**
```javascript
async expireOldQRs(policyNumber) {
  // Find pending QRs for this policy
  // Update their status to 'expired'
  // Log the expiry action
}
```

### **🟡 Secondary Changes (Optional Enhancement)**

#### **2. src/services/customerService.js**
**Function:** `generateQRCode()`
**Change:** Add logging for QR expiry actions

**Enhancement:** Log when old QRs are expired for audit purposes

#### **3. Xano Database (Configuration)**
**Table:** `nic_qr_transactions`
**Change:** Ensure proper indexing for performance

**Optimization:** Add index on `(policy_number, status)` for faster queries

---

## 🔄 Implementation Flow

### **Step 1: Add Expiry Logic**
```javascript
// New method in qrTransactionService.js
async expireOldQRs(policyNumber) {
  try {
    console.log(`🔄 Expiring old QRs for policy: ${policyNumber}`)
    
    // Get all pending QRs for this policy
    const existingQRs = await qrTransactionsApi.get(
      `${this.baseUrl}?policy_number=${policyNumber}&status=pending`
    )
    
    if (existingQRs.data.length > 0) {
      console.log(`📋 Found ${existingQRs.data.length} pending QRs to expire`)
      
      // Update each QR to expired status
      for (const qr of existingQRs.data) {
        await qrTransactionsApi.patch(`${this.baseUrl}/${qr.id}`, {
          status: 'expired',
          expired_at: new Date().toISOString(),
          expired_reason: 'superseded_by_new_qr'
        })
        
        console.log(`✅ Expired QR ID: ${qr.id}`)
      }
    }
    
    return { success: true, expiredCount: existingQRs.data.length }
  } catch (error) {
    console.error('❌ Error expiring old QRs:', error)
    return { success: false, error: error.message }
  }
}
```

### **Step 2: Update QR Generation Flow**
```javascript
// Modified logQRGeneration method
async logQRGeneration(qrData, customerData, agentData, qrType) {
  try {
    // STEP 1: Expire old QRs first
    const expiryResult = await this.expireOldQRs(
      customerData.policyNumber || customerData.policy_number
    )
    
    if (expiryResult.success && expiryResult.expiredCount > 0) {
      console.log(`🔄 Expired ${expiryResult.expiredCount} old QRs`)
    }
    
    // STEP 2: Create new QR (existing logic)
    const transaction = {
      qr_data: qrData,
      policy_number: customerData.policyNumber || customerData.policy_number,
      customer_name: customerData.name,
      customer_email: customerData.email,
      // ... rest of existing fields
      status: 'pending',
      created_at: new Date().toISOString()
    }

    const response = await qrTransactionsApi.post(this.baseUrl, transaction)
    
    console.log('✅ New QR transaction logged:', response.data.id)
    
    return {
      success: true,
      transaction: response.data,
      expiredOldQRs: expiryResult.expiredCount || 0
    }
  } catch (error) {
    console.error('❌ Error in QR generation:', error)
    return { success: false, error: error.message }
  }
}
```

---

## 🗄️ Database Changes

### **Optional: Add New Fields**
```sql
-- Add fields to track expiry (optional)
ALTER TABLE nic_qr_transactions ADD COLUMN expired_at TIMESTAMP;
ALTER TABLE nic_qr_transactions ADD COLUMN expired_reason VARCHAR(100);

-- Add index for performance
CREATE INDEX idx_policy_status ON nic_qr_transactions(policy_number, status);
```

### **Status Values**
- `pending` - QR generated, waiting for payment
- `paid` - Payment received and processed
- `expired` - Superseded by newer QR
- `cancelled` - Manually cancelled

---

## 🧪 Testing Strategy

### **Test Scenarios**

#### **Scenario 1: Single QR Generation**
1. Generate QR for policy ABC123
2. Verify: No old QRs to expire
3. Verify: New QR created with status 'pending'

#### **Scenario 2: Multiple QR Generation**
1. Generate QR #1 for policy ABC123 (email: test1@email.com)
2. Generate QR #2 for policy ABC123 (email: test2@email.com)
3. Verify: QR #1 status changed to 'expired'
4. Verify: QR #2 status is 'pending'
5. Make payment for policy ABC123
6. Verify: Payment confirmation goes to test2@email.com

#### **Scenario 3: Payment Processing**
1. Generate multiple QRs for same policy
2. Make payment
3. Verify: Webhook finds only the latest pending QR
4. Verify: Correct customer email used

### **Test Data**
```javascript
// Test case data
const testPolicy = "TEST123/2024/01"
const oldEmail = "old.customer@test.com"
const newEmail = "new.customer@test.com"

// Generate QR with old email
// Generate QR with new email  
// Verify old QR expired
// Make payment and verify email routing
```

---

## 📊 Impact Analysis

### **Performance Impact**
- **Additional Query**: One SELECT query per QR generation
- **Additional Updates**: N UPDATE queries (where N = existing pending QRs)
- **Typical Load**: 1-2 existing QRs per policy (minimal impact)

### **Storage Impact**
- **No Additional Storage**: Uses existing status field
- **Optional Fields**: `expired_at`, `expired_reason` (minimal storage)

### **Business Impact**
- ✅ **Eliminates Wrong Emails**: Prevents payment confirmations to wrong recipients
- ✅ **Improves Data Quality**: Clean, single-source-of-truth approach
- ✅ **Better Audit Trail**: Clear progression of QR lifecycle

---

## 🚀 Deployment Strategy

### **Phase 1: Core Implementation**
1. **Update qrTransactionService.js** with expiry logic
2. **Test thoroughly** with multiple QR scenarios
3. **Deploy to staging** for validation

### **Phase 2: Enhancement**
1. **Add optional database fields** for better tracking
2. **Add performance monitoring** for query impact
3. **Deploy to production** with monitoring

### **Phase 3: Monitoring**
1. **Monitor QR generation patterns**
2. **Track expiry statistics**
3. **Optimize queries** if needed

---

## 🔄 Rollback Plan

### **If Issues Occur**
1. **Disable expiry logic** by commenting out `expireOldQRs()` call
2. **Revert to previous behavior** (multiple pending QRs allowed)
3. **Fix issues** and redeploy

### **Data Recovery**
```sql
-- If needed, restore expired QRs to pending
UPDATE nic_qr_transactions 
SET status = 'pending' 
WHERE status = 'expired' 
AND expired_at > '2024-12-18'  -- Today's date
```

---

## 📋 Implementation Checklist

### **Development**
- [ ] Add `expireOldQRs()` method to qrTransactionService.js
- [ ] Modify `logQRGeneration()` to call expiry logic
- [ ] Add error handling and logging
- [ ] Write unit tests for expiry logic

### **Testing**
- [ ] Test single QR generation (no expiry needed)
- [ ] Test multiple QR generation (expiry triggered)
- [ ] Test payment processing with expired QRs
- [ ] Test error scenarios (API failures, etc.)

### **Deployment**
- [ ] Deploy to staging environment
- [ ] Run integration tests
- [ ] Monitor performance impact
- [ ] Deploy to production
- [ ] Monitor QR generation patterns

### **Validation**
- [ ] Verify only one pending QR per policy
- [ ] Verify payment confirmations use correct email
- [ ] Verify audit trail shows expiry actions
- [ ] Verify no performance degradation

---

## 🎯 Success Criteria

- [ ] **Single Pending QR**: Only one pending QR per policy at any time
- [ ] **Correct Email Routing**: Payment confirmations always use latest customer email
- [ ] **Clean Audit Trail**: Clear status progression (pending → expired/paid)
- [ ] **No Performance Impact**: QR generation remains fast (<2 seconds)
- [ ] **Backward Compatible**: Existing QRs continue to work normally

---

## 📚 Related Documentation

- `QUICK_QR_TRANSACTION_LOGGING_IMPLEMENTATION_COMPLETE.md` - Original QR logging implementation
- `WEBHOOK_QR_INTEGRATION_IMPLEMENTATION_COMPLETE.md` - Webhook payment processing
- `src/services/qrTransactionService.js` - QR transaction service code

---

**Status:** 📋 IMPLEMENTATION PLAN READY
**Date:** December 18, 2024
**Priority:** 🟡 MEDIUM (Prevents wrong email issues)
**Complexity:** 🟢 LOW (Simple status update logic)
**Estimated Time:** 2-3 hours development + testing