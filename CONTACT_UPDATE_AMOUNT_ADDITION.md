# Contact Update Feature - Amount Correction Addition

**Date**: November 28, 2024  
**Change**: Added amount correction fields to capture incorrect amounts

---

## 🎯 What Changed

### New Fields Added

**Field 7: `old_amount`**
- Type: decimal (10,2)
- Required: No
- Description: Original amount due from system
- Example: 4491.29

**Field 8: `new_amount`**
- Type: decimal (10,2)
- Required: No
- Description: Corrected amount due provided by customer
- Example: 4500.00

---

## 💡 Why This Change?

### Business Problem
- Customers sometimes report that the amount due is incorrect
- Agents have no way to capture the correct amount
- Payment discrepancies cause confusion and delays

### Solution
- Allow agents to capture both old and new amounts
- Store for admin review and master system sync
- Use corrected amount for QR code generation if provided

---

## 🎨 Updated UI Design

### Update Contact Modal (With Amount)

```
┌─────────────────────────────────────────────────────────┐
│ Update Customer Information                      [✕]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Customer: Kevin Anderson Curepipe                       │
│ Policy: LIB/C7013                                       │
│                                                         │
│ ─────────────────────────────────────────────────────── │
│                                                         │
│ Mobile Number                                           │
│ Current: 57372333                                       │
│ New:     [_________________________] (optional)         │
│                                                         │
│ Email Address                                           │
│ Current: vikas.khanna@zwennpay.com                     │
│ New:     [_________________________] (optional)         │
│                                                         │
│ Amount Due                                              │
│ Current: MUR 4,491.29                                   │
│ New:     [_________________________] (optional)         │
│          Format: Numbers only (e.g., 4500.00)          │
│                                                         │
│ Update Reason *                                         │
│ [▼ Select reason                                    ]   │
│   - Customer provided new contact                       │
│   - Current contact is incorrect                        │
│   - Amount is incorrect                          ← NEW  │
│   - Contact and amount incorrect                 ← NEW  │
│   - Email bounced / SMS failed                          │
│   - Customer requested update                           │
│   - Other                                               │
│                                                         │
│ Additional Notes (optional)                             │
│ [_________________________________________________]     │
│                                                         │
│ ℹ️ Updated information will be used immediately for    │
│    QR code generation and future communications.        │
│                                                         │
│                          [Cancel]  [Save & Continue]    │
└─────────────────────────────────────────────────────────┘
```

### Validation Rules

**Amount Field:**
- Optional (can be left empty)
- If provided: Must be a valid decimal number
- Format: Up to 10 digits, 2 decimal places
- Example: 4500.00, 1234.56
- No currency symbol needed

**At Least One Update:**
- Must provide at least ONE of: new mobile, new email, OR new amount
- Cannot save without any updates

---

## 📊 Updated Table Structure

### Complete Field List (16 fields)

```
1.  id (integer, auto-increment)
2.  customer_id (relationship to nic_cc_customer)
3.  old_mobile (text, optional)
4.  new_mobile (text, optional)
5.  old_email (text, optional)
6.  new_email (text, optional)
7.  old_amount (decimal, optional) ← NEW
8.  new_amount (decimal, optional) ← NEW
9.  update_reason (text, required)
10. notes (text, optional)
11. agent_id (integer, required)
12. agent_name (text, required)
13. captured_at (timestamp, default: now)
14. status (text, default: "pending")
15. synced_at (timestamp, optional)
16. synced_by (integer, optional)
```

---

## 🔌 Updated API Request/Response

### Create Contact Update Request

```json
{
  "customer_id": 12345,
  "old_mobile": "57372333",
  "new_mobile": "58123456",
  "old_email": "old@email.com",
  "new_email": "new@email.com",
  "old_amount": 4491.29,
  "new_amount": 4500.00,
  "update_reason": "Contact and amount incorrect",
  "notes": "Customer confirmed correct amount is MUR 4500",
  "agent_id": 24,
  "agent_name": "David Brown"
}
```

### API Response

```json
{
  "id": 1,
  "customer_id": {
    "id": 12345,
    "policy_number": "LIB/C7013",
    "name": "Kevin Anderson Curepipe",
    "mobile": "57372333",
    "email": "old@email.com",
    "amount_due": 4491.29
  },
  "old_mobile": "57372333",
  "new_mobile": "58123456",
  "old_email": "old@email.com",
  "new_email": "new@email.com",
  "old_amount": 4491.29,
  "new_amount": 4500.00,
  "update_reason": "Contact and amount incorrect",
  "notes": "Customer confirmed correct amount is MUR 4500",
  "agent_id": 24,
  "agent_name": "David Brown",
  "captured_at": "2024-11-28T10:30:00Z",
  "status": "pending"
}
```

