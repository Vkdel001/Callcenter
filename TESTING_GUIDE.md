# NIC Call Center System - Testing Guide

## Overview

This guide provides comprehensive testing procedures for the NIC Call Center System, including test environment setup, manual testing procedures, and critical user journeys.

---

## Test Environment Setup

### 1. Test Xano Instance

**Setup Steps**:
1. Create separate Xano workspace for testing
2. Clone production database structure
3. Populate with test data
4. Configure test API endpoints

**Test Data Requirements**:
- 50+ test customers
- 10+ test agents
- 20+ test payment plans
- Sample CSL policies
- Test branches

### 2. Test User Accounts

**Required Test Accounts**:
```
Admin Account:
- Email: admin.test@nic.mu
- Password: TestAdmin123!
- Role: admin

Agent Account:
- Email: agent.test@nic.mu
- Password: TestAgent123!
- Role: agent

CSL Agent Account:
- Email: csl.test@nic.mu
- Password: TestCSL123!
- Role: csl_agent

Sales Agent Account:
- Email: sales.test@nic.mu
- Password: TestSales123!
- Role: sales_agent
```

### 3. Test Data Creation

**Create Test Customers**:
```javascript
// Use test-data-customers.csv
const testCustomers = [
  {
    policy_number: "TEST-001",
    name: "Test Customer 1",
    mobile: "+230 5123 4567",
    email: "test1@example.com",
    amount_due: 5000.00,
    policy_type: "Motor"
  },
  // ... more test customers
];
```

**Create Test Payment Plans**:
```javascript
// Create via API or Xano dashboard
POST /payment-plans
{
  "customer_id": 1,
  "total_amount": 5000.00,
  "installment_count": 5,
  "start_date": "2024-02-01"
}
```

### 4. Mock Services Configuration

**Mock Brevo (Email/SMS)**:
```javascript
// Use test API key that doesn't send real emails
VITE_BREVO_API_KEY=test-key-no-send

// Or use Brevo test mode
// Emails logged but not delivered
```

**Mock ZwennPay (QR Payments)**:
```javascript
// Use sandbox API key
VITE_ZWENNPAY_API_KEY=sandbox-key

// QR codes generated but payments simulated
```

---

## Existing Test Files

### Location of Test Scripts

All test files are in the root directory with prefix `test-`:

```
test-login-flow.js
test-customer-enhancement.js
test-qr-performance-browser.js
test-installment-qr-fix.js
test-aod-email-cc.js
test-bulk-agent-creation.js
test-csl-functions.js
test-device-linking-improved.js
... (50+ test files)
```

### How to Run Tests

**Individual Test**:
```bash
node test-login-flow.js
```

**All Tests** (if test runner configured):
```bash
npm test
```

**Test with Specific Environment**:
```bash
# Set test environment variables
export VITE_API_URL=https://test-api.xano.io
node test-login-flow.js
```

### Test Data Files (CSV)

```
test-data-customers.csv
test-data-agents.csv
test-data-csr-customers.csv
test-data-branch-distribution.csv
sample-bulk-agents.csv
new-test-customers.csv
```

---

## Manual Testing Procedures

### Authentication Flow

#### Test 1: Login with Valid Credentials
**Steps**:
1. Navigate to login page
2. Enter email: agent.test@nic.mu
3. Enter password: TestAgent123!
4. Click "Login"

**Expected Result**:
- ✅ Redirected to dashboard
- ✅ User name displayed in navbar
- ✅ JWT token stored in localStorage
- ✅ Appropriate menu items visible based on role

**Verification**:
```javascript
// Check localStorage
localStorage.getItem('token') // Should have JWT
localStorage.getItem('user') // Should have user object
```

#### Test 2: Login with Invalid Credentials
**Steps**:
1. Navigate to login page
2. Enter email: agent.test@nic.mu
3. Enter password: WrongPassword
4. Click "Login"

**Expected Result**:
- ✅ Error message displayed: "Invalid email or password"
- ✅ User remains on login page
- ✅ No token stored

#### Test 3: OTP Verification
**Steps**:
1. Login with valid credentials
2. System sends OTP to email
3. Enter OTP code
4. Click "Verify"

**Expected Result**:
- ✅ OTP sent to email
- ✅ Valid OTP accepted
- ✅ Invalid OTP rejected
- ✅ OTP expires after 10 minutes

#### Test 4: Password Reset Flow
**Steps**:
1. Click "Forgot Password"
2. Enter email: agent.test@nic.mu
3. Receive OTP via email
4. Enter OTP
5. Enter new password
6. Confirm new password
7. Submit

