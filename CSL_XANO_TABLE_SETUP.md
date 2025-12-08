# CSL Call Center - Xano Table Setup Guide

## Overview
Complete guide to create all CSL tables in Xano with field definitions, data types, and indexes.

---

## 🎯 ACTUAL XANO IMPLEMENTATION (LIVE)

**Status:** ✅ All tables created and CRUD APIs deployed  
**Date:** December 6, 2025  
**Base URL:** `https://xbde-ekcn-8kg2.n7e.xano.io`

### Table 1: csl_policies ✅

**Schema:**
```typescript
interface CSLPolicy {
  id: number;
  created_at: number;
  policy_number: string;
  policy_status: string;
  real_nx_premium: number;
  installments_in_arrears: number;
  frequency: string;
  arrears_amount: number;
  computed_gross_premium: number;
  policy_start_date: string;
  policy_maturity_date: string;
  policy_issued_date: string;
  next_cash_back_date: string;
  plan_name: string;
  owner1_title: string;
  owner1_surname: string;
  owner1_first_name: string;
  owner1_maiden_name: string;
  owner1_nic: string;
  owner1_sms_no: string;
  owner1_mobile_no: string;
  owner1_home_tel_no: string;
  owner1_email: email;
  owner1_address_1: string;
  owner1_address_2: string;
  owner1_address_3: string;
  owner1_address_4: string;
  owner2_title: string;
  owner2_surname: string;
  owner2_first_name: string;
  owner2_nic: string;
  owner2_sms_no: string;
  owner2_mobile_no: string;
  owner2_home_tel_no: string;
  owner2_email: email;
  agent_surname: string;
  agent_first_name: string;
  branch_id: number;
  assigned_to_agent_id: number;
  data_as_of_date: string;
  last_upload_id: number;
  updated_at: number;
}
```

**API Endpoints:**
- `GET` https://xbde-ekcn-8kg2.n7e.xano.io/api:WCN7osGn/csl_policies
- `GET` https://xbde-ekcn-8kg2.n7e.xano.io/api:WCN7osGn/csl_policies/{csl_policies_id}
- `POST` https://xbde-ekcn-8kg2.n7e.xano.io/api:WCN7osGn/csl_policies
- `PATCH` https://xbde-ekcn-8kg2.n7e.xano.io/api:WCN7osGn/csl_policies/{csl_policies_id}
- `DELETE` https://xbde-ekcn-8kg2.n7e.xano.io/api:WCN7osGn/csl_policies/{csl_policies_id}

---

### Table 2: csl_interactions ✅

**Schema:**
```typescript
interface CSLInteraction {
  id: integer;
  created_at: timestamp;
  csl_policy_id: integer;
  agent_id: integer;
  client_calling_date: date;
  calling_remarks: text;
  recovery_type: text;
  amount_paid: decimal;
  standing_order_status: text;
  request_for_aod: bool;
  ptp_case: bool;
  follow_up_date: date;
  outcome_1: text;
  sub_outcome: text;
  amount_paid_per_nic_system: decimal;
  promise_to_pay_amount: decimal;
  promise_to_pay_week: text;
  reason_for_non_payment: text;
  mode_of_payment: text;
  updated_contact: text;
  updated_email: email;
  updated_frequency: text;
  actions_taken: json;
  updated_at: timestamp;
}
```

**API Endpoints:**
- `GET` https://xbde-ekcn-8kg2.n7e.xano.io/api:jwfdvZTP/csl_interactions
- `GET` https://xbde-ekcn-8kg2.n7e.xano.io/api:jwfdvZTP/csl_interactions/{csl_interactions_id}
- `POST` https://xbde-ekcn-8kg2.n7e.xano.io/api:jwfdvZTP/csl_interactions
- `PATCH` https://xbde-ekcn-8kg2.n7e.xano.io/api:jwfdvZTP/csl_interactions/{csl_interactions_id}
- `DELETE` https://xbde-ekcn-8kg2.n7e.xano.io/api:jwfdvZTP/csl_interactions/{csl_interactions_id}

---

### Table 3: csl_payments ✅

**Schema:**
```typescript
interface CSLPayment {
  id: integer;
  created_at: timestamp;
  policy_number: text;
  payment_date: date;
  payment_amount: decimal;
  payment_reference: text;
  payment_method: text;
  payment_status: text;
  additional_field_1: text;
  additional_field_2: text;
  uploaded_by_admin_id: integer;
  uploaded_at: timestamp;
}
```

**API Endpoints:**
- `GET` https://xbde-ekcn-8kg2.n7e.xano.io/api:mHkBSlF2/csl_payments
- `GET` https://xbde-ekcn-8kg2.n7e.xano.io/api:mHkBSlF2/csl_payments/{csl_payments_id}
- `POST` https://xbde-ekcn-8kg2.n7e.xano.io/api:mHkBSlF2/csl_payments
- `PATCH` https://xbde-ekcn-8kg2.n7e.xano.io/api:mHkBSlF2/csl_payments/{csl_payments_id}
- `DELETE` https://xbde-ekcn-8kg2.n7e.xano.io/api:mHkBSlF2/csl_payments/{csl_payments_id}

---

### Table 4: csl_dropdown_options ✅

**Schema:**
```typescript
interface CSLDropdownOption {
  id: integer;
  created_at: timestamp;
  field_name: text;
  option_value: text;
  option_label: text;
  parent_option_id: integer;
  display_order: integer;
  is_active: bool;
  updated_at: timestamp;
}
```

