# New Policy Branch Email Notification - Feasibility Analysis

## 📋 Feature Request Summary

**Requirement:** When a sales agent selects "New Policy" in Quick QR Generator, add a Branch dropdown. When the customer makes a payment, send payment confirmation emails to:
1. Customer email (existing)
2. Branch group email (new)
3. Agent email (existing)

---

## ✅ Feasibility Assessment

### **Overall Feasibility: HIGH ✅**

This feature is **highly feasible** and aligns well with the existing architecture. The system already has:
- Branch management infrastructure
- Payment webhook with email notifications
- QR transaction logging with agent/customer data
- Multi-recipient email capability (CC functionality)

---

## 📊 Scope of Changes

### **Size of Change: MEDIUM** 🟡

**Estimated Effort:** 4-6 hours
**Complexity:** Medium
**Risk Level:** Low

---

## 🔍 Current System Analysis

### **What Already Exists:**

1. **Branch Management System** ✅
   - `nic_cc_branch` table in Xano
   - Branch CRUD operations
   - Branch assignment to agents
   - Fields: `id`, `name`, `code`, `address`, `active`

2. **Payment Confirmation Flow** ✅
   - Webhook receives payment notifications
   - `sendCustomerPaymentConfirmation()` sends to customer
   - `sendAgentPaymentNotification()` sends to agent
   - Uses Brevo API for email delivery

3. **QR Transaction Logging** ✅
   - `nic_cc_qr_transactions` table
   - Stores: `agent_email`, `customer_email`, `policy_number`, `line_of_business`
   - Webhook queries this table to find transaction details

4. **Multi-Recipient Email** ✅
   - Brevo API supports CC and multiple recipients
   - Already used for agent CC in payment reminders

### **What's Missing:**

1. **Branch Email Field** ❌
   - `nic_cc_branch` table doesn't have `email` or `group_email` field
   - Need to add this field to store branch notification email

2. **Branch Selection in Quick QR** ❌
   - No branch dropdown in QuickQRGenerator.jsx
   - Need to add branch selection for "New Policy" mode

3. **Branch Email in QR Transaction** ❌
   - `nic_cc_qr_transactions` doesn't store `branch_id` or `branch_email`
   - Need to add these fields for webhook lookup

4. **Branch Email in Webhook** ❌
   - Webhook doesn't send to branch email
   - Need to add branch email to recipient list

---

## 🛠️ Required Changes

### **1. Database Changes (Xano)**

#### **A. Add Email Field to Branch Table**
**Table:** `nic_cc_branch`
**New Field:** `notification_email` (Text, optional)

**Purpose:** Store the group email address for each branch

**Example Data:**
```
Branch 1 (Port Louis): portlouis@nicl.mu
Branch 2 (Curepipe): curepipe@nicl.mu
Branch 3 (Quatre Bornes): quatrebornes@nicl.mu
Branch 6 (Call Center): callcenter@nicl.mu
```

**Migration:** No data loss, existing branches will have null email (optional field)

---

#### **B. Add Branch Fields to QR Transactions Table**
**Table:** `nic_cc_qr_transactions`
**New Fields:**
- `branch_id` (Integer, optional) - Links to nic_cc_branch.id
- `branch_email` (Text, optional) - Cached branch email for faster lookup

**Purpose:** Store branch information when QR is generated, so webhook can send notifications

**Why Cache Email?** 
- Faster webhook processing (no need to join branch table)
- Preserves email even if branch is deleted/modified later
- Audit trail of which email was used

---

### **2. Frontend Changes**

#### **A. Update Branch Management Page**
**File:** `src/pages/admin/BranchManagement.jsx`

**Changes:**
- Add "Notification Email" field to branch form
- Display email in branch cards
- Validate email format

**Estimated Lines:** +30 lines

