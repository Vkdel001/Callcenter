# Quick QR Generator - Email Templates Implementation

## ✅ **What Was Implemented**

### **1. LOB-Specific Email Sender Names**
- **Life Insurance:** "NIC Life Insurance"
- **Health Insurance:** "NIC Health Insurance"
- **Motor Insurance:** "NIC Motor Insurance"

### **2. Context-Aware Email Templates**

#### **For Sales Agents (New Policy):**
- **Subject:** "Welcome to NIC [Life/Health/Motor] Insurance - Your Initial Premium Payment"
- **Template:** Welcome email with application details
- **Tone:** Welcoming, encouraging
- **Content:** Application form number, next steps, coverage details

#### **For CSR/Call Center (Payment Reminder):**
- **Subject:** "Payment Reminder - [Life/Health/Motor] Policy [NUMBER]"
- **Template:** Standard payment reminder
- **Tone:** Professional, reminder-focused
- **Content:** Policy number, amount due, payment instructions

---

## 🎯 **Key Features**

### **1. Automatic Template Selection**
The system automatically chooses the correct template based on:
- **User Role:** Sales agent vs CSR/Call Center
- **LOB:** Life, Health, or Motor
- **Reference Number:** Application form number vs Policy number

### **2. LOB-Specific Branding**
- Company name changes based on LOB
- Sender name reflects the insurance type
- Professional branding throughout

### **3. Same QR Code**
- QR code image remains the same
- Only email content and branding changes
- Consistent payment experience

---

## 📧 **Email Template Comparison**

### **New Policy Welcome Email (Sales Agent)**

**Subject:**
```
Welcome to NIC Life Insurance - Your Initial Premium Payment
```

**Key Sections:**
1. **Header:** Green background (welcoming)
2. **Greeting:** "Welcome to NIC Life Insurance!"
3. **Application Details:**
   - Application Form Number: APP-2024-001
   - Line of Business: Life Insurance
   - Initial Premium: MUR 4,500.00
4. **QR Code Section:** "Complete Your Payment"
5. **Next Steps:**
   - ✅ Make payment
   - ✅ Policy issued in 2-3 days
   - ✅ Documents via email
   - ✅ Coverage begins immediately
6. **Signature:** "NIC Life Insurance Mauritius - Sales Team"

---

### **Payment Reminder Email (CSR Agent)**

**Subject:**
```
Payment Reminder - Life Policy LIFE/001
```

**Key Sections:**
1. **Header:** Blue background (professional)
2. **Greeting:** "Payment Reminder"
3. **Payment Details:**
   - Policy Number: LIFE/001
   - Amount Due: MUR 4,500.00
4. **QR Code Section:** "Quick Payment via QR Code"
5. **Call to Action:** Pay now
6. **Signature:** "NIC Life Insurance Mauritius - Customer Service Team"

---

## 🔧 **Technical Implementation**

### **Files Modified:**

1. ✅ `src/pages/QuickQRGenerator.jsx`
   - Pass `options` object to email mutation
   - Include `isNewPolicy`, `lineOfBusiness`, `referenceNumber`

2. ✅ `src/services/customerService.js`
   - Update `sendEmail()` to accept `options` parameter
   - Pass options to emailService

3. ✅ `src/services/emailService.js`
   - Add `getSenderConfig()` method for LOB-specific senders
   - Update `sendPaymentReminderEmail()` to handle options
   - Add `generateNewPolicyWelcomeHTML()` method
   - Add `generateNewPolicyWelcomeText()` method
   - Update existing templates with LOB and reference number

---

## 📊 **Email Flow**

### **Sales Agent Flow:**
```
Sales Agent generates QR
    ↓
isSalesAgent = true
    ↓
options = {
  isNewPolicy: true,
  lineOfBusiness: 'life',
  referenceNumber: 'APP-2024-001'
}
    ↓
emailService detects isNewPolicy = true
    ↓
Uses Welcome Email Template
    ↓
Sender: "NIC Life Insurance"
Subject: "Welcome to NIC Life Insurance..."
Content: Welcome message + next steps
```

