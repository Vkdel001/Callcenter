# NIC Call Center System - Business Logic Reference

## Overview

This document explains domain-specific business rules, workflows, and logic that govern the NIC Call Center System. Understanding these rules is essential for maintaining and extending the system.

---

## Insurance Domain Concepts

### Policy Types

**Motor Insurance**:
- Vehicle insurance policies
- Premium based on vehicle type and value
- Renewal typically annual
- Arrears common due to financial constraints

**Non-Motor Insurance**:
- Property, health, travel insurance
- Various premium structures
- Different renewal cycles
- Lower arrears rate than motor

**Life Insurance**:
- Long-term policies (10-30 years)
- Monthly or annual premiums
- Critical for customer financial planning
- Highest priority for collection

### Policy Status Lifecycle

```
New Policy
    ↓
Active (premiums paid on time)
    ↓
In Arrears (missed 1-2 payments)
    ↓
Lapsed (missed 3+ payments, policy suspended)
    ↓
Cancelled (policy terminated)
    OR
    ↓
Renewed (arrears paid, policy reactivated)
```

### Premium Calculations

**Monthly Premium**:
```
Monthly Premium = Annual Premium / 12
```

**Arrears Amount**:
```
Arrears = (Number of Missed Payments × Monthly Premium) + Late Fees
```

**Example**:
- Annual Premium: Rs 12,000
- Monthly Premium: Rs 1,000
- Missed 3 months
- Arrears: Rs 3,000 + Late Fees

---

## Payment Plan Rules

### Minimum/Maximum Installment Count

**Minimum**: 2 installments
- Ensures meaningful payment arrangement
- Reduces administrative overhead

**Maximum**: 12 installments
- Aligns with annual policy cycle
- Manageable for customers
- Reasonable collection period

**Business Rationale**:
- Too few installments: Customer may not afford
- Too many installments: Increased default risk

### Installment Amount Calculation

**Equal Installments**:
```javascript
installmentAmount = Math.round((totalAmount / installmentCount) * 100) / 100;
```

**Example**:
- Total Amount: Rs 5,000
- Installment Count: 5
- Each Installment: Rs 1,000

**Rounding Rule**:
- Round to 2 decimal places
- Last installment adjusted for rounding differences

**Example with Rounding**:
- Total Amount: Rs 5,001
- Installment Count: 5
- Installments 1-4: Rs 1,000.20
- Installment 5: Rs 1,000.21 (adjusted)

### Due Date Calculation

**Monthly Frequency**:
```javascript
// First installment due on start date
dueDate1 = startDate;

// Subsequent installments due on same day each month
dueDate2 = addMonths(startDate, 1);
dueDate3 = addMonths(startDate, 2);
// ...
```

**Weekly Frequency**:
```javascript
// First installment due on start date
dueDate1 = startDate;

// Subsequent installments due 7 days apart
dueDate2 = addDays(startDate, 7);
dueDate3 = addDays(startDate, 14);
// ...
```

**Business Rule**:
- Start date must be today or future date
- Cannot backdate payment plans
- Due dates must be business days (Monday-Friday)

### Late Payment Handling

**Grace Period**: 3 days after due date
- No late fee charged
- Status remains "pending"

**After Grace Period**:
- Status changes to "overdue"
- Late fee may be applied (configurable)
- Reminder escalation begins

**Late Fee Calculation**:
```javascript
lateFee = installmentAmount * 0.05; // 5% of installment
maxLateFee = 500; // Maximum Rs 500
actualLateFee = Math.min(lateFee, maxLateFee);
```

### Payment Plan Modification Rules

**Allowed Modifications**:
- Extend due dates (with approval)
- Add installments (split remaining amount)
- Adjust amounts (with customer agreement)

**Not Allowed**:
- Reduce total amount (without approval)
- Remove paid installments
- Change past due dates

**Modification Process**:
1. Agent requests modification
2. Admin reviews and approves
3. System updates payment plan
4. Customer notified of changes

