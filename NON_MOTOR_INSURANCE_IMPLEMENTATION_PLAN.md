# Non Motor Insurance Implementation Plan

## 📋 Overview

This document outlines the implementation plan for adding **Non Motor Insurance** as a fourth Line of Business (LOB) option with **Merchant ID 171** to the NIC Call Center system.

**Date**: January 22, 2026  
**Status**: 📝 Planning Phase - Awaiting Approval  
**Complexity**: LOW  
**Risk Level**: LOW  
**Estimated Time**: 1-2 hours

---

## 🎯 Business Requirement

Add support for Non Motor Insurance policies with dedicated merchant code for proper payment routing and accounting.

### **Current LOB Options**
| Line of Business | Merchant ID | Status |
|------------------|-------------|---------|
| Life Insurance | 151 | ✅ Active |
| Health Insurance | 153 | ✅ Active |
| Motor Insurance | 155 | ✅ Active |

### **New LOB Option**
| Line of Business | Merchant ID | Status |
|------------------|-------------|---------|
| **Non Motor Insurance** | **171** | 🆕 To Be Added |

---

## 📊 Impact Analysis

### **Scope: SMALL TO MEDIUM**
- **Total Files to Modify**: 5-6 files
- **Total Lines of Code**: ~20-25 lines
- **Breaking Changes**: None
- **Backward Compatibility**: 100% maintained

### **Files Requiring Changes**

| File | Changes | Lines | Complexity |
|------|---------|-------|------------|
| `src/services/qrService.js` | Add merchant code + validation | ~8 | Low |
| `src/pages/QuickQRGenerator.jsx` | Add dropdown option + display | ~6 | Low |
| `src/pages/AgentQRSummary.jsx` | Add filter option | ~1 | Low |
| `src/services/bulkAgentService.js` | Update validation | ~1 | Low |
| `src/pages/admin/CustomerUpload.jsx` | Update validation + help text | ~2 | Low |
| `src/components/sales/LOBDashboard.jsx` | Add to calculations (optional) | ~3 | Medium |

---

## 🔧 Detailed Implementation Plan

### **1. Backend/Service Layer**

#### **File: `src/services/qrService.js`**

**Location 1: Lines 6-9 - Add to merchantCodes**
```javascript
// BEFORE:
this.merchantCodes = {
  life: '151',
  health: '153',
  motor: '155'
}

// AFTER:
this.merchantCodes = {
  life: '151',
  health: '153',
  motor: '155',
  nonmotor: '171'  // NEW
}
```

**Location 2: Lines 12-15 - Add to adHocMerchantCodes**
```javascript
// BEFORE:
this.adHocMerchantCodes = {
  life: '151',
  health: '153',
  motor: '155'
}

// AFTER:
this.adHocMerchantCodes = {
  life: '151',
  health: '153',
  motor: '155',
  nonmotor: '171'  // NEW
}
```

**Location 3: Line 36 - Update validLOBs array**
```javascript
// BEFORE:
const validLOBs = ['life', 'health', 'motor']

// AFTER:
const validLOBs = ['life', 'health', 'motor', 'nonmotor']
```

**Location 4: Line 38 - Update error message**
```javascript
// BEFORE:
throw new Error(`❌ Invalid Line of Business: "${lineOfBusiness}". Must be one of: life, health, motor`)

// AFTER:
throw new Error(`❌ Invalid Line of Business: "${lineOfBusiness}". Must be one of: life, health, motor, nonmotor`)
```

**Location 5: Line 356 - Update second validLOBs array (in generateAdHocQR)**
```javascript
// BEFORE:
const validLOBs = ['life', 'health', 'motor']

// AFTER:
const validLOBs = ['life', 'health', 'motor', 'nonmotor']
```

**Location 6: Line 358 - Update second error message**
```javascript
// BEFORE:
throw new Error(`❌ Invalid Line of Business: "${customerData.lineOfBusiness}". Must be one of: life, health, motor`)

// AFTER:
throw new Error(`❌ Invalid Line of Business: "${customerData.lineOfBusiness}". Must be one of: life, health, motor, nonmotor`)
```

