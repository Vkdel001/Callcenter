# Actual Xano Table Structure - As Created

**Table Name**: `nic_customer_contact_updates`  
**Table ID**: #63  
**Date Created**: November 28, 2024

---

## 📊 Actual Field Structure

| # | Field Name | Type | Notes |
|---|------------|------|-------|
| 1 | `id` | integer | Auto-increment, Primary key |
| 2 | `created_at` | timestamp | Auto-added by Xano |
| 3 | `customer` | integer | Relationship to `nic_cc_customer` |
| 4 | `old_mobile` | text | Original mobile number |
| 5 | `old_email` | email | Original email (email type, not text) |
| 6 | `new_mobile` | text | Updated mobile number |
| 7 | `new_email` | email | Updated email (email type, not text) |
| 8 | `old_amount` | decimal | Original amount due |
| 9 | `new_amount` | decimal | Corrected amount due |
| 10 | `update_reason` | text | Reason for update |
| 11 | `notes` | text | Additional notes |
| 12 | `agent` | integer | Agent ID (not agent_id) |
| 13 | `agent_name` | text | Agent name |
| 14 | `captured_at` | timestamp | When update was captured |
| 15 | `status` | enum | Update status (enum, not text) |
| 16 | `synced_at` | timestamp | When synced to master |
| 17 | `synced_by` | integer | Admin ID who synced |

**Total Fields**: 17 (includes `created_at` auto-added by Xano)

---

## 🔄 Key Differences from Documentation

### 1. Table Name
- **Documented**: `customer_contact_updates`
- **Actual**: `nic_customer_contact_updates`
- **Impact**: Update all API endpoint references

### 2. Field Names
- **Documented**: `customer_id` → **Actual**: `customer`
- **Documented**: `agent_id` → **Actual**: `agent`
- **Impact**: Update all API request/response examples

### 3. Field Types
- **Email fields**: Using `email` type instead of `text` (better validation)
- **Status field**: Using `enum` instead of `text` (better data integrity)

### 4. Extra Field
- **`created_at`**: Auto-added by Xano (standard practice)

---

## 📝 Field Mapping for Code

When writing frontend code, use these field names:

```javascript
// API Request Body
{
  customer: 12345,           // NOT customer_id
  old_mobile: "57372333",
  old_email: "old@email.com",
  new_mobile: "58123456",
  new_email: "new@email.com",
  old_amount: 4491.29,
  new_amount: 4500.00,
  update_reason: "Contact and amount incorrect",
  notes: "Customer called",
  agent: 24,                 // NOT agent_id
  agent_name: "David Brown"
}
```

```javascript
// API Response
{
  id: 1,
  created_at: "2024-11-28T10:30:00Z",  // Auto-added by Xano
  customer: {
    id: 12345,
    policy_number: "LIB/C7013",
    name: "Kevin Anderson",
    // ... other customer fields
  },
  old_mobile: "57372333",
  old_email: "old@email.com",
  new_mobile: "58123456",
  new_email: "new@email.com",
  old_amount: 4491.29,
  new_amount: 4500.00,
  update_reason: "Contact and amount incorrect",
  notes: "Customer called",
  agent: 24,
  agent_name: "David Brown",
  captured_at: "2024-11-28T10:30:00Z",
  status: "pending",
  synced_at: null,
  synced_by: null
}
```

---

## 🎯 Status Enum Values

Since `status` is an enum, you need to define the allowed values in Xano:

**Recommended Enum Values**:
- `pending` (default)
- `synced`
- `rejected` (for future use)

Make sure these are configured in Xano's enum settings for the `status` field.

---

## 🔌 API Endpoint URLs

Based on table name `nic_customer_contact_updates`:

```
POST   /nic_customer_contact_updates
GET    /nic_customer_contact_updates/latest/{customer_id}
GET    /nic_customer_contact_updates
PATCH  /nic_customer_contact_updates/{id}/sync
POST   /nic_customer_contact_updates/bulk-sync
```

---

## ✅ What to Share

Please provide these API endpoint URLs:

```
CREATE:      POST   https://xbde-ekcn-8kg2.n7e.xano.io/api:XXXXX/nic_customer_contact_updates
GET_LATEST:  GET    https://xbde-ekcn-8kg2.n7e.xano.io/api:XXXXX/nic_customer_contact_updates/latest/{customer_id}
GET_ALL:     GET    https://xbde-ekcn-8kg2.n7e.xano.io/api:XXXXX/nic_customer_contact_updates
MARK_SYNCED: PATCH  https://xbde-ekcn-8kg2.n7e.xano.io/api:XXXXX/nic_customer_contact_updates/{id}/sync
BULK_SYNC:   POST   https://xbde-ekcn-8kg2.n7e.xano.io/api:XXXXX/nic_customer_contact_updates/bulk-sync
```

Replace `XXXXX` with your actual API key.

---

## 📋 Quick Reference for Development

### Field Names (Use These in Code)
```
✅ customer (not customer_id)
✅ agent (not agent_id)
✅ old_email (email type)
✅ new_email (email type)
✅ status (enum type)
✅ created_at (auto-added)
```

### Required Fields
```
✅ customer
✅ update_reason
✅ agent
✅ agent_name
```

### Optional Fields
```
❌ old_mobile
❌ new_mobile
❌ old_email
❌ new_email
❌ old_amount
❌ new_amount
❌ notes
❌ synced_at
❌ synced_by
```

### Auto-Set Fields
```
🤖 id (auto-increment)
🤖 created_at (auto-set by Xano)
🤖 captured_at (default: now)
🤖 status (default: "pending")
```

---

**Document Version**: 1.0  
**Last Updated**: November 28, 2024  
**Status**: Actual Production Table Structure
