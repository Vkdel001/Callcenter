# CSL Call Center System - Complete Design Document

## Overview
Branch 13 (CSL) requires a specialized call center system with detailed policy data, comprehensive interaction tracking, and payment verification capabilities.

---

## 1. Database Structure

### Table 1: `csl_policies` (Main Policy Data)

**Purpose:** Store detailed policy information uploaded by admin

```sql
CREATE TABLE csl_policies (
  -- Primary Key
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Policy Information (13 fields)
  policy_number VARCHAR(50) UNIQUE NOT NULL,
  policy_status VARCHAR(50),
  real_nx_premium DECIMAL(10,2),
  installments_in_arrears INT,
  frequency VARCHAR(20),
  arrears_amount DECIMAL(10,2),
  computed_gross_premium DECIMAL(10,2),
  policy_start_date DATE,
  policy_maturity_date DATE,
  policy_issued_date DATE,
  next_cash_back_date DATE,
  plan_name VARCHAR(100),
  
  -- Owner 1 Information (11 fields)
  owner1_title VARCHAR(10),
  owner1_surname VARCHAR(100),
  owner1_first_name VARCHAR(100),
  owner1_maiden_name VARCHAR(100),
  owner1_nic VARCHAR(50),
  owner1_sms_no VARCHAR(20),
  owner1_mobile_no VARCHAR(20),
  owner1_home_tel_no VARCHAR(20),
  owner1_email VARCHAR(100),
  
  -- Owner 1 Address (4 fields)
  owner1_address_1 VARCHAR(200),
  owner1_address_2 VARCHAR(200),
  owner1_address_3 VARCHAR(200),
  owner1_address_4 VARCHAR(200),
  
  -- Owner 2 Information (8 fields)
  owner2_title VARCHAR(10),
  owner2_surname VARCHAR(100),
  owner2_first_name VARCHAR(100),
  owner2_nic VARCHAR(50),
  owner2_sms_no VARCHAR(20),
  owner2_mobile_no VARCHAR(20),
  owner2_home_tel_no VARCHAR(20),
  owner2_email VARCHAR(100),
  
  -- Agent Information (2 fields)
  agent_surname VARCHAR(100),
  agent_first_name VARCHAR(100),
  
  -- System Fields
  branch_id INT DEFAULT 13,
  assigned_to_agent_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_policy_number (policy_number),
  INDEX idx_branch_id (branch_id),
  INDEX idx_assigned_agent (assigned_to_agent_id),
  INDEX idx_policy_status (policy_status),
  INDEX idx_owner1_nic (owner1_nic),
  INDEX idx_owner2_nic (owner2_nic)
);
```

**Total Fields:** ~40 fields

---

### Table 2: `csl_interactions` (Call Center Agent Interactions)

**Purpose:** Track every interaction CSL agents have with customers

```sql
CREATE TABLE csl_interactions (
  -- Primary Key
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Foreign Keys
  csl_policy_id INT NOT NULL,
  agent_id INT NOT NULL,
  
  -- Interaction Details
  client_calling_date DATE NOT NULL,
  calling_remarks TEXT,
  
  -- Recovery Information
  recovery_type VARCHAR(20), -- Dropdown: Full, Partial, None
  amount_paid DECIMAL(10,2),
  
  -- Standing Order
  standing_order_status VARCHAR(20), -- Dropdown: Active, Newly Setup, Inactive, N/A
  
  -- AOD & PTP
  request_for_aod BOOLEAN, -- Yes/No
  ptp_case BOOLEAN, -- Yes/No (Promise to Pay)
  
  -- Follow Up
  follow_up_date DATE,
  
  -- Outcomes
  outcome_1 VARCHAR(50), -- Dropdown (configurable)
  sub_outcome VARCHAR(50), -- Dropdown (configurable, depends on outcome_1)
  
  -- Payment Details
  amount_paid_per_nic_system DECIMAL(10,2),
  promise_to_pay_amount DECIMAL(10,2),
  promise_to_pay_week VARCHAR(20), -- Dropdown: Week 1, Week 2, Week 3, Week 4
  
  -- Additional Information
  reason_for_non_payment VARCHAR(100), -- Dropdown (configurable)
  mode_of_payment VARCHAR(50), -- Dropdown: Cash, Cheque, Bank Transfer, Mobile Money, etc.
  
  -- Updated Contact Information
  updated_contact VARCHAR(20),
  updated_email VARCHAR(100),
  updated_frequency VARCHAR(20), -- Dropdown: Monthly, Quarterly, Annually
  
  -- System Fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Key Constraints
  FOREIGN KEY (csl_policy_id) REFERENCES csl_policies(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES users(id),
  
  -- Indexes
  INDEX idx_policy_id (csl_policy_id),
  INDEX idx_agent_id (agent_id),
  INDEX idx_calling_date (client_calling_date),
  INDEX idx_follow_up_date (follow_up_date),
  INDEX idx_outcome (outcome_1)
);
```