**Expected Result**:
- ✅ OTP sent to email
- ✅ Valid OTP accepted
- ✅ Password updated successfully
- ✅ Can login with new password

#### Test 5: Session Expiration
**Steps**:
1. Login successfully
2. Wait 24 hours (or manually expire token)
3. Try to access protected page

**Expected Result**:
- ✅ Redirected to login page
- ✅ Message: "Session expired, please login again"
- ✅ Token removed from localStorage

---

### Payment Plan Flow

#### Test 1: Create Payment Plan
**Steps**:
1. Login as agent
2. Navigate to Customers
3. Select customer "Test Customer 1"
4. Click "Create Payment Plan"
5. Enter:
   - Total Amount: 5000
   - Installments: 5
   - Start Date: 2024-02-01
6. Click "Create"

**Expected Result**:
- ✅ Payment plan created
- ✅ 5 installments generated
- ✅ Each installment amount: 1000
- ✅ Due dates: 2024-02-01, 2024-03-01, 2024-04-01, 2024-05-01, 2024-06-01
- ✅ Success message displayed

**Verification**:
```javascript
// Check in Xano dashboard
// payment_plans table should have new record
// installments table should have 5 records
```

#### Test 2: Generate QR Code for Installment
**Steps**:
1. View payment plan details
2. Select first installment
3. Click "Generate QR Code"
4. QR code displayed

**Expected Result**:
- ✅ QR code generated
- ✅ QR code image displayed
- ✅ Amount shown: 1000
- ✅ Reference includes policy number and installment number
- ✅ QR code logged in qr_transactions table

#### Test 3: Simulate Payment
**Steps**:
1. Generate QR code
2. Use test webhook to simulate payment:
```bash
curl -X POST https://your-railway-app.railway.app/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "TEST-123",
    "reference": "TEST-001-INS-1",
    "amount": 1000.00,
    "status": "completed",
    "paid_at": "2024-02-01T15:30:00Z"
  }'
```

**Expected Result**:
- ✅ Webhook processes payment
- ✅ Installment status updated to "paid"
- ✅ Confirmation email sent to customer
- ✅ QR transaction status updated to "completed"

#### Test 4: Verify Installment Update
**Steps**:
1. View payment plan details
2. Check first installment status

**Expected Result**:
- ✅ Status: Paid
- ✅ Paid date: 2024-02-01
- ✅ Payment method: QR Code
- ✅ Transaction ID: TEST-123

---

### AOD Workflow

#### Test 1: Generate AOD PDF
**Steps**:
1. Create payment plan
2. Click "Generate AOD"
3. System generates PDF

**Expected Result**:
- ✅ PDF generated with:
  - NIC logo
  - Customer details
  - Payment plan terms
  - Legal clauses
  - Signature section
- ✅ PDF uploaded to Xano storage
- ✅ AOD record created with status "pending_signature"

#### Test 2: Send Signature Request
**Steps**:
1. Generate AOD PDF
2. Click "Send Signature Request"
3. Email sent to customer

**Expected Result**:
- ✅ Email sent with PDF attachment
- ✅ Email contains instructions
- ✅ signature_sent_date recorded
- ✅ Status remains "pending_signature"

#### Test 3: Check Reminder Scheduling
**Steps**:
1. Generate AOD
2. Wait for Day 7 (or manually trigger reminder service)
3. Check reminder sent

**Expected Result**:
- ✅ Reminder sent on Day 7
- ✅ reminder_count incremented to 1
- ✅ last_signature_reminder updated
- ✅ Reminders sent on Day 14, 21, 28

**Manual Trigger**:
```bash
# SSH to VPS
ssh root@your-vps-ip

# Run reminder service manually
node backend-reminder-service.cjs

# Check logs
tail -f /var/log/nic-reminder.log
```

#### Test 4: Upload Signed Document
**Steps**:
1. Prepare test PDF file (signed-aod-test.pdf)
2. Navigate to AOD history
3. Click "Upload Signed Document"
4. Select file
5. Click "Upload"

**Expected Result**:
- ✅ File uploaded successfully
- ✅ signed_document_url populated
- ✅ Status updated to "received"
- ✅ signature_received_date recorded
- ✅ Confirmation email sent

#### Test 5: Verify Status Changes
**Steps**:
1. Check AOD record in Xano dashboard
2. Verify status transitions

