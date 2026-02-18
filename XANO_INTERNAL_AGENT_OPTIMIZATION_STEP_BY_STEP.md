# Xano API Changes - Step-by-Step Guide
## Internal Agent Optimization

**Goal:** Make the existing `/get_nic_cc_customers` endpoint accept a `branch_id` parameter so Internal Agents can get only their branch's customers.

---

## What You Currently Have

**Endpoint:** `/get_nic_cc_customers`

**Current Behavior:**
- When called with `?sales_agent_id=2103` → Returns only that agent's customers ✅
- When called with no parameters → Returns all 27,817 customers

**What We Need to Add:**
- When called with `?branch_id=5` → Returns only Branch 5's customers (NEW)

---

## Step-by-Step Instructions

### Step 1: Log into Xano Dashboard

1. Go to your Xano workspace
2. Navigate to **API** section
3. Find the endpoint: **`get_nic_cc_customers`**
4. Click to open it

---

### Step 2: Understand Current Logic

Your endpoint currently looks something like this:

```
GET /get_nic_cc_customers

Inputs:
  - sales_agent_id (query parameter, optional)

Function Stack:
  1. Get all records from nic_cc_customer table
  2. If sales_agent_id is provided:
     - Filter where sales_agent_id = query.sales_agent_id
  3. Return filtered results
```

---

### Step 3: Add New Input Parameter

**In the Xano endpoint editor:**

1. Look for the **"Inputs"** section at the top
2. You should see: `sales_agent_id` (integer, optional)
3. Click **"Add Input"**
4. Add a new input:
   - **Name:** `branch_id`
   - **Type:** Integer
   - **Required:** No (leave unchecked)
   - **Source:** Query parameter

**Result:** Your endpoint now accepts both `sales_agent_id` and `branch_id` as optional parameters.

---

### Step 4: Modify the Function Logic

**Find the filtering logic in your function stack.** It probably looks like this:

```
Current Logic:
┌─────────────────────────────────┐
│ Query All Records               │
│ FROM: nic_cc_customer           │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ Filter (if sales_agent_id)      │
│ WHERE: sales_agent_id = input   │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ Return Results                  │
└─────────────────────────────────┘
```

**You need to change it to:**

```
New Logic:
┌─────────────────────────────────┐
│ Query All Records               │
│ FROM: nic_cc_customer           │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ IF sales_agent_id is provided   │
│   Filter by sales_agent_id      │
│ ELSE IF branch_id is provided   │
│   Filter by branch_id           │  ← NEW
│ ELSE                            │
│   Return all records            │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ Return Results                  │
└─────────────────────────────────┘
```

---

### Step 5: Implement the Logic in Xano

**Option A: Using Xano's Visual Function Builder**

1. Find your existing **Filter** function
2. Click to edit it
3. Change the filter condition from:
   ```
   sales_agent_id = query.sales_agent_id
   ```
   
   To a conditional filter:
   ```
   IF query.sales_agent_id exists:
     sales_agent_id = query.sales_agent_id
   ELSE IF query.branch_id exists:
     branch_id = query.branch_id
   ELSE:
     (no filter - return all)
   ```

**Option B: Using Xano's Custom Code (if available)**

If your endpoint uses custom code, modify it like this:

```javascript
// Get query parameters
const salesAgentId = query.sales_agent_id;
const branchId = query.branch_id;

// Get all customers
let customers = nic_cc_customer.getAll();

// Apply filtering based on which parameter is provided
if (salesAgentId) {
  // Filter by sales agent (existing logic)
  customers = customers.filter(c => c.sales_agent_id == salesAgentId);
} else if (branchId) {
  // Filter by branch (NEW logic)
  customers = customers.filter(c => c.branch_id == branchId);
}
// If neither parameter provided, return all customers

return customers;
```

---

### Step 6: Test in Xano

**Before deploying, test directly in Xano:**

1. Click the **"Run & Debug"** button in the endpoint editor

2. **Test Case 1:** Sales Agent (should still work)
   ```
   Query Parameters:
   sales_agent_id: 2103
   
   Expected: Returns ~190 customers for agent 2103
   ```

3. **Test Case 2:** Branch Filter (NEW)
   ```
   Query Parameters:
   branch_id: 5
   
   Expected: Returns all customers in Branch 5
   ```

4. **Test Case 3:** No Parameters
   ```
   Query Parameters:
   (empty)
   
   Expected: Returns all 27,817 customers
   ```

5. **Test Case 4:** Invalid Branch
   ```
   Query Parameters:
   branch_id: 999
   
   Expected: Returns empty array []
   ```

---

### Step 7: Verify the Response

**Check that the response includes:**
- Customer records with all fields
- Correct filtering applied
- No errors in the response

**Example Response for Branch 5:**
```json
[
  {
    "id": 1,
    "policy_number": "POL001",
    "name": "John Doe",
    "branch_id": 5,
    "sales_agent_id": 2103,
    "amount_due": 1500,
    ...
  },
  {
    "id": 2,
    "policy_number": "POL002",
    "name": "Jane Smith",
    "branch_id": 5,
    "sales_agent_id": 2104,
    "amount_due": 2000,
    ...
  }
  // ... more customers from Branch 5
]
```

---

## Visual Diagram: What Changes

### BEFORE (Current State)

```
Frontend Request:
GET /get_nic_cc_customers?sales_agent_id=2103
                          ↓
                    Xano Endpoint
                          ↓
              Filter by sales_agent_id
                          ↓
              Return 190 customers ✅
```