---

## AOD Workflow Rules

### When AOD is Required

**Amount Threshold**: Rs 10,000 or more
- Legal requirement for large payment arrangements
- Protects both NIC and customer
- Enforceable in court if needed

**Policy Types Requiring AOD**:
- All payment plans ≥ Rs 10,000
- Life insurance arrears
- Multiple policy consolidations

**Exceptions** (No AOD Required):
- Amounts < Rs 10,000
- Single installment payments
- Corporate policies (different process)

### 30-Day Signature Collection Period

**Day 0**: AOD generated and sent to customer
- PDF with legal terms
- Signature section
- Return instructions

**Day 1-6**: Waiting period
- No reminders sent
- Customer expected to review and sign

**Day 7**: First reminder
- Email reminder
- SMS notification
- Reminder count: 1

**Day 14**: Second reminder
- Email reminder
- SMS notification
- Reminder count: 2

**Day 21**: Third reminder
- Email reminder (urgent tone)
- SMS notification
- Reminder count: 3

**Day 28**: Final reminder
- Email reminder (final notice)
- SMS notification
- Phone call from agent
- Reminder count: 4

**Day 30**: Deadline
- If signed: Status → "received"
- If not signed: Status → "expired"

**After Day 30**:
- Expired AODs require regeneration
- Payment plan may be cancelled
- Customer must restart process

### Reminder Schedule

**Automated Reminders**:
```javascript
const reminderSchedule = [
  { day: 7, type: 'email_sms', urgency: 'normal' },
  { day: 14, type: 'email_sms', urgency: 'normal' },
  { day: 21, type: 'email_sms', urgency: 'urgent' },
  { day: 28, type: 'email_sms_call', urgency: 'final' }
];
```

**Reminder Content Escalation**:
- Day 7: Friendly reminder
- Day 14: Polite reminder with deadline
- Day 21: Urgent reminder with consequences
- Day 28: Final notice with immediate action required

### Document Expiration Rules

**Expiration Conditions**:
1. 30 days passed without signature
2. Payment plan cancelled
3. Customer requests cancellation

**Expired AOD Handling**:
- Status: "expired"
- Cannot be reactivated
- Must generate new AOD
- New 30-day period starts

**Business Rationale**:
- Legal validity limited to 30 days
- Ensures current customer information
- Prevents stale agreements

### Legal Compliance Requirements

**AOD Must Include**:
- Customer full name and NIC
- Policy number(s)
- Total amount due
- Payment plan terms (installments, dates, amounts)
- Legal clauses (default consequences, interest, etc.)
- Signature section with date
- Witness signature section
- NIC authorized signatory

**Legal Clauses**:
1. Acknowledgment of debt
2. Agreement to payment terms
3. Default consequences
4. Interest on late payments
5. Legal action rights
6. Governing law (Mauritius)

**Document Retention**:
- Signed AODs retained for 7 years (legal requirement)
- Stored securely in Xano file storage
- Accessible for audit and legal purposes

---

## QR Code Rules

### QR Code Expiration

**Expiration Period**: 24 hours from generation
- ZwennPay limitation
- Security measure
- Prevents stale QR codes

**Expiration Handling**:
```javascript
const expiresAt = new Date();
expiresAt.setHours(expiresAt.getHours() + 24);

// Check if expired
const isExpired = new Date() > expiresAt;
```

**After Expiration**:
- QR code no longer scannable
- Status: "expired"
- Must generate new QR code
- Previous QR code invalidated

### Amount Limits

**Minimum Amount**: Rs 10
- ZwennPay minimum transaction
- Prevents micro-transactions

**Maximum Amount**: Rs 100,000
- ZwennPay maximum transaction
- Security measure
- Large amounts require approval

**Validation**:
```javascript
if (amount < 10 || amount > 100000) {
  throw new Error('Amount must be between Rs 10 and Rs 100,000');
}
```

### Transaction Logging Requirements

