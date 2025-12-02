# CSV Upload Upsert Feature

## Overview
The CSV upload system now supports **upsert** (update or insert) functionality based on the combination of `policy_number` + `assigned_month`.

## How It Works

### Unique Key
The system uses a composite key to identify unique customer records:
```
Unique Key = policy_number + assigned_month
```

### Examples

#### Scenario 1: New Policy for New Month
```csv
policy_number,assigned_month,amount_due
LIFE-001,Nov-25,5000
```
**Result:** ✅ Creates new record

#### Scenario 2: Same Policy, Same Month (Update)
```csv
policy_number,assigned_month,amount_due
LIFE-001,Nov-25,6000
```
**Result:** ✅ Updates existing record (amount changes from 5000 to 6000)

#### Scenario 3: Same Policy, Different Month
```csv
policy_number,assigned_month,amount_due
LIFE-001,Dec-25,5500
```
**Result:** ✅ Creates new record (different month)

## Benefits

### 1. **Data Refresh**
- Upload the same month's data multiple times
- Latest data always overwrites old data
- No need to manually delete old records

### 2. **Corrections**
- Fix errors in previously uploaded data
- Update customer contact information
- Adjust amounts due

### 3. **Monthly Updates**
- Same policy can exist for multiple months
- Each month is treated as a separate record
- Historical data is preserved

## Update Behavior

### What Gets Updated
When a duplicate `policy_number + assigned_month` is found:
- ✅ All customer fields are updated
- ✅ `update_count` is incremented
- ✅ `last_updated` timestamp is set

### Special Handling
**Contact Information Changes:**
If email or mobile number changes:
- Assignment is reset to `'available'`
- `assigned_agent` is cleared
- Reason: Contact change may require re-verification

### What Stays the Same
- Record ID remains unchanged
- Creation timestamp preserved
- Call logs and history maintained

## Technical Implementation

### Before (Old Logic)
```javascript
// Only checked policy_number
const existingPolicyMap = new Map(
  existingCustomers.map(customer => [customer.policy_number, customer])
)
```
**Problem:** Same policy couldn't exist for different months

### After (New Logic)
```javascript
// Checks policy_number + assigned_month
const existingPolicyMonthMap = new Map(
  existingCustomers.map(customer => {
    const key = `${customer.policy_number}|${customer.assigned_month || 'Unknown'}`
    return [key, customer]
  })
)
```
**Solution:** Same policy can exist for multiple months

## Upload Results

### Success Messages
```
✅ 150 customers uploaded successfully
   - 100 created (new records)
   - 50 updated (existing records)
```

### Update Tracking
Each updated record shows:
- `update_count`: Number of times updated
- `last_updated`: Timestamp of last update

## Use Cases

### Monthly Data Refresh
```bash
# November data
Upload: customers-nov-2025.csv
Result: 2000 created

# November data correction (same file, updated amounts)
Upload: customers-nov-2025-corrected.csv
Result: 2000 updated

# December data (same policies, new month)
Upload: customers-dec-2025.csv
Result: 2000 created
```

### Incremental Updates
```bash
# Initial upload
Upload: batch-1.csv (1000 customers)
Result: 1000 created

# Add more customers
Upload: batch-2.csv (500 customers)
Result: 500 created

# Fix errors in batch-1
Upload: batch-1-corrected.csv (1000 customers)
Result: 1000 updated
```

## Data Integrity

### Prevents
- ❌ Duplicate policy+month combinations
- ❌ Data inconsistency
- ❌ Orphaned records

### Allows
- ✅ Same policy across different months
- ✅ Data corrections and updates
- ✅ Incremental data loading

## Admin Workflow

### Step 1: Prepare CSV
```csv
policy_number,name,mobile,email,amount_due,assigned_month,line_of_business
LIFE-001,John Doe,57111001,john@example.com,5000,Nov-25,life
LIFE-002,Jane Smith,57111002,jane@example.com,3500,Nov-25,life
```

### Step 2: Upload
1. Go to Admin → Customer Upload
2. Select CSV file
3. Click "Upload Customers"

### Step 3: Review Results
```
Upload Complete!
✅ 2 customers processed
   - 2 created
   - 0 updated
   - 0 failed
```

### Step 4: Re-upload (if needed)
- Same file with corrections
- System automatically updates existing records
- No duplicates created

## Error Handling

### Validation Still Applies
- Required fields must be present
- Email format must be valid
- Amount must be numeric
- LOB must match admin permissions

### Failed Records
- Shown in error report
- Can be corrected and re-uploaded
- Successful records are not rolled back

## Best Practices

### 1. **Use Consistent Month Format**
```csv
✅ Good: Nov-25, Dec-25, Jan-26
❌ Bad: 25-Nov, 2025-11, November-25
```

### 2. **Include All Required Fields**
Even when updating, include all fields to ensure data completeness

### 3. **Review Before Upload**
Check the preview to ensure data looks correct

### 4. **Monitor Update Count**
High update counts may indicate data quality issues

## Files Modified
- `src/pages/admin/CustomerUpload.jsx`

## Related Features
- Month format normalization (MONTH_FORMAT_FIX.md)
- LOB Dashboard pagination (PAGINATION_PERFORMANCE_FIX.md)

---
**Status:** ✅ Implemented and Ready for Testing
**Date:** December 2, 2024