**Expected Status Flow**:
```
pending_signature → received (after upload)
pending_signature → expired (after 30 days)
received → active (when payment plan activated)
```

---

### CSL Module

#### Test 1: Upload Policies (CSV)
**Steps**:
1. Login as admin
2. Navigate to CSL → Policy Upload
3. Select month-year: 2024-02
4. Upload test CSV file (test-data-csr-customers.csv)
5. Click "Upload"

**Expected Result**:
- ✅ CSV validated
- ✅ Records processed (upsert logic)
- ✅ Summary displayed: X created, Y updated
- ✅ Policies visible in CSL dashboard

**Test CSV**:
```csv
policy_number,customer_name,mobile,email,premium_amount,arrears_amount,policy_type
CSL-001,John Doe,+230 5123 4567,john@example.com,500.00,100.00,Life
CSL-002,Jane Smith,+230 5987 6543,jane@example.com,750.00,200.00,Life
```

#### Test 2: Upload Payments (CSV)
**Steps**:
1. Navigate to CSL → Payment Upload
2. Select month-year: 2024-02
3. Upload payment CSV
4. Click "Upload"

**Expected Result**:
- ✅ Payments imported
- ✅ Matched to policies by policy_number
- ✅ Policy status updated if payment found

**Test CSV**:
```csv
policy_number,payment_date,payment_amount,payment_reference
CSL-001,2024-02-01,500.00,PAY-001
```

#### Test 3: Auto-Assignment Verification
**Steps**:
1. Upload policies without assigned_agent_id
2. Check auto-assignment

**Expected Result**:
- ✅ Policies distributed among agents
- ✅ Workload balanced
- ✅ Each agent has similar number of policies

**Verification**:
```sql
SELECT assigned_agent_id, COUNT(*) as policy_count
FROM csl_policies
WHERE month_year = '2024-02'
GROUP BY assigned_agent_id;
```

#### Test 4: Log Interaction
**Steps**:
1. Login as CSL agent
2. Navigate to CSL Dashboard
3. Select policy
4. Click "Log Interaction"
5. Fill form:
   - Calling date: Today
   - Outcome: Promise to Pay
   - Sub-outcome: Will Pay This Week
   - Amount paid: 0
   - Promise to pay amount: 500
   - Follow-up date: Next week
   - Notes: Customer agreed to pay
6. Click "Save"

**Expected Result**:
- ✅ Interaction saved
- ✅ Policy status updated
- ✅ Follow-up date set
- ✅ Interaction visible in policy detail

#### Test 5: Generate Reports
**Steps**:
1. Navigate to CSL → Reports
2. Select month-year: 2024-02
3. Select agent (or all)
4. Click "Generate Report"

**Expected Result**:
- ✅ Report generated with:
  - Total policies
  - Contacted count
  - Resolved count
  - Total premium
  - Collected premium
  - Collection rate
- ✅ Export to CSV works

---

### Device Integration

#### Test 1: Link Device
**Steps**:
1. Install Windows client on test machine
2. Ensure ESP32 device on same network
3. Launch client
4. Client discovers device
5. Click "Link Device"
6. Enter agent credentials

**Expected Result**:
- ✅ Device discovered via UDP broadcast
- ✅ Device MAC address displayed
- ✅ Link request sent to VPS
- ✅ Device record created in Xano
- ✅ Success message displayed

#### Test 2: Generate QR on Device
**Steps**:
1. Login to web app
2. Generate QR code
3. Click "Display on Device"
4. Select linked device
5. Click "Send"

**Expected Result**:
- ✅ QR code sent to device service
- ✅ Device service sends to ESP32
- ✅ QR code displayed on ESP32 screen
- ✅ QR code remains until cleared

#### Test 3: Multi-Device Testing
**Steps**:
1. Link 2 devices to same agent
2. Generate QR code
3. Select Device 1
4. Send QR code
5. Verify QR on Device 1
6. Select Device 2
7. Send same QR code
8. Verify QR on Device 2

**Expected Result**:
- ✅ Both devices receive QR code
- ✅ QR code displayed on both screens
- ✅ No conflicts

#### Test 4: Device Unlinking
**Steps**:
1. Navigate to Device Management
2. Select device
3. Click "Unlink Device"
4. Confirm

**Expected Result**:
- ✅ Device unlinked
- ✅ Device record updated in Xano
- ✅ Device no longer appears in agent's device list
- ✅ Cannot send QR codes to unlinked device

---

## Critical User Journeys

### Journey 1: End-to-End Payment Collection

