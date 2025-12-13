# CSV Upload UPSERT Analysis - Complete

## Executive Summary

**ANSWER:** ✅ **YES** - Both normal customer uploads and CSL customer uploads use UPSERT functionality, but with different composite key strategies.

## Normal Customer Upload UPSERT

### Location
`src/pages/admin/CustomerUpload.jsx`

### Composite Key Strategy
```javascript
const policyMonthKey = `${customer.policy_number}|${customer.assigned_month || 'Unknown'}`
```

### UPSERT Logic
```javascript
if (existingCustomer) {
  // UPDATE existing customer (same policy + same month)
  const updatePayload = { ...payload }
  updatePayload.update_count = (existingCustomer.update_count || 0) + 1
  updatePayload.last_updated = new Date().toISOString()
  
  // Reset assignment if contact changed
  if (contactChanged) {
    updatePayload.assignment_status = 'available'
    updatePayload.assigned_agent = null
  }
  
  await customerApi.patch(`/nic_cc_customer/${existingCustomer.id}`, updatePayload)
  results.updated++
} else {
  // CREATE new customer (new policy+month combination)
  await customerApi.post('/nic_cc_customer', payload)
  results.created++
}
```

### Key Features
- ✅ **Composite Key:** `policy_number + assigned_month`
- ✅ **Update Tracking:** Increments `update_count`, sets `last_updated`
- ✅ **Smart Assignment Reset:** Clears agent assignment if contact info changes
- ✅ **Monthly Separation:** Same policy can exist for different months
- ✅ **Batch Processing:** 50 records per batch with 500ms delay

## CSL Policy Upload UPSERT

### Location
`src/pages/admin/csl/CSLPolicyUpload.jsx`

### Composite Key Strategy
```javascript
// Pre-load existing policies for the specific month
const existingPolicies = await cslPolicyService.getPoliciesForMonth(calculatedDate)

// Create lookup map for O(1) access
const policyMap = new Map()
existingPolicies.forEach(p => {
  policyMap.set(p.policy_number, p)  // Key: policy_number only
})
```

### UPSERT Logic
```javascript
// Check if policy exists in our pre-loaded map (O(1) lookup!)
const existing = policyMap.get(cleanedPayload.policy_number)

let result
if (existing) {
  // UPDATE existing policy
  console.log(`✏️ Updating policy ${cleanedPayload.policy_number}`)
  result = await cslPolicyService.updatePolicy(existing.id, cleanedPayload)
  results.updated++
} else {
  // INSERT new policy
  console.log(`➕ Creating policy ${cleanedPayload.policy_number}`)
  result = await cslPolicyService.createPolicy(cleanedPayload)
  results.created++
}
```

### Key Features
- ✅ **Month-Specific UPSERT:** Only policies for the selected month are considered
- ✅ **Optimized Lookup:** Pre-loads existing policies into Map for O(1) access
- ✅ **Data Cleaning:** Removes null/empty values to prevent Xano errors
- ✅ **Email Validation:** Only includes valid email addresses
- ✅ **Batch Processing:** 50 records per batch with 100ms delay
- ✅ **Email Notifications:** Sends upload summary to admin

## CSL Policy Service UPSERT Methods

### Location
`src/services/csl/cslPolicyService.js`

### Core Methods
```javascript
// Get existing policies for a specific month
async getPoliciesForMonth(dataAsOfDate) {
  const response = await cslPolicyApi.get('/csl_policies')
  return response.data.filter(policy => 
    policy.data_as_of_date === dataAsOfDate
  )
}

// Create new policy
async createPolicy(policyData) {
  const response = await cslPolicyApi.post('/csl_policies', policyData)
  return response.data
}

// Update existing policy
async updatePolicy(id, policyData) {
  const response = await cslPolicyApi.patch(`/csl_policies/${id}`, policyData)
  return response.data
}
```

## Key Differences Between Implementations

| Aspect | Normal Customer Upload | CSL Policy Upload |
|--------|----------------------|-------------------|
| **Composite Key** | `policy_number + assigned_month` | `policy_number` (within specific month) |
| **Data Scope** | All customers across all months | Only policies for selected month |
| **Lookup Strategy** | Load all, filter by composite key | Pre-filter by month, lookup by policy |
| **Performance** | O(n) for large datasets | O(1) lookup with pre-filtering |
| **Update Tracking** | `update_count`, `last_updated` | Standard Xano timestamps |
| **Assignment Logic** | Resets agent if contact changes | No assignment logic |
| **Data Cleaning** | Text sanitization (accents) | Null/empty value removal |
| **Email Validation** | Basic @ check | Regex validation |
| **Notifications** | None | Email summary to admin |