**Example UI:**
```jsx
<div>
  <label>Notification Email (Optional)</label>
  <input
    {...register('notification_email', {
      pattern: {
        value: /^\S+@\S+$/i,
        message: 'Invalid email format'
      }
    })}
    type="email"
    placeholder="branch@nicl.mu"
  />
  <p className="help-text">
    Group email for payment notifications (e.g., portlouis@nicl.mu)
  </p>
</div>
```

---

#### **B. Update Quick QR Generator**
**File:** `src/pages/QuickQRGenerator.jsx`

**Changes:**
1. Add branch dropdown (only visible in "New Policy" mode)
2. Fetch branches from API
3. Pass selected branch to QR generation
4. Store branch_id and branch_email in QR transaction

**Estimated Lines:** +80 lines

**UI Flow:**
```
[Policy Type Dropdown]
  ├─ New Policy (Application Form)  ← Selected
  └─ Existing Policy (Payment Reminder)

[Branch Dropdown] ← NEW (only shows when "New Policy" selected)
  ├─ Port Louis Branch (portlouis@nicl.mu)
  ├─ Curepipe Branch (curepipe@nicl.mu)
  ├─ Quatre Bornes Branch (quatrebornes@nicl.mu)
  └─ Call Center (callcenter@nicl.mu)

[Customer Name]
[Application Form Number]
[Mobile Number]
[Email Address]
[National ID]
[Amount Due]

[Generate Payment QR]
```

**Example Code:**
```jsx
// State for branch selection
const [selectedBranch, setSelectedBranch] = useState(null)

// Fetch branches
const { data: branches = [] } = useQuery('branches', async () => {
  const response = await branchApi.get('/nic_cc_branch')
  return response.data.filter(b => b.active && b.notification_email)
})

// Branch dropdown (only in new policy mode)
{isNewPolicyMode && (
  <div>
    <label>Branch *</label>
    <select
      value={selectedBranch?.id || ''}
      onChange={(e) => {
        const branch = branches.find(b => b.id === parseInt(e.target.value))
        setSelectedBranch(branch)
      }}
      required
    >
      <option value="">Select Branch</option>
      {branches.map(branch => (
        <option key={branch.id} value={branch.id}>
          {branch.name} ({branch.notification_email})
        </option>
      ))}
    </select>
  </div>
)}
```

---

#### **C. Update QR Transaction Service**
**File:** `src/services/qrTransactionService.js`

**Changes:**
- Add `branch_id` and `branch_email` to transaction log payload
- Pass branch data from QuickQRGenerator

**Estimated Lines:** +5 lines

**Example:**
```javascript
async logQRGeneration(qrData, customerData, agentData, qrType, branchData = null) {
  const payload = {
    // ... existing fields ...
    agent_email: agentData?.email || null,
    customer_email: customerData.email,
    
    // NEW: Branch information
    branch_id: branchData?.id || null,
    branch_email: branchData?.notification_email || null
  }
  
  await qrTransactionApi.post('/nic_cc_qr_transactions', payload)
}
```

---

### **3. Backend Changes (Webhook)**

#### **A. Update Payment Confirmation Function**
**File:** `webhookcode-enhanced.js`

**Changes:**
- Add branch email to recipient list when available
- Use CC or BCC for branch email (configurable)

**Estimated Lines:** +15 lines

**Example:**
```javascript
async function sendCustomerPaymentConfirmation(transaction, paymentData) {
  const emailData = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [
      {
        email: transaction.customer_email,
        name: transaction.customer_name || 'Customer'
      }
    ],
    
    // NEW: Add branch email as CC (visible to customer)
    ...(transaction.branch_email && {
      cc: [
        {
          email: transaction.branch_email,
          name: 'Branch Office'
        }
      ]
    }),
    
    // Existing: Add agent email as CC
    ...(transaction.agent_email && {
      cc: [
        ...(transaction.branch_email ? [{
          email: transaction.branch_email,
          name: 'Branch Office'
        }] : []),
        {
          email: transaction.agent_email,
          name: transaction.agent_name || 'Agent'
        }
      ]
    }),
    
    subject: `Payment Confirmation - Policy ${transaction.policy_number}`,
    htmlContent: `...`
  }
  
  // Send email
  await axios.post('https://api.brevo.com/v3/smtp/email', emailData, ...)
}
```

