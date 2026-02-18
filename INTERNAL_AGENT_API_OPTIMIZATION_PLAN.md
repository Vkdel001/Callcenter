# Internal Agent API Optimization Plan

**Date:** January 22, 2026  
**Status:** Planning Phase - Awaiting Approval  
**Impact:** Performance improvement for Internal Agents (90-95% faster)

---

## Executive Summary

This document outlines a plan to optimize the API performance for Internal Agents by extending the existing `/get_nic_cc_customers` endpoint to support branch-based filtering. This will provide Internal Agents with the same 94.7% performance improvement currently enjoyed by Sales Agents.

---

## Background Context

### What's Already Been Done ✅

**Sales Agent Optimization (Completed - January 16, 2026)**:
- Created new Xano endpoint: `/get_nic_cc_customers?sales_agent_id={id}`
- Updated `customerService.js` to use server-side filtering
- **Result**: 94.7% faster (9.2s → 0.5s), 99.3% less data (18.7 MB → 128 KB)
- **Status**: Implemented and tested with Agent ID 2103 (190 customers)

**Internal Agent LOB Dashboard (Completed - December 11, 2025)**:
- Extended LOB Dashboard to support Internal Agents
- Added `getInternalAgentLOBSummary(branchId)` service method
- Added `getInternalAgentCustomersForLOBMonth(branchId, lob, month)` service method
- **Status**: Functional but still fetches all 27,817 customers from database

### The Problem

Internal Agents currently have the LOB Dashboard feature but **still suffer from the same performance issue** that Sales Agents had before optimization:

```javascript
// Current Internal Agent Implementation (SLOW)
async getInternalAgentLOBSummary(branchId) {
  const customersResponse = await customerApi.get('/nic_cc_customer')  // ❌ ALL 27,817 customers
  const allCustomers = customersResponse.data || []
  
  const branchCustomers = allCustomers.filter(customer => 
    customer.branch_id === parseInt(branchId)  // Client-side filtering
  )
  // ... rest of logic
}
```

**Impact**:
- Internal agents fetch 27,817 customers every time
- 18.7 MB data transfer per request
- 9+ seconds load time
- Poor user experience despite having the LOB Dashboard feature

---

## Current State Analysis

