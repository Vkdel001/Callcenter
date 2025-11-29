# Xano Table - SQL Reference

**Note**: Xano doesn't use SQL commands directly. This is for reference only.

---

## SQL CREATE TABLE Command (Reference)

```sql
CREATE TABLE customer_contact_updates (
    -- Primary Key
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    
    -- Foreign Key to nic_cc_customer
    customer_id INTEGER NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES nic_cc_customer(id) ON DELETE SET NULL,
    
    -- Contact Information (Old Values)
    old_mobile VARCHAR(255) NULL,
    old_email VARCHAR(255) NULL,
    
    -- Contact Information (New Values)
    new_mobile VARCHAR(255) NULL,
    new_email VARCHAR(255) NULL,
    
    -- Amount Information
    old_amount DECIMAL(10,2) NULL,
    new_amount DECIMAL(10,2) NULL,
    
    -- Update Details
    update_reason TEXT NOT NULL,
    notes TEXT NULL,
    
    -- Agent Information
    agent_id INTEGER NOT NULL,
    agent_name VARCHAR(255) NOT NULL,
    
    -- Timestamps
    captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Sync Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    synced_at TIMESTAMP NULL,
    synced_by INTEGER NULL,
    
    -- Indexes for Performance
    INDEX idx_customer_id (customer_id),
    INDEX idx_status (status),
    INDEX idx_captured_at (captured_at),
    INDEX idx_agent_id (agent_id)
);
```

---

## JSON Schema (Xano Format)

```json
{
  "table_name": "customer_contact_updates",
  "fields": [
    {
      "name": "id",
      "type": "integer",
      "required": true,
      "auto_increment": true,
      "primary_key": true
    },
    {
      "name": "customer_id",
      "type": "relationship",
      "required": true,
      "related_table": "nic_cc_customer",
      "relationship_type": "many_to_one",
      "on_delete": "set_null"
    },
    {
      "name": "old_mobile",
      "type": "text",
      "required": false,
      "default": null
    },
    {
      "name": "new_mobile",
      "type": "text",
      "required": false,
      "default": null
    },
    {
      "name": "old_email",
      "type": "text",
      "required": false,
      "default": null
    },
    {
      "name": "new_email",
      "type": "text",
      "required": false,
      "default": null
    },
    {
      "name": "old_amount",
      "type": "decimal",
      "required": false,
      "default": null,
      "precision": "10,2"
    },
    {
      "name": "new_amount",
      "type": "decimal",
      "required": false,
      "default": null,
      "precision": "10,2"
    },
    {
      "name": "update_reason",
      "type": "text",
      "required": true
    },
    {
      "name": "notes",
      "type": "text",
      "required": false,
      "default": null
    },
    {
      "name": "agent_id",
      "type": "integer",
      "required": true
    },
    {
      "name": "agent_name",
      "type": "text",
      "required": true
    },
    {
      "name": "captured_at",
      "type": "timestamp",
      "required": true,
      "default": "now"
    },
    {
      "name": "status",
      "type": "text",
      "required": true,
      "default": "pending"
    },
    {
      "name": "synced_at",
      "type": "timestamp",
      "required": false,
      "default": null
    },
    {
      "name": "synced_by",
      "type": "integer",
      "required": false,
      "default": null
    }
  ],
  "indexes": [
    {
      "name": "idx_customer_id",
      "fields": ["customer_id"]
    },
    {
      "name": "idx_status",
      "fields": ["status"]
    },
    {
      "name": "idx_captured_at",
      "fields": ["captured_at"]
    },
    {
      "name": "idx_agent_id",
      "fields": ["agent_id"]
    }
  ]
}
```

---

## Xano Visual Setup Steps

Since Xano is a no-code platform, you need to create the table through the UI:

### Step 1: Create Table
1. Go to **Database** → **Add Table**
2. Name: `customer_contact_updates`
3. Click **Create**

### Step 2: Add Fields (in order)