**Total Fields:** 22 fields

---

### Table 3: `csl_payments` (Payment Verification Data)

**Purpose:** Store payment data uploaded by admin for verification

```sql
CREATE TABLE csl_payments (
  -- Primary Key
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Payment Information
  policy_number VARCHAR(50) NOT NULL,
  payment_date DATE NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  
  -- Additional Fields (placeholders for future use)
  payment_reference VARCHAR(100),
  payment_method VARCHAR(50),
  payment_status VARCHAR(20),
  additional_field_1 VARCHAR(200),
  additional_field_2 VARCHAR(200),
  
  -- System Fields
  uploaded_by_admin_id INT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Key
  FOREIGN KEY (uploaded_by_admin_id) REFERENCES users(id),
  
  -- Indexes
  INDEX idx_policy_number (policy_number),
  INDEX idx_payment_date (payment_date),
  INDEX idx_uploaded_at (uploaded_at)
);
```

**Total Fields:** 11 fields

---

### Table 4: `csl_dropdown_options` (Configurable Dropdown Values)

**Purpose:** Store configurable dropdown options for interaction form

```sql
CREATE TABLE csl_dropdown_options (
  -- Primary Key
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Dropdown Configuration
  field_name VARCHAR(50) NOT NULL, -- e.g., 'outcome_1', 'sub_outcome', 'reason_for_non_payment'
  option_value VARCHAR(100) NOT NULL,
  option_label VARCHAR(100) NOT NULL,
  parent_option_id INT NULL, -- For dependent dropdowns (e.g., sub_outcome depends on outcome_1)
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- System Fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_field_name (field_name),
  INDEX idx_parent_option (parent_option_id),
  INDEX idx_active (is_active)
);
```

**Example Data:**
```sql
-- Outcome 1 options
INSERT INTO csl_dropdown_options (field_name, option_value, option_label, display_order) VALUES
('outcome_1', 'contacted', 'Successfully Contacted', 1),
('outcome_1', 'not_reachable', 'Not Reachable', 2),
('outcome_1', 'wrong_number', 'Wrong Number', 3),
('outcome_1', 'promise_to_pay', 'Promise to Pay', 4),
('outcome_1', 'dispute', 'Dispute', 5),
('outcome_1', 'paid', 'Already Paid', 6);

-- Sub-outcome options (dependent on outcome_1)
INSERT INTO csl_dropdown_options (field_name, option_value, option_label, parent_option_id, display_order) VALUES
('sub_outcome', 'will_pay_today', 'Will Pay Today', 4, 1), -- parent: promise_to_pay
('sub_outcome', 'will_pay_this_week', 'Will Pay This Week', 4, 2),
('sub_outcome', 'will_pay_next_week', 'Will Pay Next Week', 4, 3),
('sub_outcome', 'financial_difficulty', 'Financial Difficulty', 4, 4);

-- Reason for non-payment
INSERT INTO csl_dropdown_options (field_name, option_value, option_label, display_order) VALUES
('reason_for_non_payment', 'financial_difficulty', 'Financial Difficulty', 1),
('reason_for_non_payment', 'forgot', 'Forgot to Pay', 2),
('reason_for_non_payment', 'dispute_amount', 'Dispute Amount', 3),
('reason_for_non_payment', 'waiting_funds', 'Waiting for Funds', 4),
('reason_for_non_payment', 'other', 'Other', 5);

-- Mode of payment
INSERT INTO csl_dropdown_options (field_name, option_value, option_label, display_order) VALUES
('mode_of_payment', 'cash', 'Cash', 1),
('mode_of_payment', 'cheque', 'Cheque', 2),
('mode_of_payment', 'bank_transfer', 'Bank Transfer', 3),
('mode_of_payment', 'mobile_money', 'Mobile Money', 4),
('mode_of_payment', 'standing_order', 'Standing Order', 5),
('mode_of_payment', 'juice', 'Juice', 6);

-- Recovery type
INSERT INTO csl_dropdown_options (field_name, option_value, option_label, display_order) VALUES
('recovery_type', 'full', 'Full', 1),
('recovery_type', 'partial', 'Partial', 2),
('recovery_type', 'none', 'None', 3);

-- Standing order status
INSERT INTO csl_dropdown_options (field_name, option_value, option_label, display_order) VALUES
('standing_order_status', 'active', 'Active', 1),
('standing_order_status', 'newly_setup', 'Newly Setup', 2),
('standing_order_status', 'inactive', 'Inactive', 3),
('standing_order_status', 'na', 'N/A', 4);

-- Promise to pay week
INSERT INTO csl_dropdown_options (field_name, option_value, option_label, display_order) VALUES
('promise_to_pay_week', 'week_1', 'Week 1', 1),
('promise_to_pay_week', 'week_2', 'Week 2', 2),
('promise_to_pay_week', 'week_3', 'Week 3', 3),
('promise_to_pay_week', 'week_4', 'Week 4', 4);

-- Frequency
INSERT INTO csl_dropdown_options (field_name, option_value, option_label, display_order) VALUES
('frequency', 'monthly', 'Monthly', 1),
('frequency', 'quarterly', 'Quarterly', 2),
('frequency', 'semi_annually', 'Semi-Annually', 3),
('frequency', 'annually', 'Annually', 4);
```

