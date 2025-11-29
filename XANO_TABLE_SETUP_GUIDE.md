# Xano Table Setup Guide - Customer Contact Updates

**Table Name**: `customer_contact_updates`  
**Purpose**: Store customer contact information updates captured by agents  
**Date**: November 28, 2024

---

## 📋 Table Structure

### Field Configuration

| # | Field Name | Type | Required | Default | Notes |
|---|------------|------|----------|---------|-------|
| 1 | `id` | **int** | ✅ Yes | Auto-increment | Primary key |
| 2 | `customer_id` | **relationship** | ✅ Yes | - | Relationship to `nic_cc_customer` |
| 3 | `old_mobile` | **text** | ❌ No | null | Original mobile number |
| 4 | `new_mobile` | **text** | ❌ No | null | Updated mobile number |
| 5 | `old_email` | **text** | ❌ No | null | Original email address |
| 6 | `new_email` | **text** | ❌ No | null | Updated email address |
| 7 | `old_amount` | **decimal** | ❌ No | null | Original amount due |
| 8 | `new_amount` | **decimal** | ❌ No | null | Corrected amount due |
| 9 | `update_reason` | **text** | ✅ Yes | - | Reason for update |
| 10 | `notes` | **text** | ❌ No | null | Additional notes from agent |
| 11 | `agent_id` | **int** | ✅ Yes | - | Agent ID who captured update |
| 12 | `agent_name` | **text** | ✅ Yes | - | Agent name |
| 13 | `captured_at` | **timestamp** | ✅ Yes | now | When update was captured |
| 14 | `status` | **text** | ✅ Yes | "pending" | Update status |
| 15 | `synced_at` | **timestamp** | ❌ No | null | When synced to master system |
| 16 | `synced_by` | **int** | ❌ No | null | Admin ID who synced |

**Note**: `policy_number` and `customer_name` are not needed as separate fields since they can be accessed through the `customer_id` relationship.

---

## 🔧 Step-by-Step Xano Setup

### Step 1: Create Table

1. Go to your Xano workspace
2. Click **"Database"** in left sidebar
3. Click **"Add Table"** button
4. Enter table name: `customer_contact_updates`
5. Click **"Create"**

---

### Step 2: Add Fields

Add each field with the following settings:

**⚠️ Important Note on Relationships:**
- Field 2 (`customer_id`) should be a **relationship** field, not text
- This creates a foreign key to the `nic_cc_customer` table
- Ensures data integrity and enables better queries

#### Field 1: `id`
- **Type**: `int`
- **Required**: ✅ Yes
- **Unique**: ✅ Yes
- **Auto-increment**: ✅ Yes
- **Description**: Primary key

#### Field 2: `customer_id`
- **Type**: `relationship`
- **Required**: ✅ Yes
- **Related Table**: `nic_cc_customer`
- **Relationship Type**: Many-to-One (many updates can reference one customer)
- **On Delete**: Set Null (preserve audit trail even if customer deleted)
- **Description**: Reference to customer record

**How to Set Up Relationship in Xano:**
1. Click "Add Field"
2. Name: `customer_id`
3. Type: Select "Relationship"
4. Related Table: Select `nic_cc_customer`
5. Relationship: Select "Many customer_contact_updates to One nic_cc_customer"
6. On Delete: Select "Set Null" (keeps update record even if customer deleted)
7. Required: Check ✅
8. Click "Save"

#### Field 3: `old_mobile`
- **Type**: `text`
- **Required**: ❌ No
- **Default**: `null`
- **Description**: Original mobile number

#### Field 4: `new_mobile`
- **Type**: `text`
- **Required**: ❌ No
- **Default**: `null`
- **Description**: Updated mobile number

#### Field 5: `old_email`
- **Type**: `text`
- **Required**: ❌ No
- **Default**: `null`
- **Description**: Original email address

#### Field 6: `new_email`
- **Type**: `text`
- **Required**: ❌ No
- **Default**: `null`
- **Description**: Updated email address

#### Field 7: `old_amount`
- **Type**: `decimal`
- **Required**: ❌ No
- **Default**: `null`
- **Precision**: 10,2 (e.g., 4491.29)
- **Description**: Original amount due