**Scenario**: Agent collects payment from customer using QR code

**Steps**:
1. Agent logs in
2. Searches for customer by policy number
3. Views customer details
4. Creates payment plan (5 installments)
5. Generates QR code for first installment
6. Sends QR code via email
7. Customer receives email
8. Customer scans QR code
9. Customer completes payment
10. Webhook updates installment status
11. Agent receives notification
12. Customer receives confirmation email

**Success Criteria**:
- ✅ All steps complete without errors
- ✅ Payment recorded correctly
- ✅ Emails sent successfully
- ✅ Installment status updated
- ✅ Total time < 5 minutes

### Journey 2: Complete AOD Signature Workflow

**Scenario**: Agent generates AOD and customer returns signed document

**Steps**:
1. Agent creates payment plan
2. Agent generates AOD PDF
3. System sends AOD to customer
4. System sends reminders (Day 7, 14, 21, 28)
5. Customer signs and returns document
6. Agent uploads signed document
7. System updates status to "received"
8. Payment plan activated

**Success Criteria**:
- ✅ AOD generated correctly
- ✅ Reminders sent on schedule
- ✅ Signed document uploaded successfully
- ✅ Status transitions correct
- ✅ Total time < 30 days

### Journey 3: CSL Monthly Cycle

**Scenario**: Admin uploads monthly policies and agents process them

**Steps**:
1. Admin uploads policy CSV for February 2024
2. System processes and auto-assigns policies
3. Admin uploads payment CSV
4. System matches payments to policies
5. CSL agents log in
6. Agents see assigned policies
7. Agents call customers and log interactions
8. Agents set follow-up dates
9. Admin generates monthly report

**Success Criteria**:
- ✅ All policies uploaded successfully
- ✅ Auto-assignment balanced
- ✅ Payments matched correctly
- ✅ Interactions logged
- ✅ Report accurate

### Journey 4: Device Linking and QR Display

**Scenario**: Agent links ESP32 device and displays QR code

**Steps**:
1. Agent installs Windows client
2. Agent launches client
3. Client discovers ESP32 device
4. Agent links device
5. Agent logs into web app
6. Agent generates QR code
7. Agent sends QR to device
8. Customer scans QR from device screen
9. Payment processed

**Success Criteria**:
- ✅ Device discovered automatically
- ✅ Device linked successfully
- ✅ QR code displayed on device
- ✅ QR code scannable
- ✅ Payment processed

---

## Performance Testing

### Load Testing Procedures

**Tool**: Apache JMeter or Artillery

**Test Scenarios**:

1. **Concurrent Logins**:
   - 100 users login simultaneously
   - Expected: All logins successful within 5 seconds

2. **Customer List Loading**:
   - 50 agents load customer list simultaneously
   - Expected: Page loads within 2 seconds

3. **QR Code Generation**:
   - 30 agents generate QR codes simultaneously
   - Expected: All QR codes generated within 3 seconds

4. **CSV Upload**:
   - Admin uploads 1000-record CSV
   - Expected: Processing completes within 30 seconds

**Load Test Script** (Artillery):
```yaml
config:
  target: 'https://nic-callcenter.netlify.app'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Login and view customers"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "agent.test@nic.mu"
            password: "TestAgent123!"
      - get:
          url: "/api/customers"
```

### API Response Time Benchmarks

**Acceptable Response Times**:
- Login: < 500ms
- Customer list: < 1000ms
- Customer detail: < 500ms
- QR generation: < 2000ms
- Payment plan creation: < 1000ms
- CSV upload (100 records): < 5000ms

**Monitoring**:
```javascript
// Add to API calls
console.time('API Call');
await axios.get('/api/customers');
console.timeEnd('API Call');
```

### Database Query Performance

**Slow Query Threshold**: > 1000ms

**Test Queries**:
```sql
-- Should complete in < 100ms
SELECT * FROM customers WHERE assigned_agent_id = 123;

-- Should complete in < 200ms
SELECT * FROM csl_policies WHERE month_year = '2024-02';

-- Should complete in < 500ms
SELECT c.*, COUNT(pp.id) as plan_count
FROM customers c
LEFT JOIN payment_plans pp ON pp.customer_id = c.id
GROUP BY c.id;
```

**Optimization**:
- Ensure indexes exist on frequently queried fields
- Use EXPLAIN to analyze query plans
- Add indexes if queries slow

### Frontend Rendering Performance