**API Endpoints:**
- `GET` https://xbde-ekcn-8kg2.n7e.xano.io/api:Vt4NeKr2/csl_dropdown_options
- `GET` https://xbde-ekcn-8kg2.n7e.xano.io/api:Vt4NeKr2/csl_dropdown_options/{csl_dropdown_options_id}
- `POST` https://xbde-ekcn-8kg2.n7e.xano.io/api:Vt4NeKr2/csl_dropdown_options
- `PATCH` https://xbde-ekcn-8kg2.n7e.xano.io/api:Vt4NeKr2/csl_dropdown_options/{csl_dropdown_options_id}
- `DELETE` https://xbde-ekcn-8kg2.n7e.xano.io/api:Vt4NeKr2/csl_dropdown_options/{csl_dropdown_options_id}

**Note:** `parent_option_id` is implemented as a regular integer field (not a formal FK relationship). This allows for dependent dropdown logic in the frontend without Xano self-referencing complexity.

---

### Table 5: csl_policy_history ✅

**Schema:**
```typescript
interface CSLPolicyHistory {
  id: integer;
  created_at: timestamp;
  csl_policy: integer;
  data_as_of_date: date;
  arrears_amount: decimal;
  installments_in_arrears: integer;
  policy_status: text;
  changes_json: json;
  upload: integer;
  uploaded_by_admin: integer;
  uploaded_at: timestamp;
}
```

**API Endpoints:**
- `GET` https://xbde-ekcn-8kg2.n7e.xano.io/api:IoDyIxsz/csl_policy_history
- `GET` https://xbde-ekcn-8kg2.n7e.xano.io/api:IoDyIxsz/csl_policy_history/{csl_policy_history_id}
- `POST` https://xbde-ekcn-8kg2.n7e.xano.io/api:IoDyIxsz/csl_policy_history
- `PATCH` https://xbde-ekcn-8kg2.n7e.xano.io/api:IoDyIxsz/csl_policy_history/{csl_policy_history_id}
- `DELETE` https://xbde-ekcn-8kg2.n7e.xano.io/api:IoDyIxsz/csl_policy_history/{csl_policy_history_id}

---

### Table 6: csl_uploads ✅

**Schema:**
```typescript
interface CSLUpload {
  id: integer;
  created_at: timestamp;
  upload_date: timestamp;
  data_as_of_date: date;
  file_name: text;
  total_records: integer;
  new_policies: integer;
  updated_policies: integer;
  uploaded_by_admin: integer;
}
```

**API Endpoints:**
- `GET` https://xbde-ekcn-8kg2.n7e.xano.io/api:YRN-L6tC/csl_uploads
- `GET` https://xbde-ekcn-8kg2.n7e.xano.io/api:YRN-L6tC/csl_uploads/{csl_uploads_id}
- `POST` https://xbde-ekcn-8kg2.n7e.xano.io/api:YRN-L6tC/csl_uploads
- `PATCH` https://xbde-ekcn-8kg2.n7e.xano.io/api:YRN-L6tC/csl_uploads/{csl_uploads_id}
- `DELETE` https://xbde-ekcn-8kg2.n7e.xano.io/api:YRN-L6tC/csl_uploads/{csl_uploads_id}

---

## 📋 Quick Reference for Frontend Development

### API Base URLs by Table

| Table | API Key | Base Endpoint |
|-------|---------|---------------|
| csl_policies | WCN7osGn | `/api:WCN7osGn/csl_policies` |
| csl_interactions | jwfdvZTP | `/api:jwfdvZTP/csl_interactions` |
| csl_payments | mHkBSlF2 | `/api:mHkBSlF2/csl_payments` |
| csl_dropdown_options | Vt4NeKr2 | `/api:Vt4NeKr2/csl_dropdown_options` |
| csl_policy_history | IoDyIxsz | `/api:IoDyIxsz/csl_policy_history` |
| csl_uploads | YRN-L6tC | `/api:YRN-L6tC/csl_uploads` |

### Field Type Notes

- **timestamp**: Xano timestamp (Unix epoch in seconds)
- **date**: ISO date string (YYYY-MM-DD)
- **email**: Xano email type (validated)
- **decimal**: Numeric with decimal precision
- **json**: JSON object field
- **bool**: Boolean (true/false)
- **text**: String field
- **integer**: Whole number

---

## 📖 THEORETICAL DESIGN & SQL REFERENCE

The sections below contain the original design specifications and SQL schemas for reference and understanding the data model.

---

## Table 1: csl_policies (Main Policy Data)

### Create Table in Xano

**Table Name:** `csl_policies`

### Fields Configuration