---

## 2. User Interface Components

### 2.1 Admin Components

#### A. CSL Policy Upload Page (`CSLPolicyUpload.jsx`)
- Upload CSV with 40+ columns
- Map CSV columns to database fields
- Validate data before upload
- Support upsert (update existing policies by policy_number)
- Show upload progress and results

#### B. CSL Payment Upload Page (`CSLPaymentUpload.jsx`)
- Upload payment CSV (policy_number, payment_date, payment_amount, etc.)
- Validate policy numbers exist
- Show upload summary

#### C. CSL Dropdown Configuration Page (`CSLDropdownConfig.jsx`)
- Manage dropdown options for all fields
- Add/Edit/Delete/Reorder options
- Set parent-child relationships (e.g., sub_outcome depends on outcome_1)
- Enable/Disable options

### 2.2 CSL Agent Components

#### A. CSL Dashboard (`CSLDashboard.jsx`)
- Show list of assigned CSL policies
- Filter by:
  - Policy status
  - Arrears amount range
  - Last interaction date
  - Follow-up date
  - Payment status (paid/unpaid)
- Sort by:
  - Arrears amount (high to low)
  - Follow-up date (urgent first)
  - Last interaction date
- Search by:
  - Policy number
  - Owner name
  - NIC
  - Mobile number

#### B. CSL Policy Detail Page (`CSLPolicyDetail.jsx`)
- **Policy Information Section**
  - All policy details (status, premium, dates, plan)
  
- **Owner 1 Information Section**
  - Title, names, NIC, contact details, address
  
- **Owner 2 Information Section** (if exists)
  - Title, names, NIC, contact details
  
- **Agent Information Section**
  - Agent name from policy data
  
- **Payment Verification Section**
  - Check if policy_number exists in csl_payments table
  - Show payment status: ✅ Paid or ❌ Unpaid
  - If paid, show: payment_date, payment_amount, payment_reference
  
- **Interaction History Section**
  - List all previous interactions
  - Show: date, agent, outcome, remarks, follow-up date
  - Expandable to see full details

#### C. CSL Interaction Form (`CSLInteractionForm.jsx`)
- **Form Fields (with dropdowns):**
  1. Client Calling Date (Date picker)
  2. Calling Remarks (Text area)
  3. Recovery Type (Dropdown: Full, Partial, None)
  4. Amount Paid (Number input)
  5. Standing Order Status (Dropdown: Active, Newly Setup, Inactive, N/A)
  6. Request for AOD (Dropdown: Yes, No)
  7. PTP Case (Dropdown: Yes, No)
  8. Follow Up Date (Date picker)
  9. Outcome 1 (Dropdown - configurable)
  10. Sub-Outcome (Dropdown - configurable, depends on Outcome 1)
  11. Amount Paid (as per NIC system) (Number input)
  12. Promise to Pay Amount (Number input)
  13. Promise to Pay Week (Dropdown: Week 1, 2, 3, 4)
  14. Reason for Non-Payment (Dropdown - configurable)
  15. Mode of Payment (Dropdown - configurable)
  16. Updated Contact (Phone input)
  17. Updated Email (Email input)
  18. Updated Frequency (Dropdown - configurable)

