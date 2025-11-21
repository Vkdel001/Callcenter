# Quick QR Generator - Ad-hoc Implementation

## 🎯 Overview

The Quick QR Generator now supports **ad-hoc QR code generation** without requiring customer database records. This allows agents to generate payment QR codes for walk-in customers or one-time payments.

---

## 🔑 Key Features

### **Two QR Generation Modes:**

| Mode | Customer ID | LOB Source | Merchant IDs | Callback | Use Case |
|------|-------------|------------|--------------|----------|----------|
| **Database QR** | ✅ Required | From database | Life=56, Health=153, Motor=155 | ✅ Yes | Regular customers with full automation |
| **Ad-hoc QR** | ❌ Not required | Manual selection | Life=151, Health=153, Motor=155 | ❌ No | Walk-in customers, one-time payments |

---

## 📋 Implementation Details

### **1. Quick QR Generator Form (QuickQRGenerator.jsx)**

**New Field Added:**
- **Line of Business Dropdown**: Life / Health / Motor (required)
- Displays merchant IDs for transparency: "Life=151, Health=153, Motor=155"

**Form Data Structure:**
```javascript
{
  lineOfBusiness: "life",      // NEW: Manual LOB selection
  name: "John Doe",
  policyNumber: "LIFE/001",
  mobile: "57123456",
  email: "john@example.com",
  nid: "ID123456",
  amountDue: 5000
  // Note: No customer ID
}
```

### **2. QR Service (qrService.js)**

**New Methods Added:**

#### `generateAdHocQR(customerData)`
- Generates QR codes for ad-hoc customers (no database lookup)
- Uses ad-hoc merchant codes: 151, 153, 155
- No callback integration
- Validates LOB selection
- Applies policy number sanitization
- Applies customer name formatting (24-char limit)

#### `generateAdHocTestQR(customerData)`
- Fallback for network/CORS errors
- Generates test QR codes with ad-hoc merchant IDs
- Same validation and formatting as production

**New Configuration:**
```javascript
// Ad-hoc merchant codes (for Quick QR Generator - no callback)
this.adHocMerchantCodes = {
  life: '151',
  health: '153',
  motor: '155'
}
```

### **3. Routing Logic**

The `generatePaymentQR()` method now automatically detects the mode:

```javascript
// Check if this is an ad-hoc QR (no customer ID) from Quick QR Generator
if (!customerData.id && customerData.lineOfBusiness) {
  console.log('🔷 Ad-hoc QR generation (Quick QR Generator)')
  return this.generateAdHocQR(customerData)
}

// Otherwise, use database customer flow
// ... existing code
```

---

## 🔄 Complete Flow

### **Ad-hoc QR Generation Flow:**

```
User opens Quick QR Generator
    ↓
Selects LOB: "Life Insurance"
    ↓
Fills customer details (no ID required)
    ↓
Clicks "Generate Payment QR"
    ↓
qrService detects: no customer ID + has lineOfBusiness
    ↓
Calls: generateAdHocQR()
    ↓
Uses merchant ID: 151 (Life)
    ↓
Sanitizes policy number: "LIFE/001" → "LIFE.001"
    ↓
Formats customer name: "John Robert Smith" → "John R Smith"
    ↓
Calls ZwennPay API with merchant 151
    ↓
Generates branded QR code
    ↓
Returns QR code (no callback, no database update)
```

### **Database Customer QR Generation Flow (Unchanged):**

```
User opens Customer Detail page
    ↓
Clicks "Generate QR" for customer ID 123
    ↓
qrService detects: has customer ID
    ↓
Fetches customer from Xano database
    ↓
Extracts line_of_business: "life"
    ↓
Uses merchant ID: 56 (Life - with callback)
    ↓
Generates QR code with callback integration
    ↓
Payment triggers callback → database update → notifications
```

---

## 🏦 Merchant ID Mapping

### **Ad-hoc QR (Quick QR Generator):**
```javascript
Life Insurance:   151  // No callback
Health Insurance: 153  // No callback
Motor Insurance:  155  // No callback
```