| Field Name | Data Type | Length | Required | Unique | Default | Notes |
|------------|-----------|--------|----------|--------|---------|-------|
| id | integer | - | ✅ | ✅ | auto | Primary Key |
| policy_number | text | 50 | ✅ | ✅ | - | Unique identifier |
| policy_status | text | 50 | ❌ | ❌ | - | Active, Lapsed, etc. |
| real_nx_premium | decimal | 10,2 | ❌ | ❌ | 0.00 | Premium amount |
| installments_in_arrears | integer | - | ❌ | ❌ | 0 | Number of missed payments |
| frequency | text | 20 | ❌ | ❌ | - | Monthly, Quarterly, etc. |
| arrears_amount | decimal | 10,2 | ❌ | ❌ | 0.00 | Total arrears |
| computed_gross_premium | decimal | 10,2 | ❌ | ❌ | 0.00 | Gross premium |
| policy_start_date | date | - | ❌ | ❌ | - | Policy start |
| policy_maturity_date | date | - | ❌ | ❌ | - | Policy maturity |
| policy_issued_date | date | - | ❌ | ❌ | - | Issue date |
| next_cash_back_date | date | - | ❌ | ❌ | - | Next cashback |
| plan_name | text | 100 | ❌ | ❌ | - | Plan type |
| owner1_title | text | 10 | ❌ | ❌ | - | Mr, Mrs, Ms, Dr |
| owner1_surname | text | 100 | ❌ | ❌ | - | Last name |
| owner1_first_name | text | 100 | ❌ | ❌ | - | First name |
| owner1_maiden_name | text | 100 | ❌ | ❌ | - | Maiden name |
| owner1_nic | text | 50 | ❌ | ❌ | - | National ID |
| owner1_sms_no | text | 20 | ❌ | ❌ | - | SMS number |
| owner1_mobile_no | text | 20 | ❌ | ❌ | - | Mobile number |
| owner1_home_tel_no | text | 20 | ❌ | ❌ | - | Home telephone |
| owner1_email | text | 100 | ❌ | ❌ | - | Email address |
| owner1_address_1 | text | 200 | ❌ | ❌ | - | Address line 1 |
| owner1_address_2 | text | 200 | ❌ | ❌ | - | Address line 2 |
| owner1_address_3 | text | 200 | ❌ | ❌ | - | Address line 3 |
| owner1_address_4 | text | 200 | ❌ | ❌ | - | Address line 4 |
| owner2_title | text | 10 | ❌ | ❌ | - | Mr, Mrs, Ms, Dr |
| owner2_surname | text | 100 | ❌ | ❌ | - | Last name |
| owner2_first_name | text | 100 | ❌ | ❌ | - | First name |
| owner2_nic | text | 50 | ❌ | ❌ | - | National ID |
| owner2_sms_no | text | 20 | ❌ | ❌ | - | SMS number |
| owner2_mobile_no | text | 20 | ❌ | ❌ | - | Mobile number |
| owner2_home_tel_no | text | 20 | ❌ | ❌ | - | Home telephone |
| owner2_email | text | 100 | ❌ | ❌ | - | Email address |
| agent_surname | text | 100 | ❌ | ❌ | - | Agent last name |
| agent_first_name | text | 100 | ❌ | ❌ | - | Agent first name |
| branch_id | integer | - | ✅ | ❌ | 13 | Always 13 for CSL |
| assigned_to_agent_id | integer | - | ❌ | ❌ | - | FK to users table |
| created_at | timestamp | - | ✅ | ❌ | now() | Auto-generated |
| updated_at | timestamp | - | ✅ | ❌ | now() | Auto-updated |

### SQL for PostgreSQL (if needed)

```sql
CREATE TABLE csl_policies (
  -- Primary Key
  id SERIAL PRIMARY KEY,
  
  -- Policy Information
  policy_number VARCHAR(50) UNIQUE NOT NULL,
  policy_status VARCHAR(50),
  real_nx_premium DECIMAL(10,2) DEFAULT 0.00,
  installments_in_arrears INTEGER DEFAULT 0,
  frequency VARCHAR(20),
  arrears_amount DECIMAL(10,2) DEFAULT 0.00,
  computed_gross_premium DECIMAL(10,2) DEFAULT 0.00,
  policy_start_date DATE,
  policy_maturity_date DATE,
  policy_issued_date DATE,
  next_cash_back_date DATE,
  plan_name VARCHAR(100),
  
  -- Owner 1 Information
  owner1_title VARCHAR(10),
  owner1_surname VARCHAR(100),
  owner1_first_name VARCHAR(100),
  owner1_maiden_name VARCHAR(100),
  owner1_nic VARCHAR(50),
  owner1_sms_no VARCHAR(20),
  owner1_mobile_no VARCHAR(20),
  owner1_home_tel_no VARCHAR(20),
  owner1_email VARCHAR(100),
  
  -- Owner 1 Address
  owner1_address_1 VARCHAR(200),
  owner1_address_2 VARCHAR(200),
  owner1_address_3 VARCHAR(200),
  owner1_address_4 VARCHAR(200),
  
  -- Owner 2 Information
  owner2_title VARCHAR(10),
  owner2_surname VARCHAR(100),
  owner2_first_name VARCHAR(100),
  owner2_nic VARCHAR(50),
  owner2_sms_no VARCHAR(20),
  owner2_mobile_no VARCHAR(20),
  owner2_home_tel_no VARCHAR(20),
  owner2_email VARCHAR(100),
  
  -- Agent Information
  agent_surname VARCHAR(100),
  agent_first_name VARCHAR(100),
  
  -- System Fields
  branch_id INTEGER NOT NULL DEFAULT 13,
  assigned_to_agent_id INTEGER,
  data_as_of_date DATE,
  last_upload_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Key Constraints
  CONSTRAINT fk_csl_policy_agent FOREIGN KEY (assigned_to_agent_id) 
    REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE UNIQUE INDEX idx_csl_policy_number_unique ON csl_policies(policy_number);
CREATE INDEX idx_csl_policy_number ON csl_policies(policy_number);
CREATE INDEX idx_csl_branch_id ON csl_policies(branch_id);
CREATE INDEX idx_csl_assigned_agent ON csl_policies(assigned_to_agent_id);
CREATE INDEX idx_csl_policy_status ON csl_policies(policy_status);
CREATE INDEX idx_csl_owner1_nic ON csl_policies(owner1_nic);
CREATE INDEX idx_csl_owner2_nic ON csl_policies(owner2_nic);
CREATE INDEX idx_csl_arrears_amount ON csl_policies(arrears_amount);

-- Comments
COMMENT ON TABLE csl_policies IS 'CSL call center policy data with owner and agent information';
COMMENT ON COLUMN csl_policies.policy_number IS 'Unique policy identifier - used to link with csl_payments';
COMMENT ON COLUMN csl_policies.assigned_to_agent_id IS 'FK to users table - CSL agent assigned to this policy';
COMMENT ON COLUMN csl_policies.data_as_of_date IS 'Which month this data represents (e.g., 2025-08-31)';
COMMENT ON COLUMN csl_policies.last_upload_id IS 'FK to csl_uploads - tracks which upload batch updated this policy';
```

