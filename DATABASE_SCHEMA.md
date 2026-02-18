# NIC Call Center System - Database Schema

## Overview

Complete database structure reference for the NIC Call Center System. All tables are hosted on Xano PostgreSQL.

---

## Core Tables

### 1. users (Agents/Admins)

**Purpose**: Store agent and administrator accounts

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,  -- 'admin', 'agent', 'csl_agent', 'sales_agent'
  branch_id INTEGER,
  active_status BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);
```

**Indexes**:
- `idx_users_email` ON email
- `idx_users_role` ON role
- `idx_users_branch` ON branch_id

**Sample Data**:
```json
{
  "id": 123,
  "name": "John Doe",
  "email": "john@nic.mu",
  "role": "agent",
  "branch_id": 5,
  "active_status": true
}
```

---

### 2. customers (Insurance Policyholders)

**Purpose**: Store customer and policy information

```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  policy_number VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  mobile VARCHAR(20),
  email VARCHAR(100),
  amount_due DECIMAL(10,2) DEFAULT 0.00,
  policy_type VARCHAR(50),  -- 'Motor', 'Non-Motor', 'Life'
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'contacted', 'resolved'
  assigned_agent_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (assigned_agent_id) REFERENCES users(id) ON DELETE SET NULL
);
```

**Indexes**:
- `idx_customers_policy_number` ON policy_number (UNIQUE)
- `idx_customers_email` ON email
- `idx_customers_assigned_agent` ON assigned_agent_id
- `idx_customers_status` ON status

---

### 3. payment_plans

**Purpose**: Store payment plan arrangements

```sql
CREATE TABLE payment_plans (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  installment_count INTEGER NOT NULL,
  start_date DATE NOT NULL,
  frequency VARCHAR(20) DEFAULT 'monthly',  -- 'weekly', 'monthly'
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'completed', 'cancelled'
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

**Indexes**:
- `idx_payment_plans_customer` ON customer_id
- `idx_payment_plans_status` ON status

---

### 4. installments

**Purpose**: Individual payment installments

```sql
CREATE TABLE installments (
  id SERIAL PRIMARY KEY,
  payment_plan_id INTEGER NOT NULL,
  installment_number INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'paid', 'overdue'
  paid_date TIMESTAMP,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (payment_plan_id) REFERENCES payment_plans(id) ON DELETE CASCADE
);
```

**Indexes**:
- `idx_installments_payment_plan` ON payment_plan_id
- `idx_installments_due_date` ON due_date
- `idx_installments_status` ON status

---

### 5. call_logs

**Purpose**: Customer interaction history

```sql
CREATE TABLE call_logs (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL,
  call_status VARCHAR(50),  -- 'answered', 'no_answer', 'busy', 'wrong_number'
  remarks TEXT,
  next_follow_up DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES users(id)
);
```

**Indexes**:
- `idx_call_logs_customer` ON customer_id
- `idx_call_logs_agent` ON agent_id
- `idx_call_logs_created_at` ON created_at

---

### 6. qr_transactions

**Purpose**: QR code payment tracking

```sql
CREATE TABLE qr_transactions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL,
  qr_code_url TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'completed', 'expired'
  transaction_id VARCHAR(100),
  reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (agent_id) REFERENCES users(id)
);
```

**Indexes**:
- `idx_qr_transactions_customer` ON customer_id
- `idx_qr_transactions_agent` ON agent_id
- `idx_qr_transactions_status` ON status
- `idx_qr_transactions_created_at` ON created_at

---

### 7. aod_documents (Acknowledgment of Debt)

**Purpose**: AOD document tracking and signature management

```sql
CREATE TABLE aod_documents (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  payment_plan_id INTEGER NOT NULL,
  pdf_url TEXT NOT NULL,
  signature_status VARCHAR(30) DEFAULT 'pending_signature',
  -- 'pending_signature', 'received', 'expired', 'active'
  signature_sent_date TIMESTAMP,
  signature_received_date TIMESTAMP,
  signature_reminder_count INTEGER DEFAULT 0,
  last_signature_reminder TIMESTAMP,
  signed_document_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (payment_plan_id) REFERENCES payment_plans(id)
);
```

**Indexes**:
- `idx_aod_customer` ON customer_id
- `idx_aod_payment_plan` ON payment_plan_id
- `idx_aod_signature_status` ON signature_status

---

### 8. csl_policies (Call Center Policies)

**Purpose**: Monthly call center policy data

```sql
CREATE TABLE csl_policies (
  id SERIAL PRIMARY KEY,
  policy_number VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(200),
  mobile VARCHAR(20),
  email VARCHAR(100),
  premium_amount DECIMAL(10,2) DEFAULT 0.00,
  arrears_amount DECIMAL(10,2) DEFAULT 0.00,
  policy_type VARCHAR(50),
  policy_status VARCHAR(50),
  month_year VARCHAR(7) NOT NULL,  -- Format: 'YYYY-MM'
  assigned_agent_id INTEGER,
  branch_id INTEGER DEFAULT 13,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Additional fields (40+ total)
  owner1_nic VARCHAR(50),
  owner1_mobile VARCHAR(20),
  owner1_email VARCHAR(100),
  owner2_nic VARCHAR(50),
  owner2_mobile VARCHAR(20),
  owner2_email VARCHAR(100),
  -- ... more fields
  
  FOREIGN KEY (assigned_agent_id) REFERENCES users(id) ON DELETE SET NULL
);
```

**Indexes**:
- `idx_csl_policy_number` ON policy_number (UNIQUE)
- `idx_csl_month_year` ON month_year
- `idx_csl_assigned_agent` ON assigned_agent_id
- `idx_csl_policy_status` ON policy_status

---

### 9. csl_interactions

**Purpose**: Call center interaction logging

```sql
CREATE TABLE csl_interactions (
  id SERIAL PRIMARY KEY,
  csl_policy_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL,
  client_calling_date DATE NOT NULL,
  calling_remarks TEXT,
  recovery_type VARCHAR(20),
  amount_paid DECIMAL(10,2) DEFAULT 0.00,
  outcome_1 VARCHAR(50),
  sub_outcome VARCHAR(50),
  follow_up_date DATE,
  promise_to_pay_amount DECIMAL(10,2),
  reason_for_non_payment VARCHAR(100),
  mode_of_payment VARCHAR(50),
  updated_contact VARCHAR(20),
  updated_email VARCHAR(100),
  actions_taken JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (csl_policy_id) REFERENCES csl_policies(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE RESTRICT
);
```

**Indexes**:
- `idx_csl_int_policy` ON csl_policy_id
- `idx_csl_int_agent` ON agent_id
- `idx_csl_int_calling_date` ON client_calling_date
- `idx_csl_int_follow_up` ON follow_up_date

---

### 10. branches

**Purpose**: Branch locations

```sql
CREATE TABLE branches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Sample Data**:
```json
[
  {"id": 5, "name": "Port Louis", "code": "PL"},
  {"id": 13, "name": "Call Center", "code": "CC"}
]
```

---

## Table Relationships

```
users (agents)
  ├─ 1:N → customers (assigned_agent_id)
  ├─ 1:N → payment_plans (created_by)
  ├─ 1:N → call_logs (agent_id)
  ├─ 1:N → qr_transactions (agent_id)
  ├─ 1:N → csl_policies (assigned_agent_id)
  └─ 1:N → csl_interactions (agent_id)

customers
  ├─ 1:N → payment_plans
  ├─ 1:N → call_logs
  ├─ 1:N → qr_transactions
  └─ 1:N → aod_documents

payment_plans
  ├─ 1:N → installments
  └─ 1:1 → aod_documents

csl_policies
  └─ 1:N → csl_interactions

branches
  └─ 1:N → users (branch_id)
```

---

## Data Constraints

### Email Format
- Must match pattern: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`

### Phone Number Format (Mauritius)
- Must start with `+230` or `230`
- Example: `+230 5123 4567`

### Amount Validation
- Must be positive (> 0)
- Decimal precision: 10,2

### Date Validations
- `due_date` must be in future
- `start_date` must be <= first installment due date
- `signature_sent_date` must be <= current date

### Policy Number Format
- Unique across system
- Alphanumeric with hyphens allowed
- Example: `POL-2024-001`, `LIB/C7013`

---

## Sample Queries

### Get Customer with Payment Plans
```sql
SELECT 
  c.*,
  json_agg(pp.*) as payment_plans
FROM customers c
LEFT JOIN payment_plans pp ON pp.customer_id = c.id
WHERE c.id = ?
GROUP BY c.id;
```

### Get Overdue Installments
```sql
SELECT 
  i.*,
  pp.customer_id,
  c.name as customer_name,
  c.mobile
FROM installments i
JOIN payment_plans pp ON pp.id = i.payment_plan_id
JOIN customers c ON c.id = pp.customer_id
WHERE i.status = 'pending'
AND i.due_date < CURRENT_DATE
ORDER BY i.due_date ASC;
```

### Get Agent Performance
```sql
SELECT 
  u.id,
  u.name,
  COUNT(DISTINCT c.id) as customers_assigned,
  COUNT(DISTINCT cl.id) as calls_made,
  COUNT(DISTINCT qr.id) as qr_codes_generated,
  SUM(CASE WHEN qr.status = 'completed' THEN qr.amount ELSE 0 END) as total_collected
FROM users u
LEFT JOIN customers c ON c.assigned_agent_id = u.id
LEFT JOIN call_logs cl ON cl.agent_id = u.id
LEFT JOIN qr_transactions qr ON qr.agent_id = u.id
WHERE u.role = 'agent'
GROUP BY u.id, u.name;
```

---

## Data Retention Policies

- **Active Records**: Kept indefinitely
- **Archived Customers**: Moved to `archived_customers` table after 2 years of inactivity
- **Call Logs**: Retained for 3 years
- **QR Transactions**: Retained for 5 years (financial records)
- **AOD Documents**: Retained for 7 years (legal requirement)

---

## Backup Strategy

- **Frequency**: Daily automatic backups (Xano managed)
- **Retention**: 30 days
- **Manual Backups**: Before major deployments
- **Recovery Time**: < 1 hour

---

**Document Version**: 1.0  
**Last Updated**: February 4, 2026  
**Maintained By**: Development Team
