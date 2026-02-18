# Webhook Security - Public Endpoint Implementation

**Date**: January 17, 2026  
**Status**: 📋 Ready for Implementation  
**Priority**: HIGH - Security Enhancement

---

## Problem Statement

**Current Risk:**
- Webhook calls `GET /nic_cc_customer` to search by policy number
- This endpoint returns ALL 27,817 customer records (18.7 MB)
- If we enable authentication, webhook will break (401 Unauthorized)
- If we keep it public, entire database is exposed

**Solution:**
Create a new PUBLIC endpoint that only returns records matching a specific policy number, limiting exposure to 1 record at a time.

---

## Implementation Plan

### Step 1: Create New Public Endpoint in Xano

**Endpoint Details:**
- **Name**: `get_customer_by_policy`
- **Path**: `/get_customer_by_policy`
- **Method**: GET
- **API Group**: `api:Q4jDYUWL` (Customer API)
- **Authentication**: None (PUBLIC)
- **Purpose**: Allow webhook to search by policy number without exposing entire database

---

### Step 2: Xano Endpoint Configuration

**In Xano UI:**

1. Go to API Group: `api:Q4jDYUWL` (Customer API)
2. Click "Add Endpoint"
3. Configure as follows:

```
Endpoint Name: get_customer_by_policy
HTTP Method: GET
Path: /get_customer_by_policy
Authentication: None (PUBLIC)
```

**Input Parameters:**
```javascript
input {
  text policy_number (required)
    filters: trim
    description: "Policy number to search for (e.g., L/12345/2024)"
}
```

**Function Stack:**
```javascript
stack {
  // Query customers matching the policy number
  db.query nic_cc_customer {
    where = $db.nic_cc_customer.policy_number == $input.policy_number
  } as $customers
  
  // Optional: Log access for security monitoring
  // db.insert access_log {
  //   endpoint = "get_customer_by_policy"
  //   policy_number = $input.policy_number
  //   timestamp = now()
  //   ip_address = $request.ip
  // }
}

response = $customers
```

**Response Format:**
```json
[
  {
    "id": 123,
    "policy_number": "L/12345/2024",
    "name": "John Doe",
    "amount_due": 5000,
    "status": "active",
    ...
  }
]
```

---

### Step 3: Enable Authentication on Existing Endpoint

**In Xano UI:**

1. Go to endpoint: `GET /nic_cc_customer`
2. Change Authentication from "None" to "nic_cc_agent"
3. Save

**This secures:**
- ✅ Frontend can still get all customers (has JWT token)
- ❌ Public access to all customers is blocked

---

### Step 4: Update Railway Webhook Code

**File**: `webhookcode-final.cjs`

**Current Code (Line 119):**
```javascript
const customersResponse = await axios.get(
  `${XANO_BASE_URL}/api:${XANO_CUSTOMER_API_KEY}/nic_cc_customer`
);
```

**New Code:**
```javascript
const customersResponse = await axios.get(
  `${XANO_BASE_URL}/api:${XANO_CUSTOMER_API_KEY}/get_customer_by_policy`,
  {
    params: {
      policy_number: originalPolicyNumber
    }
  }
);
```

**Changes:**
- ✅ Uses new public endpoint
- ✅ Passes policy_number as query parameter
- ✅ Returns only matching records (not all 27,817)
- ✅ No authentication needed

---

## Security Comparison

| Scenario | Before | After |
|----------|--------|-------|
| **Public access, no filter** | 27,817 records | ❌ 401 Unauthorized |
| **Public access, with policy#** | 27,817 records | ✅ 1 record only |
| **Authenticated, no filter** | 27,817 records | ✅ 27,817 records |
| **Webhook access** | ✅ Works | ✅ Works |
| **Data exposure risk** | 🔴 HIGH (18.7 MB) | 🟢 LOW (~1 KB) |
| **Enumeration risk** | 🔴 HIGH | 🟡 MEDIUM* |

*Attacker would need to know exact policy number format and enumerate one-by-one (much harder than getting all at once)

---

## Testing Plan

### Test 1: New Public Endpoint Works

**In Browser Console:**
```javascript
fetch('https://xbde-ekcn-8kg2.n7e.xano.io/api:Q4jDYUWL/get_customer_by_policy?policy_number=L/12345/2024')
  .then(r => r.json())
  .then(d => {
    console.log('✅ Found customers:', d.length);
    console.log('Data:', d);
  });
```

**Expected**: Returns only customers with that policy number

---

### Test 2: Old Endpoint Requires Auth

