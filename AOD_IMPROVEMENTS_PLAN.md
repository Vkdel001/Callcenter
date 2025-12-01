# AOD Improvements Implementation Plan

**Date**: November 29, 2024  
**Status**: Ready for Implementation

---

## 📋 Changes to Implement

### **1. Editable AOD Amount** ✅

**File**: `src/components/modals/PaymentPlanModal.jsx`

**Changes:**
- Line 346: Change `disabled` input to editable
- Line 346: Register field with react-hook-form
- Line 351: Update help text
- Line 25: Keep default value from customer.amountDue
- Line 48: Use `watchedValues.outstanding_amount` instead of `customer.amountDue` for calculations

**Impact:**
- Agents can now edit the AOD amount before creating
- Amount is validated (must be positive)
- Calculations update automatically when amount changes

---

### **2. Label Changes** ✅

**File**: `src/components/modals/PaymentPlanModal.jsx`

**Changes:**
- Line 343: "Outstanding Amount (MUR)" → "Amount for AOD (MUR)"
- Line 557: "Outstanding Amount:" → "Amount for AOD:"

**Impact:**
- Clearer terminology throughout the UI
- Consistent with business requirements

---

### **3. Customer Data Integration in PDF** ✅

**File**: `src/services/aodPdfService.js`

**Changes in `addPartiesSection` method:**

**Current (Lines 90-110):**
```javascript
const line1 = `Mr/Mrs/Ms ${customer.name || '_'.repeat(30)} holder of National Identity Card`
const line2 = `No. ${customerNic || '_'.repeat(15)}, residing at ${customerAddress || '_'.repeat(40)}`
```

**New:**
```javascript
// Owner 1 (Primary)
const title1 = customer.title_owner1 || 'Mr/Mrs/Ms'
const name1 = customer.name || '_'.repeat(30)
const nic1 = customer.national_id || '_'.repeat(15)
const address = customer.address || '_'.repeat(40)

const line1 = `${title1} ${name1} holder of National Identity Card`
const line2 = `No. ${nic1}, residing at ${address}`

// Owner 2 (Secondary) - Only if exists
if (customer.name_owner2) {
  const title2 = customer.title_owner2 || 'Mr/Mrs/Ms'
  const name2 = customer.name_owner2
  const nic2 = customer.national_id_owner2 || '_'.repeat(15)
  // Show actual owner 2 data
} else {
  // Show blank lines for manual filling
}
```

**Impact:**
- Professional appearance with actual customer data
- Legal compliance (real names and IDs)
- Supports joint policies (2 owners)
- Falls back to blank lines if data missing

---

### **4. PDF Formatting Improvements** ✅

**File**: `src/services/aodPdfService.js`

**Typography Improvements:**
- Consistent font hierarchy
- Better line spacing
- Proper text wrapping

**Layout Improvements:**
- Better margins and padding
- Improved signature section
- Professional table formatting
- Enhanced visual hierarchy

**Specific Changes:**
1. **Signature Section** (Page 2):
   - Add "Sign here" indicators
   - Better spacing between boxes
   - Add date fields next to signatures
   - Subtle borders

2. **Installment Table**:
   - Right-align amounts
   - Center-align status
   - Better cell padding
   - Subtle borders

3. **Text Formatting**:
   - Consistent use of `pdf.splitTextToSize()`
   - Proper line height calculations
   - Better section spacing

---

## 🔧 Implementation Order

1. **PaymentPlanModal.jsx** - Editable amount + label changes
2. **aodPdfService.js** - Customer data integration
3. **aodPdfService.js** - PDF formatting improvements

---

## ✅ Testing Checklist

After implementation:

- [ ] Amount field is editable in AOD modal
- [ ] Amount validation works (positive numbers only)
- [ ] Calculations update when amount changes
- [ ] Label shows "Amount for AOD" everywhere
- [ ] PDF shows actual customer name
- [ ] PDF shows actual national ID
- [ ] PDF shows actual address
- [ ] PDF shows owner 2 if exists
- [ ] PDF formatting looks professional
- [ ] Signature section is clear
- [ ] Installment table is well-formatted
- [ ] No data is cut off or misaligned

---

## 📊 Expected Results

**Before:**
- Amount: Fixed, not editable
- Label: "Outstanding Amount"
- PDF: Blank lines for name, ID, address
- PDF: Basic formatting

**After:**
- Amount: Editable, validated
- Label: "Amount for AOD"
- PDF: Actual customer data filled in
- PDF: Professional formatting with better alignment

---

**Ready to proceed with implementation!**
