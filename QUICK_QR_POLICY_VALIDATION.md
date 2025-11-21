# Quick QR Generator - Policy Number Validation

## 🎯 Overview

The Quick QR Generator now includes **strict policy number validation** to ensure data accuracy and prevent incorrect QR code generation. The system validates policy numbers based on the selected Line of Business (LOB) and requires double confirmation before generating QR codes.

---

## 📋 Validation Rules

### **Health Insurance**
**Requirements:**
- ✅ Must start with **"MED"** (case-insensitive)
- ✅ Must contain **4-5 slashes** (/)
- ✅ Example: `MED/2023/260/11/0028` (4 slashes)
- ✅ Example: `MED/2023/260/11/0028/1` (5 slashes)

**Invalid Examples:**
- ❌ `HEALTH/2023/001` - Doesn't start with MED
- ❌ `MED/2023/001` - Only 2 slashes (needs 4-5)
- ❌ `MED-2023-001` - Uses hyphens instead of slashes

### **Motor Insurance**
**Requirements:**
- ✅ Must start with **"P"** (case-insensitive)
- ✅ Must contain **3-5 slashes** (/)
- ✅ Must contain at least **one hyphen** (-)
- ✅ Example: `P/2024/001-M/123` (3 slashes + hyphen)
- ✅ Example: `P/2024/001-M/123/456` (4 slashes + hyphen)
- ✅ Example: `P/2024/001-M/123/456/789` (5 slashes + hyphen)

**Invalid Examples:**
- ❌ `M/2024/001-M` - Doesn't start with P
- ❌ `P/2024/001` - No hyphen
- ❌ `P/2024` - Only 1 slash (needs 3-5)
- ❌ `P-2024-001-M` - Uses hyphens instead of slashes

### **Life Insurance**
**Requirements:**
- ✅ **No specific validation** - Flexible format accepted
- ✅ Any format is valid
- ✅ Example: `LIFE/001`, `L-2024-001`, `12345`

---

## 🔒 Double Confirmation System

### **Confirmation Dialog**
Before generating a QR code, users must:

1. **Review Details**: Customer name, policy number, amount, LOB, merchant ID
2. **Type LOB Name**: Must type the exact LOB name to confirm
   - For Life: Type "**life**"
   - For Health: Type "**health**"
   - For Motor: Type "**motor**"
3. **Confirm**: Button remains disabled until correct text is entered

**Purpose:**
- Prevents accidental QR generation
- Ensures user awareness of LOB selection
- Reduces errors in payment processing
- Provides final review opportunity

---

## 🎨 User Interface Features

### **Real-time Validation Feedback**

**Valid Policy Number:**
```
✅ Policy number format is valid
```

**Invalid Policy Number:**
```
⚠️ Health policy must start with "MED"
⚠️ Health policy must have 4-5 slashes (/)
⚠️ Motor policy must start with "P"
⚠️ Motor policy must have 3-5 slashes (/)
⚠️ Motor policy must contain a hyphen (-)
```

### **Format Hints**

**Health Insurance:**
```
Format: MED/YYYY/XXX/XX/XXXX (4-5 slashes)
```

**Motor Insurance:**
```
Format: P/YYYY/XXX-X/XXX (3-5 slashes + hyphen required)
```

**Life Insurance:**
```
Format: Flexible (any format accepted)
```

### **Button States**

**Generate QR Button:**
- ✅ **Enabled**: When all fields valid + policy number passes validation
- ❌ **Disabled**: When policy number fails validation or required fields missing
- 🔄 **Loading**: During QR generation

**Visual Feedback:**
```
⚠️ Please fix policy number format
```

---

## 🔄 Complete User Flow

### **Step 1: Select LOB**
```
User selects: "Health Insurance"
↓
System shows: "Merchant IDs: Life=151, Health=153, Motor=155"
↓
Format hint appears: "Format: MED/YYYY/XXX/XX/XXXX (4-5 slashes)"
```

### **Step 2: Enter Policy Number**
```
User types: "MED/2023/260/11/0028"
↓
Real-time validation: ✅ Policy number format is valid
↓
Generate button: ENABLED
```

### **Step 3: Fill Other Fields**
```
User fills: Name, Mobile, Amount, etc.
↓
All required fields complete
↓
Generate button: ENABLED (if policy valid)
```

### **Step 4: Click Generate**
```
User clicks: "Generate Payment QR"
↓
Confirmation dialog appears
↓
Shows: Customer details, LOB, Merchant ID
↓
Requires: Type "health" to confirm
```

### **Step 5: Confirm Generation**
```
User types: "health"
↓
Confirm button: ENABLED
↓
User clicks: "Confirm & Generate"
↓
QR code generated with merchant ID 153
```

---

## 🧪 Test Cases

### **Health Insurance - Valid**
```javascript
LOB: "health"
Policy: "MED/2023/260/11/0028"
Slashes: 4 ✅
Starts with MED: ✅
Result: VALID ✅
```

### **Health Insurance - Invalid (Wrong Prefix)**
```javascript
LOB: "health"
Policy: "HEALTH/2023/260/11/0028"
Slashes: 4 ✅
Starts with MED: ❌
Result: INVALID ❌
Error: "Health policy must start with 'MED'"
```

### **Health Insurance - Invalid (Too Few Slashes)**
```javascript
LOB: "health"
Policy: "MED/2023/001"
Slashes: 2 ❌
Starts with MED: ✅
Result: INVALID ❌
Error: "Health policy must have 4-5 slashes (/)"
```

### **Motor Insurance - Valid**
```javascript
LOB: "motor"
Policy: "P/2024/001-M/123"
Slashes: 3 ✅
Starts with P: ✅
Has hyphen: ✅
Result: VALID ✅
```

