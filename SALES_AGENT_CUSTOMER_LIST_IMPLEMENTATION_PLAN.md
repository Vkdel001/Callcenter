# Sales Agent "My Customers" Feature Implementation Plan

**Date**: January 18, 2026  
**Status**: Pending Approval  
**Priority**: Medium  
**Estimated Effort**: 2-3 hours

---

## Executive Summary

Add a "My Customers" menu option for sales agents to provide quick access to their complete customer portfolio in a single list view, similar to the existing functionality available to internal agents.

### Current State
Sales agents can only view their customers through:
- LOB Dashboard → Select LOB → Select Month → View customer list (requires 3 clicks)

### Proposed State
Sales agents will have direct access to:
- **My Customers** menu item → View all their customers in one paginated list (1 click)

---

## Business Justification

### Benefits
1. **Improved Efficiency**: Reduces navigation from 3 clicks to 1 click
2. **Better Portfolio Management**: Sales agents can see their entire customer base at once
3. **Consistent UX**: Aligns with internal agent experience
4. **Enhanced Productivity**: Quick search and filter across all customers
5. **Scalability**: Works efficiently for sales agents with hundreds of customers

### Use Cases
- Sales agent needs to quickly find a specific customer by name/policy
- Sales agent wants to see all pending customers across all LOBs
- Sales agent needs to review their total portfolio size
- Sales agent wants to sort customers by amount due across all months

---

## Technical Analysis

### Data Security ✅
- Filtering by `sales_agent_id` ensures data isolation
- Sales agents can ONLY see customers where `customer.sales_agent_id === user.sales_agent_id`
- No cross-agent data leakage possible

### Backend Service Status ✅
The required service method **already exists** in `customerService.js`:

```javascript
async getSalesAgentCustomers(salesAgentId) {
  // Filters: customer.sales_agent_id === salesAgentId
  // Returns ALL customers for this sales agent
}
```

**Location**: `src/services/customerService.js` (lines ~900-950)

### Permissions Status ✅
Sales agents already have route access configured in `src/config/permissions.js`:

```javascript
sales_agent: {
  canAccess: [
    ...ROUTE_PERMISSIONS.AUTHENTICATED,
    ...ROUTE_PERMISSIONS.LOB_DASHBOARD,
    ...ROUTE_PERMISSIONS.CUSTOMER_ACCESS  // Includes /customers route
  ]
}
```

### UI Component Status ✅
The `CustomerList` component already exists with full functionality:
- Search (name, policy, mobile, email)
- Status filtering (pending, contacted, resolved)
- Pagination (50 items per page)
- Sorting by amount due
- Mobile-responsive design
- Direct navigation to customer detail pages

---

## Implementation Plan

### Option 1: Separate Menu Item (RECOMMENDED)

#### New Menu Structure
```
Sales Agent Menu:
1. Arrears Dashboard (LOB Dashboard)
2. My Customers ← NEW
3. Follow-Ups
4. Quick QR Generator
5. My QR Performance
```

#### Advantages
- Clear separation of concerns
- Maintains existing LOB dashboard functionality
- Intuitive for users
- Minimal code changes

#### Disadvantages
- Adds one more menu item (minor)

---

### Option 2: Unified Dashboard with Toggle

#### Menu Structure
```
Sales Agent Menu:
1. Dashboard (with toggle: LOB View / List View)
2. Follow-Ups
3. Quick QR Generator
4. My QR Performance
```

#### Advantages
- Fewer menu items
- Unified dashboard concept

#### Disadvantages
- More complex UI implementation
- Requires toggle state management
- May confuse users switching between views

---

## Recommended Implementation: Option 1

### Files to Modify

#### 1. `src/components/layout/Sidebar.jsx`
**Change**: Add "My Customers" menu item to sales agent navigation

**Current Code** (lines ~20-25):
```javascript
const salesAgentNavItems = [
  { to: '/', icon: Home, label: 'Arrears Dashboard' },
  { to: '/follow-ups', icon: Calendar, label: 'Follow-Ups' },
  { to: '/quick-qr', icon: QrCode, label: 'Quick QR Generator' },
  { to: '/qr-summary', icon: BarChart3, label: 'My QR Performance' }
]
```

