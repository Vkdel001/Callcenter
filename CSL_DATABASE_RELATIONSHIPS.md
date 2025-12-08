# CSL Database Relationships - Complete Guide

## Overview
This document clarifies all primary keys, foreign keys, and relationships between CSL tables.

---

## Relationship Diagram

```
┌─────────────────┐
│     users       │
│  (existing)     │
│─────────────────│
│ id (PK)         │
│ email           │
│ name            │
│ role            │
│ branch_id       │
└─────────────────┘
         │
         │ (FK: assigned_to_agent_id)
         │ (FK: agent_id)
         │ (FK: uploaded_by_admin_id)
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    csl_policies                             │
│─────────────────────────────────────────────────────────────│
│ id (PK)                                                     │
│ policy_number (UNIQUE) ◄──────────────┐                    │
│ ... (40+ fields)                       │                    │
│ assigned_to_agent_id (FK → users.id)   │                    │
└─────────────────────────────────────────┘                    │
         │                                                     │
         │ (FK: csl_policy_id)                                │
         ▼                                                     │
┌─────────────────────────────────────────┐                    │
│         csl_interactions                │                    │
│─────────────────────────────────────────│                    │
│ id (PK)                                 │                    │
│ csl_policy_id (FK → csl_policies.id)    │                    │
│ agent_id (FK → users.id)                │                    │
│ ... (22 fields)                         │                    │
└─────────────────────────────────────────┘                    │
                                                               │
                                                               │
┌─────────────────────────────────────────┐                    │
│           csl_payments                  │                    │
│─────────────────────────────────────────│                    │
│ id (PK)                                 │                    │
│ policy_number (NOT FK, indexed) ────────┘                    │
│ payment_date                            │                    │
│ payment_amount                          │                    │
│ uploaded_by_admin_id (FK → users.id)    │                    │
│ ... (11 fields)                         │                    │
└─────────────────────────────────────────┘
         
┌─────────────────────────────────────────┐
│      csl_dropdown_options               │
│─────────────────────────────────────────│
│ id (PK)                                 │
│ field_name                              │
│ option_value                            │
│ parent_option_id (FK → self.id)         │
│ ... (9 fields)                          │
└─────────────────────────────────────────┘
```

---

## Key Relationships Explained

### 1. csl_policies ↔ csl_interactions (One-to-Many)

**Relationship Type:** One policy can have many interactions

**Primary Key:** `csl_policies.id`  
**Foreign Key:** `csl_interactions.csl_policy_id`

```sql
-- In csl_interactions table
csl_policy_id INTEGER NOT NULL,
FOREIGN KEY (csl_policy_id) REFERENCES csl_policies(id) ON DELETE CASCADE
```

**Why CASCADE?** If a policy is deleted, all its interactions should be deleted too.

---

### 2. csl_policies ↔ csl_payments (Soft Link via policy_number)

**Relationship Type:** Soft link (no formal FK constraint)

**Link Field:** `policy_number` (text field in both tables)

**Why NOT a Foreign Key?**
- `csl_payments` is uploaded independently by admin
- Payment data may exist before policy is created in CSL system
- Payment data may reference policies not yet in CSL system
- More flexible for data imports

**How to Query:**
```sql
-- Check if payment exists for a policy
SELECT * FROM csl_payments 
WHERE policy_number = (
  SELECT policy_number FROM csl_policies WHERE id = ?
);

-- Or join them
SELECT p.*, pay.* 
FROM csl_policies p
LEFT JOIN csl_payments pay ON p.policy_number = pay.policy_number
WHERE p.id = ?;
```

**Index for Performance:**
```sql
CREATE INDEX idx_csl_pay_policy_number ON csl_payments(policy_number);
CREATE INDEX idx_csl_policy_number ON csl_policies(policy_number);
```

---

### 3. users ↔ csl_policies (One-to-Many)

**Relationship Type:** One agent can be assigned many policies

**Primary Key:** `users.id`  
**Foreign Key:** `csl_policies.assigned_to_agent_id`

```sql
-- In csl_policies table
assigned_to_agent_id INTEGER,
FOREIGN KEY (assigned_to_agent_id) REFERENCES users(id) ON DELETE SET NULL
```

**Why SET NULL?** If an agent is deleted, policies should remain but assignment is cleared.

---

### 4. users ↔ csl_interactions (One-to-Many)

**Relationship Type:** One agent can log many interactions

**Primary Key:** `users.id`  
**Foreign Key:** `csl_interactions.agent_id`

```sql
-- In csl_interactions table
agent_id INTEGER NOT NULL,
FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE RESTRICT
```

**Why RESTRICT?** Cannot delete an agent who has logged interactions (data integrity).

---

### 5. users ↔ csl_payments (One-to-Many)

**Relationship Type:** One admin can upload many payment files

**Primary Key:** `users.id`  
**Foreign Key:** `csl_payments.uploaded_by_admin_id`