```
Frontend Request:
GET /nic_cc_customer  (Internal Agent)
                          ↓
                    Xano Endpoint
                          ↓
              Return ALL 27,817 customers ❌ SLOW
                          ↓
              Frontend filters by branch_id
```

### AFTER (Optimized)

```
Frontend Request:
GET /get_nic_cc_customers?sales_agent_id=2103
                          ↓
                    Xano Endpoint
                          ↓
              Filter by sales_agent_id
                          ↓
              Return 190 customers ✅
```

```
Frontend Request:
GET /get_nic_cc_customers?branch_id=5  (NEW)
                          ↓
                    Xano Endpoint
                          ↓
              Filter by branch_id  (NEW)
                          ↓
              Return ~500 customers ✅ FAST
```

---

## Common Questions

### Q: Will this break the Sales Agent functionality?
**A:** No! The logic checks `sales_agent_id` first, so Sales Agents will continue to work exactly as before.

### Q: What if someone provides both parameters?
**A:** The logic prioritizes `sales_agent_id` first. So if both are provided, it will filter by `sales_agent_id` and ignore `branch_id`.

### Q: What if the branch_id doesn't exist?
**A:** It will return an empty array `[]`, which is fine. The frontend will show "No customers found."

### Q: Do I need to change the database table?
**A:** No! The `branch_id` field already exists in your `nic_cc_customer` table. You're just using it for filtering.

### Q: How do I know which branch IDs exist?
**A:** You can check your `branches` table in Xano, or look at the `branch_id` values in your `nic_cc_customer` table.

---

## Testing Checklist

After making the changes in Xano:

- [ ] Test with `sales_agent_id=2103` → Should return ~190 customers
- [ ] Test with `branch_id=5` → Should return Branch 5 customers only
- [ ] Test with no parameters → Should return all customers
- [ ] Test with invalid `branch_id=999` → Should return empty array
- [ ] Verify response time is fast (<1 second)
- [ ] Verify all customer fields are present in response
- [ ] Check that no errors appear in Xano logs

---

## What Happens Next

Once you've made these Xano changes:

1. **I'll update the frontend code** in `src/services/customerService.js` to use the new parameter
2. **We'll test** with a real Internal Agent account
3. **We'll deploy** the frontend changes
4. **Internal Agents will see** 90%+ faster load times

---

## Need Help?

If you're stuck on any step:

1. **Take a screenshot** of your Xano endpoint editor
2. **Share it** so I can see the current structure
3. **I'll guide you** through the exact clicks needed

The key is just adding `branch_id` as an input and modifying the filter logic to check for it!

---

**Summary:** You're adding one input parameter (`branch_id`) and one conditional filter (if `branch_id` is provided, filter by it). That's it! 🎯

---

## Appendix: Instructions for Xano AI Agent

**Copy and paste this prompt to Xano AI Agent to make the changes automatically:**

```
I need you to modify the existing API endpoint "get_nic_cc_customers" to add support for branch-based filtering.

CURRENT BEHAVIOR:
- The endpoint accepts an optional query parameter "sales_agent_id" (integer)
- When sales_agent_id is provided, it filters the nic_cc_customer table by that sales_agent_id
- When no parameter is provided, it returns all records

REQUIRED CHANGES:

1. ADD NEW INPUT PARAMETER:
   - Name: branch_id
   - Type: Integer
   - Required: No (optional)
   - Source: Query parameter

2. MODIFY FILTERING LOGIC:
   Change the current filter logic to support both parameters with this priority:
   
   IF sales_agent_id is provided:
     - Filter nic_cc_customer table WHERE sales_agent_id = query.sales_agent_id
     - Return filtered results
   ELSE IF branch_id is provided:
     - Filter nic_cc_customer table WHERE branch_id = query.branch_id
     - Return filtered results
   ELSE:
     - Return all records from nic_cc_customer table

3. MAINTAIN BACKWARD COMPATIBILITY:
   - Existing calls with sales_agent_id must continue to work exactly as before
   - The sales_agent_id filter takes priority over branch_id filter
   - If both parameters are provided, use sales_agent_id and ignore branch_id

EXPECTED RESULTS AFTER CHANGES:

Test Case 1 (Existing - must still work):
GET /get_nic_cc_customers?sales_agent_id=2103
Expected: Returns only customers where sales_agent_id = 2103

Test Case 2 (New functionality):
GET /get_nic_cc_customers?branch_id=5
Expected: Returns only customers where branch_id = 5

Test Case 3 (No parameters):
GET /get_nic_cc_customers
Expected: Returns all customers from nic_cc_customer table

Test Case 4 (Both parameters - sales_agent_id takes priority):
GET /get_nic_cc_customers?sales_agent_id=2103&branch_id=5
Expected: Returns only customers where sales_agent_id = 2103 (ignores branch_id)

Test Case 5 (Invalid branch_id):
GET /get_nic_cc_customers?branch_id=999
Expected: Returns empty array [] (no error)

IMPORTANT NOTES:
- Do not modify the database table structure
- Do not change the response format
- Ensure all existing customer fields are returned in the response
- The branch_id field already exists in the nic_cc_customer table
- This is a performance optimization to reduce data transfer for Internal Agents

Please implement these changes and confirm when complete.
```

**After Xano AI Agent completes the changes:**

1. Test all 5 test cases listed above in Xano's "Run & Debug" interface
2. Verify response times are fast (<1 second)
3. Confirm all customer fields are present in responses
4. Check that no errors appear in Xano logs
5. Proceed to frontend implementation (Phase 2)

---
