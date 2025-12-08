# CSL Call Center - Feature Integration Document

## Overview
CSL agents will have access to ALL existing features (QR generation, email, SMS, AOD, etc.) in addition to their specialized interaction tracking.

---

## 1. Integrated Features for CSL

### ✅ Features CSL Agents Will Have

1. **QR Code Generation** - Generate payment QR codes for arrears
2. **Email Sending** - Send payment reminders with CC and Reply-To
3. **SMS Sending** - Send payment reminders via SMS
4. **WhatsApp** - Send payment reminders via WhatsApp
5. **AOD (Acknowledgment of Debt)** - Create and manage AOD agreements
6. **Payment Plans** - Set up installment payment plans
7. **Contact Updates** - Update customer contact information
8. **Call Logging** - Log call interactions (enhanced for CSL)
9. **Payment History** - View payment history
10. **Document Upload** - Upload signed AOD documents
11. **Reports** - Generate CSL-specific reports

---

## 2. Updated CSL Policy Detail Page Layout

### Tab Structure (Updated)

```
┌─────────────────────────────────────────────────────────────────┐
│  Policy: LIF/2024/12345                    ✅ Payment Verified   │
│  Owner: John Smith                         📞 Last Call: 2 days ago│
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [Overview] [Owner 1] [Owner 2] [Payments] [AOD] [Interactions] [Log Call]│
│  ─────────  ────────  ────────  ────────   ───   ────────────  ────────   │
│                                                                   │
│  [Tab Content Here]                                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Updated Tab Breakdown

### Tab 1: Overview (Enhanced)

```
┌──────────────────────────────────────────────────────────────┐
│  📋 OVERVIEW                                                  │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Policy Status   │  │ Financial Info  │  │ Quick Actions│ │
│  ├─────────────────┤  ├─────────────────┤  ├──────────────┤ │
│  │ Status: Active  │  │ Arrears:        │  │ 📞 Call Now  │ │
│  │ Plan: Endowment │  │ MUR 15,000      │  │              │ │
│  │ Frequency:      │  │                 │  │ 📧 Send Email│ │
│  │ Monthly         │  │ Premium:        │  │              │ │
│  │                 │  │ MUR 2,500       │  │ 💬 Send SMS  │ │
│  │ Installments    │  │                 │  │              │ │
│  │ in Arrears: 6   │  │ Gross Premium:  │  │ 📱 WhatsApp  │ │
│  │                 │  │ MUR 30,000      │  │              │ │
│  │                 │  │                 │  │ 🔲 Gen QR    │ │
│  │                 │  │                 │  │              │ │
│  │                 │  │                 │  │ 📄 Create AOD│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 📅 Important Dates                                       │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ Start Date: 01/01/2020    Maturity: 01/01/2040         │ │
│  │ Issued: 15/01/2020        Next Cashback: 01/01/2026    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 💰 Payment Verification                                  │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ ✅ PAYMENT VERIFIED                                      │ │
│  │ Amount: MUR 5,000                                        │ │
│  │ Date: 25/11/2025                                         │ │
│  │ Reference: PAY-2025-12345                                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🔲 Latest QR Code                                        │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ [QR Code Image]                                          │ │
│  │                                                           │ │
│  │ Generated: 05/12/2025 10:30 AM                           │ │
│  │ Amount: MUR 15,000                                       │ │
│  │                                                           │ │
│  │ [📧 Email QR] [💬 SMS QR] [📱 WhatsApp] [🖨️ Print]     │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Quick Actions Added:**
- Call Now (click-to-call)
- Send Email (payment reminder with CC)
- Send SMS (payment reminder)
- WhatsApp (payment reminder)
- Generate QR (create new QR code)
- Create AOD (start AOD process)

---

### Tab 4: Payments (NEW)