```sql
-- In csl_payments table
uploaded_by_admin_id INTEGER NOT NULL,
FOREIGN KEY (uploaded_by_admin_id) REFERENCES users(id) ON DELETE RESTRICT
```

**Why RESTRICT?** Cannot delete an admin who has uploaded payment data.

---

### 6. csl_dropdown_options ↔ self (Parent-Child)

**Relationship Type:** Self-referencing for dependent dropdowns

**Primary Key:** `csl_dropdown_options.id`  
**Foreign Key:** `csl_dropdown_options.parent_option_id`

```sql
-- In csl_dropdown_options table
parent_option_id INTEGER,
FOREIGN KEY (parent_option_id) REFERENCES csl_dropdown_options(id) ON DELETE SET NULL
```

**Example:**
```
Outcome 1: "Promise to Pay" (id=4, parent_option_id=NULL)
  └─ Sub-Outcome: "Will Pay Today" (id=10, parent_option_id=4)
  └─ Sub-Outcome: "Will Pay This Week" (id=11, parent_option_id=4)
```

---

## Complete SQL with All Relationships

```sql
-- ============================================
-- Table 1: csl_policies
-- ============================================
CREATE TABLE csl_policies (
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (assigned_to_agent_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for csl_policies
CREATE UNIQUE INDEX idx_csl_policy_number_unique ON csl_policies(policy_number);
CREATE INDEX idx_csl_policy_number ON csl_policies(policy_number);
CREATE INDEX idx_csl_branch_id ON csl_policies(branch_id);
CREATE INDEX idx_csl_assigned_agent ON csl_policies(assigned_to_agent_id);
CREATE INDEX idx_csl_policy_status ON csl_policies(policy_status);
CREATE INDEX idx_csl_owner1_nic ON csl_policies(owner1_nic);
CREATE INDEX idx_csl_owner2_nic ON csl_policies(owner2_nic);
CREATE INDEX idx_csl_arrears_amount ON csl_policies(arrears_amount);

-- ============================================
-- Table 2: csl_interactions
-- ============================================
CREATE TABLE csl_interactions (
  id SERIAL PRIMARY KEY,
  
  -- Foreign Keys (MUST BE FIRST)
  csl_policy_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL,
  
  -- Interaction Details
  client_calling_date DATE NOT NULL,
  calling_remarks TEXT,
  recovery_type VARCHAR(20),
  amount_paid DECIMAL(10,2) DEFAULT 0.00,
  standing_order_status VARCHAR(20),
  request_for_aod BOOLEAN DEFAULT FALSE,
  ptp_case BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  outcome_1 VARCHAR(50),
  sub_outcome VARCHAR(50),
  amount_paid_per_nic_system DECIMAL(10,2) DEFAULT 0.00,
  promise_to_pay_amount DECIMAL(10,2) DEFAULT 0.00,
  promise_to_pay_week VARCHAR(20),
  reason_for_non_payment VARCHAR(100),
  mode_of_payment VARCHAR(50),
  updated_contact VARCHAR(20),
  updated_email VARCHAR(100),
  updated_frequency VARCHAR(20),
  actions_taken JSONB DEFAULT '{}',
  
  -- System Fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Key Constraints
  FOREIGN KEY (csl_policy_id) REFERENCES csl_policies(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Indexes for csl_interactions
CREATE INDEX idx_csl_int_policy_id ON csl_interactions(csl_policy_id);
CREATE INDEX idx_csl_int_agent_id ON csl_interactions(agent_id);
CREATE INDEX idx_csl_int_calling_date ON csl_interactions(client_calling_date);
CREATE INDEX idx_csl_int_follow_up_date ON csl_interactions(follow_up_date);
CREATE INDEX idx_csl_int_outcome ON csl_interactions(outcome_1);
CREATE INDEX idx_csl_int_created_at ON csl_interactions(created_at);

-- ============================================
-- Table 3: csl_payments
-- ============================================
CREATE TABLE csl_payments (
  id SERIAL PRIMARY KEY,
  
  -- Payment Information (NO FK to csl_policies - soft link via policy_number)
  policy_number VARCHAR(50) NOT NULL,
  payment_date DATE NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_reference VARCHAR(100),
  payment_method VARCHAR(50),
  payment_status VARCHAR(20) DEFAULT 'verified',
  additional_field_1 VARCHAR(200),
  additional_field_2 VARCHAR(200),
  
  -- System Fields
  uploaded_by_admin_id INTEGER NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Key Constraint
  FOREIGN KEY (uploaded_by_admin_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Indexes for csl_payments
CREATE INDEX idx_csl_pay_policy_number ON csl_payments(policy_number);
CREATE INDEX idx_csl_pay_payment_date ON csl_payments(payment_date);
CREATE INDEX idx_csl_pay_uploaded_at ON csl_payments(uploaded_at);
CREATE INDEX idx_csl_pay_status ON csl_payments(payment_status);
CREATE INDEX idx_csl_pay_admin_id ON csl_payments(uploaded_by_admin_id);

-- ============================================
-- Table 4: csl_dropdown_options
-- ============================================
CREATE TABLE csl_dropdown_options (
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
  
  -- Foreign Key for parent-child relationship
  FOREIGN KEY (parent_option_id) REFERENCES csl_dropdown_options(id) ON DELETE SET NULL
);

-- Indexes for csl_dropdown_options
CREATE INDEX idx_csl_dd_field_name ON csl_dropdown_options(field_name);
CREATE INDEX idx_csl_dd_parent_option ON csl_dropdown_options(parent_option_id);
CREATE INDEX idx_csl_dd_active ON csl_dropdown_options(is_active);
CREATE INDEX idx_csl_dd_display_order ON csl_dropdown_options(display_order);
```