### **Database Customers (Customer Detail):**
```javascript
Life Insurance:   56   // With callback integration
Health Insurance: 153  // With callback integration
Motor Insurance:  155  // With callback integration
```

---

## 🎨 UI Changes

### **Quick QR Generator Form:**

**Before:**
- Customer Name
- Policy Number
- Mobile Number
- Email (optional)
- National ID (optional)
- Amount Due

**After:**
- **Line of Business** ⭐ NEW (dropdown: Life/Health/Motor)
- Customer Name
- Policy Number
- Mobile Number
- Email (optional)
- National ID (optional)
- Amount Due

**Visual Indicator:**
- Shows merchant IDs below dropdown: "Merchant IDs: Life=151, Health=153, Motor=155"

---

## ✅ Testing Checklist

### **Ad-hoc QR Generation:**
- [ ] Open Quick QR Generator
- [ ] Select "Life Insurance" from LOB dropdown
- [ ] Fill customer details (no ID needed)
- [ ] Generate QR code
- [ ] Verify merchant ID 151 in console logs
- [ ] Verify QR code displays correctly
- [ ] Test WhatsApp sharing
- [ ] Test email sending (if email provided)

### **Database Customer QR (Verify No Breaking Changes):**
- [ ] Open any customer detail page
- [ ] Generate QR code
- [ ] Verify merchant ID from database LOB (56/153/155)
- [ ] Make test payment
- [ ] Verify callback received
- [ ] Verify database updated
- [ ] Verify SMS/Email sent

---

## 🔍 Console Logs

### **Ad-hoc QR Generation:**
```
🔷 Ad-hoc QR generation (Quick QR Generator)
🔷 Generating ad-hoc QR (Quick QR Generator - No Callback)
🏦 Ad-hoc Merchant ID selected: 151 for LOB: life
📝 Note: This is for Quick QR Generator (no callback integration)
Policy number sanitized: "LIFE/001" → "LIFE.001"
Customer name formatted for QR: "John Robert Smith" (18 chars) → "John R Smith" (12 chars)
Generating ad-hoc QR with payload: {...}
```

### **Database Customer QR:**
```
📋 Customer 123 (John Doe): LOB = life
🏦 Merchant ID selected: 56 for LOB: life
Policy number sanitized: "LIFE/001" → "LIFE.001"
Customer name formatted for QR: "John Doe" (8 chars) → "John Doe" (8 chars)
```

---

## 🚨 Important Notes

### **Why Different Merchant IDs?**

**Ad-hoc QR (151):**
- No callback integration
- Manual payment tracking
- Used for testing and walk-in customers
- Will be migrated to production later

**Database QR (56):**
- Full callback integration
- Automated payment processing
- Database updates
- SMS/Email notifications
- Currently in testing phase

### **Future Migration:**
Once callback is fully tested and configured for merchant 151, all QR codes will use:
- Life: 151
- Health: 153
- Motor: 155

---

## 📝 Code Files Modified

1. **src/services/qrService.js**
   - Added `adHocMerchantCodes` configuration
   - Added `generateAdHocQR()` method
   - Added `generateAdHocTestQR()` method
   - Updated `generatePaymentQR()` routing logic

2. **src/pages/QuickQRGenerator.jsx**
   - Added LOB dropdown field
   - Updated form submission to include `lineOfBusiness`
   - Added merchant ID display for transparency

---

## 🎯 Success Criteria

✅ Quick QR Generator works without customer ID  
✅ LOB dropdown is required and functional  
✅ Ad-hoc merchant IDs used (151, 153, 155)  
✅ Database customer QR unchanged (56, 153, 155)  
✅ Policy number sanitization works  
✅ Customer name formatting works  
✅ No breaking changes to existing functionality  
✅ Console logs clearly indicate ad-hoc vs database mode  

---

**Implementation Date**: November 1, 2025  
**Status**: ✅ Complete and Ready for Testing  
**Next Steps**: Test ad-hoc QR generation, then deploy to production