### **Motor Insurance - Invalid (No Hyphen)**
```javascript
LOB: "motor"
Policy: "P/2024/001/123"
Slashes: 3 ✅
Starts with P: ✅
Has hyphen: ❌
Result: INVALID ❌
Error: "Motor policy must contain a hyphen (-)"
```

### **Motor Insurance - Invalid (Wrong Prefix)**
```javascript
LOB: "motor"
Policy: "M/2024/001-M/123"
Slashes: 3 ✅
Starts with P: ❌
Has hyphen: ✅
Result: INVALID ❌
Error: "Motor policy must start with 'P'"
```

### **Life Insurance - Always Valid**
```javascript
LOB: "life"
Policy: "LIFE/001" or "L-2024" or "12345"
Result: VALID ✅ (no validation rules)
```

---

## 💻 Implementation Details

### **Validation Function**
```javascript
const validatePolicyNumber = (policyNumber, lob) => {
  const slashCount = (policyNumber.match(/\//g) || []).length
  const hasHyphen = policyNumber.includes('-')
  
  if (lob === 'health') {
    if (!policyNumber.toUpperCase().startsWith('MED')) {
      return { valid: false, error: 'Health policy must start with "MED"' }
    }
    if (slashCount < 4 || slashCount > 5) {
      return { valid: false, error: 'Health policy must have 4-5 slashes (/)' }
    }
    return { valid: true }
  }
  
  if (lob === 'motor') {
    if (!policyNumber.toUpperCase().startsWith('P')) {
      return { valid: false, error: 'Motor policy must start with "P"' }
    }
    if (slashCount < 3 || slashCount > 5) {
      return { valid: false, error: 'Motor policy must have 3-5 slashes (/)' }
    }
    if (!hasHyphen) {
      return { valid: false, error: 'Motor policy must contain a hyphen (-)' }
    }
    return { valid: true }
  }
  
  // Life: No validation
  return { valid: true }
}
```

### **Button Disable Logic**
```javascript
const isPolicyValid = () => {
  if (!watchedLOB || !watchedPolicyNumber) return false
  const validation = validatePolicyNumber(watchedPolicyNumber, watchedLOB)
  return validation.valid
}

<button
  disabled={generateQRMutation.isLoading || !isPolicyValid()}
>
  Generate Payment QR
</button>
```

### **Confirmation Dialog**
```javascript
const handleConfirmGeneration = () => {
  const expectedConfirmation = pendingFormData.lineOfBusiness.toLowerCase()
  const userInput = confirmationInput.toLowerCase().trim()
  
  if (userInput !== expectedConfirmation) {
    alert(`❌ Please type "${expectedConfirmation}" to confirm`)
    return
  }
  
  // Proceed with QR generation
  generateQRMutation.mutate(customerData)
}
```

---

## 🎯 Benefits

### **Data Accuracy**
- ✅ Prevents incorrect policy number formats
- ✅ Ensures consistency across LOBs
- ✅ Reduces payment processing errors

### **User Experience**
- ✅ Real-time feedback guides users
- ✅ Clear error messages explain issues
- ✅ Format hints show expected patterns
- ✅ Button states indicate form validity

### **Error Prevention**
- ✅ Double confirmation prevents accidents
- ✅ Validation catches mistakes early
- ✅ Clear rules reduce confusion
- ✅ Disabled button prevents invalid submissions

### **Compliance**
- ✅ Enforces company policy number standards
- ✅ Maintains data integrity
- ✅ Supports audit requirements
- ✅ Reduces manual corrections

---

## 📝 User Training Guide

### **For Health Insurance QR:**
1. Select "Health Insurance" from dropdown
2. Enter policy starting with "MED"
3. Ensure 4-5 slashes in policy number
4. Example: `MED/2023/260/11/0028`
5. Watch for ✅ validation message
6. Click Generate, type "health" to confirm

### **For Motor Insurance QR:**
1. Select "Motor Insurance" from dropdown
2. Enter policy starting with "P"
3. Ensure 3-5 slashes AND one hyphen
4. Example: `P/2024/001-M/123`
5. Watch for ✅ validation message
6. Click Generate, type "motor" to confirm

### **For Life Insurance QR:**
1. Select "Life Insurance" from dropdown
2. Enter any policy format (flexible)
3. No specific validation required
4. Click Generate, type "life" to confirm

---

## ✅ Testing Checklist

**Health Insurance:**
- [ ] Valid: `MED/2023/260/11/0028` (4 slashes)
- [ ] Valid: `MED/2023/260/11/0028/1` (5 slashes)
- [ ] Invalid: `HEALTH/2023/001` (wrong prefix)
- [ ] Invalid: `MED/2023/001` (too few slashes)
- [ ] Button disabled when invalid
- [ ] Confirmation dialog requires "health"

**Motor Insurance:**
- [ ] Valid: `P/2024/001-M/123` (3 slashes + hyphen)
- [ ] Valid: `P/2024/001-M/123/456` (4 slashes + hyphen)
- [ ] Invalid: `M/2024/001-M` (wrong prefix)
- [ ] Invalid: `P/2024/001` (no hyphen)
- [ ] Invalid: `P/2024` (too few slashes)
- [ ] Button disabled when invalid
- [ ] Confirmation dialog requires "motor"

**Life Insurance:**
- [ ] Any format accepted
- [ ] Button enabled with any policy
- [ ] Confirmation dialog requires "life"

---

**Implementation Date**: November 1, 2025  
**Status**: ✅ Complete and Ready for Testing  
**Next Steps**: Test validation rules, then deploy to production