```
┌──────────────────────────────────────────────────────────────┐
│  💳 PAYMENT HISTORY                                           │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Payment Summary                                          │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ Total Paid: MUR 45,000                                   │ │
│  │ Outstanding: MUR 15,000                                  │ │
│  │ Last Payment: 25/11/2025                                 │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Payment History                                          │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │                                                           │ │
│  │ 📅 25/11/2025 - MUR 5,000                                │ │
│  │ Method: Bank Transfer | Ref: PAY-2025-12345              │ │
│  │ ✅ Verified                                               │ │
│  │                                                           │ │
│  │ 📅 25/10/2025 - MUR 5,000                                │ │
│  │ Method: Cash | Ref: PAY-2025-12344                       │ │
│  │ ✅ Verified                                               │ │
│  │                                                           │ │
│  │ 📅 25/09/2025 - MUR 5,000                                │ │
│  │ Method: Mobile Money | Ref: PAY-2025-12343               │ │
│  │ ✅ Verified                                               │ │
│  │                                                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ QR Code History                                          │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │                                                           │ │
│  │ 📅 05/12/2025 10:30 AM - MUR 15,000                      │ │
│  │ Generated by: Sarah Johnson                              │ │
│  │ Status: Active | [View QR] [Resend]                      │ │
│  │                                                           │ │
│  │ 📅 28/11/2025 02:15 PM - MUR 20,000                      │ │
│  │ Generated by: Sarah Johnson                              │ │
│  │ Status: Expired | [View QR]                              │ │
│  │                                                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Features:**
- Payment summary
- Payment history from csl_payments table
- QR code generation history
- Resend QR codes

---

### Tab 5: AOD (NEW)

```
┌──────────────────────────────────────────────────────────────┐
│  📄 ACKNOWLEDGMENT OF DEBT (AOD)                              │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ AOD Status                                               │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ Status: Active                                           │ │
│  │ Created: 15/11/2025                                      │ │
│  │ Outstanding Amount: MUR 15,000                           │ │
│  │ Payment Method: Monthly Installments                     │ │
│  │ Signature Status: ✅ Received                            │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Payment Plan                                             │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │                                                           │ │
│  │ Total Installments: 6                                    │ │
│  │ Installment Amount: MUR 2,500                            │ │
│  │ Start Date: 01/12/2025                                   │ │
│  │                                                           │ │
│  │ Installment Schedule:                                    │ │
│  │ 1. 01/12/2025 - MUR 2,500 - ✅ Paid                      │ │
│  │ 2. 01/01/2026 - MUR 2,500 - ⏳ Pending                   │ │
│  │ 3. 01/02/2026 - MUR 2,500 - ⏳ Pending                   │ │
│  │ 4. 01/03/2026 - MUR 2,500 - ⏳ Pending                   │ │
│  │ 5. 01/04/2026 - MUR 2,500 - ⏳ Pending                   │ │
│  │ 6. 01/05/2026 - MUR 2,500 - ⏳ Pending                   │ │
│  │                                                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Documents                                                │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ 📄 AOD Agreement (Signed)                                │ │
│  │ Uploaded: 20/11/2025                                     │ │
│  │ [Download PDF] [View]                                    │ │
│  │                                                           │ │
│  │ 📄 AOD Agreement (Original)                              │ │
│  │ Generated: 15/11/2025                                    │ │
│  │ [Download PDF] [Email to Customer]                       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  [Create New AOD] [Upload Signed Document]                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Features:**
- View AOD status
- View payment plan and installment schedule
- Download AOD documents
- Upload signed documents
- Create new AOD
- Email AOD to customer

---

### Tab 6: Interactions (Enhanced)

```
┌──────────────────────────────────────────────────────────────┐
│  📞 INTERACTION HISTORY                                       │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  [Filter: All] [Sort: Latest First] [Export CSV]             │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 📅 05 Dec 2025 - 10:30 AM          Agent: Sarah Johnson │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ Type: Call                                               │ │
│  │ Outcome: Promise to Pay                                  │ │
│  │ Recovery: Partial - MUR 5,000                            │ │
│  │ Follow Up: 12 Dec 2025                                   │ │
│  │                                                           │ │
│  │ Actions Taken:                                           │ │
│  │ • Generated QR Code (MUR 15,000)                         │ │
│  │ • Sent Email Reminder                                    │ │
│  │ • Updated Contact: 57372333                              │ │
│  │                                                           │ │
│  │ [View Details ▼]                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 📧 28 Nov 2025 - 02:15 PM          Agent: Sarah Johnson │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ Type: Email                                              │ │
│  │ Outcome: Email Sent                                      │ │
│  │ Recovery: None                                           │ │
│  │ Follow Up: 05 Dec 2025                                   │ │
│  │                                                           │ │
│  │ Actions Taken:                                           │ │
│  │ • Sent Payment Reminder Email                            │ │
│  │ • Attached QR Code                                       │ │
│  │                                                           │ │
│  │ [View Details ▼]                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 📄 20 Nov 2025 - 11:00 AM          Agent: Mike Brown    │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ Type: AOD Created                                        │ │
│  │ Outcome: AOD Agreement Sent                              │ │
│  │ Recovery: None                                           │ │
│  │ Follow Up: 27 Nov 2025                                   │ │
│  │                                                           │ │
│  │ Actions Taken:                                           │ │
│  │ • Created AOD Agreement                                  │ │
│  │ • Emailed AOD to Customer                                │ │
│  │                                                           │ │
│  │ [View Details ▼]                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Enhanced Features:**
- Shows all interaction types (Call, Email, SMS, WhatsApp, AOD)
- Shows actions taken during interaction
- Links to generated QR codes, emails sent, etc.

---

### Tab 7: Log Call (Enhanced with Actions)

**Step 1: Basic Information** (same as before)

**Step 2: Recovery Details** (same as before)

**Step 3: Promise to Pay & Standing Order** (same as before)

**Step 4: Follow Up & Contact Updates** (same as before)

**Step 5: Actions (NEW)**

```
Step 5 of 5: Actions
○━━━━○━━━━○━━━━○━━━━●

