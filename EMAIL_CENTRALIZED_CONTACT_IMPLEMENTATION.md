# Email Centralized Contact Implementation - Short Term Solution

## 🎯 Objective

Implement a centralized customer service contact approach for payment reminder emails by:
1. **CC**: All emails CC to `customerservice@nicl.mu` (instead of individual agents)
2. **BCC**: Agents receive BCC copy (still informed but not exposed)
3. **Contact Section**: Static customer service contact information

---

## 📧 Current vs New Email Flow

### **Current Email Flow**
```
To: customer@email.com
CC: agent@nicl.mu          ← Agent exposed to customer
Subject: Payment Reminder

Your Agent Contact:
Name: John Doe             ← Individual agent details
Email: agent@nicl.mu
```

### **New Email Flow**
```
To: customer@email.com
CC: customerservice@nicl.mu    ← Centralized customer service
BCC: agent@nicl.mu             ← Agent still informed (hidden)
Reply-To: customerservice@nicl.mu  ← Customer replies go here automatically
Subject: Payment Reminder

For any questions or assistance, you can contact us by email at 
customerservice@nicl.mu or call us on 602 3000.
```

---

## 🔧 Implementation Details

### **File to Modify: `src/services/emailService.js`**

#### **Change 1: Update Email Headers**

**Location:** `sendPaymentReminderEmail()` function (around line 150)

**Current Code:**
```javascript
// Add CC and Reply-To for agent if provided (but NOT for CSL agents)
if (agentEmail && !options.isCslAgent) {
  emailOptions.cc = [{
    email: agentEmail,
    name: agentName || 'Agent'
  }]
  emailOptions.replyTo = {
    email: agentEmail,
    name: agentName || 'Your Agent'
  }
}
```

**New Code:**
```javascript
// Always CC customer service
emailOptions.cc = [{
  email: 'customerservice@nicl.mu',
  name: 'Customer Service'
}]

// BCC agent if provided (keeps them informed but hidden)
if (agentEmail) {
  emailOptions.bcc = [{
    email: agentEmail,
    name: agentName || 'Agent'
  }]
}

// Set reply-to to customer service
emailOptions.replyTo = {
  email: 'customerservice@nicl.mu',
  name: 'Customer Service'
}
```

#### **Change 2: Update Contact Section**

**Location:** `generatePaymentReminderHTML()` function (around line 190)

**Current Code:**
```javascript
// Generate contact section based on agent type
const contactSection = isCslAgent ? `
  <div class="agent-contact">
    <p style="margin: 0; color: #666; line-height: 1.6;">
      Should you require any additional information, please do not 
      hesitate to email us on <a href="mailto:nicarlife@nicl.mu" 
      style="color: #2563eb;">nicarlife@nicl.mu</a> or call our 
      Recovery Department on <strong>602-3315</strong>.
    </p>
  </div>
` : (agentEmail ? `
  <div class="agent-contact">
    <h4 style="margin-top: 0; color: #000;">Your Agent Contact</h4>
    <p style="margin: 5px 0;"><strong>Name:</strong> ${agentName || 'Your Agent'}</p>
    <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${agentEmail}" style="color: #2563eb;">${agentEmail}</a></p>
    <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">For any questions or assistance, please contact your agent directly by replying to this email.</p>
  </div>
` : '<p>If you have any questions or need assistance, please contact our customer service team.</p>')
```

**New Code:**
```javascript
// Static customer service contact section for all emails
const contactSection = `
  <div class="agent-contact">
    <p style="margin: 0; color: #666; line-height: 1.6;">
      For any questions or assistance, you can contact us by email at 
      <a href="mailto:customerservice@nicl.mu" style="color: #2563eb;">customerservice@nicl.mu</a> 
      or call us on <strong>602 3000</strong>.
    </p>
  </div>
`
```

#### **Change 3: Update Text Version**

**Location:** `generatePaymentReminderText()` function (around line 270)

**Current Code:**
```javascript
// Generate contact text based on agent type
const agentContact = isCslAgent ? `

Should you require any additional information, please do not hesitate to email us on nicarlife@nicl.mu or call our Recovery Department on 602-3315.
` : (agentEmail ? `

YOUR AGENT CONTACT:
Name: ${agentName || 'Your Agent'}
Email: ${agentEmail}

For any questions or assistance, please contact your agent directly by replying to this email.
` : 'If you have any questions or need assistance, please contact our customer service team.')
```

**New Code:**
```javascript
// Static customer service contact for all emails
const agentContact = `

For any questions or assistance, you can contact us by email at customerservice@nicl.mu or call us on 602 3000.
`
```

---

## 📋 Complete Implementation Steps

### **Step 1: Make Code Changes**

1. **Open** `src/services/emailService.js`
2. **Find** the `sendPaymentReminderEmail()` function (around line 150)
3. **Replace** the CC/BCC logic as shown above
4. **Find** the `generatePaymentReminderHTML()` function (around line 190)
5. **Replace** the contact section logic as shown above
6. **Find** the `generatePaymentReminderText()` function (around line 270)
7. **Replace** the agent contact logic as shown above

### **Step 2: Test Locally**

```bash
# Start local development server
npm run dev

# Test email sending functionality
# - Generate QR and send email
# - Check email headers and content
# - Verify CC goes to customerservice@nicl.mu
# - Verify agent gets BCC copy
```