#### Field 8: `new_amount`
- **Type**: `decimal`
- **Required**: ❌ No
- **Default**: `null`
- **Precision**: 10,2 (e.g., 4500.00)
- **Description**: Corrected amount due

#### Field 9: `update_reason`
- **Type**: `text`
- **Required**: ✅ Yes
- **Description**: Reason for update

#### Field 10: `notes`
- **Type**: `text`
- **Required**: ❌ No
- **Default**: `null`
- **Description**: Additional notes from agent

#### Field 11: `agent_id`
- **Type**: `int`
- **Required**: ✅ Yes
- **Description**: Agent ID who captured update

#### Field 12: `agent_name`
- **Type**: `text`
- **Required**: ✅ Yes
- **Description**: Agent name

#### Field 13: `captured_at`
- **Type**: `timestamp`
- **Required**: ✅ Yes
- **Default**: `now`
- **Description**: When update was captured

#### Field 14: `status`
- **Type**: `text`
- **Required**: ✅ Yes
- **Default**: `"pending"`
- **Description**: Update status (pending/synced)

#### Field 15: `synced_at`
- **Type**: `timestamp`
- **Required**: ❌ No
- **Default**: `null`
- **Description**: When synced to master system

#### Field 16: `synced_by`
- **Type**: `int`
- **Required**: ❌ No
- **Default**: `null`
- **Description**: Admin ID who synced

---

### Step 3: Add Indexes (Optional but Recommended)

For better query performance:

1. Click **"Indexes"** tab in table settings
2. Add these indexes:

**Index 1: customer_id**
- Field: `customer_id`
- Type: Standard
- Purpose: Fast customer lookups

**Index 2: policy_number**
- Field: `policy_number`
- Type: Standard
- Purpose: Fast policy lookups

**Index 3: status**
- Field: `status`
- Type: Standard
- Purpose: Fast filtering by status

**Index 4: captured_at**
- Field: `captured_at`
- Type: Standard
- Purpose: Fast date range queries

---

## 🔌 API Endpoints to Create

### Endpoint 1: Create Contact Update (POST)

**Name**: `add_contact_update`  
**Method**: POST  
**Path**: `/customer_contact_updates`

**Input Parameters**:
```json
{
  "customer_id": "text",
  "policy_number": "text",
  "customer_name": "text",
  "old_mobile": "text (optional)",
  "new_mobile": "text (optional)",
  "old_email": "text (optional)",
  "new_email": "text (optional)",
  "update_reason": "text",
  "notes": "text (optional)",
  "agent_id": "integer",
  "agent_name": "text"
}
```

**Function Stack**:
1. Add Record to `customer_contact_updates`
   - Set all input fields
   - Set `status` = "pending"
   - Set `captured_at` = now
2. Return the created record

---

### Endpoint 2: Get Latest Contact for Customer (GET)

**Name**: `get_latest_contact`  
**Method**: GET  
**Path**: `/customer_contact_updates/latest/{customer_id}`

**Input Parameters**:
- `customer_id` (path parameter)

**Function Stack**:
1. Query `customer_contact_updates`
   - Filter: `customer_id` = {customer_id}
   - Sort: `captured_at` DESC
   - Limit: 1
2. If found:
   - Return: `new_mobile`, `new_email`, `captured_at`, `agent_name`
3. If not found:
   - Return: null

---

### Endpoint 3: Get All Contact Updates (GET)

**Name**: `get_all_contact_updates`  
**Method**: GET  
**Path**: `/customer_contact_updates`

**Input Parameters** (all optional):
- `status` (query param) - Filter by status
- `agent_id` (query param) - Filter by agent
- `from_date` (query param) - Start date
- `to_date` (query param) - End date
- `search` (query param) - Search policy or customer name
- `page` (query param) - Page number (default: 1)
- `per_page` (query param) - Results per page (default: 50)

**Function Stack**:
1. Query `customer_contact_updates`
   - Apply filters if provided
   - Sort: `captured_at` DESC
   - Paginate: page, per_page
2. Return:
   - `total`: Total count
   - `page`: Current page
   - `per_page`: Results per page
   - `data`: Array of records

