# Agent Type Conditional Email Display - Implementation Analysis

## 🎯 Objective

Implement conditional display of agent contact information in payment reminder emails based on the `agent_type` field from the `nic_cc_agent` table, replacing the current branch-based approach with a more flexible agent type-based system.

---

## 📊 Current Implementation Analysis

### **Current Logic (Branch-Based)**
```javascript
// Current: Uses branch_id to determine CSL agents
isCslAgent: options.agentBranchId === 13  // Branch 13 = CSL agents
```

### **Proposed Logic (Agent Type-Based)**
```javascript
// Proposed: Use agent_type field directly
agentType: user.agent_type  // call_center, internal, sales_agent, csr
```

---

## 🗄️ Database Structure

### **nic_cc_agent Table Fields**
```json
{
  "id": "integer",
  "name": "text",
  "email": "email", 
  "agent_type": "enum",  // ← KEY FIELD
  "branch_id": "integer",
  "sales_agent_id": "text",
  "role": "enum",
  "active": "bool"
}
```

### **Agent Types in System**
- `call_center` - Call center agents (team-based)
- `internal` - Internal agents (branch-based)
- `sales_agent` - Sales agents (individual relationships)
- `csr` - Customer service representatives (3rd party like CSL)

---

## 📧 Email Contact Display Rules

### **Proposed Contact Display Logic**

| Agent Type | Display Agent Contact | Contact Message |
|------------|----------------------|-----------------|
| `sales_agent` | ✅ YES | "Your Sales Agent Contact" + agent details |
| `internal` | ✅ YES | "Your Agent Contact" + agent details |
| `call_center` | ❌ NO | "Contact our Call Center team at callcenter@nicl.mu" |
| `csr` | ❌ NO | "Contact Customer Service at nicarlife@nicl.mu or 602-3315" |

### **Business Rationale**
- **Sales/Internal**: Direct customer relationships → Show agent contact
- **Call Center/CSR**: Team-based or 3rd party → Show generic contact

---

## 📁 Files Requiring Changes

### **🔴 Core Files (Required Changes)**

#### **1. src/services/emailService.js**
**Current Function:** `generatePaymentReminderHTML()`
```javascript
// Current parameter
generatePaymentReminderHTML(..., isCslAgent = false)

// Proposed parameter  
generatePaymentReminderHTML(..., agentType = null)
```

**Changes Required:**
- Replace `isCslAgent` parameter with `agentType`
- Update conditional logic to check `agentType` values
- Modify contact section generation based on agent type
- Update `generatePaymentReminderText()` similarly

#### **2. src/services/csl/cslAdapterService.js**
**Current Code:**
```javascript
{
  agentEmail: options.agentEmail,
  agentName: options.agentName,
  agentBranchId: options.agentBranchId,
  isCslAgent: options.agentBranchId === 13,  // ← REMOVE
  lineOfBusiness: 'life',
  ccAgent: options.ccAgent !== undefined ? options.ccAgent : true
}
```

**Proposed Code:**
```javascript
{
  agentEmail: options.agentEmail,
  agentName: options.agentName,
  agentType: options.agentType,  // ← ADD
  lineOfBusiness: 'life',
  ccAgent: options.ccAgent !== undefined ? options.ccAgent : true
}
```

#### **3. src/components/csl/CSLQuickActionsPanel.jsx**
**Current Code:**
```javascript
{
  agentEmail: user.email,
  agentName: user.name,
  agentBranchId: user.branch_id,  // ← REMOVE
  ccAgent: true
}
```

**Proposed Code:**
```javascript
{
  agentEmail: user.email,
  agentName: user.name,
  agentType: user.agent_type,  // ← ADD
  ccAgent: true
}
```

### **🟡 Secondary Files (Likely Need Updates)**

#### **4. src/services/customerService.js**
**Function:** `sendEmail()`
**Current:** Passes `options` object to `sendPaymentReminderEmail()`
**Change:** Ensure `options` includes `agentType` when called from UI components

#### **5. src/pages/InstallmentReminder.jsx**
**Analysis Needed:** Check if this page sends payment reminder emails
**Potential Change:** Pass `user.agent_type` in email options

#### **6. src/pages/QuickQRGenerator.jsx**
**Analysis Needed:** Check if this page sends payment reminder emails  
**Potential Change:** Pass `user.agent_type` in email options

#### **7. src/services/reminderService.js**
**Analysis Needed:** Check if this service calls email functions
**Potential Change:** Pass agent type information when available

### **🟢 Files That May Need Updates (Context-Dependent)**

#### **8. src/pages/customers/CustomerDetail.jsx**
**Condition:** If it has email sending functionality
**Change:** Pass `user.agent_type` when sending emails

#### **9. src/components/modals/PaymentPlanModal.jsx**
**Condition:** If it sends payment reminder emails
**Change:** Pass `user.agent_type` in email options