---

## 📧 Email Recipient Logic

### **Scenario 1: New Policy Payment (with Branch)**
**Recipients:**
- **TO:** Customer email (customer@email.com)
- **CC:** Branch email (portlouis@nicl.mu)
- **CC:** Agent email (agent@nicl.mu)

**Result:** All three parties receive the same payment confirmation

---

### **Scenario 2: New Policy Payment (no Branch Email)**
**Recipients:**
- **TO:** Customer email
- **CC:** Agent email

**Result:** Falls back to current behavior (customer + agent only)

---

### **Scenario 3: Existing Policy Payment**
**Recipients:**
- **TO:** Customer email
- **CC:** Agent email (if available)

**Result:** No branch email (only for new policies)

---

## 🎯 User Experience Flow

### **Sales Agent Workflow:**

1. **Login** → Quick QR Generator
2. **Select:** "New Policy" (default)
3. **Select Branch:** Choose from dropdown (e.g., "Port Louis Branch")
4. **Fill Form:** Application number, customer details
5. **Generate QR:** QR code created with branch info
6. **Customer Pays:** Scans QR and makes payment
7. **Notifications Sent:**
   - ✅ Customer receives confirmation
   - ✅ Branch office receives notification
   - ✅ Agent receives notification

---

## 🔒 Security & Privacy Considerations

### **1. Email Visibility**
**Decision:** Use **CC (visible)** instead of BCC

**Reasoning:**
- Transparency: Customer knows branch is notified
- Accountability: Branch knows agent is involved
- Collaboration: All parties can reply-all if needed

**Alternative:** Use BCC if privacy is preferred

---

### **2. Branch Email Validation**
- Only active branches with valid emails shown
- Email format validation on frontend and backend
- Optional field (graceful degradation if missing)

---

### **3. Data Retention**
- Branch email cached in QR transaction (audit trail)
- Historical record preserved even if branch changes

---

## 🧪 Testing Requirements

### **1. Database Testing**
- [ ] Add `notification_email` field to `nic_cc_branch`
- [ ] Add `branch_id` and `branch_email` to `nic_cc_qr_transactions`
- [ ] Test with existing branches (null email handling)
- [ ] Test with new branches (email populated)

### **2. Frontend Testing**
- [ ] Branch dropdown appears only in "New Policy" mode
- [ ] Branch dropdown hidden in "Existing Policy" mode
- [ ] Branch selection required for new policies
- [ ] Branch email displayed in dropdown
- [ ] QR generation includes branch data

### **3. Webhook Testing**
- [ ] Payment confirmation sent to customer
- [ ] Payment confirmation CC'd to branch email
- [ ] Payment confirmation CC'd to agent email
- [ ] Graceful handling when branch email is null
- [ ] Email delivery logs show all recipients

### **4. Email Testing**
- [ ] Customer receives email (TO)
- [ ] Branch receives email (CC)
- [ ] Agent receives email (CC)
- [ ] Email content is correct
- [ ] All recipients can see each other (CC transparency)

---

## 📦 Deployment Plan

### **Phase 1: Database Setup**
1. Add `notification_email` to `nic_cc_branch` table
2. Add `branch_id` and `branch_email` to `nic_cc_qr_transactions`
3. Populate branch emails for existing branches

### **Phase 2: Frontend Updates**
1. Update Branch Management page (add email field)
2. Update Quick QR Generator (add branch dropdown)
3. Update QR transaction service (pass branch data)

### **Phase 3: Backend Updates**
1. Update `webhookcode-enhanced.js` payment confirmation function
2. Add branch email to CC list
3. Test email delivery

### **Phase 4: Testing & Rollout**
1. Test in development environment
2. Test with real branch emails
3. Deploy to production
4. Monitor email delivery logs

---

## ⚠️ Potential Issues & Solutions