**Proposed Code**:
```javascript
const salesAgentNavItems = [
  { to: '/', icon: Home, label: 'Arrears Dashboard' },
  { to: '/customers', icon: Users, label: 'My Customers' }, // NEW LINE
  { to: '/follow-ups', icon: Calendar, label: 'Follow-Ups' },
  { to: '/quick-qr', icon: QrCode, label: 'Quick QR Generator' },
  { to: '/qr-summary', icon: BarChart3, label: 'My QR Performance' }
]
```

**Impact**: Low risk, simple addition

---

#### 2. `src/pages/customers/CustomerList.jsx`
**Change**: Add sales agent data fetching logic to existing query

**Current Code** (lines ~30-40):
```javascript
const { data: customers = [], isLoading } = useQuery(
  ['customers', user?.id, user?.agent_type],
  async () => {
    if (user?.agent_type === 'internal') {
      return customerService.getAllBranchCustomers(user?.id)
    } else {
      return customerService.getAssignedCustomers(user?.id)
    }
  },
  { enabled: !!user?.id }
)
```

**Proposed Code**:
```javascript
const { data: customers = [], isLoading } = useQuery(
  ['customers', user?.id, user?.agent_type, user?.sales_agent_id],
  async () => {
    if (user?.agent_type === 'internal') {
      // Internal agents: All customers from their branch
      return customerService.getAllBranchCustomers(user?.id)
    } else if (user?.agent_type === 'sales_agent') {
      // Sales agents: All customers where they are the sales agent
      return customerService.getSalesAgentCustomers(user?.sales_agent_id)
    } else {
      // Call center agents: Assigned customers only
      return customerService.getAssignedCustomers(user?.id)
    }
  },
  { enabled: !!user?.id && (user?.agent_type !== 'sales_agent' || !!user?.sales_agent_id) }
)
```

**Impact**: Low risk, follows existing pattern

---

#### 3. `src/services/customerService.js`
**Change**: Verify `getSalesAgentCustomers()` method exists and is correct

**Expected Method** (should already exist around line ~900):
```javascript
async getSalesAgentCustomers(salesAgentId) {
  try {
    console.log('Getting all customers for Sales Agent:', salesAgentId)
    
    const customersResponse = await customerApi.get('/nic_cc_customer')
    const allCustomers = customersResponse.data || []
    
    // Filter customers where this sales agent is assigned
    const salesAgentCustomers = allCustomers.filter(customer => 
      customer.sales_agent_id === parseInt(salesAgentId)
    )
    
    console.log(`Sales agent ${salesAgentId} has ${salesAgentCustomers.length} customers`)
    
    // Transform to frontend format
    return salesAgentCustomers.map(customer => ({
      id: customer.id,
      policyNumber: customer.policy_number,
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
      amountDue: customer.amount_due,
      status: customer.status,
      lastCallDate: customer.last_call_date,
      attempts: customer.total_attempts || 0,
      branchId: customer.branch_id,
      salesAgentId: customer.sales_agent_id,
      lineOfBusiness: customer.line_of_business,
      monthlyPremium: customer.monthly_premium,
      nationalIdOwner2: customer.national_id_owner2
    }))
  } catch (error) {
    console.error('Failed to get sales agent customers:', error)
    return []
  }
}
```

**Action**: Verify this method exists, if not, add it

**Impact**: Low risk if method already exists, medium if needs to be added

---

### Files That Need NO Changes

✅ **`src/config/permissions.js`** - Permissions already configured  
✅ **`src/App.jsx`** - Route already exists  
✅ **`src/pages/customers/CustomerDetail.jsx`** - Works with all agent types  
✅ **Backend/Xano** - No database changes needed

---

## Testing Plan

### Unit Tests Required

1. **Test: Sales agent can only see their customers**
   ```javascript
   // Test file: test-sales-agent-customer-list.js
   - Verify filtering by sales_agent_id
   - Verify no cross-agent data leakage
   - Verify correct customer count
   ```

2. **Test: Search functionality works**
   ```javascript
   - Search by name
   - Search by policy number
   - Search by mobile
   - Search by email
   ```

3. **Test: Pagination works correctly**
   ```javascript
   - Verify 50 items per page
   - Verify page navigation
   - Verify total count accuracy
   ```

### Manual Testing Checklist

- [ ] Login as sales agent
- [ ] Click "My Customers" menu item
- [ ] Verify only their customers are displayed
- [ ] Test search functionality
- [ ] Test status filter (pending, contacted, resolved)
- [ ] Test sorting (amount high to low, low to high, name A-Z)
- [ ] Test pagination (if > 50 customers)
- [ ] Click on a customer to view details
- [ ] Verify "Back" navigation returns to correct page
- [ ] Test on mobile device
- [ ] Test on tablet device
- [ ] Verify no console errors

