# CSL Email Customization - Implementation Plan

## 🎯 Objective

Customize QR payment emails for CSL agents (3rd party contractors) to:
1. Remove agent name and email from email body
2. Remove CC to CSL agent email
3. Replace with generic NICL contact information
4. Maintain existing behavior for regular (internal) agents

---

## 🔍 Problem Statement

**Current Behavior:**
All QR payment emails include:
```
Your Agent Contact
Name: Test Call Center Agent
Email: vikas.khanna@zwennpay.com

For any questions or assistance, please contact your agent 
directly by replying to this email.

CC: vikas.khanna@zwennpay.com
```

**Issue:**
- CSL agents are 3rd party contractors
- Cannot expose their personal email addresses to customers
- Customers should not contact CSL agents directly
- All communication must go through official NICL channels

---

## ✅ Required Behavior

**For CSL Agents (Branch 13):**
```
Should you require any additional information, please do not 
hesitate to email us on nicarlife@nicl.mu or call our 
Recovery Department on 602-3315.

CC: (none)
```

**For Regular Agents (All other branches):**
```
Your Agent Contact
Name: John Doe
Email: john.doe@nicl.mu

For any questions or assistance, please contact your agent 
directly by replying to this email.

CC: john.doe@nicl.mu
```

---

## 🔧 Implementation Strategy

### **Detection Method: Branch-Based**

Use `agent.branch_id === 13` to identify CSL agents.

**Pros:**
- ✅ Simple and reliable
- ✅ No database changes needed
- ✅ Already have branch_id field
- ✅ Clear separation of CSL vs internal agents

---

## 📂 Files to Modify

### **1. src/services/csl/cslAdapterService.js**

**Location:** `sendEmailForCSLPolicy()` function (line ~106)

**Change:**
```javascript
// Current
const result = await emailService.sendPaymentReminderEmail(
  customerData,
  qrCodeUrl,
  paymentLink,
  {
    agentEmail: options.agentEmail,
    agentName: options.agentName,
    lineOfBusiness: 'life',
    ccAgent: options.ccAgent !== undefined ? options.ccAgent : true
  }
)

// New - Add isCslAgent flag
const result = await emailService.sendPaymentReminderEmail(
  customerData,
  qrCodeUrl,
  paymentLink,
  {
    agentEmail: options.agentEmail,
    agentName: options.agentName,
    agentBranchId: options.agentBranchId,  // NEW
    isCslAgent: options.agentBranchId === 13,  // NEW
    lineOfBusiness: 'life',
    ccAgent: options.ccAgent !== undefined ? options.ccAgent : true
  }
)
```

### **2. src/components/csl/CSLQuickActionsPanel.jsx**

**Location:** `handleSendEmail()` function (line ~47)

**Change:**
```javascript
// Current
const emailResult = await cslService.adapter.sendEmailForCSLPolicy(
  policy,
  qrResult.qrCodeUrl,
  qrResult.paymentLink,
  {
    agentEmail: user.email,
    agentName: user.name,
    ccAgent: true
  }
)

// New - Add branch_id
const emailResult = await cslService.adapter.sendEmailForCSLPolicy(
  policy,
  qrResult.qrCodeUrl,
  qrResult.paymentLink,
  {
    agentEmail: user.email,
    agentName: user.name,
    agentBranchId: user.branch_id,  // NEW
    ccAgent: true
  }
)
```

### **3. src/services/emailService.js**

**Location:** `sendPaymentReminderEmail()` function

**Changes:**

**A. Modify CC logic:**
```javascript
// Current
const ccEmails = options.ccAgent && options.agentEmail 
  ? [options.agentEmail] 
  : []

// New - Skip CC for CSL agents
const ccEmails = options.ccAgent && options.agentEmail && !options.isCslAgent
  ? [options.agentEmail] 
  : []
```

**B. Create contact section helper:**
```javascript
/**
 * Get contact section based on agent type
 * @param {Object} options - Email options
 * @returns {string} HTML contact section
 */
const getContactSection = (options) => {
  // CSL agents - show generic NICL contact
  if (options.isCslAgent) {
    return `
      <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px;">
        <p style="margin: 0; color: #666; line-height: 1.6;">
          Should you require any additional information, please do not 
          hesitate to email us on <a href="mailto:nicarlife@nicl.mu" 
          style="color: #0066cc;">nicarlife@nicl.mu</a> or call our 
          Recovery Department on <strong>602-3315</strong>.
        </p>
      </div>
    `;
  }
  
  // Regular agents - show agent contact
  return `
    <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px;">
      <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">
        Your Agent Contact
      </p>
      <p style="margin: 5px 0; color: #666;">
        Name: ${options.agentName || 'N/A'}
      </p>
      <p style="margin: 5px 0; color: #666;">
        Email: ${options.agentEmail || 'N/A'}
      </p>
      <p style="margin: 10px 0 0 0; color: #666;">
        For any questions or assistance, please contact your agent 
        directly by replying to this email.
      </p>
    </div>
  `;
};
```

