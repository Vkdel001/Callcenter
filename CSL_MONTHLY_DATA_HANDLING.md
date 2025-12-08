# CSL Monthly Data Handling Strategy

## Problem Statement

CSL receives monthly arrears data where **the same policy number can appear in multiple months** if the customer continues to have outstanding dues.

**Example:**
- August 2025: Policy LIF/2024/12345 has MUR 15,000 arrears
- September 2025: Same policy LIF/2024/12345 now has MUR 20,000 arrears (still unpaid + new arrears)
- October 2025: Same policy LIF/2024/12345 now has MUR 25,000 arrears

**Challenge:** How do we handle this without creating duplicate policies or losing historical data?

---

## Recommended Solution: Update Strategy with History Tracking

### Approach: **Update Existing Policy + Track Changes**

When admin uploads new monthly data:
1. **Check if policy exists** (by policy_number)
2. **If exists:** Update the policy with new data
3. **If new:** Create new policy record
4. **Track changes:** Log what changed in a history table

---

## Database Structure

### Table 1: csl_policies (Current State)

**Purpose:** Always contains the LATEST data for each policy

```sql
CREATE TABLE csl_policies (
  id SERIAL PRIMARY KEY,
  policy_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Financial data (updated monthly)
  arrears_amount DECIMAL(10,2),
  installments_in_arrears INTEGER,
  real_nx_premium DECIMAL(10,2),
  
  -- Policy data (rarely changes)
  policy_status VARCHAR(50),
  owner1_first_name VARCHAR(100),
  owner1_surname VARCHAR(100),
  -- ... other fields
  
  -- Tracking
  data_as_of_date DATE, -- NEW: Which month's data is this?
  last_updated_at TIMESTAMP,
  last_upload_id INTEGER -- NEW: Link to upload batch
);
```

### Table 2: csl_policy_history (Historical Snapshots)

**Purpose:** Track how policy data changes over time

```sql
CREATE TABLE csl_policy_history (
  id SERIAL PRIMARY KEY,
  csl_policy_id INTEGER NOT NULL,
  
  -- Snapshot of data at this point in time
  data_as_of_date DATE NOT NULL,
  arrears_amount DECIMAL(10,2),
  installments_in_arrears INTEGER,
  policy_status VARCHAR(50),
  
  -- What changed?
  changes_json JSONB, -- Stores what fields changed
  
  -- Upload tracking
  upload_id INTEGER,
  uploaded_by_admin_id INTEGER,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (csl_policy_id) REFERENCES csl_policies(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by_admin_id) REFERENCES users(id)
);

CREATE INDEX idx_csl_history_policy_id ON csl_policy_history(csl_policy_id);
CREATE INDEX idx_csl_history_date ON csl_policy_history(data_as_of_date);
```

### Table 3: csl_uploads (Upload Batches)

**Purpose:** Track each monthly upload

```sql
CREATE TABLE csl_uploads (
  id SERIAL PRIMARY KEY,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_as_of_date DATE NOT NULL, -- Which month's data (e.g., "2025-08-31")
  file_name VARCHAR(200),
  total_records INTEGER,
  new_policies INTEGER,
  updated_policies INTEGER,
  uploaded_by_admin_id INTEGER NOT NULL,
  
  FOREIGN KEY (uploaded_by_admin_id) REFERENCES users(id)
);
```

---

## Upload Logic Flow

### Step 1: Admin Uploads CSV

```javascript
// Admin selects CSV file
// Admin specifies: "Data as of: August 31, 2025"

const uploadData = {
  file: csvFile,
  dataAsOfDate: '2025-08-31'
}
```

### Step 2: Process Each Row