---

### **2. Frontend UI Layer**

#### **File: `src/pages/QuickQRGenerator.jsx`**

**Location 1: Lines 322-324 - Add dropdown option**
```javascript
// BEFORE:
<select {...register('lineOfBusiness', { required: 'Line of Business is required' })}>
  <option value="">Select LOB</option>
  <option value="life">Life Insurance</option>
  <option value="health">Health Insurance</option>
  <option value="motor">Motor Insurance</option>
</select>

// AFTER:
<select {...register('lineOfBusiness', { required: 'Line of Business is required' })}>
  <option value="">Select LOB</option>
  <option value="life">Life Insurance</option>
  <option value="health">Health Insurance</option>
  <option value="motor">Motor Insurance</option>
  <option value="nonmotor">Non Motor Insurance</option>  {/* NEW */}
</select>
```

**Location 2: Line 330 - Update merchant ID hint**
```javascript
// BEFORE:
<p className="mt-1 text-xs text-gray-500">
  Merchant IDs: Life=151, Health=153, Motor=155
</p>

// AFTER:
<p className="mt-1 text-xs text-gray-500">
  Merchant IDs: Life=151, Health=153, Motor=155, Non Motor=171
</p>
```

**Location 3: Line 565 - Update confirmation dialog merchant ID display**
```javascript
// BEFORE:
<p><strong>Merchant ID:</strong> {
  pendingFormData.lineOfBusiness === 'life' ? '151' : 
  pendingFormData.lineOfBusiness === 'health' ? '153' : '155'
}</p>

// AFTER:
<p><strong>Merchant ID:</strong> {
  pendingFormData.lineOfBusiness === 'life' ? '151' : 
  pendingFormData.lineOfBusiness === 'health' ? '153' : 
  pendingFormData.lineOfBusiness === 'motor' ? '155' :
  pendingFormData.lineOfBusiness === 'nonmotor' ? '171' : '151'
}</p>
```

**Location 4: Lines 124-157 - Policy Validation (Optional)**

Non Motor policies may need specific validation rules. Current options:
- **Option A**: No validation (like Life insurance) - flexible format
- **Option B**: Add specific format requirements (if business rules exist)

```javascript
// If Option B is needed, add after line 151:
if (lob === 'nonmotor') {
  // Non Motor: Add specific validation if required
  // Example: Must start with "NM", specific slash count, etc.
  // For now, accepting any format (like Life)
  return { valid: true }
}
```

#### **File: `src/pages/AgentQRSummary.jsx`**

**Location: Lines 185-187 - Add filter option**
```javascript
// BEFORE:
<select value={selectedLOB} onChange={(e) => setSelectedLOB(e.target.value)}>
  <option value="all">All LOBs</option>
  <option value="life">Life Insurance</option>
  <option value="health">Health Insurance</option>
  <option value="motor">Motor Insurance</option>
</select>

// AFTER:
<select value={selectedLOB} onChange={(e) => setSelectedLOB(e.target.value)}>
  <option value="all">All LOBs</option>
  <option value="life">Life Insurance</option>
  <option value="health">Health Insurance</option>
  <option value="motor">Motor Insurance</option>
  <option value="nonmotor">Non Motor Insurance</option>  {/* NEW */}
</select>
```

---

### **3. Validation Layer**

#### **File: `src/services/bulkAgentService.js`**

**Location: Line 168 - Update LOB validation**
```javascript
// BEFORE:
if (record.admin_lob && !['life', 'health', 'motor'].includes(record.admin_lob)) {
  recordErrors.push({ field: 'admin_lob', message: 'Invalid admin_lob value' })
}

// AFTER:
if (record.admin_lob && !['life', 'health', 'motor', 'nonmotor'].includes(record.admin_lob)) {
  recordErrors.push({ field: 'admin_lob', message: 'Invalid admin_lob value' })
}
```

#### **File: `src/pages/admin/CustomerUpload.jsx`**