- **Form Behavior:**
  - Auto-save draft every 30 seconds
  - Validate required fields before submit
  - Show payment verification status at top
  - Highlight if payment found in system

### 2.3 CSL Reports Page (`CSLReports.jsx`)
- **Metrics:**
  - Total policies assigned
  - Total arrears amount
  - Policies contacted today
  - Policies with follow-up today
  - Recovery rate (amount collected / total arrears)
  - Payment verification rate (paid policies / total policies)
  
- **Reports:**
  - Daily call log report
  - Recovery report (by agent, by week, by month)
  - Follow-up report (upcoming follow-ups)
  - Payment verification report (paid vs unpaid)
  - Outcome analysis report (breakdown by outcome types)

---

## 3. Service Layer

### `cslService.js`

```javascript
// Policy Management
- getAllCSLPolicies(filters, pagination)
- getCSLPolicyById(id)
- getCSLPolicyByPolicyNumber(policyNumber)
- uploadCSLPolicies(csvData)
- updateCSLPolicy(id, data)
- assignPolicyToAgent(policyId, agentId)

// Interaction Management
- createInteraction(interactionData)
- getInteractionsByPolicyId(policyId)
- getInteractionsByAgentId(agentId, filters)
- updateInteraction(id, data)
- deleteInteraction(id)

// Payment Verification
- uploadPayments(csvData)
- checkPaymentStatus(policyNumber)
- getPaymentsByPolicyNumber(policyNumber)

// Dropdown Configuration
- getDropdownOptions(fieldName, parentOptionId)
- createDropdownOption(data)
- updateDropdownOption(id, data)
- deleteDropdownOption(id)
- reorderDropdownOptions(fieldName, orderArray)

// Reports
- getCSLDashboardMetrics(agentId, dateRange)
- getDailyCallLogReport(agentId, date)
- getRecoveryReport(filters)
- getFollowUpReport(agentId, dateRange)
- getPaymentVerificationReport(dateRange)
- getOutcomeAnalysisReport(dateRange)
```

---

## 4. Routing & Access Control

### Route Configuration

```javascript
// In App.jsx
{user.branch_id === 13 && user.role === 'internal_agent' && (
  <>
    <Route path="/csl/dashboard" element={<CSLDashboard />} />
    <Route path="/csl/policy/:id" element={<CSLPolicyDetail />} />
    <Route path="/csl/reports" element={<CSLReports />} />
  </>
)}

{user.role === 'admin' && (
  <>
    <Route path="/admin/csl/upload-policies" element={<CSLPolicyUpload />} />
    <Route path="/admin/csl/upload-payments" element={<CSLPaymentUpload />} />
    <Route path="/admin/csl/dropdown-config" element={<CSLDropdownConfig />} />
  </>
)}
```

### Sidebar Menu (for CSL agents)

```javascript
{user.branch_id === 13 && (
  <>
    <MenuItem icon={<Phone />} to="/csl/dashboard">CSL Dashboard</MenuItem>
    <MenuItem icon={<FileText />} to="/csl/reports">CSL Reports</MenuItem>
  </>
)}
```

---

## 5. CSV Upload Formats

### 5.1 CSL Policy Upload CSV

**Columns (40+):**
```
Policy No, Policy Status, Real Nx Premium, No of Instalments in Arrears, 
Frequency, Arrears Amount as @ 30.08.2025, Computed Gross Premium, 
Policy Start Date, Policy Maturity Date, Policy Issued Date, 
Next Cash Back Date, Plan Name, Owner 1 Title, Owner 1 Surname, 
Owner 1 First Name, Owner 1 Maiden Name, Owner 1 NIC, Owner 1 SMS No, 
Owner 1 Mobile No, Owner 1 Home Tel No, Owner 1 Email Address, 
Owner 2 Title, Owner 2 Surname, Owner 2 First Name, Owner 2 NIC, 
Owner 2 SMS No, Owner 2 Mobile No, Owner 2 Home Tel No, Owner 2 Email Address, 
Owner 1 Policy Address 1, Owner 1 Policy Address 2, Owner 1 Policy Address 3, 
Owner 1 Policy Address 4, Agent Surname, Agent First Name
```