### **Step 3: Commit to Git**

```bash
# Add changes
git add src/services/emailService.js

# Commit with descriptive message
git commit -m "feat: centralize email contact to customerservice@nicl.mu

- CC all payment reminder emails to customerservice@nicl.mu
- BCC agents (keeps them informed but hidden from customers)
- Replace agent contact section with static customer service info
- Set reply-to to customerservice@nicl.mu for consistent support flow

Resolves: Centralized customer support communication"

# Push to GitHub
git push origin main
```

### **Step 4: Deploy to VPS**

#### **4.1: Connect to VPS**
```bash
ssh root@your-vps-ip
```

#### **4.2: Navigate to Project Directory**
```bash
cd /var/www/nic-callcenter
```

#### **4.3: Pull Latest Changes**
```bash
# Pull from GitHub
git pull origin main

# Verify the changes are present
git log --oneline -5
```

#### **4.4: Build and Deploy**
```bash
# Install any new dependencies (if needed)
npm install

# Build the project
npm run build

# Restart services
sudo nginx -s reload
pm2 restart all

# Check PM2 status
pm2 status
```

#### **4.5: Verify Deployment**
```bash
# Check if build was successful
ls -la dist/

# Check nginx status
sudo systemctl status nginx

# Check application logs
pm2 logs --lines 20
```

---

## 🧪 Testing Checklist

### **Local Testing**
- [ ] Email sends successfully
- [ ] CC goes to `customerservice@nicl.mu`
- [ ] Agent receives BCC copy
- [ ] Contact section shows customer service info
- [ ] Reply-to is set to `customerservice@nicl.mu`
- [ ] **Customer replies automatically go to customerservice@nicl.mu**
- [ ] Text version has correct contact info

### **VPS Testing**
- [ ] Application builds successfully
- [ ] No console errors in browser
- [ ] Email functionality works on production
- [ ] All email flows use new contact system
- [ ] Agents still receive BCC notifications

### **Email Testing Matrix**

| Test Case | Expected CC | Expected BCC | Expected Contact Section |
|-----------|-------------|--------------|-------------------------|
| Sales Agent Email | customerservice@nicl.mu | sales.agent@nicl.mu | Customer service info |
| Internal Agent Email | customerservice@nicl.mu | internal.agent@nicl.mu | Customer service info |
| Call Center Email | customerservice@nicl.mu | callcenter.agent@nicl.mu | Customer service info |
| CSL Agent Email | customerservice@nicl.mu | csl.agent@nicl.mu | Customer service info |

---

## 🔄 Rollback Plan

If issues occur, rollback using Git:

```bash
# On VPS - rollback to previous commit
cd /var/www/nic-callcenter
git log --oneline -10  # Find previous commit hash
git reset --hard <previous-commit-hash>
npm run build
sudo nginx -s reload
pm2 restart all
```

---

## 📊 Benefits Summary

### **Business Benefits**
- ✅ **Centralized Support**: All customer inquiries go to one team
- ✅ **Professional Image**: Consistent contact information
- ✅ **Agent Privacy**: Individual agent emails not exposed
- ✅ **Scalable**: Easy to manage customer service workload

### **Technical Benefits**
- ✅ **Simple Implementation**: Only 1 file modified
- ✅ **Low Risk**: Minimal code changes
- ✅ **Easy Testing**: Clear verification steps
- ✅ **Quick Deployment**: Standard deployment process

### **Operational Benefits**
- ✅ **Agent Awareness**: Agents still get BCC copies
- ✅ **Customer Clarity**: One clear contact method
- ✅ **Support Efficiency**: Centralized email handling
- ✅ **Consistent Experience**: Same contact info for all customers
- ✅ **Automatic Reply Routing**: Customer replies go directly to customer service

---

## 🚨 Important Notes

### **Email Configuration**
- Ensure `customerservice@nicl.mu` email exists and is monitored
- Set up email forwarding/distribution if needed
- Configure auto-responders for customer service email

### **Agent Communication**
- Inform agents about the change to BCC
- Ensure agents know customers will contact customer service
- Set up internal processes for customer service team

### **Monitoring**
- Monitor email delivery rates after deployment
- Check customer service email volume
- Verify agents are receiving BCC copies

---

## 📅 Deployment Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Development** | 30 minutes | Make code changes, local testing |
| **Git Commit** | 5 minutes | Commit and push to GitHub |
| **VPS Deployment** | 15 minutes | Pull, build, restart services |
| **Production Testing** | 15 minutes | Verify email functionality |
| **Total** | **65 minutes** | Complete implementation |

---

## 🎯 Success Criteria

- [ ] All payment reminder emails CC `customerservice@nicl.mu`
- [ ] Agents receive BCC copies of customer emails
- [ ] Contact section shows customer service information
- [ ] Reply-to is set to customer service email
- [ ] No email delivery failures
- [ ] Application functions normally after deployment

---

**Status:** 📋 READY FOR IMPLEMENTATION
**Date:** December 18, 2024
**Priority:** 🟢 HIGH (Simple, High-Impact Change)
**Risk Level:** 🟢 LOW (Minimal code changes)
**Estimated Time:** 1 hour total