---

### Endpoint 4: Mark as Synced (PATCH)

**Name**: `mark_as_synced`  
**Method**: PATCH  
**Path**: `/customer_contact_updates/{id}/sync`

**Input Parameters**:
- `id` (path parameter)
- `synced_by` (body parameter) - Admin ID

**Function Stack**:
1. Get Record from `customer_contact_updates` where `id` = {id}
2. Update Record:
   - Set `status` = "synced"
   - Set `synced_at` = now
   - Set `synced_by` = {synced_by}
3. Return updated record

---

### Endpoint 5: Bulk Mark as Synced (POST)

**Name**: `bulk_mark_as_synced`  
**Method**: POST  
**Path**: `/customer_contact_updates/bulk-sync`

**Input Parameters**:
```json
{
  "update_ids": [1, 2, 3, 4, 5],
  "synced_by": 1
}
```

**Function Stack**:
1. Loop through `update_ids`
2. For each ID:
   - Get Record from `customer_contact_updates` where `id` = ID
   - Update Record:
     - Set `status` = "synced"
     - Set `synced_at` = now
     - Set `synced_by` = {synced_by}
3. Return:
   - `synced_count`: Number of records updated
   - `message`: Success message

---

## 📝 Sample Data for Testing

After creating the table, add this test record:

```json
{
  "customer_id": 12345,
  "old_mobile": "57372333",
  "new_mobile": "58123456",
  "old_email": "old@email.com",
  "new_email": "new@email.com",
  "old_amount": 4491.29,
  "new_amount": 4500.00,
  "update_reason": "Customer provided new contact and corrected amount",
  "notes": "Customer called to update contact info and amount",
  "agent_id": 24,
  "agent_name": "David Brown"
}
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Table `customer_contact_updates` created
- [ ] All 16 fields added with correct types
- [ ] `id` field is auto-increment
- [ ] `captured_at` has default value `now`
- [ ] `status` has default value `"pending"`
- [ ] Indexes created (optional but recommended)
- [ ] All 5 API endpoints created
- [ ] Test record inserted successfully
- [ ] Can query records via API
- [ ] Can update status to "synced"

---

## 🔗 API URLs Format

Once you create the endpoints, the URLs will be:

```
POST   https://xbde-ekcn-8kg2.n7e.xano.io/api:YOUR_API_KEY/customer_contact_updates
GET    https://xbde-ekcn-8kg2.n7e.xano.io/api:YOUR_API_KEY/customer_contact_updates/latest/{customer_id}
GET    https://xbde-ekcn-8kg2.n7e.xano.io/api:YOUR_API_KEY/customer_contact_updates
PATCH  https://xbde-ekcn-8kg2.n7e.xano.io/api:YOUR_API_KEY/customer_contact_updates/{id}/sync
POST   https://xbde-ekcn-8kg2.n7e.xano.io/api:YOUR_API_KEY/customer_contact_updates/bulk-sync
```

**Replace `YOUR_API_KEY` with your actual Xano API key.**

---

## 📞 Next Steps

After creating the table and endpoints in Xano:

1. **Test each endpoint** using Xano's built-in API tester
2. **Copy the API URLs** for each endpoint
3. **Share the URLs** with me in this format:

```
CREATE:      POST   https://xbde-ekcn-8kg2.n7e.xano.io/api:XXXXX/customer_contact_updates
GET_LATEST:  GET    https://xbde-ekcn-8kg2.n7e.xano.io/api:XXXXX/customer_contact_updates/latest/{customer_id}
GET_ALL:     GET    https://xbde-ekcn-8kg2.n7e.xano.io/api:XXXXX/customer_contact_updates
MARK_SYNCED: PATCH  https://xbde-ekcn-8kg2.n7e.xano.io/api:XXXXX/customer_contact_updates/{id}/sync
BULK_SYNC:   POST   https://xbde-ekcn-8kg2.n7e.xano.io/api:XXXXX/customer_contact_updates/bulk-sync
```

4. I'll then create the frontend service to integrate with these endpoints!

---

**Document Version**: 1.0  
**Last Updated**: November 28, 2024  
**Status**: Ready for Xano Setup