---

## Table 2: csl_interactions (Call Center Interactions)

### Create Table in Xano

**Table Name:** `csl_interactions`

### Fields Configuration

| Field Name | Data Type | Length | Required | Unique | Default | Notes |
|------------|-----------|--------|----------|--------|---------|-------|
| id | integer | - | ✅ | ✅ | auto | Primary Key |
| csl_policy_id | integer | - | ✅ | ❌ | - | FK to csl_policies |
| agent_id | integer | - | ✅ | ❌ | - | FK to users |
| client_calling_date | date | - | ✅ | ❌ | - | Date of call |
| calling_remarks | text | - | ❌ | ❌ | - | Call notes |
| recovery_type | text | 20 | ❌ | ❌ | - | Full, Partial, None |
| amount_paid | decimal | 10,2 | ❌ | ❌ | 0.00 | Amount collected |
| standing_order_status | text | 20 | ❌ | ❌ | - | Active, Inactive, etc. |
| request_for_aod | boolean | - | ❌ | ❌ | false | Yes/No |
| ptp_case | boolean | - | ❌ | ❌ | false | Promise to Pay |
| follow_up_date | date | - | ❌ | ❌ | - | Next follow-up |
| outcome_1 | text | 50 | ❌ | ❌ | - | Primary outcome |
| sub_outcome | text | 50 | ❌ | ❌ | - | Secondary outcome |
| amount_paid_per_nic_system | decimal | 10,2 | ❌ | ❌ | 0.00 | NIC system amount |
| promise_to_pay_amount | decimal | 10,2 | ❌ | ❌ | 0.00 | PTP amount |
| promise_to_pay_week | text | 20 | ❌ | ❌ | - | Week 1, 2, 3, 4 |
| reason_for_non_payment | text | 100 | ❌ | ❌ | - | Reason |
| mode_of_payment | text | 50 | ❌ | ❌ | - | Cash, Bank, etc. |
| updated_contact | text | 20 | ❌ | ❌ | - | New contact number |
| updated_email | text | 100 | ❌ | ❌ | - | New email |
| updated_frequency | text | 20 | ❌ | ❌ | - | New frequency |
| actions_taken | json | - | ❌ | ❌ | {} | Actions executed |
| created_at | timestamp | - | ✅ | ❌ | now() | Auto-generated |
| updated_at | timestamp | - | ✅ | ❌ | now() | Auto-updated |

### SQL for PostgreSQL

```sql
CREATE TABLE csl_interactions (
  -- Primary Key
  id SERIAL PRIMARY KEY,
  
  -- Foreign Keys (REQUIRED)
  csl_policy_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL,
  
  -- Interaction Details
  client_calling_date DATE NOT NULL,
  calling_remarks TEXT,
  
  -- Recovery Information
  recovery_type VARCHAR(20),
  amount_paid DECIMAL(10,2) DEFAULT 0.00,
  
  -- Standing Order
  standing_order_status VARCHAR(20),
  
  -- AOD & PTP
  request_for_aod BOOLEAN DEFAULT FALSE,
  ptp_case BOOLEAN DEFAULT FALSE,
  
  -- Follow Up
  follow_up_date DATE,
  
  -- Outcomes
  outcome_1 VARCHAR(50),
  sub_outcome VARCHAR(50),
  
  -- Payment Details
  amount_paid_per_nic_system DECIMAL(10,2) DEFAULT 0.00,
  promise_to_pay_amount DECIMAL(10,2) DEFAULT 0.00,
  promise_to_pay_week VARCHAR(20),
  
  -- Additional Information
  reason_for_non_payment VARCHAR(100),
  mode_of_payment VARCHAR(50),
  
  -- Updated Contact Information
  updated_contact VARCHAR(20),
  updated_email VARCHAR(100),
  updated_frequency VARCHAR(20),
  
  -- Actions Taken (JSON)
  actions_taken JSONB DEFAULT '{}',
  
  -- System Fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Key Constraints
  CONSTRAINT fk_csl_interaction_policy FOREIGN KEY (csl_policy_id) 
    REFERENCES csl_policies(id) ON DELETE CASCADE,
  CONSTRAINT fk_csl_interaction_agent FOREIGN KEY (agent_id) 
    REFERENCES users(id) ON DELETE RESTRICT
);

-- Indexes
CREATE INDEX idx_csl_int_policy_id ON csl_interactions(csl_policy_id);
CREATE INDEX idx_csl_int_agent_id ON csl_interactions(agent_id);
CREATE INDEX idx_csl_int_calling_date ON csl_interactions(client_calling_date);
CREATE INDEX idx_csl_int_follow_up_date ON csl_interactions(follow_up_date);
CREATE INDEX idx_csl_int_outcome ON csl_interactions(outcome_1);
CREATE INDEX idx_csl_int_created_at ON csl_interactions(created_at);

-- Comments
COMMENT ON TABLE csl_interactions IS 'CSL call center interaction logs with detailed tracking';
COMMENT ON COLUMN csl_interactions.csl_policy_id IS 'FK to csl_policies - CASCADE delete if policy deleted';
COMMENT ON COLUMN csl_interactions.agent_id IS 'FK to users - RESTRICT delete if agent has interactions';
COMMENT ON COLUMN csl_interactions.actions_taken IS 'JSON field storing actions executed (QR generated, email sent, etc.)';
```