**In Browser Console:**
```javascript
fetch('https://xbde-ekcn-8kg2.n7e.xano.io/api:Q4jDYUWL/nic_cc_customer')
  .then(r => r.json())
  .then(d => {
    if (d.code === 'ERROR_CODE_UNAUTHORIZED') {
      console.log('✅ Endpoint is secured!');
    } else {
      console.log('❌ Endpoint is still public!');
    }
  });
```

**Expected**: 401 Unauthorized error

---

### Test 3: Frontend Still Works

**In Browser Console (after login):**
```javascript
const token = localStorage.getItem('auth_token');

fetch('https://xbde-ekcn-8kg2.n7e.xano.io/api:Q4jDYUWL/nic_cc_customer', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
  .then(r => r.json())
  .then(d => {
    console.log('✅ Frontend can still access:', d.length, 'customers');
  });
```

**Expected**: Returns all customers (frontend has JWT token)

---

### Test 4: Webhook Still Works

**Test payment callback:**
1. Make a test payment via ZwennPay
2. Check Railway webhook logs
3. Verify customer record is updated

**Expected**: Payment confirmation works, customer balance updates

---

## Deployment Checklist

### Phase 1: Create New Endpoint (No Breaking Changes)
- [ ] Create `/get_customer_by_policy` endpoint in Xano
- [ ] Set authentication to "None" (PUBLIC)
- [ ] Add `policy_number` input parameter (required)
- [ ] Add query logic to filter by policy number
- [ ] Test endpoint returns correct data
- [ ] Test endpoint with invalid policy number (returns empty array)

### Phase 2: Update Webhook Code
- [ ] Update `webhookcode-final.cjs` line 119
- [ ] Change endpoint from `/nic_cc_customer` to `/get_customer_by_policy`
- [ ] Add `params: { policy_number: originalPolicyNumber }`
- [ ] Test webhook locally
- [ ] Deploy to Railway
- [ ] Test with real payment

### Phase 3: Secure Old Endpoint
- [ ] Enable `nic_cc_agent` authentication on `/nic_cc_customer`
- [ ] Test frontend still works (has JWT token)
- [ ] Test public access is blocked (401 error)
- [ ] Verify webhook still works (uses new endpoint)

### Phase 4: Verification
- [ ] Run all 4 security tests above
- [ ] Monitor Railway logs for errors
- [ ] Test payment flow end-to-end
- [ ] Verify customer balances update correctly

---

## Rollback Plan

**If webhook breaks:**

1. **Immediate Fix (Xano):**
   - Go to `/nic_cc_customer` endpoint
   - Change authentication back to "None"
   - Webhook will work again

2. **Debug:**
   - Check Railway logs for errors
   - Verify new endpoint URL is correct
   - Verify policy_number parameter is passed correctly

3. **Permanent Fix:**
   - Fix webhook code issue
   - Re-enable authentication on old endpoint

---

## Future Enhancements (Optional)

### 1. Rate Limiting
**In Xano:**
- Limit `/get_customer_by_policy` to 10 requests/minute per IP
- Prevents mass enumeration attacks
- Webhook only needs 1-2 requests per payment

### 2. Access Logging
**In Xano:**
- Log all calls to `/get_customer_by_policy`
- Track: timestamp, IP, policy_number, result
- Monitor for suspicious patterns

### 3. Webhook Signature Verification
**Later:**
- Add ZwennPay signature verification
- Reject requests without valid signature
- Even more secure than public endpoint

---

## Summary

**What This Achieves:**
- ✅ Secures 99.9% of customer data (27,816 out of 27,817 records)
- ✅ Webhook continues working without code changes initially
- ✅ Frontend continues working (has JWT tokens)
- ✅ No breaking changes during implementation
- ✅ Easy to rollback if needed

**Security Improvement:**
- Before: Anyone can download entire database (18.7 MB, 27,817 records)
- After: Anyone can only get 1 record at a time IF they know exact policy number

**Risk Reduction:**
- 🔴 HIGH → 🟢 LOW

---

## Files Modified

**Xano:**
- New endpoint: `/get_customer_by_policy` (PUBLIC)
- Modified endpoint: `/nic_cc_customer` (add authentication)

**Railway Webhook:**
- `webhookcode-final.cjs` (line 119)

**Frontend:**
- No changes needed (already uses JWT tokens)

---

## Questions?

Contact the development team if you need help with:
- Creating the Xano endpoint
- Testing the webhook
- Deploying to Railway
- Verifying security

---

**Status**: Ready for implementation  
**Estimated Time**: 30 minutes  
**Risk Level**: LOW (easy rollback)  
**Impact**: HIGH (major security improvement)