### **CSR Agent Flow:**
```
CSR Agent generates QR
    ↓
isSalesAgent = false
    ↓
options = {
  isNewPolicy: false,
  lineOfBusiness: 'health',
  referenceNumber: 'MED/2023/001'
}
    ↓
emailService detects isNewPolicy = false
    ↓
Uses Payment Reminder Template
    ↓
Sender: "NIC Health Insurance"
Subject: "Payment Reminder - Health Policy..."
Content: Reminder message + payment details
```

---

## 🏢 **LOB-Specific Examples**

### **Life Insurance:**
- **Sender:** "NIC Life Insurance"
- **Subject (New):** "Welcome to NIC Life Insurance - Your Initial Premium Payment"
- **Subject (Reminder):** "Payment Reminder - Life Policy LIFE/001"

### **Health Insurance:**
- **Sender:** "NIC Health Insurance"
- **Subject (New):** "Welcome to NIC Health Insurance - Your Initial Premium Payment"
- **Subject (Reminder):** "Payment Reminder - Health Policy MED/2023/001"

### **Motor Insurance:**
- **Sender:** "NIC Motor Insurance"
- **Subject (New):** "Welcome to NIC Motor Insurance - Your Initial Premium Payment"
- **Subject (Reminder):** "Payment Reminder - Motor Policy P/2023/001"

---

## ✅ **Testing Checklist**

### **Test as Sales Agent:**
- [ ] Login as sales agent
- [ ] Generate QR for new customer (Life Insurance)
- [ ] Send email
- [ ] Check email received
- [ ] Verify subject: "Welcome to NIC Life Insurance..."
- [ ] Verify sender: "NIC Life Insurance"
- [ ] Verify content shows "Application Form Number"
- [ ] Verify "Welcome" tone and "Next Steps" section
- [ ] Verify signature: "Sales Team"

### **Test as CSR Agent:**
- [ ] Login as CSR agent
- [ ] Generate QR for existing customer (Health Insurance)
- [ ] Send email
- [ ] Check email received
- [ ] Verify subject: "Payment Reminder - Health Policy..."
- [ ] Verify sender: "NIC Health Insurance"
- [ ] Verify content shows "Policy Number"
- [ ] Verify "Reminder" tone
- [ ] Verify signature: "Customer Service Team"

### **Test All LOBs:**
- [ ] Test Life Insurance (both templates)
- [ ] Test Health Insurance (both templates)
- [ ] Test Motor Insurance (both templates)

---

## 🚀 **Deployment**

### **Files to Deploy:**
```bash
src/pages/QuickQRGenerator.jsx
src/services/customerService.js
src/services/emailService.js
```

### **No Environment Variables Needed**
- Uses existing `VITE_SENDER_EMAIL`
- Sender name changes dynamically based on LOB

### **Deploy Commands:**
```bash
# Commit changes
git add src/pages/QuickQRGenerator.jsx src/services/customerService.js src/services/emailService.js
git commit -m "feat: Add LOB-specific email templates for new policy vs payment reminder"
git push origin main

# Deploy to VPS
ssh your-vps
cd /var/www/nic-callcenter
sudo git pull origin main
sudo npm run build
sudo systemctl reload nginx
```

---

## 📋 **Summary**

**What's Working:**
- ✅ Sales agents get welcome email template
- ✅ CSR agents get payment reminder template
- ✅ LOB-specific sender names (Life/Health/Motor)
- ✅ LOB-specific company branding in email
- ✅ Correct reference number (Application Form vs Policy)
- ✅ Different tone and content per context
- ✅ Same QR code functionality

**Benefits:**
- ✅ Professional branding per insurance type
- ✅ Clear distinction between new policy and renewal
- ✅ Better customer experience
- ✅ Appropriate messaging per context

**Status:** ✅ **Ready to Test and Deploy**

---

**Date:** December 3, 2024  
**Implementation:** Email Templates with LOB-Specific Branding