### Sales Agent (Optimized) ✅
- **Endpoint:** `/get_nic_cc_customers?sales_agent_id={id}`
- **Performance:** 484 ms response time
- **Data Transfer:** 128 KB (only agent's customers)
- **Status:** Optimized and deployed

### Internal Agent (Not Optimized) ❌
- **Endpoint:** `/nic_cc_customer` (fetches all customers)
- **Performance:** 9,176 ms response time
- **Data Transfer:** 18,678 KB (all 27,817 customers)
- **Status:** Needs optimization

### CSR Agent (Not Optimized) ❌
- **Endpoint:** `/nic_cc_customer` (fetches all customers)
- **Performance:** 9,176 ms response time
- **Data Transfer:** 18,678 KB (all 27,817 customers)
- **Status:** Needs optimization (future consideration)

---

## Proposed Solution

### Option 1: Extend Existing Endpoint (RECOMMENDED)

Extend the `/get_nic_cc_customers` endpoint to support branch-based filtering:

**New Query Parameter:**
```
GET /get_nic_cc_customers?branch_id={id}
```

**Example:**
```bash
GET https://xbde-ekcn-8kg2.n7e.xano.io/api:Q4jDYUWL/get_nic_cc_customers?branch_id=5
```

**Benefits:**
- ✅ Reuses existing endpoint architecture
- ✅ Consistent API design pattern
- ✅ Same 94.7% performance improvement as Sales Agents
- ✅ Minimal Xano configuration changes
- ✅ Easy to implement and test

**Xano Implementation:**
```javascript
// In Xano endpoint logic
if (query.sales_agent_id) {
  // Filter by sales_agent_id (existing)
  return nic_cc_customer.filter(c => c.sales_agent_id == query.sales_agent_id)
} else if (query.branch_id) {
  // Filter by branch_id (new)
  return nic_cc_customer.filter(c => c.branch_id == query.branch_id)
} else {
  // Return all (fallback for CSR agents)
  return nic_cc_customer
}
```

### Option 2: Create Separate Endpoint

Create a new endpoint specifically for branch filtering:

**New Endpoint:**
```
GET /get_branch_customers?branch_id={id}
```

**Benefits:**
- ✅ Clear separation of concerns
- ✅ Dedicated endpoint for branch operations

**Drawbacks:**
- ❌ More endpoints to maintain
- ❌ Duplicated logic
- ❌ Less consistent API design

**Recommendation:** Option 1 is preferred for consistency and maintainability.

---

## Expected Performance Improvement

### Current Performance (Internal Agent - Branch 5 Example)

Assuming Branch 5 has ~500 customers:

| Metric | Current (Unoptimized) |
|--------|----------------------|
| **Response Time** | 9,176 ms (9.2 seconds) |
| **Records Fetched** | 27,817 (all customers) |
| **Data Size** | 18,678 KB (18.7 MB) |
| **Client Filtering** | Required (27,817 → 500) |
| **Records Transferred** | 27,317 unnecessary records |

### Expected Performance (After Optimization)

| Metric | Expected (Optimized) | Improvement |
|--------|---------------------|-------------|
| **Response Time** | ~600-800 ms | **91-93% faster** ⚡ |
| **Records Fetched** | 500 (branch only) | **98.2% fewer** 📉 |
| **Data Size** | ~350 KB | **98.1% smaller** 💾 |
| **Client Filtering** | Not needed | **✅ Eliminated** |
| **Records Transferred** | 0 unnecessary | **100% efficient** |

**Estimated Performance:**
- Similar to Sales Agent optimization (94.7% improvement)
- Slightly slower due to larger branch datasets vs individual agent datasets
- Still massive improvement: 9.2s → 0.7s (92% faster)

### Real-World Impact

**Current Workflow** (3 API calls):
- Initial load: 9.2s
- LOB click: 9.2s
- Month click: 9.2s
- **Total: 27.6 seconds**
- **Data transferred: 56 MB**

**After Optimization** (3 API calls):
- Initial load: 0.7s
- LOB click: 0.7s
- Month click: 0.7s
- **Total: 2.1 seconds**
- **Data transferred: ~1 MB**

**Time Saved:** 25.5 seconds per workflow (92% faster)

---

## Implementation Plan

### Phase 1: Xano API Endpoint Extension

**Task:** Extend `/get_nic_cc_customers` endpoint to support `branch_id` parameter

**Xano Changes Required:**
1. Add `branch_id` as optional query parameter
2. Add conditional logic to filter by `branch_id` when provided
3. Maintain backward compatibility with `sales_agent_id` parameter
4. Test with sample branch IDs

**Estimated Time:** 30-60 minutes

**Testing:**
```bash
# Test with Branch 5
GET /get_nic_cc_customers?branch_id=5

# Verify Sales Agent still works
GET /get_nic_cc_customers?sales_agent_id=2103

# Test edge cases
GET /get_nic_cc_customers?branch_id=999  # Non-existent branch
GET /get_nic_cc_customers  # No parameters (should return all or error)
```

### Phase 2: Frontend Service Update

**File:** `src/services/customerService.js`

**Functions to Update:**

#### 1. `getInternalAgentLOBSummary(branchId)` - Line ~950

**Current Code (SLOW):**
```javascript
async getInternalAgentLOBSummary(branchId) {
  try {
    // ❌ Fetches ALL 27,817 customers
    const customersResponse = await customerApi.get('/nic_cc_customer')
    const allCustomers = customersResponse.data || []
    
    // Client-side filtering
    const branchCustomers = allCustomers.filter(customer => 
      customer.branch_id === parseInt(branchId)
    )
    
    // ... rest of logic
  }
}
```

**New Code (FAST):**
```javascript
async getInternalAgentLOBSummary(branchId) {
  try {
    // ✅ Fetches only branch customers (server-filtered)
    const customersResponse = await customerApi.get('/get_nic_cc_customers', {
      params: { branch_id: branchId }
    })
    
    const branchCustomers = customersResponse.data || []
    // No filtering needed - already filtered by server!
    
    // ... rest of logic (unchanged)
  }
}
```

#### 2. `getInternalAgentCustomersForLOBMonth(branchId, lob, month)` - Line ~1010

**Current Code (SLOW):**
```javascript
async getInternalAgentCustomersForLOBMonth(branchId, lob, month) {
  try {
    // ❌ Fetches ALL 27,817 customers
    const customersResponse = await customerApi.get('/nic_cc_customer')
    const allCustomers = customersResponse.data || []
    
    // Client-side filtering
    const filteredCustomers = allCustomers.filter(customer => 
      customer.branch_id === parseInt(branchId) &&
      customer.line_of_business === lob &&
      this.normalizeMonthFormat(customer.assigned_month) === month
    )
    
    // ... rest of logic
  }
}
```

**New Code (FAST):**
```javascript
async getInternalAgentCustomersForLOBMonth(branchId, lob, month) {
  try {
    // ✅ Fetches only branch customers (server-filtered)
    const customersResponse = await customerApi.get('/get_nic_cc_customers', {
      params: { branch_id: branchId }
    })
    
    const allCustomers = customersResponse.data || []
    
    // Only filter by LOB and month (much smaller dataset)
    const filteredCustomers = allCustomers.filter(customer => 
      customer.line_of_business === lob &&
      this.normalizeMonthFormat(customer.assigned_month) === month
    )
    
    // ... rest of logic (unchanged)
  }
}
```

**Estimated Time:** 15-30 minutes

### Phase 3: Testing

**Test Scenarios:**

1. **Internal Agent Login**
   - [ ] LOB Dashboard loads quickly (<1 second)
   - [ ] Correct branch customers displayed
   - [ ] Customer counts accurate
   - [ ] Total amounts correct

2. **LOB Navigation**
   - [ ] Life/Health/Motor cards load quickly
   - [ ] Month selection loads quickly
   - [ ] Customer list displays correctly

3. **Data Accuracy**
   - [ ] Only branch customers shown
   - [ ] No cross-branch data leakage
   - [ ] All customer details present

4. **Performance Verification**
   - [ ] Network tab shows new endpoint
   - [ ] Response time < 1 second
   - [ ] Data size < 500 KB
   - [ ] No client-side filtering of large datasets

5. **Edge Cases**
   - [ ] Branch with 0 customers
   - [ ] Branch with 1 customer
   - [ ] Branch with 1000+ customers
   - [ ] Invalid branch ID

**Estimated Time:** 30-60 minutes

### Phase 4: Deployment

**Steps:**
1. Commit changes to `customerService.js`
2. Create deployment script (if needed)
3. Deploy to production
4. Monitor error logs
5. Verify with real internal agents

**Estimated Time:** 30 minutes

---

## Files to Modify

### 1. Xano API Configuration
- **Endpoint:** `/get_nic_cc_customers`
- **Change:** Add `branch_id` parameter support
- **Lines:** ~10-15 lines of Xano function code

### 2. Frontend Service
- **File:** `src/services/customerService.js`
- **Functions:** 2 functions (getInternalAgentLOBSummary, getInternalAgentCustomersForLOBMonth)
- **Lines:** ~10-15 lines total

### 3. No UI Changes Required ✅
- `src/components/sales/LOBDashboard.jsx` - No changes (uses service methods)
- `src/pages/Dashboard.jsx` - No changes (uses LOBDashboard component)
- `src/components/layout/Sidebar.jsx` - No changes (navigation already set up)

---

## Risk Assessment

### Low Risk Factors ✅

- **Proven Pattern:** Same approach already works for Sales Agents
- **Minimal Changes:** Only 2 functions in 1 file + Xano endpoint
- **Backward Compatible:** Doesn't affect Sales Agent optimization
- **Easy Rollback:** Simple revert if issues occur
- **No UI Changes:** Transparent optimization
- **Same Data Structure:** No schema changes

### Potential Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Xano endpoint breaks Sales Agent | Low | High | Test Sales Agent after Xano changes |
| Branch filtering returns wrong data | Low | High | Thorough testing with multiple branches |
| Performance not as expected | Low | Medium | Test with various branch sizes |
| Breaking change for other features | Very Low | Medium | Review all uses of `/nic_cc_customer` |

---

## Success Criteria

### Performance Metrics
- [ ] Response time < 1 second (from 9.2s) - **90%+ improvement**
- [ ] Data transfer < 500 KB (from 18.7 MB) - **97%+ reduction**
- [ ] Total workflow < 3 seconds (from 27.6s) - **89%+ improvement**

### Functional Metrics
- [ ] 100% data accuracy (correct branch filtering)
- [ ] No cross-branch data leakage
- [ ] All customer details present
- [ ] LOB/month filtering works correctly

### User Experience Metrics
- [ ] No user complaints about data accuracy
- [ ] Positive feedback on speed improvement
- [ ] No increase in support tickets
- [ ] Internal agents report better productivity

---

## Comparison: Before vs After

### Current State (Unoptimized)

| User Type | Endpoint | Filter Method | Response Time | Data Size | Status |
|-----------|----------|---------------|---------------|-----------|--------|
| Sales Agent | `/get_nic_cc_customers?sales_agent_id=X` | Server | 484 ms | 128 KB | ✅ Optimized |
| Internal Agent | `/nic_cc_customer` | Client | 9,176 ms | 18,678 KB | ❌ Slow |
| CSR Agent | `/nic_cc_customer` | Client | 9,176 ms | 18,678 KB | ❌ Slow |

### After Optimization

| User Type | Endpoint | Filter Method | Response Time | Data Size | Status |
|-----------|----------|---------------|---------------|-----------|--------|
| Sales Agent | `/get_nic_cc_customers?sales_agent_id=X` | Server | 484 ms | 128 KB | ✅ Optimized |
| Internal Agent | `/get_nic_cc_customers?branch_id=X` | Server | ~700 ms | ~350 KB | ✅ Optimized |
| CSR Agent | `/nic_cc_customer` | Client | 9,176 ms | 18,678 KB | ⏳ Future |

---

## Future Considerations

### CSR Agent Optimization (Phase 2)

CSR Agents have universal access (all branches except branch 6), so they need a different approach:

**Option A:** Return all customers (current behavior)
- No filtering needed
- But still slow (9.2s)

**Option B:** Create summary endpoint
- `/get_csr_customers_summary` - Returns aggregated data only
- Lazy load details on demand

**Option C:** Exclude branch 6 on server
- `/get_nic_cc_customers?exclude_branch=6`
- Still returns ~27,000 customers but slightly faster

**Recommendation:** Defer CSR optimization until Internal Agent optimization is proven successful.

---

## Timeline Estimate

| Phase | Task | Estimated Time |
|-------|------|----------------|
| **Phase 1** | Xano API endpoint extension | 30-60 minutes |
| **Phase 2** | Frontend service update | 15-30 minutes |
| **Phase 3** | Testing | 30-60 minutes |
| **Phase 4** | Deployment | 30 minutes |
| **Total** | **End-to-end implementation** | **2-3 hours** |

---

## Rollback Plan

If issues occur after deployment:

### Quick Rollback (5 minutes)

**Revert frontend changes:**
```bash
git revert HEAD
git push origin main
```

**Or manually revert in customerService.js:**
```javascript
// Change back to old endpoint
const customersResponse = await customerApi.get('/nic_cc_customer')
const allCustomers = customersResponse.data || []
const branchCustomers = allCustomers.filter(customer => 
  customer.branch_id === parseInt(branchId)
)
```

**Xano rollback:**
- Remove `branch_id` parameter logic
- Endpoint reverts to Sales Agent only

---

## Approval Required

### Questions for Stakeholders

1. **Priority:** Is this optimization a priority for Internal Agents?
2. **Timeline:** When should this be implemented?
3. **Testing:** Who will test with real internal agent accounts?
4. **Deployment:** Preferred deployment window (low-traffic hours)?
5. **Monitoring:** What metrics should we track post-deployment?

### Approval Checklist

- [ ] Technical approach approved
- [ ] Timeline acceptable
- [ ] Testing plan approved
- [ ] Deployment window scheduled
- [ ] Rollback plan understood
- [ ] Success criteria agreed upon

---

## Summary

**Problem:** Internal Agents have LOB Dashboard but suffer from poor performance (9.2s load times)

**Solution:** Extend `/get_nic_cc_customers` endpoint to support `branch_id` parameter

**Impact:** 
- 90-93% faster response times (9.2s → 0.7s)
- 98% less data transfer (18.7 MB → 350 KB)
- Better user experience for Internal Agents
- Consistent with Sales Agent optimization pattern

**Effort:** 2-3 hours total implementation time

**Risk:** Low (proven pattern, minimal changes, easy rollback)

**Status:** ⏳ **Awaiting Approval to Proceed**

---

**Next Steps:**
1. Get stakeholder approval
2. Schedule Xano endpoint extension
3. Implement frontend changes
4. Test thoroughly
5. Deploy to production
6. Monitor and verify

---

**Document Status:** Complete - Ready for Review  
**Author:** Development Team  
**Date:** January 22, 2026  
**Version:** 1.0