---

## Table 3: csl_payments (Payment Verification)

### Create Table in Xano

**Table Name:** `csl_payments`

### Fields Configuration

| Field Name | Data Type | Length | Required | Unique | Default | Notes |
|------------|-----------|--------|----------|--------|---------|-------|
| id | integer | - | ✅ | ✅ | auto | Primary Key |
| policy_number | text | 50 | ✅ | ❌ | - | Policy reference |
| payment_date | date | - | ✅ | ❌ | - | Payment date |
| payment_amount | decimal | 10,2 | ✅ | ❌ | 0.00 | Amount paid |
| payment_reference | text | 100 | ❌ | ❌ | - | Reference number |
| payment_method | text | 50 | ❌ | ❌ | - | Cash, Bank, etc. |
| payment_status | text | 20 | ❌ | ❌ | verified | Status |
| additional_field_1 | text | 200 | ❌ | ❌ | - | Placeholder |
| additional_field_2 | text | 200 | ❌ | ❌ | - | Placeholder |
| uploaded_by_admin_id | integer | - | ✅ | ❌ | - | FK to users |
| uploaded_at | timestamp | - | ✅ | ❌ | now() | Upload timestamp |

### SQL for PostgreSQL

```sql
CREATE TABLE csl_payments (
  -- Primary Key
  id SERIAL PRIMARY KEY,
  
  -- Payment Information (NO FK - Soft link via policy_number)
  policy_number VARCHAR(50) NOT NULL,
  payment_date DATE NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  
  -- Additional Fields
  payment_reference VARCHAR(100),
  payment_method VARCHAR(50),
  payment_status VARCHAR(20) DEFAULT 'verified',
  additional_field_1 VARCHAR(200),
  additional_field_2 VARCHAR(200),
  
  -- System Fields
  uploaded_by_admin_id INTEGER NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Key Constraint
  CONSTRAINT fk_csl_payment_admin FOREIGN KEY (uploaded_by_admin_id) 
    REFERENCES users(id) ON DELETE RESTRICT
);

-- Indexes
CREATE INDEX idx_csl_pay_policy_number ON csl_payments(policy_number);
CREATE INDEX idx_csl_pay_payment_date ON csl_payments(payment_date);
CREATE INDEX idx_csl_pay_uploaded_at ON csl_payments(uploaded_at);
CREATE INDEX idx_csl_pay_status ON csl_payments(payment_status);
CREATE INDEX idx_csl_pay_admin_id ON csl_payments(uploaded_by_admin_id);

-- Comments
COMMENT ON TABLE csl_payments IS 'CSL payment verification data uploaded by admin';
COMMENT ON COLUMN csl_payments.policy_number IS 'Soft link to csl_policies.policy_number (text field, not FK)';
COMMENT ON COLUMN csl_payments.uploaded_by_admin_id IS 'FK to users - RESTRICT delete if admin has uploaded payments';
```

---

## Table 4: csl_dropdown_options (Configurable Dropdowns)

### Create Table in Xano

**Table Name:** `csl_dropdown_options`

### Fields Configuration

| Field Name | Data Type | Length | Required | Unique | Default | Notes |
|------------|-----------|--------|----------|--------|---------|-------|
| id | integer | - | ✅ | ✅ | auto | Primary Key |
| field_name | text | 50 | ✅ | ❌ | - | Field identifier |
| option_value | text | 100 | ✅ | ❌ | - | Value stored |
| option_label | text | 100 | ✅ | ❌ | - | Display text |
| parent_option_id | integer | - | ❌ | ❌ | null | For dependent dropdowns |
| display_order | integer | - | ❌ | ❌ | 0 | Sort order |
| is_active | boolean | - | ✅ | ❌ | true | Enable/disable |
| created_at | timestamp | - | ✅ | ❌ | now() | Auto-generated |
| updated_at | timestamp | - | ✅ | ❌ | now() | Auto-updated |

### SQL for PostgreSQL

```sql
CREATE TABLE csl_dropdown_options (
  -- Primary Key
  id SERIAL PRIMARY KEY,
  
  -- Dropdown Configuration
  field_name VARCHAR(50) NOT NULL,
  option_value VARCHAR(100) NOT NULL,
  option_label VARCHAR(100) NOT NULL,
  parent_option_id INTEGER,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- System Fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Key for parent-child relationship (self-referencing)
  CONSTRAINT fk_csl_dropdown_parent FOREIGN KEY (parent_option_id) 
    REFERENCES csl_dropdown_options(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_csl_dd_field_name ON csl_dropdown_options(field_name);
CREATE INDEX idx_csl_dd_parent_option ON csl_dropdown_options(parent_option_id);
CREATE INDEX idx_csl_dd_active ON csl_dropdown_options(is_active);
CREATE INDEX idx_csl_dd_display_order ON csl_dropdown_options(display_order);

-- Comments
COMMENT ON TABLE csl_dropdown_options IS 'Configurable dropdown options for CSL interaction form';
COMMENT ON COLUMN csl_dropdown_options.parent_option_id IS 'Self-referencing FK for dependent dropdowns (e.g., sub_outcome depends on outcome_1)';
COMMENT ON COLUMN csl_dropdown_options.field_name IS 'Field identifier (e.g., outcome_1, sub_outcome, recovery_type)';
```