### 5.2 CSL Payment Upload CSV

**Columns:**
```
Policy Number, Payment Date, Payment Amount, Payment Reference, 
Payment Method, Payment Status, Additional Field 1, Additional Field 2
```

---

## 6. Implementation Phases

### Phase 1: Database Setup (Week 1)
- [ ] Create csl_policies table in Xano
- [ ] Create csl_interactions table
- [ ] Create csl_payments table
- [ ] Create csl_dropdown_options table
- [ ] Populate initial dropdown options
- [ ] Set up indexes and foreign keys

### Phase 2: Admin Upload (Week 2)
- [ ] Create CSLPolicyUpload.jsx
- [ ] Create CSLPaymentUpload.jsx
- [ ] Create cslService.js with upload methods
- [ ] Test CSV parsing and validation
- [ ] Test upsert functionality

### Phase 3: Dropdown Configuration (Week 2)
- [ ] Create CSLDropdownConfig.jsx
- [ ] Add dropdown management methods to cslService.js
- [ ] Test adding/editing/deleting options
- [ ] Test parent-child relationships

### Phase 4: CSL Dashboard (Week 3)
- [ ] Create CSLDashboard.jsx
- [ ] Implement filters and search
- [ ] Implement pagination
- [ ] Add policy assignment functionality
- [ ] Test with sample data

### Phase 5: CSL Policy Detail (Week 3-4)
- [ ] Create CSLPolicyDetail.jsx
- [ ] Display all policy information
- [ ] Add payment verification section
- [ ] Display interaction history
- [ ] Test payment status checking

### Phase 6: Interaction Form (Week 4)
- [ ] Create CSLInteractionForm.jsx
- [ ] Implement all form fields with dropdowns
- [ ] Add dependent dropdown logic (sub-outcome)
- [ ] Add form validation
- [ ] Add auto-save functionality
- [ ] Test form submission

### Phase 7: Reports (Week 5)
- [ ] Create CSLReports.jsx
- [ ] Implement dashboard metrics
- [ ] Create report generation methods
- [ ] Add export functionality (CSV/PDF)
- [ ] Test report accuracy

### Phase 8: Testing & Deployment (Week 6)
- [ ] End-to-end testing
- [ ] User acceptance testing with CSL agents
- [ ] Performance testing
- [ ] Deploy to production
- [ ] Train CSL agents

---

## 7. Key Features Summary

### ✅ Separate Data Structure
- Completely isolated from existing customer table
- No impact on other branches
- Optimized for CSL workflow

### ✅ Comprehensive Policy Data
- 40+ fields covering all policy details
- Owner 1 and Owner 2 information
- Agent information

### ✅ Detailed Interaction Tracking
- 22 fields for each interaction
- Configurable dropdowns
- Payment verification integration

### ✅ Payment Verification
- Admin uploads payment data
- System checks policy_number
- Shows paid/unpaid status to agents

### ✅ Configurable Dropdowns
- Admin can manage dropdown options
- Support for dependent dropdowns
- Easy to add new options without code changes

### ✅ CSL-Specific Reports
- Recovery metrics
- Call log reports
- Follow-up tracking
- Payment verification reports

---

## 8. Risk Mitigation

### Low Risk
- ✅ Isolated from existing system
- ✅ Branch-specific access control
- ✅ Separate database tables
- ✅ Independent UI components

### Medium Risk
- ⚠️ Large CSV uploads (40+ columns)
  - Mitigation: Batch processing, progress indicators
- ⚠️ Complex form with many dropdowns
  - Mitigation: Auto-save, validation, user training

### Managed Risk
- ⚠️ Data volume (thousands of policies)
  - Mitigation: Pagination, indexes, caching
- ⚠️ Concurrent agent access
  - Mitigation: Optimistic locking, conflict resolution

---

## 9. Success Criteria

- [ ] CSL agents can view assigned policies
- [ ] CSL agents can log interactions with all required fields
- [ ] Payment verification works correctly
- [ ] Dropdowns are configurable by admin
- [ ] Reports show accurate metrics
- [ ] System performs well with 1000+ policies
- [ ] No impact on existing branches

---

## Next Steps

1. Review and approve this design
2. Create Xano database tables
3. Start Phase 1 implementation
4. Iterate based on feedback

---

**Document Version:** 1.0  
**Last Updated:** December 6, 2025  
**Status:** Awaiting Approval