**Metrics**:
- First Contentful Paint (FCP): < 1.5s
- Time to Interactive (TTI): < 3.5s
- Largest Contentful Paint (LCP): < 2.5s

**Testing Tool**: Lighthouse (Chrome DevTools)

**Steps**:
1. Open Chrome DevTools
2. Navigate to Lighthouse tab
3. Run audit
4. Review performance score (target: > 90)

---

## Security Testing

### Authentication Bypass Attempts

**Test 1: Access Protected Route Without Token**:
```javascript
// Remove token
localStorage.removeItem('token');

// Try to access protected page
window.location.href = '/customers';

// Expected: Redirected to login
```

**Test 2: Use Expired Token**:
```javascript
// Set expired token
localStorage.setItem('token', 'expired-token');

// Try to access API
await axios.get('/api/customers');

// Expected: 401 Unauthorized
```

### Authorization Checks

**Test 1: Agent Accessing Admin Route**:
```javascript
// Login as agent
// Try to access /admin/agents

// Expected: 403 Forbidden or redirected to Unauthorized page
```

**Test 2: Sales Agent Accessing Customer Details**:
```javascript
// Login as sales agent
// Try to access /customers/123

// Expected: 403 Forbidden
```

### SQL Injection Tests

**Test 1: Malicious Input in Search**:
```javascript
// Try SQL injection in search field
const maliciousInput = "'; DROP TABLE customers; --";

await axios.get(`/api/customers?search=${maliciousInput}`);

// Expected: Input sanitized, no SQL executed
```

### XSS Vulnerability Checks

**Test 1: Script Injection in Customer Name**:
```javascript
// Try to create customer with script in name
const maliciousName = "<script>alert('XSS')</script>";

await axios.post('/api/customers', {
  name: maliciousName,
  // ... other fields
});

// Expected: Script escaped, not executed
```

### API Security Validation

**Test 1: Missing Authorization Header**:
```bash
curl https://api.xano.io/customers

# Expected: 401 Unauthorized
```

**Test 2: Invalid API Key**:
```bash
curl -H "Authorization: Bearer invalid-token" \
  https://api.xano.io/customers

# Expected: 401 Unauthorized
```

---

## Browser Compatibility

### Browsers to Test

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Chrome (Android)
- Mobile Safari (iOS)

### Test Checklist

For each browser:
- [ ] Login works
- [ ] Customer list loads
- [ ] QR code displays correctly
- [ ] Forms submit successfully
- [ ] Modals open and close
- [ ] Responsive design works
- [ ] No console errors

### Mobile Browser Testing

**Test on**:
- Android phone (Chrome)
- iPhone (Safari)
- Tablet (iPad)

**Test Features**:
- Touch interactions
- Responsive layout
- QR code scanning
- Form inputs
- Navigation menu

---

## Test Data

### Sample Customers

```javascript
const testCustomers = [
  {
    policy_number: "TEST-001",
    name: "John Test Customer",
    mobile: "+230 5123 4567",
    email: "john.test@example.com",
    amount_due: 5000.00,
    policy_type: "Motor"
  },
  {
    policy_number: "TEST-002",
    name: "Jane Test Customer",
    mobile: "+230 5987 6543",
    email: "jane.test@example.com",
    amount_due: 3000.00,
    policy_type: "Non-Motor"
  }
];
```

### Sample Payment Plans

```javascript
const testPaymentPlans = [
  {
    customer_id: 1,
    total_amount: 5000.00,
    installment_count: 5,
    start_date: "2024-02-01"
  }
];
```

### CSV Upload Samples

**customers.csv**:
```csv
policy_number,name,mobile,email,amount_due,policy_type
TEST-001,John Doe,+230 5123 4567,john@example.com,5000,Motor
TEST-002,Jane Smith,+230 5987 6543,jane@example.com,3000,Non-Motor
```

**agents.csv**:
```csv
name,email,role,branch_id
Test Agent 1,agent1@nic.mu,agent,5
Test Agent 2,agent2@nic.mu,agent,5
```

---

## Continuous Testing

### Automated Testing (Planned)

**Unit Tests**:
- Test utility functions
- Test service functions
- Test components

**Integration Tests**:
- Test API endpoints
- Test database operations
- Test third-party integrations

**E2E Tests**:
- Test complete user journeys
- Test critical workflows

**Tools**:
- Jest for unit tests
- Cypress for E2E tests
- Postman for API tests

---

**Document Version**: 1.0  
**Last Updated**: February 4, 2026  
**Maintained By**: Development Team