```
1. id
   - Type: integer
   - Auto-increment: ✅
   - Required: ✅

2. customer_id
   - Type: relationship
   - Related table: nic_cc_customer
   - Relationship: Many-to-One
   - On Delete: Set Null
   - Required: ✅

3. old_mobile
   - Type: text
   - Required: ❌

4. new_mobile
   - Type: text
   - Required: ❌

5. old_email
   - Type: text
   - Required: ❌

6. new_email
   - Type: text
   - Required: ❌

7. old_amount
   - Type: decimal (10,2)
   - Required: ❌

8. new_amount
   - Type: decimal (10,2)
   - Required: ❌

9. update_reason
   - Type: text
   - Required: ✅

10. notes
   - Type: text
   - Required: ❌

9. agent_id
   - Type: integer
   - Required: ✅

10. agent_name
    - Type: text
    - Required: ✅

11. captured_at
    - Type: timestamp
    - Required: ✅
    - Default: now

12. status
    - Type: text
    - Required: ✅
    - Default: "pending"

13. synced_at
    - Type: timestamp
    - Required: ❌

14. synced_by
    - Type: integer
    - Required: ❌
```

### Step 3: Add Indexes (Optional but Recommended)

```
Index 1: customer_id
Index 2: status
Index 3: captured_at
Index 4: agent_id
```

---

## Quick Copy-Paste Checklist

Use this checklist while creating the table in Xano:

```
□ Table created: customer_contact_updates
□ Field 1: id (integer, auto-increment, required)
□ Field 2: customer_id (relationship to nic_cc_customer, required)
□ Field 3: old_mobile (text, optional)
□ Field 4: new_mobile (text, optional)
□ Field 5: old_email (text, optional)
□ Field 6: new_email (text, optional)
□ Field 7: old_amount (decimal 10,2, optional)
□ Field 8: new_amount (decimal 10,2, optional)
□ Field 9: update_reason (text, required)
□ Field 10: notes (text, optional)
□ Field 11: agent_id (integer, required)
□ Field 12: agent_name (text, required)
□ Field 13: captured_at (timestamp, required, default: now)
□ Field 14: status (text, required, default: "pending")
□ Field 15: synced_at (timestamp, optional)
□ Field 16: synced_by (integer, optional)
□ Index on customer_id
□ Index on status
□ Index on captured_at
□ Index on agent_id
```

---

## Sample INSERT Statement (Reference)

```sql
INSERT INTO customer_contact_updates (
    customer_id,
    old_mobile,
    new_mobile,
    old_email,
    new_email,
    old_amount,
    new_amount,
    update_reason,
    notes,
    agent_id,
    agent_name,
    status
) VALUES (
    12345,                                    -- customer_id (from nic_cc_customer.id)
    '57372333',                               -- old_mobile
    '58123456',                               -- new_mobile
    'old@email.com',                          -- old_email
    'new@email.com',                          -- new_email
    4491.29,                                  -- old_amount
    4500.00,                                  -- new_amount
    'Contact and amount incorrect',           -- update_reason
    'Customer called to update contact info and amount', -- notes
    24,                                       -- agent_id
    'David Brown',                            -- agent_name
    'pending'                                 -- status
);
```

---

## Xano API Request Body (When Creating Record)

```json
{
  "customer_id": 12345,
  "old_mobile": "57372333",
  "new_mobile": "58123456",
  "old_email": "old@email.com",
  "new_email": "new@email.com",
  "old_amount": 4491.29,
  "new_amount": 4500.00,
  "update_reason": "Contact and amount incorrect",
  "notes": "Customer called to update contact info and amount",
  "agent_id": 24,
  "agent_name": "David Brown"
}
```

**Note**: `captured_at` and `status` are set automatically by defaults.

---

**Document Version**: 1.0  
**Last Updated**: November 28, 2024  
**Purpose**: SQL Reference for Xano Table Creation