---

## Table 5: csl_policy_history (Historical Snapshots)

### Create Table in Xano

**Table Name:** `csl_policy_history`

### Fields Configuration

| Field Name | Data Type | Length | Required | Unique | Default | Notes |
|------------|-----------|--------|----------|--------|---------|-------|
| id | integer | - | ✅ | ✅ | auto | Primary Key |
| csl_policy_id | integer | - | ✅ | ❌ | - | FK to csl_policies |
| data_as_of_date | date | - | ✅ | ❌ | - | Which month's data |
| arrears_amount | decimal | 10,2 | ❌ | ❌ | 0.00 | Historical arrears |
| installments_in_arrears | integer | - | ❌ | ❌ | 0 | Historical installments |
| policy_status | text | 50 | ❌ | ❌ | - | Historical status |
| changes_json | json | - | ❌ | ❌ | {} | What changed |
| upload_id | integer | - | ❌ | ❌ | - | FK to csl_uploads |
| uploaded_by_admin_id | integer | - | ✅ | ❌ | - | FK to users |
| uploaded_at | timestamp | - | ✅ | ❌ | now() | When saved |

### SQL for PostgreSQL

```sql
CREATE TABLE csl_policy_history (
  -- Primary Key
  id SERIAL PRIMARY KEY,
  
  -- Foreign Keys
  csl_policy_id INTEGER NOT NULL,
  
  -- Snapshot of data at this point in time
  data_as_of_date DATE NOT NULL,
  arrears_amount DECIMAL(10,2) DEFAULT 0.00,
  installments_in_arrears INTEGER DEFAULT 0,
  policy_status VARCHAR(50),
  
  -- What changed?
  changes_json JSONB DEFAULT '{}',
  
  -- Upload tracking
  upload_id INTEGER,
  uploaded_by_admin_id INTEGER NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Key Constraints
  CONSTRAINT fk_csl_history_policy FOREIGN KEY (csl_policy_id) 
    REFERENCES csl_policies(id) ON DELETE CASCADE,
  CONSTRAINT fk_csl_history_upload FOREIGN KEY (upload_id) 
    REFERENCES csl_uploads(id) ON DELETE SET NULL,
  CONSTRAINT fk_csl_history_admin FOREIGN KEY (uploaded_by_admin_id) 
    REFERENCES users(id) ON DELETE RESTRICT
);

-- Indexes
CREATE INDEX idx_csl_history_policy_id ON csl_policy_history(csl_policy_id);
CREATE INDEX idx_csl_history_date ON csl_policy_history(data_as_of_date);
CREATE INDEX idx_csl_history_upload_id ON csl_policy_history(upload_id);
CREATE INDEX idx_csl_history_uploaded_at ON csl_policy_history(uploaded_at);

-- Comments
COMMENT ON TABLE csl_policy_history IS 'Historical snapshots of CSL policy data for tracking changes over time';
COMMENT ON COLUMN csl_policy_history.csl_policy_id IS 'FK to csl_policies - CASCADE delete if policy deleted';
COMMENT ON COLUMN csl_policy_history.data_as_of_date IS 'Which month this historical snapshot represents';
COMMENT ON COLUMN csl_policy_history.changes_json IS 'JSON object showing what fields changed from previous state';
```

---

## Table 6: csl_uploads (Upload Batches)

### Create Table in Xano

**Table Name:** `csl_uploads`

### Fields Configuration

| Field Name | Data Type | Length | Required | Unique | Default | Notes |
|------------|-----------|--------|----------|--------|---------|-------|
| id | integer | - | ✅ | ✅ | auto | Primary Key |
| upload_date | timestamp | - | ✅ | ❌ | now() | When uploaded |
| data_as_of_date | date | - | ✅ | ❌ | - | Which month's data |
| file_name | text | 200 | ❌ | ❌ | - | CSV filename |
| total_records | integer | - | ❌ | ❌ | 0 | Total rows processed |
| new_policies | integer | - | ❌ | ❌ | 0 | New policies created |
| updated_policies | integer | - | ❌ | ❌ | 0 | Existing policies updated |
| uploaded_by_admin_id | integer | - | ✅ | ❌ | - | FK to users |

### SQL for PostgreSQL

