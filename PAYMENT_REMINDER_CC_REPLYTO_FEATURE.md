# Payment Reminder CC and Reply-To Feature

## Overview
Added CC and Reply-To functionality for payment reminder emails so agents are automatically CC'd and customers can reply directly to their assigned agent.

## Date
December 5, 2025

## Changes Made

### 1. Modified Files

#### `src/services/emailService.js`
**Changes:**
- Updated `sendPaymentReminderEmail()` to accept `agentEmail` and `agentName` in options
- Added CC and Reply-To headers when agent info is provided
- Updated `generatePaymentReminderHTML()` to include agent contact section
- Updated `generatePaymentReminderText()` to include agent contact info

**Key Updates:**
```javascript
// Now accepts agent info for both new policies and payment reminders
const agentEmail = options.agentEmail || null
const agentName = options.agentName || null

// Adds CC and Reply-To if agent provided
if (agentEmail) {
  emailOptions.cc = [{ email: agentEmail, name: agentName || 'Agent' }]
  emailOptions.replyTo = { email: agentEmail, name: agentName || 'Your Agent' }
}
```

#### `src/components/sales/LOBDashboard.jsx`
**Changes:**
- Updated `handleSendEmail()` to pass agent info when sending payment reminders

**Key Updates:**
```javascript
const result = await customerService.sendEmail(
  qrData.customerData,
  qrData.qrCodeUrl,
  qrData.paymentLink,
  {
    agentEmail: user?.email,
    agentName: user?.name,
    lineOfBusiness: lobType
  }
)
```

#### `src/pages/customers/CustomerDetail.jsx`
**Changes:**
- Updated `sendEmailMutation` to pass agent info when sending emails

**Key Updates:**
```javascript
customerService.sendEmail(customer, qrCodeUrl, paymentLink, {
  agentEmail: user?.email,
  agentName: user?.name
})
```

## Features

### For New Policy Welcome Emails (Already Working)
✅ Agent is CC'd on welcome email
✅ Reply-To set to agent's email
✅ Agent contact info displayed in email
✅ Customer can reply directly to agent

### For Payment Reminder Emails (NEW)
✅ Agent is CC'd on payment reminder
✅ Reply-To set to agent's email
✅ Agent contact info displayed in email
✅ Customer can reply directly to agent

## Benefits

1. **Better Communication** - Direct customer-agent communication channel
2. **Agent Awareness** - Agents know when their customers receive reminders
3. **Customer Service** - Customers can easily reach their agent with questions
4. **Audit Trail** - Agents have email record of all communications

## Testing Checklist

Before deploying to VPS:

- [ ] Test new policy email from Quick QR Generator
  - [ ] Verify agent receives CC
  - [ ] Verify Reply-To works
  - [ ] Verify agent contact section appears

- [ ] Test payment reminder from LOB Dashboard
  - [ ] Verify agent receives CC
  - [ ] Verify Reply-To works
  - [ ] Verify agent contact section appears

- [ ] Test payment reminder from Customer Detail
  - [ ] Verify agent receives CC
  - [ ] Verify Reply-To works
  - [ ] Verify agent contact section appears

- [ ] Test with different LOBs (Life, Health, General)
  - [ ] Verify LOB-specific sender works
  - [ ] Verify templates render correctly

## Deployment Steps

### 1. Build Production Bundle
```bash
npm run build
```

### 2. Deploy to VPS
```bash
# Option A: Using deploy script
./deploy.sh

# Option B: Manual deployment
scp -r dist/* user@vps:/var/www/nic-callcenter/
```

### 3. Verify Deployment
- [ ] Login to application
- [ ] Generate Quick QR and send email
- [ ] Check agent receives CC
- [ ] Send payment reminder from LOB Dashboard
- [ ] Check agent receives CC
- [ ] Test Reply-To functionality

### 4. Monitor
- [ ] Check Brevo dashboard for email delivery
- [ ] Monitor for any errors in browser console
- [ ] Check agent feedback on CC functionality

## Rollback Plan

If issues occur:

1. **Quick Fix**: Revert to previous build
```bash
# On VPS
cd /var/www/nic-callcenter/
cp -r dist.backup/* dist/
```

2. **Code Rollback**: Revert these files:
   - `src/services/emailService.js`
   - `src/components/sales/LOBDashboard.jsx`
   - `src/pages/customers/CustomerDetail.jsx`

## Notes

- No database changes required
- No backend service changes required
- Only frontend code modified
- Backward compatible (works without agent info)
- No breaking changes to existing functionality

## Related Documentation

- `QUICK_QR_EMAIL_TEMPLATES.md` - Email template documentation
- `QUICK_QR_SALES_AGENT_SIMPLE.md` - Quick QR feature documentation

## Next Steps

After successful deployment:
1. Gather agent feedback on CC functionality
2. Monitor email delivery rates
3. Consider implementing for other email types (AOD, installment reminders)
4. Plan CSL branch-specific workflow (separate feature)