## UPSERT Behavior Examples

### Normal Customer Upload
```csv
# Upload 1: November data
policy_number,assigned_month,amount_due
LIFE-001,Nov-25,5000
Result: ✅ Created

# Upload 2: Same policy, same month (correction)
policy_number,assigned_month,amount_due  
LIFE-001,Nov-25,6000
Result: ✅ Updated (amount: 5000 → 6000)

# Upload 3: Same policy, different month
policy_number,assigned_month,amount_due
LIFE-001,Dec-25,5500
Result: ✅ Created (new month record)
```

### CSL Policy Upload
```csv
# Upload 1: Select "November 2025" + upload data
policy_number,arrears_amount
CSL-001,2000
Result: ✅ Created (stored with data_as_of_date: 2025-11-30)

# Upload 2: Select "November 2025" again + upload corrections
policy_number,arrears_amount
CSL-001,2500
Result: ✅ Updated (amount: 2000 → 2500, same month)

# Upload 3: Select "December 2025" + upload same policy
policy_number,arrears_amount
CSL-001,1800
Result: ✅ Created (new month: 2025-12-31)
```

## Performance Optimizations

### Normal Customer Upload
- **Batch Processing:** 50 records per batch
- **Delay:** 500ms between batches
- **Memory:** Loads all existing customers into Map

### CSL Policy Upload  
- **Pre-filtering:** Only loads policies for target month
- **Faster Batching:** 100ms delay (vs 500ms)
- **O(1) Lookup:** Map-based policy lookup
- **Memory Efficient:** Only relevant month data in memory

## Data Integrity Features

### Both Systems
- ✅ **Validation:** Required fields checked before UPSERT
- ✅ **Error Handling:** Failed records logged, successful ones continue
- ✅ **Transaction Safety:** Individual record failures don't rollback batch
- ✅ **Progress Tracking:** Real-time upload progress display

### Normal Customer Only
- ✅ **LOB Restrictions:** Admin can only upload matching line_of_business
- ✅ **Contact Change Detection:** Resets assignments when email/mobile changes
- ✅ **Text Sanitization:** Removes accents and special characters

### CSL Policy Only
- ✅ **Date Calculation:** Auto-calculates month-end dates
- ✅ **Data Cleaning:** Removes null/empty values for Xano compatibility
- ✅ **Email Validation:** Strict email format checking
- ✅ **Admin Notifications:** Email summary with detailed results

## Recommendations

### Consistency Improvements
1. **Standardize Batch Delays:** Consider using same delay (100ms) for both
2. **Unified Progress Display:** Both use similar progress UI patterns ✅
3. **Error Reporting:** Both have comprehensive error tables ✅
4. **Update Tracking:** Consider adding update_count to CSL policies

### Performance Enhancements
1. **Normal Customer:** Consider pre-filtering by month like CSL
2. **CSL Policy:** Current optimization is excellent ✅
3. **Memory Usage:** Both systems handle large datasets well ✅

### Feature Parity
1. **Email Notifications:** Consider adding to normal customer uploads
2. **Data Cleaning:** Consider adding null removal to normal uploads
3. **Validation:** Both have appropriate validation for their domains ✅

## Conclusion

Both upload systems successfully implement UPSERT functionality with different but appropriate strategies:

- **Normal Customer Upload:** Uses `policy_number + assigned_month` composite key for cross-month policy management
- **CSL Policy Upload:** Uses month-specific `policy_number` key with optimized pre-filtering

The implementations are well-suited to their respective use cases and demonstrate good software engineering practices with proper error handling, progress tracking, and data validation.

---
**Analysis Date:** December 13, 2025  
**Status:** ✅ Complete - Both systems use UPSERT with appropriate strategies  
**Files Analyzed:** 
- `src/pages/admin/CustomerUpload.jsx`
- `src/pages/admin/csl/CSLPolicyUpload.jsx` 
- `src/services/csl/cslPolicyService.js`
- `CSV_UPSERT_FEATURE.md`