```sql
CREATE TABLE csl_uploads (
  -- Primary Key
  id SERIAL PRIMARY KEY,
  
  -- Upload Information
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_as_of_date DATE NOT NULL,
  file_name VARCHAR(200),
  
  -- Statistics
  total_records INTEGER DEFAULT 0,
  new_policies INTEGER DEFAULT 0,
  updated_policies INTEGER DEFAULT 0,
  
  -- System Fields
  uploaded_by_admin_id INTEGER NOT NULL,
  
  -- Foreign Key Constraint
  CONSTRAINT fk_csl_upload_admin FOREIGN KEY (uploaded_by_admin_id) 
    REFERENCES users(id) ON DELETE RESTRICT
);

-- Indexes
CREATE INDEX idx_csl_upload_date ON csl_uploads(upload_date);
CREATE INDEX idx_csl_upload_data_date ON csl_uploads(data_as_of_date);
CREATE INDEX idx_csl_upload_admin_id ON csl_uploads(uploaded_by_admin_id);

-- Comments
COMMENT ON TABLE csl_uploads IS 'Tracks each monthly CSL data upload batch';
COMMENT ON COLUMN csl_uploads.data_as_of_date IS 'Which month-end date this upload represents (e.g., 2025-08-31)';
COMMENT ON COLUMN csl_uploads.uploaded_by_admin_id IS 'FK to users - RESTRICT delete if admin has uploaded data';
```

---

## Initial Data for csl_dropdown_options

### Insert Default Dropdown Values

```sql
-- Recovery Type
INSERT INTO csl_dropdown_options (field_name, option_value, option_label, display_order) VALUES
('recovery_type', 'full', 'Full', 1),
('recovery_type', 'partial', 'Partial', 2),
('recovery_type', 'none', 'None', 3);

-- Standing Order Status
INSERT INTO csl_dropdown_options (field_name, option_value, option_label, display_order) VALUES
('standing_order_status', 'active', 'Active', 1),
('standing_order_status', 'newly_setup', 'Newly Setup', 2),
('standing_order_status', 'inactive', 'Inactive', 3),
('standing_order_status', 'na', 'N/A', 4);

-- Outcome 1
INSERT INTO csl_dropdown_options (field_name, option_value, option_label, display_order) VALUES
('outcome_1', 'contacted', 'Successfully Contacted', 1),
('outcome_1', 'not_reachable', 'Not Reachable', 2),
('outcome_1', 'wrong_number', 'Wrong Number', 3),
('outcome_1', 'promise_to_pay', 'Promise to Pay', 4),
('outcome_1', 'dispute', 'Dispute', 5),
('outcome_1', 'paid', 'Already Paid', 6),
('outcome_1', 'callback_requested', 'Callback Requested', 7),
('outcome_1', 'no_answer', 'No Answer', 8);

-- Sub-Outcome (dependent on outcome_1 = 'promise_to_pay')
-- First, get the ID of 'promise_to_pay' outcome
-- Assuming ID = 4 for promise_to_pay
INSERT INTO csl_dropdown_options (field_name, option_value, option_label, parent_option_id, display_order) VALUES
('sub_outcome', 'will_pay_today', 'Will Pay Today', 4, 1),
('sub_outcome', 'will_pay_this_week', 'Will Pay This Week', 4, 2),
('sub_outcome', 'will_pay_next_week', 'Will Pay Next Week', 4, 3),
('sub_outcome', 'will_pay_end_of_month', 'Will Pay End of Month', 4, 4),
('sub_outcome', 'financial_difficulty', 'Financial Difficulty', 4, 5);

-- Sub-Outcome (dependent on outcome_1 = 'not_reachable')
-- Assuming ID = 2 for not_reachable
INSERT INTO csl_dropdown_options (field_name, option_value, option_label, parent_option_id, display_order) VALUES
('sub_outcome', 'phone_off', 'Phone Switched Off', 2, 1),
('sub_outcome', 'no_network', 'No Network Coverage', 2, 2),
('sub_outcome', 'voicemail', 'Went to Voicemail', 2, 3);

-- Reason for Non-Payment
INSERT INTO csl_dropdown_options (field_name, option_value, option_label, display_order) VALUES
('reason_for_non_payment', 'financial_difficulty', 'Financial Difficulty', 1),
('reason_for_non_payment', 'forgot', 'Forgot to Pay', 2),
('reason_for_non_payment', 'dispute_amount', 'Dispute Amount', 3),
('reason_for_non_payment', 'waiting_funds', 'Waiting for Funds', 4),
('reason_for_non_payment', 'unemployment', 'Unemployment', 5),
('reason_for_non_payment', 'medical_emergency', 'Medical Emergency', 6),
('reason_for_non_payment', 'other', 'Other', 7);

-- Mode of Payment
INSERT INTO csl_dropdown_options (field_name, option_value, option_label, display_order) VALUES
('mode_of_payment', 'cash', 'Cash', 1),
('mode_of_payment', 'cheque', 'Cheque', 2),
('mode_of_payment', 'bank_transfer', 'Bank Transfer', 3),
('mode_of_payment', 'mobile_money', 'Mobile Money (Juice)', 4),
('mode_of_payment', 'standing_order', 'Standing Order', 5),
('mode_of_payment', 'debit_card', 'Debit Card', 6),
('mode_of_payment', 'credit_card', 'Credit Card', 7);

-- Promise to Pay Week
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

## Xano-Specific Setup Instructions

### Step 1: Create Tables in Xano

1. Log into your Xano workspace
2. Go to **Database** section
3. Click **Add Table** for each table above
4. Add fields one by one using the field configuration tables

### Step 2: Set Up Relationships

**In csl_interactions table:**
- Add relationship: `csl_policy_id` → `csl_policies.id`
- Add relationship: `agent_id` → `users.id`

**In csl_payments table:**
- Add relationship: `uploaded_by_admin_id` → `users.id`

**In csl_dropdown_options table:**
- Add self-relationship: `parent_option_id` → `csl_dropdown_options.id`

### Step 3: Create API Endpoints

Create these endpoints in Xano:

**For csl_policies:**
- GET `/csl_policies` - List all policies
- GET `/csl_policies/{id}` - Get single policy
- POST `/csl_policies` - Create policy
- PATCH `/csl_policies/{id}` - Update policy
- DELETE `/csl_policies/{id}` - Delete policy
- POST `/csl_policies/bulk_upload` - Bulk CSV upload

**For csl_interactions:**
- GET `/csl_interactions` - List interactions
- GET `/csl_interactions/policy/{policy_id}` - Get by policy
- POST `/csl_interactions` - Create interaction
- PATCH `/csl_interactions/{id}` - Update interaction

**For csl_payments:**
- GET `/csl_payments/verify/{policy_number}` - Check payment
- POST `/csl_payments/bulk_upload` - Bulk CSV upload

**For csl_dropdown_options:**
- GET `/csl_dropdown_options/{field_name}` - Get options for field
- POST `/csl_dropdown_options` - Create option
- PATCH `/csl_dropdown_options/{id}` - Update option
- DELETE `/csl_dropdown_options/{id}` - Delete option

---

## Summary

**6 Tables Created:**
1. ✅ `csl_policies` - 40+ fields for policy data (current state)
2. ✅ `csl_interactions` - 22 fields for call tracking
3. ✅ `csl_payments` - Payment verification data
4. ✅ `csl_dropdown_options` - Configurable dropdowns
5. ✅ `csl_policy_history` - Historical snapshots for tracking changes
6. ✅ `csl_uploads` - Upload batch tracking

**Total Fields:** ~110 fields across all tables

**Relationships:**
- csl_policies → users (assigned_to_agent_id)
- csl_policies → csl_uploads (last_upload_id)
- csl_interactions → csl_policies
- csl_interactions → users
- csl_payments → users
- csl_policy_history → csl_policies
- csl_policy_history → csl_uploads
- csl_policy_history → users
- csl_uploads → users
- csl_dropdown_options → self (parent-child)

**Ready for:** CSV uploads, API integration, frontend development

---

## Relationship Summary

### Primary Keys (PK)
- `csl_policies.id` - Auto-increment integer
- `csl_interactions.id` - Auto-increment integer
- `csl_payments.id` - Auto-increment integer
- `csl_dropdown_options.id` - Auto-increment integer
- `csl_policy_history.id` - Auto-increment integer
- `csl_uploads.id` - Auto-increment integer

### Foreign Keys (FK)

| From Table | Column | References | On Delete | Type |
|------------|--------|------------|-----------|------|
| csl_policies | assigned_to_agent_id | users.id | SET NULL | Optional |
| csl_policies | last_upload_id | csl_uploads.id | SET NULL | Optional |
| csl_interactions | csl_policy_id | csl_policies.id | CASCADE | Required |
| csl_interactions | agent_id | users.id | RESTRICT | Required |
| csl_payments | uploaded_by_admin_id | users.id | RESTRICT | Required |
| csl_policy_history | csl_policy_id | csl_policies.id | CASCADE | Required |
| csl_policy_history | upload_id | csl_uploads.id | SET NULL | Optional |
| csl_policy_history | uploaded_by_admin_id | users.id | RESTRICT | Required |
| csl_uploads | uploaded_by_admin_id | users.id | RESTRICT | Required |
| csl_dropdown_options | parent_option_id | csl_dropdown_options.id | SET NULL | Optional |

### Soft Links (No FK Constraint)

| From Table | Column | Links To | Type |
|------------|--------|----------|------|
| csl_payments | policy_number | csl_policies.policy_number | Text match |

**Why Soft Link?**
- Payment data uploaded independently
- Payments may exist before policy created
- More flexible for data imports
- Both fields indexed for performance

### Relationship Diagram

```
users (existing table)
  ├─→ csl_policies.assigned_to_agent_id (SET NULL)
  ├─→ csl_interactions.agent_id (RESTRICT)
  ├─→ csl_payments.uploaded_by_admin_id (RESTRICT)
  ├─→ csl_policy_history.uploaded_by_admin_id (RESTRICT)
  └─→ csl_uploads.uploaded_by_admin_id (RESTRICT)

