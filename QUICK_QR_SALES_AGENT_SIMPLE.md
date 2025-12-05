# Quick QR Generator - Sales Agent Implementation (Simple Version)

## ✅ **What Was Implemented**

### **1. Sales Agent Access**
- ✅ Quick QR Generator added to sales agent sidebar
- ✅ Sales agents can now access `/quick-qr` route

### **2. Role-Based UI Changes**

#### **For Sales Agents:**
- **Page Title:** "New Customer Payment QR"
- **Description:** "Generate payment QR codes for new customers (application form stage)"
- **Policy Number Field:** Changed to "Application Form Number *"
- **Placeholder:** "e.g., APP-2024-001"
- **Validation:** NO validation (any format accepted)
- **National ID:** MANDATORY (required field)
- **NID Placeholder:** "e.g., A0101851234567 (required)"
- **NID Validation:** Minimum 10 characters

#### **For CSR/Call Center Agents:**
- **Page Title:** "Quick QR Generator"
- **Description:** "Generate payment QR codes for any customer instantly"
- **Policy Number Field:** "Policy Number *"
- **Placeholder:** "e.g., MED/2023/260/11/0028/1"
- **Validation:** YES (LOB-specific format validation)
- **National ID:** OPTIONAL
- **NID Placeholder:** "National ID (optional)"

---

## 🎯 **Key Differences**

| Feature | Sales Agent | CSR/Call Center |
|---------|-------------|-----------------|
| **Field Label** | Application Form Number | Policy Number |
| **Validation** | None (any format) | LOB-specific format |
| **National ID** | Mandatory | Optional |
| **Use Case** | New customers (pre-policy) | Existing customers |
| **Confirmation** | Still required | Still required |

---

## 📋 **How It Works**

### **Sales Agent Flow:**
1. Login as sales agent
2. Click "Quick QR Generator" in sidebar
3. See "New Customer Payment QR" page
4. Fill form:
   - Select LOB (Life/Health/Motor)
   - Enter customer name
   - Enter **Application Form Number** (any format)
   - Enter mobile number
   - Enter email (optional)
   - Enter **National ID** (mandatory)
   - Enter amount
5. Click "Generate Payment QR"
6. Confirm by typing LOB name
7. QR generated successfully

### **CSR Agent Flow:**
1. Login as CSR agent
2. Click "Quick QR Generator" in sidebar
3. See "Quick QR Generator" page
4. Fill form:
   - Select LOB (Life/Health/Motor)
   - Enter customer name
   - Enter **Policy Number** (validated format)
   - Enter mobile number
   - Enter email (optional)
   - Enter National ID (optional)
   - Enter amount
5. Click "Generate Payment QR"
6. Confirm by typing LOB name
7. QR generated successfully

---

## 🔧 **Technical Implementation**

### **Files Modified:**
1. ✅ `src/pages/QuickQRGenerator.jsx` - Added role-based logic
2. ✅ `src/components/layout/Sidebar.jsx` - Already had Quick QR for sales agents

### **Code Changes:**

#### **1. Detect User Role**
```javascript
import { useAuth } from '../contexts/AuthContext'

const { user } = useAuth()
const isSalesAgent = user?.agent_type === 'sales_agent'
```

#### **2. Conditional Field Label**
```javascript
{isSalesAgent ? 'Application Form Number *' : 'Policy Number *'}
```

#### **3. Skip Validation for Sales Agents**
```javascript
// Check if form is valid for submission
const isPolicyValid = () => {
  if (!watchedLOB || !watchedPolicyNumber) return false
  // Sales agents don't need validation
  if (isSalesAgent) return true
  const validation = validatePolicyNumber(watchedPolicyNumber, watchedLOB)
  return validation.valid
}
```

#### **4. Mandatory National ID for Sales Agents**
```javascript
{...register('nid', isSalesAgent ? { 
  required: 'National ID is required for new customers',
  minLength: {
    value: 10,
    message: 'National ID must be at least 10 characters'
  }
} : {})}
```

---

## ✅ **Testing Checklist**

### **Test as Sales Agent:**
- [ ] Login as sales agent
- [ ] See "Quick QR Generator" in sidebar
- [ ] Click and open page
- [ ] Page title shows "New Customer Payment QR"
- [ ] Field shows "Application Form Number *"
- [ ] Enter any format (e.g., "APP-2024-001") - no validation error
- [ ] National ID field shows asterisk (mandatory)
- [ ] Try to submit without National ID - shows error
- [ ] Enter National ID (at least 10 chars)
- [ ] Generate QR successfully
- [ ] QR code displays correctly

### **Test as CSR Agent:**
- [ ] Login as CSR agent
- [ ] See "Quick QR Generator" in sidebar
- [ ] Click and open page
- [ ] Page title shows "Quick QR Generator"
- [ ] Field shows "Policy Number *"
- [ ] Enter invalid format - shows validation error
- [ ] Enter valid format - shows green checkmark
- [ ] National ID field is optional (no asterisk)
- [ ] Can submit without National ID
- [ ] Generate QR successfully

---

## 🚀 **Deployment**

### **Files to Deploy:**
```bash
src/pages/QuickQRGenerator.jsx
src/components/layout/Sidebar.jsx (already has Quick QR for sales agents)
```

### **No Database Changes Required**
- No new tables needed
- No API changes needed
- Pure frontend changes

### **Deploy Commands:**
```bash
# Commit changes
git add src/pages/QuickQRGenerator.jsx src/components/layout/Sidebar.jsx
git commit -m "feat: Add Quick QR Generator for sales agents with application form number support"
git push origin main

# Deploy to VPS
ssh your-vps
cd /var/www/nic-callcenter
sudo git pull origin main
sudo npm run build
sudo systemctl reload nginx
```

---

## 📊 **Summary**

**What's Working:**
- ✅ Sales agents can access Quick QR Generator
- ✅ Field label changes based on user role
- ✅ Validation skipped for sales agents
- ✅ National ID mandatory for sales agents
- ✅ Different page title and description
- ✅ All existing functionality preserved

**What's NOT Included (Future):**
- ❌ Database logging (will add later)
- ❌ Data masking (will add later)
- ❌ QR history page (will add later)
- ❌ Different email templates (will add later)

**Status:** ✅ **Ready to Test and Deploy**

---

**Date:** December 3, 2024  
**Implementation:** Simple Version (Core Functionality Only)