**Every QR Code Generation Must Log**:
- Customer ID and name
- Agent ID and name
- Amount
- Reference (policy number + installment number)
- QR code URL
- Generation timestamp
- Expiration timestamp

**Every Payment Must Log**:
- Transaction ID (from ZwennPay)
- Payment timestamp
- Payment method
- Payment status
- Webhook received timestamp

**Business Rationale**:
- Audit trail
- Dispute resolution
- Performance tracking
- Fraud prevention

### Duplicate Prevention

**Rule**: Only one active QR code per installment

**Validation**:
```javascript
// Check for existing active QR
const existingQR = await getActiveQRForInstallment(installmentId);
if (existingQR && !existingQR.isExpired) {
  throw new Error('Active QR code already exists for this installment');
}
```

**Business Rationale**:
- Prevents confusion
- Ensures single payment per installment
- Simplifies reconciliation

---

## Reminder Scheduling Logic

### Payment Reminder Timing

**Schedule**:
- **3 days before due date**: First reminder
- **On due date**: Second reminder
- **1 day after due date**: Overdue reminder

**Example**:
- Due Date: February 15
- First Reminder: February 12
- Second Reminder: February 15
- Overdue Reminder: February 16

**Reminder Content**:
```
3 days before: "Your payment of Rs [amount] is due on [date]"
On due date: "Your payment of Rs [amount] is due today"
1 day after: "Your payment of Rs [amount] is overdue"
```

### Signature Reminder Schedule

**Fixed Schedule**: Day 7, 14, 21, 28 after AOD sent

**No Reminders If**:
- Signature already received
- AOD expired
- Payment plan cancelled

### Business Hours Consideration

**Reminder Sending Hours**: 9 AM - 6 PM (Mauritius time)
- Respects customer privacy
- Higher open rates
- Professional practice

**Weekend Handling**:
- Reminders scheduled for weekends sent on next Monday
- Maintains professional communication

**Holiday Handling**:
- Reminders scheduled for public holidays sent on next business day
- Holiday calendar maintained in system

### Retry Logic for Failed Deliveries

**Email Delivery Failure**:
1. Retry after 1 hour
2. Retry after 4 hours
3. Retry after 24 hours
4. Mark as failed, notify agent

**SMS Delivery Failure**:
1. Retry after 30 minutes
2. Retry after 2 hours
3. Mark as failed, notify agent

**Business Rationale**:
- Temporary network issues
- Email server downtime
- Ensures delivery

---

## CSL Module Rules

### Monthly Data Upload Cycle

**Upload Schedule**: First week of each month
- Admin uploads previous month's policy data
- Admin uploads previous month's payment data
- System processes and assigns to agents

**Data Format**: CSV files
- Policy CSV: 40+ fields
- Payment CSV: 5+ fields

**Processing Logic**:
1. Validate CSV format
2. Upsert policies (update if exists, create if new)
3. Match payments to policies by policy number
4. Auto-assign unassigned policies
5. Generate summary report

### Auto-Assignment Algorithm

**Goal**: Balance workload among CSL agents

**Algorithm**:
```javascript
// 1. Get all CSL agents
const agents = await getCSLAgents();

// 2. Count current assignments
const assignments = agents.map(agent => ({
  agentId: agent.id,
  count: await countAssignedPolicies(agent.id, monthYear)
}));

// 3. Sort by count (ascending)
assignments.sort((a, b) => a.count - b.count);

// 4. Assign new policies to agent with lowest count
for (const policy of unassignedPolicies) {
  const agent = assignments[0];
  await assignPolicy(policy.id, agent.agentId);
  agent.count++;
  assignments.sort((a, b) => a.count - b.count);
}
```

**Considerations**:
- Branch assignment (if applicable)
- Agent capacity limits
- Policy complexity (premium amount)

### Interaction Outcome Options

**Primary Outcomes**:
- Promise to Pay
- Payment Made
- No Answer
- Wrong Number
- Refused to Pay
- Requested Callback