---

## 💻 Code Logic Changes

### 1. QR Generation Logic

**Before:**
```javascript
// Use amount from customer record
const qrAmount = customer.amount_due;
```

**After:**
```javascript
// Check for updated amount first
const latestUpdate = await contactUpdateService.getLatestContact(customer.id);
const qrAmount = latestUpdate?.new_amount || customer.amount_due;
```

### 2. Update Reason Dropdown

Add new options:
- "Amount is incorrect"
- "Contact and amount incorrect"

### 3. Validation Logic

```javascript
// At least one field must be updated
const hasUpdate = 
  newMobile || 
  newEmail || 
  newAmount;

if (!hasUpdate) {
  return error("Please update at least one field");
}

// Amount validation
if (newAmount) {
  if (isNaN(newAmount) || newAmount <= 0) {
    return error("Amount must be a valid positive number");
  }
  if (newAmount > 999999.99) {
    return error("Amount is too large");
  }
}
```

### 4. Admin Report Display

**CSV Export Columns:**
```
Policy Number, Customer Name, 
Old Mobile, New Mobile, 
Old Email, New Email,
Old Amount, New Amount,  ← NEW
Reason, Notes, Agent, Date, Status
```

---

## 📋 Updated Testing Checklist

### Amount-Specific Tests

- [ ] Can enter new amount (decimal format)
- [ ] Amount validation works (rejects negative, text, etc.)
- [ ] Can update amount only (without contact changes)
- [ ] Can update amount + contact together
- [ ] Updated amount is used for QR generation
- [ ] Amount displays correctly in admin report
- [ ] Amount exports correctly to CSV
- [ ] Large amounts handled correctly (up to 999,999.99)
- [ ] Decimal precision maintained (2 decimal places)

---

## 🎯 Use Cases

### Use Case 1: Amount Only Update
```
Agent: "Customer says amount should be MUR 4500, not MUR 4491.29"
Action: Update amount only, leave contact info unchanged
Result: QR generated with MUR 4500
```

### Use Case 2: Contact + Amount Update
```
Agent: "Customer has new email AND says amount is wrong"
Action: Update both email and amount
Result: QR sent to new email with corrected amount
```

### Use Case 3: Amount Verification
```
Admin: Reviews pending updates
Sees: Old Amount: 4491.29 → New Amount: 4500.00
Action: Verifies with finance team, marks as synced
```

---

## 📊 Admin Report Enhancement

### Updated Report Table

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Policy    │ Customer  │ Contact Updates    │ Amount Updates  │ Agent │ Date │ Status │
├──────────────────────────────────────────────────────────────────────────────────┤
│ LIB/C7013 │ Kevin A.  │ 📱 57372333→58123456│ 4491.29→4500.00│ David │ Today│ Pending│
│           │           │ ✉️ old→new@mail.com │                 │       │      │        │
├──────────────────────────────────────────────────────────────────────────────────┤
│ LIB/C7014 │ John D.   │ No changes         │ 3200.00→3250.00│ Sarah │ Today│ Pending│
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Impact

### Files to Update

1. **Database** (Xano)
   - Add `old_amount` field (decimal)
   - Add `new_amount` field (decimal)

2. **Frontend Components**
   - `UpdateContactModal.jsx` - Add amount input field
   - `ContactUpdateReport.jsx` - Display amount columns

3. **Services**
   - `contactUpdateService.js` - Handle amount in API calls
   - `qrService.js` - Use updated amount for QR generation

4. **Validation**
   - Add amount validation rules
   - Update "at least one field" logic

### Estimated Additional Time

- Database: +5 minutes (2 fields)
- UI: +30 minutes (amount input + validation)
- Logic: +20 minutes (QR amount logic)
- Testing: +15 minutes (amount-specific tests)

**Total Additional Time**: ~1 hour

---

## ✅ Summary

**What's New:**
- ✅ Agents can capture incorrect amounts
- ✅ Corrected amount used for QR generation
- ✅ Amount updates tracked in admin report
- ✅ Full audit trail of amount changes

**Benefits:**
- Reduces payment errors
- Improves customer satisfaction
- Better data quality for finance team
- Complete audit trail for amount corrections

---

**Document Version**: 1.0  
**Last Updated**: November 28, 2024  
**Status**: Ready for Implementation