**C. Use helper in email template:**
```javascript
// In the HTML template, replace the agent contact section with:
${getContactSection(options)}
```

---

## 🧪 Testing Checklist

### **Test Scenarios:**

**1. CSL Agent Email (Branch 13):**
- [ ] Login as CSL agent
- [ ] Generate QR for policy
- [ ] Send email
- [ ] Verify email received
- [ ] Check: No agent name/email in body
- [ ] Check: Shows NICL generic contact
- [ ] Check: No CC to agent
- [ ] Check: Reply-to is nicarlife@nicl.mu

**2. Regular Agent Email (Other branches):**
- [ ] Login as regular agent
- [ ] Generate QR for policy
- [ ] Send email
- [ ] Verify email received
- [ ] Check: Shows agent name/email
- [ ] Check: CC includes agent email
- [ ] Check: Reply-to works

**3. Edge Cases:**
- [ ] Agent with no branch_id (should default to regular)
- [ ] Agent with branch_id = null
- [ ] Multiple emails sent in sequence

---

## 📊 Expected Results

### **CSL Agent Email:**
```
From: arrears@niclmauritius.site
To: customer@email.com
CC: (none)
Reply-To: nicarlife@nicl.mu

[QR Code Image]

Should you require any additional information, please do not 
hesitate to email us on nicarlife@nicl.mu or call our 
Recovery Department on 602-3315.
```

### **Regular Agent Email:**
```
From: arrears@niclmauritius.site
To: customer@email.com
CC: agent@nicl.mu
Reply-To: nicarlife@nicl.mu

[QR Code Image]

Your Agent Contact
Name: John Doe
Email: john.doe@nicl.mu

For any questions or assistance, please contact your agent 
directly by replying to this email.
```

---

## 🚨 Important Considerations

**Privacy & Compliance:**
- ✅ CSL agent emails never exposed
- ✅ Customers contact official NICL channels only
- ✅ Maintains professional brand image
- ✅ Complies with 3rd party contractor agreements

**Backward Compatibility:**
- ✅ No changes to existing agent emails
- ✅ Only affects CSL agents (Branch 13)
- ✅ No database changes required
- ✅ Easy to rollback if needed

**Performance:**
- ✅ No additional API calls
- ✅ Simple boolean check
- ✅ No impact on email delivery speed

---

## 📝 Implementation Steps

1. **Modify cslAdapterService.js**
   - Add `agentBranchId` to options
   - Add `isCslAgent` flag

2. **Modify CSLQuickActionsPanel.jsx**
   - Pass `user.branch_id` to adapter

3. **Modify emailService.js**
   - Create `getContactSection()` helper
   - Update CC logic
   - Update email template

4. **Test locally**
   - Test with CSL agent
   - Test with regular agent
   - Verify email content

5. **Deploy to VPS**
   - Commit changes
   - Push to GitHub
   - Pull on VPS
   - Build and restart

6. **Production testing**
   - Send test emails
   - Verify with real CSL agent
   - Monitor for issues

---

## 🔄 Rollback Plan

If issues occur:

1. **Quick rollback:**
   ```bash
   git revert <commit-hash>
   git push origin main
   # Pull and rebuild on VPS
   ```

2. **Emergency fix:**
   - Set `isCslAgent: false` for all agents temporarily
   - Investigate and fix issue
   - Redeploy

---

## 📚 Related Documentation

- `CSL_ADMIN_AGENT_REPORTS.md` - CSL admin features
- `CSL_IMPLEMENTATION_SUMMARY_FINAL.md` - Overall CSL system
- `PAYMENT_REMINDER_CC_REPLYTO_FEATURE.md` - Email CC functionality

---

## ✅ Success Criteria

- [ ] CSL agents can send QR emails
- [ ] CSL emails show generic NICL contact
- [ ] No CC to CSL agent emails
- [ ] Regular agents unaffected
- [ ] No errors in production
- [ ] Customer feedback positive

---

## 📅 Timeline

**Estimated Time:** 1-2 hours
- Implementation: 30 minutes
- Testing: 30 minutes
- Deployment: 15 minutes
- Verification: 15 minutes

---

## 👥 Stakeholders

**Technical:**
- Development team
- QA team

**Business:**
- CSL management
- Customer service team
- Compliance team

---

**Status:** 📋 PLANNED - Ready for implementation
**Priority:** 🔴 HIGH - Customer-facing feature
**Risk:** 🟡 MEDIUM - Affects email communications