**Sub-Outcomes** (dependent on primary):
- Promise to Pay:
  - Will Pay Today
  - Will Pay This Week
  - Will Pay This Month
  - Will Pay Next Month
- No Answer:
  - Busy
  - No Response
  - Voicemail
- Refused to Pay:
  - Financial Difficulty
  - Dispute Amount
  - Policy Cancelled

**Business Rules**:
- Sub-outcome required if primary outcome has sub-options
- Follow-up date required for "Promise to Pay"
- Amount required for "Payment Made"

### Archiving Rules

**Archive Conditions**:
- Policy fully paid for 3+ consecutive months
- Policy cancelled
- Customer deceased
- Policy transferred

**Archive Process**:
1. Admin selects policies to archive
2. System validates archive conditions
3. System moves policies to archive table
4. System maintains audit trail
5. Policies removed from active CSL dashboard

**Archived Policy Access**:
- Admins can view archived policies
- Agents cannot access archived policies
- Archived policies can be restored if needed

---

## Agent Assignment Rules

### Branch-Based Assignment

**Rule**: Customers assigned to agents in same branch

**Example**:
- Customer in Port Louis → Agent in Port Louis branch
- Customer in Curepipe → Agent in Curepipe branch

**Exceptions**:
- No agents available in customer's branch → Assign to nearest branch
- Customer requests specific agent → Admin can override

### Workload Balancing

**Goal**: Distribute customers evenly among agents

**Balancing Algorithm**:
```javascript
// Count customers per agent
const agentWorkloads = await getAgentWorkloads();

// Assign new customer to agent with lowest count
const agent = agentWorkloads.sort((a, b) => a.count - b.count)[0];
await assignCustomer(customerId, agent.id);
```

**Considerations**:
- Agent capacity (max 100 customers per agent)
- Agent experience level
- Customer complexity (high-value policies)

### Reassignment Procedures

**Reasons for Reassignment**:
- Agent leaves company
- Agent on extended leave
- Workload rebalancing
- Customer request

**Reassignment Process**:
1. Admin selects customers to reassign
2. Admin selects new agent
3. System updates assigned_agent_id
4. System notifies new agent
5. System logs reassignment in audit trail

**Business Rules**:
- Cannot reassign customers with pending payments
- Cannot reassign during active call
- Must notify customer of agent change

---

## Data Validation Rules

### Email Format

**Validation**:
```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValid = emailRegex.test(email);
```

**Business Rules**:
- Must contain @ symbol
- Must have domain extension
- No spaces allowed
- Case-insensitive

### Phone Number Format (Mauritius)

**Format**: +230 XXXX XXXX

**Validation**:
```javascript
const phoneRegex = /^(\+230|230)?\s?\d{4}\s?\d{4}$/;
const isValid = phoneRegex.test(phone);
```

**Normalization**:
```javascript
// Normalize to +230 XXXX XXXX format
const normalized = phone.replace(/\D/g, ''); // Remove non-digits
if (normalized.startsWith('230')) {
  return '+' + normalized;
} else {
  return '+230' + normalized;
}
```

**Business Rules**:
- Must be Mauritius number (+230)
- Must be 8 digits after country code
- Mobile numbers start with 5
- Landline numbers start with 2, 4, 6, 8

### Policy Number Format

**Format**: Alphanumeric with hyphens/slashes allowed

**Examples**:
- POL-2024-001
- LIB/C7013
- MTR-PL-12345

**Validation**:
```javascript
const policyRegex = /^[A-Z0-9\-\/]+$/i;
const isValid = policyRegex.test(policyNumber);
```

**Business Rules**:
- Must be unique across system
- Case-insensitive
- No special characters except - and /
- Minimum 5 characters

### Amount Validations

**Rules**:
- Must be positive (> 0)
- Maximum 2 decimal places
- Maximum value: Rs 10,000,000