### **Issue 1: Branch Email Not Set**
**Problem:** Branch doesn't have notification email configured

**Solution:** 
- Make field optional
- Gracefully skip branch notification if email is null
- Show warning in UI if branch has no email

---

### **Issue 2: Email Delivery Limits**
**Problem:** Brevo has daily sending limits

**Solution:**
- Branch emails count toward limit
- Monitor usage
- Consider using BCC instead of CC to reduce visible recipients

---

### **Issue 3: Branch Changes**
**Problem:** Branch email changes after QR is generated

**Solution:**
- Cache branch email in QR transaction (already planned)
- Use cached email for notifications (historical accuracy)
- New QRs will use updated email

---

### **Issue 4: Multiple Branches**
**Problem:** Agent works across multiple branches

**Solution:**
- Require branch selection per QR (already planned)
- Agent chooses appropriate branch for each customer
- No automatic branch detection

---

## 💰 Cost Analysis

### **Development Time:**
- Database changes: 30 minutes
- Branch Management UI: 1 hour
- Quick QR Generator UI: 2 hours
- QR Transaction Service: 30 minutes
- Webhook updates: 1 hour
- Testing: 1-2 hours

**Total: 4-6 hours**

### **Ongoing Costs:**
- Email sending: +1 email per payment (branch CC)
- Storage: Minimal (2 new fields per QR transaction)
- Maintenance: Low (follows existing patterns)

---

## ✅ Recommendation

### **Proceed with Implementation: YES ✅**

**Reasons:**
1. ✅ **High Business Value:** Improves branch visibility and accountability
2. ✅ **Low Technical Risk:** Uses existing infrastructure
3. ✅ **Reasonable Effort:** 4-6 hours of development
4. ✅ **Good Architecture:** Follows existing patterns
5. ✅ **Scalable:** Easy to extend to other notification scenarios

---

## 📝 Implementation Checklist

### **Database (Xano):**
- [ ] Add `notification_email` field to `nic_cc_branch` table
- [ ] Add `branch_id` field to `nic_cc_qr_transactions` table
- [ ] Add `branch_email` field to `nic_cc_qr_transactions` table
- [ ] Populate branch emails for existing branches

### **Frontend:**
- [ ] Update `src/pages/admin/BranchManagement.jsx` (add email field)
- [ ] Update `src/pages/QuickQRGenerator.jsx` (add branch dropdown)
- [ ] Update `src/services/qrTransactionService.js` (pass branch data)
- [ ] Add branch API service if needed

### **Backend (Webhook):**
- [ ] Update `webhookcode-enhanced.js` (add branch CC)
- [ ] Test email delivery with multiple recipients
- [ ] Deploy updated webhook to Railway/VPS

### **Testing:**
- [ ] Test branch email configuration
- [ ] Test branch dropdown in Quick QR
- [ ] Test payment confirmation with branch CC
- [ ] Test graceful degradation (no branch email)
- [ ] Test email delivery logs

### **Documentation:**
- [ ] Update user guide for branch email setup
- [ ] Document branch selection workflow
- [ ] Update deployment checklist

---

## 🎯 Success Criteria

1. ✅ Branch admins can configure notification emails
2. ✅ Sales agents can select branch when generating new policy QRs
3. ✅ Payment confirmations sent to customer, branch, and agent
4. ✅ System gracefully handles missing branch emails
5. ✅ All emails delivered successfully (monitored via Brevo logs)

---

## 📞 Next Steps

**Awaiting Your Approval to Proceed with:**
1. Database schema changes (add email fields)
2. Frontend UI updates (branch dropdown)
3. Webhook email logic updates (branch CC)

**Estimated Timeline:** 1-2 days for complete implementation and testing

---

**Status:** ✅ **FEASIBLE - AWAITING APPROVAL**

**Date:** February 1, 2026  
**Feature:** New Policy Branch Email Notifications  
**Complexity:** Medium  
**Risk:** Low  
**Recommendation:** Proceed with Implementation