**Location 1: Line 85 - Update CSV validation**
```javascript
// BEFORE:
if (customer.line_of_business && !['life', 'health', 'motor'].includes(customer.line_of_business)) {
  errors.push(`Line of business must be 'life', 'health', or 'motor'`)
}

// AFTER:
if (customer.line_of_business && !['life', 'health', 'motor', 'nonmotor'].includes(customer.line_of_business)) {
  errors.push(`Line of business must be 'life', 'health', 'motor', or 'nonmotor'`)
}
```

**Location 2: Line 617 - Update help text**
```javascript
// BEFORE:
<li><strong>line_of_business</strong> - life, health, or motor</li>

// AFTER:
<li><strong>line_of_business</strong> - life, health, motor, or nonmotor</li>
```

---

### **4. Dashboard/Reporting (Optional)**

#### **File: `src/components/sales/LOBDashboard.jsx`**

**Note**: This file requires more extensive changes if you want Non Motor to appear as a separate card in the dashboard.

**Option A: Include in totals only** (Minimal change)
```javascript
// Line 1136: Add nonmotor to total amount
const totalAmount = (lobSummary?.life?.totalAmount || 0) + 
                    (lobSummary?.health?.totalAmount || 0) + 
                    (lobSummary?.motor?.totalAmount || 0) +
                    (lobSummary?.nonmotor?.totalAmount || 0)  // NEW

// Line 1142: Add nonmotor to active months
const activeMonths = Object.keys(lobSummary?.life?.months || {}).length + 
                     Object.keys(lobSummary?.health?.months || {}).length + 
                     Object.keys(lobSummary?.motor?.months || {}).length +
                     Object.keys(lobSummary?.nonmotor?.months || {}).length  // NEW

// Line 1148: Add nonmotor to average calculation
const avgAmount = totalAmount / (totalCustomers || 1)
```

**Option B: Add separate dashboard card** (More extensive)
- Requires adding a new card component
- Requires updating the grid layout
- Requires adding nonmotor to the lobSummary initialization
- **Recommendation**: Defer this to a separate task if needed

---

## 📧 Email Template Handling

### **✅ NO CHANGES REQUIRED**

Email templates are **dynamic** and will automatically handle Non Motor Insurance:

**How it works:**
```javascript
// emailService.js automatically generates:
const lob = 'nonmotor'
const lobName = lob.charAt(0).toUpperCase() + lob.slice(1)  // "Nonmotor"

// Results in:
// - Sender: "NIC Nonmotor Insurance"
// - Subject: "Payment Reminder - Nonmotor Policy XXX"
// - Body: "Thank you for choosing NIC Nonmotor Insurance..."
```

### **Optional Enhancement: Better Display Name**

If you want "Non-Motor" or "Non Motor" instead of "Nonmotor":

**Add to `src/services/emailService.js` (after line 85):**
```javascript
getLOBDisplayName(lob) {
  const displayNames = {
    'life': 'Life',
    'health': 'Health',
    'motor': 'Motor',
    'nonmotor': 'Non-Motor'  // Custom display name
  }
  return displayNames[lob] || lob.charAt(0).toUpperCase() + lob.slice(1)
}

// Then replace line 96:
// BEFORE:
const lobName = lob.charAt(0).toUpperCase() + lob.slice(1)

// AFTER:
const lobName = this.getLOBDisplayName(lob)
```

**Result**: Emails will show "NIC Non-Motor Insurance" instead of "NIC Nonmotor Insurance"

---

## 🗄️ Database Considerations

### **Xano Database Schema**

**Table: `nic_cc_customer`**

The `line_of_business` field should accept the new value:
- Current values: `'life'`, `'health'`, `'motor'`
- New value: `'nonmotor'`

**Action Required:**
1. Verify the field type allows the new value (likely TEXT or VARCHAR)
2. No schema changes needed if field is flexible
3. Update any database-level constraints or enums if they exist

**Admin LOB Field:**
- Agents with `admin_lob = 'nonmotor'` will only see Non Motor customers
- Ensure this value is added to any admin role configurations

---

## 🧪 Testing Plan

### **1. Unit Testing**

Create test file: `test-nonmotor-lob.js`