**Validation**:
```javascript
const isValidAmount = (amount) => {
  if (amount <= 0) return false;
  if (amount > 10000000) return false;
  
  // Check decimal places
  const decimals = (amount.toString().split('.')[1] || '').length;
  if (decimals > 2) return false;
  
  return true;
};
```

### Date Validations

**Rules**:
- Due dates must be in future
- Start dates must be today or future
- Dates must be valid calendar dates
- Dates must be business days (Monday-Friday)

**Validation**:
```javascript
const isValidDueDate = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(date);
  dueDate.setHours(0, 0, 0, 0);
  
  // Must be today or future
  if (dueDate < today) return false;
  
  // Must be business day (Monday-Friday)
  const dayOfWeek = dueDate.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  
  return true;
};
```

---

## Status Workflows

### Customer Status

```
pending → contacted → resolved
   ↓         ↓
   └─────────┴──→ archived
```

**Status Definitions**:
- **pending**: New customer, not yet contacted
- **contacted**: Agent has made contact, working on resolution
- **resolved**: Payment plan established or arrears paid
- **archived**: No longer active (paid off, cancelled, etc.)

**Status Transitions**:
- pending → contacted: Agent logs first call
- contacted → resolved: Payment plan created or payment received
- Any → archived: Admin archives customer

### Payment Status

```
pending → paid
   ↓
overdue
```

**Status Definitions**:
- **pending**: Payment not yet made, due date not passed
- **paid**: Payment received and confirmed
- **overdue**: Due date passed, payment not received

**Status Transitions**:
- pending → paid: Payment received via QR code or manual entry
- pending → overdue: Due date passed (automated)
- overdue → paid: Late payment received

### AOD Status

```
pending_signature → received → active
        ↓
    expired
```

**Status Definitions**:
- **pending_signature**: AOD sent, awaiting customer signature
- **received**: Signed AOD received from customer
- **expired**: 30 days passed without signature
- **active**: Payment plan active with signed AOD

**Status Transitions**:
- pending_signature → received: Agent uploads signed document
- pending_signature → expired: 30 days passed (automated)
- received → active: Payment plan activated

### Policy Status (CSL)

```
active → in_arrears → lapsed
   ↓         ↓          ↓
   └─────────┴──────────┴──→ renewed
```

**Status Definitions**:
- **active**: Premiums paid on time
- **in_arrears**: 1-2 missed payments
- **lapsed**: 3+ missed payments, policy suspended
- **renewed**: Arrears paid, policy reactivated

**Status Transitions**:
- active → in_arrears: Payment missed
- in_arrears → lapsed: Multiple payments missed
- Any → renewed: Arrears paid

---

## Business Rules Summary

### Critical Rules

1. **Payment plans ≥ Rs 10,000 require AOD**
2. **AOD must be signed within 30 days**
3. **QR codes expire after 24 hours**
4. **Only one active QR per installment**
5. **Reminders sent only during business hours (9 AM - 6 PM)**
6. **Installment count: 2-12**
7. **Amount limits: Rs 10 - Rs 100,000 for QR codes**
8. **Phone numbers must be Mauritius format (+230)**
9. **Policy numbers must be unique**
10. **Due dates must be business days**

### Configurable Rules

- Late fee percentage (default: 5%)
- Maximum late fee (default: Rs 500)
- Grace period (default: 3 days)
- Reminder schedule (default: 3 days before, on due date, 1 day after)
- AOD amount threshold (default: Rs 10,000)
- Agent capacity (default: 100 customers)

---

## Glossary

- **AOD**: Acknowledgment of Debt - Legal document for payment plans
- **Arrears**: Overdue premium payments
- **CSL**: Call Center module for monthly policy management
- **Installment**: Individual payment in a payment plan
- **Lapsed Policy**: Policy suspended due to non-payment
- **LOB**: Line of Business (insurance product type)
- **Premium**: Insurance payment amount
- **QR Code**: Quick Response code for payments
- **Upsert**: Update if exists, insert if new

---

**Document Version**: 1.0  
**Last Updated**: February 4, 2026  
**Maintained By**: Development Team