#### **10. src/services/paymentPlanService.js**
**Condition:** If it handles email sending
**Change:** Accept and pass through agent type information

---

## 🔄 Implementation Flow

### **Step 1: Update Email Service Core**
1. Modify `generatePaymentReminderHTML()` function
2. Replace `isCslAgent` parameter with `agentType`
3. Update conditional logic for contact display
4. Update `generatePaymentReminderText()` function

### **Step 2: Update CSL System**
1. Modify `cslAdapterService.js` to pass `agentType`
2. Update `CSLQuickActionsPanel.jsx` to use `user.agent_type`
3. Remove `agentBranchId` and `isCslAgent` logic

### **Step 3: Update Other Email Senders**
1. Find all places that call `sendPaymentReminderEmail()`
2. Ensure they pass `agentType` in options
3. Update UI components to include `user.agent_type`

### **Step 4: Testing**
1. Test each agent type displays correct contact info
2. Verify CC behavior works correctly
3. Test all email sending flows

---

## 🧪 Testing Matrix

### **Test Cases by Agent Type**

| Agent Type | Expected Contact Display | Expected CC Behavior |
|------------|-------------------------|---------------------|
| `sales_agent` | Show agent name/email | CC agent |
| `internal` | Show agent name/email | CC agent |
| `call_center` | Show call center contact | No CC |
| `csr` | Show customer service contact | No CC |

### **Test Scenarios**
1. **CSL Agent (csr)** → Generic customer service contact
2. **Sales Agent** → Show agent contact + CC agent
3. **Internal Agent** → Show agent contact + CC agent  
4. **Call Center Agent** → Generic call center contact
5. **Legacy Agent (no agent_type)** → Default behavior

---

## 📋 Implementation Checklist

### **Phase 1: Core Email Service**
- [ ] Update `generatePaymentReminderHTML()` function
- [ ] Update `generatePaymentReminderText()` function
- [ ] Replace `isCslAgent` with `agentType` parameter
- [ ] Implement agent type conditional logic

### **Phase 2: CSL System Updates**
- [ ] Update `cslAdapterService.js`
- [ ] Update `CSLQuickActionsPanel.jsx`
- [ ] Remove branch-based logic
- [ ] Test CSL email functionality

### **Phase 3: Other Email Senders**
- [ ] Update `customerService.js` if needed
- [ ] Update `InstallmentReminder.jsx` if needed
- [ ] Update `QuickQRGenerator.jsx` if needed
- [ ] Update any other email sending components

### **Phase 4: Testing & Validation**
- [ ] Test all agent types
- [ ] Verify CC behavior
- [ ] Test all email sending flows
- [ ] Validate backward compatibility

---

## 🔒 Backward Compatibility

### **Handling Legacy Data**
```javascript
// Fallback for agents without agent_type
const agentType = user.agent_type || 'call_center'  // Default to call_center
```

### **Migration Strategy**
1. **No database changes required** - use existing `agent_type` field
2. **Gradual rollout** - test with specific agent types first
3. **Fallback behavior** - default to current logic if `agent_type` missing

---

## 🎯 Benefits

### **Business Benefits**
- ✅ **Flexible Rules**: Easy to change contact display per agent type
- ✅ **Proper Segmentation**: Different contact info for different roles
- ✅ **Professional Image**: Appropriate contact channels per agent type
- ✅ **Scalable**: Easy to add new agent types

### **Technical Benefits**
- ✅ **Uses Existing Data**: Leverages `nic_cc_agent.agent_type` field
- ✅ **No Database Changes**: Pure application logic changes
- ✅ **Maintainable**: Clear, readable conditional logic
- ✅ **Backward Compatible**: Handles legacy data gracefully

---

## 🚨 Risk Assessment

### **Low Risk Changes**
- Email template modifications
- Parameter updates
- Conditional logic changes

### **Medium Risk Areas**
- Multiple file updates
- Testing all email flows
- Ensuring no email sending is broken

### **Mitigation Strategies**
- **Thorough Testing**: Test each agent type individually
- **Gradual Rollout**: Deploy to staging first
- **Fallback Logic**: Default behavior for edge cases
- **Monitoring**: Watch email delivery rates post-deployment

---

## 📊 Summary

**Total Files to Modify:** 3-10 files (depending on email sending scope)
**Complexity:** Medium (multiple file coordination)
**Risk Level:** Low-Medium (well-defined changes)
**Timeline:** 1-2 days development + testing

**Key Success Factors:**
1. Thorough analysis of all email sending flows
2. Comprehensive testing of each agent type
3. Proper fallback handling for edge cases
4. Clear documentation of new logic

---

**Status:** 📋 ANALYSIS COMPLETE - Ready for Implementation Planning
**Date:** December 18, 2024
**Priority:** 🟡 MEDIUM
**Complexity:** 🟡 MEDIUM