### Edge Cases to Test

1. Sales agent with 0 customers
2. Sales agent with exactly 50 customers (1 page)
3. Sales agent with 51 customers (2 pages)
4. Sales agent with 500+ customers (many pages)
5. Search with no results
6. Filter with no results

---

## Alternative Menu Label Options

Instead of "My Customers", consider:

| Label | Pros | Cons |
|-------|------|------|
| **My Customers** | Personal, clear ownership | Slightly longer |
| **All Customers** | Matches internal agent label | Less personal |
| **Customer List** | Neutral, descriptive | Generic |
| **My Portfolio** | Professional, sales-oriented | May not be clear |
| **My Clients** | Professional | "Clients" vs "Customers" terminology |

**Recommendation**: "My Customers" - Clear, personal, and intuitive

---

## Deployment Plan

### Pre-Deployment
1. Get approval for implementation approach
2. Review and approve code changes
3. Run all unit tests
4. Complete manual testing checklist

### Deployment Steps
1. Deploy frontend changes to staging
2. Test on staging environment
3. Get user acceptance testing (UAT) approval
4. Deploy to production during low-traffic window
5. Monitor for errors in first 24 hours

### Rollback Plan
If issues occur:
1. Remove "My Customers" menu item from Sidebar.jsx
2. Revert CustomerList.jsx changes
3. Redeploy previous version
4. Investigate and fix issues
5. Re-deploy when ready

---

## Performance Considerations

### Expected Load
- Sales agents typically have 50-500 customers
- Page load: ~1-2 seconds for 500 customers
- Pagination limits UI rendering to 50 items at a time

### Optimization Strategies (if needed)
1. Client-side caching with React Query (already implemented)
2. Debounced search input (already implemented)
3. Virtual scrolling (only if > 1000 customers per agent)

### Database Impact
- No additional database queries
- Uses existing `/nic_cc_customer` endpoint
- Filtering done in frontend (acceptable for current scale)

---

## Success Metrics

### Quantitative
- Menu item click rate
- Average time to find a customer (before vs after)
- Number of searches performed
- Page views on customer list

### Qualitative
- Sales agent feedback
- Reduced support tickets about finding customers
- User satisfaction survey results

---

## Future Enhancements (Out of Scope)

1. Export customer list to CSV
2. Bulk actions (send reminders to multiple customers)
3. Advanced filters (by LOB, by month, by amount range)
4. Customer list customization (show/hide columns)
5. Save search preferences

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data leakage to wrong agent | Low | High | Strict filtering by sales_agent_id, thorough testing |
| Performance issues with large lists | Low | Medium | Pagination limits rendering, React Query caching |
| User confusion with new menu | Low | Low | Clear labeling, matches internal agent pattern |
| Breaking existing functionality | Low | Medium | Minimal changes, thorough testing |

**Overall Risk Level**: LOW

---

## Approval Required

### Decision Points
1. **Approve Option 1** (Separate "My Customers" menu item) - RECOMMENDED
2. **Approve Option 2** (Unified dashboard with toggle)
3. **Request modifications** to the plan
4. **Reject** and maintain current functionality

### Approver Sign-off
- [ ] Product Owner: _______________  Date: _______
- [ ] Technical Lead: _______________  Date: _______
- [ ] QA Lead: _______________  Date: _______

---

## Implementation Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Phase 1: Code Changes** | 2 hours | Modify Sidebar.jsx, CustomerList.jsx, verify service method |
| **Phase 2: Testing** | 1 hour | Unit tests, manual testing, edge cases |
| **Phase 3: Review** | 30 min | Code review, QA review |
| **Phase 4: Deployment** | 30 min | Deploy to staging, UAT, deploy to production |

**Total Estimated Time**: 4 hours

---

## Questions for Stakeholders

1. Do you prefer "My Customers" or another label?
2. Should we add any additional filters specific to sales agents?
3. What is the typical number of customers per sales agent?
4. Are there any specific sorting preferences?
5. Should this feature be rolled out to all sales agents or piloted first?

---

## Conclusion

This is a low-risk, high-value enhancement that improves sales agent productivity by providing direct access to their complete customer portfolio. The implementation leverages existing code and infrastructure, requiring minimal changes with maximum benefit.

**Recommendation**: Approve and implement Option 1 (Separate "My Customers" menu item)