```javascript
// Test merchant code selection
console.log('Testing Non Motor merchant code...')
const merchantId = qrService.getMerchantIdForLOB('nonmotor')
console.assert(merchantId === '171', 'Non Motor merchant ID should be 171')

// Test validation
const validLOBs = ['life', 'health', 'motor', 'nonmotor']
console.assert(validLOBs.includes('nonmotor'), 'nonmotor should be valid LOB')

// Test email template
const lobName = 'nonmotor'.charAt(0).toUpperCase() + 'nonmotor'.slice(1)
console.assert(lobName === 'Nonmotor', 'LOB name should be capitalized')
```

### **2. Integration Testing**

**Test Scenario 1: Quick QR Generator**
1. Navigate to Quick QR Generator
2. Select "Non Motor Insurance" from dropdown
3. Fill in customer details
4. Generate QR code
5. Verify console shows: `🏦 Merchant ID selected: 171 for LOB: nonmotor`
6. Verify confirmation dialog shows: `Merchant ID: 171`
7. Verify QR code generates successfully

**Test Scenario 2: Email Sending**
1. Generate QR for Non Motor customer
2. Click "Send via Email"
3. Check email received
4. Verify subject: "Payment Reminder - Nonmotor Policy XXX"
5. Verify body mentions "NIC Nonmotor Insurance"

**Test Scenario 3: Agent QR Summary**
1. Navigate to Agent QR Summary
2. Select "Non Motor Insurance" from filter
3. Verify filtering works correctly

**Test Scenario 4: CSV Upload**
1. Create CSV with `line_of_business = 'nonmotor'`
2. Upload via Customer Upload page
3. Verify no validation errors
4. Verify customer created successfully

### **3. Manual Testing Checklist**

- [ ] Non Motor option appears in all dropdowns
- [ ] Merchant ID 171 is used for Non Motor QR codes
- [ ] QR codes scan correctly with mobile banking
- [ ] Email templates display correctly
- [ ] Confirmation dialog shows correct merchant ID
- [ ] Validation accepts 'nonmotor' value
- [ ] CSV upload accepts 'nonmotor' value
- [ ] Agent filtering works for Non Motor
- [ ] Console logs show correct merchant selection
- [ ] No errors in browser console
- [ ] No errors in backend logs

---

## 🚀 Deployment Plan

### **Step 1: Local Development**
```bash
# 1. Make code changes (5 files)
# 2. Test locally
npm run dev

# 3. Test QR generation for all LOBs
# 4. Verify console logs
# 5. Test email sending
```

### **Step 2: Commit to Git**
```bash
git add src/services/qrService.js
git add src/pages/QuickQRGenerator.jsx
git add src/pages/AgentQRSummary.jsx
git add src/services/bulkAgentService.js
git add src/pages/admin/CustomerUpload.jsx
git add src/components/sales/LOBDashboard.jsx  # if modified

git commit -m "Add Non Motor Insurance LOB with Merchant ID 171

- Add nonmotor to merchant codes (171)
- Add Non Motor option to Quick QR Generator
- Add Non Motor filter to Agent QR Summary
- Update validation to accept nonmotor value
- Update CSV upload help text
- Email templates handle automatically (dynamic)

Tested: QR generation, email sending, validation"

git push origin main
```

### **Step 3: Deploy to VPS**
```bash
# SSH to VPS
ssh root@your-vps-ip

# Navigate to project
cd /var/www/nic-callcenter

# Pull latest code
git pull origin main

# Build application
npm run build

# Reload Nginx
sudo systemctl reload nginx

# Verify deployment
curl -I https://payments.niclmauritius.site
```

### **Step 4: Verify in Production**
```bash
# Open browser console
# Generate QR codes for all LOBs including Non Motor
# Check console logs:
# 🏦 Merchant ID selected: 151 for LOB: life
# 🏦 Merchant ID selected: 153 for LOB: health
# 🏦 Merchant ID selected: 155 for LOB: motor
# 🏦 Merchant ID selected: 171 for LOB: nonmotor  ← NEW
```

---

## 📝 Documentation Updates

### **Files to Update:**