┌─────────────────────────────────────────────────────────┐
│ Actions to Take                                          │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ ☑ Generate QR Code                                       │
│   Amount: [15000.00]                                     │
│                                                           │
│ ☑ Send Email Reminder                                    │
│   ☑ Include QR Code                                      │
│   ☑ CC Agent                                             │
│                                                           │
│ ☐ Send SMS Reminder                                      │
│   ☐ Include Payment Link                                 │
│                                                           │
│ ☐ Send WhatsApp Message                                  │
│   ☐ Include QR Code                                      │
│                                                           │
│ ☐ Create AOD Agreement                                   │
│   Outstanding Amount: [15000.00]                         │
│   Payment Method: [Monthly Installments ▼]              │
│                                                           │
│ ☐ Update Contact Information                             │
│   (Will use updated contact from Step 4)                │
│                                                           │
└─────────────────────────────────────────────────────────┘

[Save Draft]              [← Back] [Cancel] [Submit & Execute ✓]
```

**Features:**
- Select which actions to take
- Generate QR code with custom amount
- Send email/SMS/WhatsApp with QR code
- Create AOD agreement
- Update contact information
- All actions execute when form is submitted

---

## 4. Service Integration

### Updated `cslService.js`

```javascript
// Existing CSL methods
- getAllCSLPolicies()
- getCSLPolicyById()
- createInteraction()
- etc.

// NEW: Integration methods
- generateQRForCSLPolicy(policyId, amount)
- sendEmailReminderForCSL(policyId, options)
- sendSMSReminderForCSL(policyId, message)
- sendWhatsAppReminderForCSL(policyId, message)
- createAODForCSLPolicy(policyId, aodData)
- updateCSLContactInfo(policyId, contactData)
- getPaymentHistoryForCSL(policyId)
- getQRHistoryForCSL(policyId)
- getAODForCSLPolicy(policyId)
```

### Integration with Existing Services

```javascript
// cslService.js will call existing services

import { qrService } from './qrService'
import { emailService } from './emailService'
import { paymentPlanService } from './paymentPlanService'
import { aodPdfService } from './aodPdfService'

// Example: Generate QR for CSL policy
async generateQRForCSLPolicy(policyId, amount) {
  // 1. Get CSL policy data
  const policy = await this.getCSLPolicyById(policyId)
  
  // 2. Map CSL policy to customer format
  const customerData = {
    name: `${policy.owner1_first_name} ${policy.owner1_surname}`,
    email: policy.owner1_email,
    mobile: policy.owner1_mobile_no,
    policyNumber: policy.policy_number,
    amountDue: amount
  }
  
  // 3. Use existing QR service
  const qrResult = await qrService.generateQR(customerData)
  
  // 4. Log action in CSL interactions
  await this.logAction(policyId, 'qr_generated', { amount, qrUrl: qrResult.qrCodeUrl })
  
  return qrResult
}

// Example: Send email reminder for CSL policy
async sendEmailReminderForCSL(policyId, options) {
  const policy = await this.getCSLPolicyById(policyId)
  
  const customerData = {
    name: `${policy.owner1_first_name} ${policy.owner1_surname}`,
    email: policy.owner1_email,
    policyNumber: policy.policy_number,
    amountDue: policy.arrears_amount
  }
  
  // Use existing email service with CC and Reply-To
  const result = await emailService.sendPaymentReminderEmail(
    customerData,
    options.qrCodeUrl,
    options.paymentLink,
    {
      agentEmail: options.agentEmail,
      agentName: options.agentName,
      lineOfBusiness: 'life'
    }
  )
  
  // Log action
  await this.logAction(policyId, 'email_sent', { emailId: result.messageId })
  
  return result
}
```

---

## 5. Database Updates

### Add to `csl_interactions` table:

```sql
ALTER TABLE csl_interactions ADD COLUMN actions_taken JSON;