---

## Xano Relationship Setup

### In Xano UI:

**For csl_policies table:**
1. Add field: `assigned_to_agent_id` (integer)
2. Set as relationship: Link to `users` table, field `id`
3. Relationship type: Many-to-One (many policies to one user)
4. On delete: Set NULL

**For csl_interactions table:**
1. Add field: `csl_policy_id` (integer, required)
2. Set as relationship: Link to `csl_policies` table, field `id`
3. Relationship type: Many-to-One (many interactions to one policy)
4. On delete: CASCADE

5. Add field: `agent_id` (integer, required)
6. Set as relationship: Link to `users` table, field `id`
7. Relationship type: Many-to-One (many interactions to one user)
8. On delete: RESTRICT

**For csl_payments table:**
1. Add field: `policy_number` (text, required)
2. **DO NOT** set as relationship - keep as regular text field
3. Add index on `policy_number` for performance

4. Add field: `uploaded_by_admin_id` (integer, required)
5. Set as relationship: Link to `users` table, field `id`
6. Relationship type: Many-to-One
7. On delete: RESTRICT

**For csl_dropdown_options table:**
1. Add field: `parent_option_id` (integer, nullable)
2. Set as relationship: Link to `csl_dropdown_options` table, field `id` (self-reference)
3. Relationship type: Many-to-One
4. On delete: SET NULL

---

## Query Examples

### Get policy with all interactions
```sql
SELECT 
  p.*,
  json_agg(i.*) as interactions
FROM csl_policies p
LEFT JOIN csl_interactions i ON i.csl_policy_id = p.id
WHERE p.id = ?
GROUP BY p.id;
```

### Check payment status for a policy
```sql
SELECT 
  p.*,
  CASE 
    WHEN pay.id IS NOT NULL THEN true 
    ELSE false 
  END as payment_verified,
  pay.payment_date,
  pay.payment_amount
FROM csl_policies p
LEFT JOIN csl_payments pay ON pay.policy_number = p.policy_number
WHERE p.id = ?;
```

### Get agent's assigned policies with interaction count
```sql
SELECT 
  p.*,
  COUNT(i.id) as interaction_count,
  MAX(i.client_calling_date) as last_interaction_date
FROM csl_policies p
LEFT JOIN csl_interactions i ON i.csl_policy_id = p.id
WHERE p.assigned_to_agent_id = ?
GROUP BY p.id
ORDER BY p.arrears_amount DESC;
```

### Get dependent dropdown options
```sql
-- Get sub-outcomes for "Promise to Pay" outcome
SELECT * FROM csl_dropdown_options
WHERE field_name = 'sub_outcome'
AND parent_option_id = (
  SELECT id FROM csl_dropdown_options 
  WHERE field_name = 'outcome_1' 
  AND option_value = 'promise_to_pay'
)
AND is_active = true
ORDER BY display_order;
```

---

## Summary of Relationships

| From Table | To Table | Relationship Type | Foreign Key | On Delete |
|------------|----------|-------------------|-------------|-----------|
| csl_policies | users | Many-to-One | assigned_to_agent_id | SET NULL |
| csl_interactions | csl_policies | Many-to-One | csl_policy_id | CASCADE |
| csl_interactions | users | Many-to-One | agent_id | RESTRICT |
| csl_payments | users | Many-to-One | uploaded_by_admin_id | RESTRICT |
| csl_payments | csl_policies | **Soft Link** | policy_number (text) | N/A |
| csl_dropdown_options | csl_dropdown_options | Many-to-One (self) | parent_option_id | SET NULL |

---

## Key Points

✅ **csl_interactions → csl_policies:** Formal FK relationship via `csl_policy_id`  
✅ **csl_payments → csl_policies:** Soft link via `policy_number` (text field, indexed)  
✅ **Why soft link?** Flexibility for payment data that may exist before policy creation  
✅ **All user relationships:** Formal FK constraints for data integrity  
✅ **Cascading deletes:** Only for interactions (if policy deleted, interactions go too)  
✅ **Restrict deletes:** For users who have created data (agents, admins)  

---

**Document Version:** 1.0  
**Last Updated:** December 6, 2025  
**Status:** Ready for Implementation