```javascript
async function processCSVRow(row, uploadId, dataAsOfDate) {
  const policyNumber = row['Policy No']
  
  // 1. Check if policy exists
  const existingPolicy = await db.query(
    'SELECT * FROM csl_policies WHERE policy_number = ?',
    [policyNumber]
  )
  
  if (existingPolicy) {
    // POLICY EXISTS - UPDATE IT
    
    // 2. Save current state to history before updating
    await db.query(`
      INSERT INTO csl_policy_history (
        csl_policy_id,
        data_as_of_date,
        arrears_amount,
        installments_in_arrears,
        policy_status,
        changes_json,
        upload_id,
        uploaded_by_admin_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      existingPolicy.id,
      existingPolicy.data_as_of_date, // OLD date
      existingPolicy.arrears_amount,   // OLD amount
      existingPolicy.installments_in_arrears,
      existingPolicy.policy_status,
      calculateChanges(existingPolicy, row), // What changed?
      uploadId,
      adminId
    ])
    
    // 3. Update policy with new data
    await db.query(`
      UPDATE csl_policies SET
        arrears_amount = ?,
        installments_in_arrears = ?,
        policy_status = ?,
        data_as_of_date = ?,
        last_updated_at = NOW(),
        last_upload_id = ?
      WHERE id = ?
    `, [
      row['Arrears Amount'],
      row['No of Instalments in Arrears'],
      row['Policy Status'],
      dataAsOfDate, // NEW date
      uploadId,
      existingPolicy.id
    ])
    
    return { action: 'updated' }
    
  } else {
    // NEW POLICY - INSERT IT
    
    await db.query(`
      INSERT INTO csl_policies (
        policy_number,
        arrears_amount,
        installments_in_arrears,
        policy_status,
        owner1_first_name,
        owner1_surname,
        -- ... all other fields
        data_as_of_date,
        last_upload_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      policyNumber,
      row['Arrears Amount'],
      row['No of Instalments in Arrears'],
      row['Policy Status'],
      row['Owner 1 First Name'],
      row['Owner 1 Surname'],
      // ... all other values
      dataAsOfDate,
      uploadId
    ])
    
    return { action: 'created' }
  }
}

function calculateChanges(oldData, newData) {
  const changes = {}
  
  if (oldData.arrears_amount !== newData['Arrears Amount']) {
    changes.arrears_amount = {
      from: oldData.arrears_amount,
      to: newData['Arrears Amount']
    }
  }
  
  if (oldData.installments_in_arrears !== newData['No of Instalments in Arrears']) {
    changes.installments_in_arrears = {
      from: oldData.installments_in_arrears,
      to: newData['No of Instalments in Arrears']
    }
  }
  
  // ... check other fields
  
  return changes
}
```

### Step 3: Upload Summary

```javascript
// After processing all rows
const summary = {
  totalRecords: 1250,
  newPolicies: 45,
  updatedPolicies: 1205,
  dataAsOfDate: '2025-08-31'
}

// Save to csl_uploads table
await db.query(`
  INSERT INTO csl_uploads (
    data_as_of_date,
    file_name,
    total_records,
    new_policies,
    updated_policies,
    uploaded_by_admin_id
  ) VALUES (?, ?, ?, ?, ?, ?)
`, [
  summary.dataAsOfDate,
  'CSL_Arrears_August_2025.csv',
  summary.totalRecords,
  summary.newPolicies,
  summary.updatedPolicies,
  adminId
])
```

---

## Benefits of This Approach

### ✅ Advantages

1. **No Duplicates** - Each policy_number appears only once in csl_policies
2. **Always Current** - csl_policies always has latest data
3. **Historical Tracking** - csl_policy_history preserves all changes
4. **Trend Analysis** - Can see how arrears increased/decreased over time
5. **Audit Trail** - Know when and by whom data was updated
6. **Simple Queries** - Agents always query csl_policies for current state

---

## UI Implications

### CSL Dashboard

**Shows current data only:**
```sql
SELECT * FROM csl_policies 
WHERE assigned_to_agent_id = ?
ORDER BY arrears_amount DESC
```

### CSL Policy Detail - History Tab

**Shows historical changes:**
```sql
SELECT 
  h.data_as_of_date,
  h.arrears_amount,
  h.installments_in_arrears,
  h.changes_json,
  u.name as uploaded_by
FROM csl_policy_history h
JOIN users u ON u.id = h.uploaded_by_admin_id
WHERE h.csl_policy_id = ?
ORDER BY h.data_as_of_date DESC
```

**Display:**
```
┌──────────────────────────────────────────────────────────┐
│  📊 ARREARS HISTORY                                       │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  Current (Oct 2025): MUR 25,000 | 10 months overdue      │
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Sep 2025: MUR 20,000 | 8 months overdue            │  │
│  │ ↑ Increased by MUR 5,000                           │  │
│  │ Uploaded by: Admin User on 01/10/2025             │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Aug 2025: MUR 15,000 | 6 months overdue            │  │
│  │ ↑ Increased by MUR 5,000                           │  │
│  │ Uploaded by: Admin User on 01/09/2025             │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
│  [View Full History]                                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Admin Upload UI

### Upload Page Enhancement

```
┌─────────────────────────────────────────────────────────┐
│  📤 UPLOAD CSL MONTHLY DATA                              │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Data As Of Date *                                       │
│  ┌────────────────────────────────────────────────┐     │
│  │ August 31, 2025                              ▼ │     │
│  └────────────────────────────────────────────────┘     │
│  💡 Select the month-end date for this data             │
│                                                           │
│  Upload CSV File *                                       │
│  ┌────────────────────────────────────────────────┐     │
│  │ [Choose File] CSL_Arrears_August_2025.csv     │     │
│  └────────────────────────────────────────────────┘     │
│                                                           │
│  Upload Strategy                                         │
│  ● Update existing policies with new data               │
│  ○ Create new records only (skip existing)              │
│                                                           │
│  [Cancel]                              [Upload Data]     │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Upload Results

```
┌─────────────────────────────────────────────────────────┐
│  ✅ UPLOAD COMPLETE                                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Data As Of: August 31, 2025                            │
│  File: CSL_Arrears_August_2025.csv                      │
│  Uploaded: 01/09/2025 10:30 AM                          │
│                                                           │
│  📊 Summary:                                             │
│  • Total Records: 1,250                                  │
│  • New Policies: 45                                      │
│  • Updated Policies: 1,205                               │
│  • Errors: 0                                             │
│                                                           │
│  [View Upload History] [Download Report]                │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Alternative Approach: Keep All Monthly Records

### If you want to keep separate records for each month:

```sql
-- Add month field to make policy_number + month unique
CREATE TABLE csl_policies (
  id SERIAL PRIMARY KEY,
  policy_number VARCHAR(50) NOT NULL,
  data_as_of_date DATE NOT NULL,
  -- ... all other fields
  
  -- Unique constraint on policy + month
  UNIQUE(policy_number, data_as_of_date)
);
```

**Pros:**
- Simple - just insert new records each month
- Complete historical data in main table

**Cons:**
- Duplicate policy data (owner info repeated every month)
- Queries more complex (need to filter by latest date)
- More storage space
- Harder to see "current" state

**Verdict:** ❌ Not recommended - Use update strategy instead

---

## Query Examples

### Get Current Policy State
```sql
SELECT * FROM csl_policies 
WHERE policy_number = 'LIF/2024/12345'
```

### Get Policy History
```sql
SELECT 
  data_as_of_date,
  arrears_amount,
  installments_in_arrears,
  changes_json
FROM csl_policy_history
WHERE csl_policy_id = (
  SELECT id FROM csl_policies WHERE policy_number = 'LIF/2024/12345'
)
ORDER BY data_as_of_date DESC
```

### Get Policies with Increasing Arrears
```sql
SELECT 
  p.policy_number,
  p.owner1_first_name,
  p.owner1_surname,
  p.arrears_amount as current_arrears,
  h.arrears_amount as previous_arrears,
  (p.arrears_amount - h.arrears_amount) as increase
FROM csl_policies p
JOIN csl_policy_history h ON h.csl_policy_id = p.id
WHERE h.data_as_of_date = (
  SELECT MAX(data_as_of_date) 
  FROM csl_policy_history 
  WHERE csl_policy_id = p.id
)
AND p.arrears_amount > h.arrears_amount
ORDER BY increase DESC
```

### Get Upload History
```sql
SELECT 
  upload_date,
  data_as_of_date,
  file_name,
  total_records,
  new_policies,
  updated_policies,
  u.name as uploaded_by
FROM csl_uploads cu
JOIN users u ON u.id = cu.uploaded_by_admin_id
ORDER BY upload_date DESC
```

---

## Implementation Summary

### Database Changes Needed

1. **Add to csl_policies:**
   - `data_as_of_date DATE`
   - `last_upload_id INTEGER`

2. **Create new table:**
   - `csl_policy_history`

3. **Create new table:**
   - `csl_uploads`

### Upload Logic

1. Admin specifies "Data as of" date
2. For each CSV row:
   - Check if policy exists
   - If exists: Save to history, then update
   - If new: Insert new record
3. Save upload summary

### UI Changes

1. **Admin Upload Page:**
   - Add "Data as of" date picker
   - Show upload summary

2. **CSL Policy Detail:**
   - Add "History" tab
   - Show arrears trend over time

---

## Recommendation

**Use the UPDATE strategy with history tracking:**

✅ Clean data structure  
✅ Always shows current state  
✅ Preserves history  
✅ Easy to query  
✅ Supports trend analysis  
✅ Audit trail included  

This approach handles monthly uploads elegantly without duplicates while maintaining complete historical data.

---

**Document Version:** 1.0  
**Last Updated:** December 6, 2025  
**Status:** Ready for Implementation