csl_uploads
  ├─→ csl_policies.last_upload_id (SET NULL)
  └─→ csl_policy_history.upload_id (SET NULL)

csl_policies
  ├─→ csl_interactions.csl_policy_id (CASCADE)
  ├─→ csl_policy_history.csl_policy_id (CASCADE)
  └─→ csl_payments.policy_number (SOFT LINK via text)

csl_dropdown_options
  └─→ csl_dropdown_options.parent_option_id (SET NULL, self-reference)
```

### Delete Behavior

**CASCADE (csl_interactions → csl_policies)**
- If policy deleted, all interactions deleted automatically
- Maintains data integrity

**RESTRICT (users → csl_interactions, csl_payments)**
- Cannot delete user who has logged interactions
- Cannot delete admin who has uploaded payments
- Prevents accidental data loss

**SET NULL (csl_policies → users, csl_dropdown_options → self)**
- If agent deleted, policy assignment cleared
- If parent dropdown deleted, child options remain

---

**Document Version:** 1.3  
**Last Updated:** December 6, 2025  
**Status:** ✅ Implemented in Xano - Ready for Frontend Development  
**Changes:**  
- v1.1: Added complete FK constraints and relationship documentation
- v1.2: Added csl_policy_history and csl_uploads tables for monthly data handling
- v1.3: Added actual Xano implementation details with live API endpoints and schemas