-- Example actions_taken JSON:
{
  "qr_generated": {
    "amount": 15000,
    "qr_url": "https://...",
    "timestamp": "2025-12-05T10:30:00Z"
  },
  "email_sent": {
    "message_id": "abc123",
    "cc_agent": true,
    "timestamp": "2025-12-05T10:31:00Z"
  },
  "sms_sent": {
    "message_id": "sms456",
    "timestamp": "2025-12-05T10:32:00Z"
  }
}
```

---

## 6. Feature Availability Matrix

| Feature | CSL Agents | Other Branches |
|---------|-----------|----------------|
| View Policy Details | ✅ (40+ fields) | ✅ (Basic fields) |
| Generate QR Code | ✅ | ✅ |
| Send Email | ✅ (with CC) | ✅ (with CC) |
| Send SMS | ✅ | ✅ |
| Send WhatsApp | ✅ | ✅ |
| Create AOD | ✅ | ✅ |
| Payment Plans | ✅ | ✅ |
| Log Interactions | ✅ (22 fields) | ✅ (Basic fields) |
| Payment Verification | ✅ (CSL-specific) | ❌ |
| Owner 2 Information | ✅ | ❌ |
| Configurable Dropdowns | ✅ | ❌ |
| CSL Reports | ✅ | ❌ |

---

## 7. Implementation Notes

### Reuse Existing Components

```javascript
// Import existing components
import QRModal from '../components/modals/QRModal'
import PaymentPlanModal from '../components/modals/PaymentPlanModal'
import MarkAODReceivedModal from '../components/modals/MarkAODReceivedModal'

// Use in CSL components
<QRModal 
  customer={cslPolicyAsCustomer} 
  onClose={handleClose}
/>

<PaymentPlanModal
  customer={cslPolicyAsCustomer}
  onClose={handleClose}
/>
```

### Data Mapping Layer

Create a utility to map CSL policy data to customer format:

```javascript
// utils/cslDataMapper.js

export function mapCSLPolicyToCustomer(cslPolicy) {
  return {
    id: cslPolicy.id,
    name: `${cslPolicy.owner1_first_name} ${cslPolicy.owner1_surname}`,
    email: cslPolicy.owner1_email,
    mobile: cslPolicy.owner1_mobile_no,
    policyNumber: cslPolicy.policy_number,
    amountDue: cslPolicy.arrears_amount,
    // ... other mappings
  }
}
```

---

## 8. Benefits of This Approach

✅ **Code Reuse** - Leverage existing QR, email, AOD functionality  
✅ **Consistency** - Same user experience across branches  
✅ **Maintainability** - Fix bugs once, benefits all branches  
✅ **Efficiency** - Don't rebuild what already works  
✅ **Integration** - CSL data flows through existing systems  

---

## 9. Updated Implementation Phases

### Phase 1: Database Setup (Week 1)
- Create CSL tables
- Add actions_taken JSON column

### Phase 2: Admin Upload (Week 2)
- CSL policy upload
- CSL payment upload
- Dropdown configuration

### Phase 3: Data Mapping Layer (Week 2)
- Create cslDataMapper utility
- Test mapping functions

### Phase 4: CSL Dashboard (Week 3)
- Dashboard with filters
- Policy list
- Integration with existing features

### Phase 5: CSL Policy Detail (Week 3-4)
- Tabbed interface
- Overview, Owner 1, Owner 2 tabs
- **Payments tab** (NEW)
- **AOD tab** (NEW)
- Interactions tab
- Integration with QR, email, SMS services

### Phase 6: Enhanced Interaction Form (Week 4)
- Multi-step wizard
- **Actions step** (NEW)
- Execute actions on submit

### Phase 7: Reports (Week 5)
- CSL-specific reports
- Integration with existing report infrastructure

### Phase 8: Testing & Deployment (Week 6)
- End-to-end testing
- Feature integration testing
- Deploy to production

---

**Document Version:** 1.0  
**Last Updated:** December 6, 2025  
**Status:** Ready for Implementation