1. **`LOB_MERCHANT_CODES.md`**
   - Add Non Motor to merchant codes table
   - Update examples to include Non Motor

2. **`README.md`** (if it lists LOB options)
   - Add Non Motor to supported LOBs

3. **User Documentation** (if exists)
   - Update screenshots showing dropdown
   - Add Non Motor to user guides

---

## ⚠️ Potential Issues & Solutions

### **Issue 1: Policy Number Validation**
**Problem**: Non Motor policies may have specific format requirements  
**Solution**: 
- Start with no validation (like Life insurance)
- Add validation later if business rules are defined

### **Issue 2: Display Name Formatting**
**Problem**: "Nonmotor" looks awkward in emails  
**Solution**: 
- Option A: Keep as "Nonmotor" (simple, works)
- Option B: Add `getLOBDisplayName()` helper for "Non-Motor"

### **Issue 3: Dashboard Card**
**Problem**: LOB Dashboard doesn't show Non Motor card  
**Solution**: 
- Phase 1: Include in totals only (minimal change)
- Phase 2: Add separate card later if needed

### **Issue 4: ZwennPay Merchant Activation**
**Problem**: Merchant ID 171 may not be activated in ZwennPay  
**Solution**: 
- Verify with ZwennPay that merchant 171 is active
- Test QR code scanning before production deployment

---

## 📊 Success Criteria

### **Functional Requirements**
- ✅ Non Motor option appears in all relevant dropdowns
- ✅ Merchant ID 171 is correctly assigned to Non Motor
- ✅ QR codes generate successfully for Non Motor
- ✅ Email templates display "Nonmotor Insurance" correctly
- ✅ Validation accepts 'nonmotor' as valid LOB
- ✅ CSV upload works with 'nonmotor' value

### **Non-Functional Requirements**
- ✅ No breaking changes to existing LOBs
- ✅ Backward compatibility maintained
- ✅ No performance degradation
- ✅ Code follows existing patterns
- ✅ All tests pass

---

## 🔄 Rollback Plan

If issues arise after deployment:

### **Quick Rollback (5 minutes)**
```bash
# SSH to VPS
ssh root@your-vps-ip
cd /var/www/nic-callcenter

# Revert to previous commit
git log --oneline  # Find previous commit hash
git reset --hard <previous-commit-hash>

# Rebuild and reload
npm run build
sudo systemctl reload nginx
```

### **Partial Rollback**
If only specific features need rollback:
- Remove 'nonmotor' from validation arrays
- Hide Non Motor option in dropdowns (comment out)
- Keep merchant code in place (no harm)

---

## 📞 Support & Questions

### **Before Implementation:**
- Confirm merchant ID 171 is activated in ZwennPay
- Confirm policy number format requirements for Non Motor
- Confirm if dashboard card is needed immediately

### **During Implementation:**
- Test each file change individually
- Verify console logs at each step
- Test QR generation after each change

### **After Deployment:**
- Monitor error logs for 24 hours
- Test with real Non Motor customers
- Gather user feedback

---

## 📅 Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Planning** | 30 min | Review document, confirm requirements |
| **Development** | 1 hour | Make code changes, local testing |
| **Testing** | 30 min | Integration testing, QR generation |
| **Deployment** | 15 min | Git commit, VPS deployment |
| **Verification** | 15 min | Production testing, monitoring |
| **Total** | **2.5 hours** | End-to-end implementation |

---

## ✅ Approval Checklist

Before proceeding with implementation:

- [ ] Business confirms merchant ID 171 is correct
- [ ] ZwennPay confirms merchant 171 is activated
- [ ] Policy number format requirements confirmed (or none)
- [ ] Display name preference confirmed ("Nonmotor" vs "Non-Motor")
- [ ] Dashboard card requirement confirmed (now or later)
- [ ] Database schema verified to accept 'nonmotor'
- [ ] Testing plan approved
- [ ] Deployment window scheduled

---

**Document Version**: 1.0  
**Last Updated**: January 22, 2026  
**Status**: 📝 Awaiting Approval  
**Next Step**: Review and approve implementation plan
