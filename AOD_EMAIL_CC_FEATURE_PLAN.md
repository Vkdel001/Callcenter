# AOD Email CC Feature Implementation Plan

## Overview
Add CC functionality to AOD signature emails so the logged-in agent gets copied on emails sent to customers for signature.

## Current Implementation Analysis

### Current AOD Email Flow
1. **PaymentPlanModal.jsx** calls `emailService.sendAODEmail()`
2. **emailService.sendAODEmail()** method currently accepts:
   - `customer` - customer data
   - `aodData` - AOD/payment plan data  
   - `pdfBlob` - PDF attachment
   - `installments` - installment data (optional)
3. Email is sent only to customer with no CC

### User Context Availability
- **PaymentPlanModal.jsx** has access to `user` via `useAuth()` hook
- **CustomerDetail.jsx** also has access to `user` via `useAuth()` hook
- User object contains: `user.id`, `user.name`, `user.email`

## Implementation Plan

### Step 1: Modify sendAODEmail Method
**File**: `src/services/emailService.js`

**Changes**:
- Add optional `agent` parameter to `sendAODEmail()` method
- Add CC functionality when agent is provided
- Update method signature:
  ```javascript
  async sendAODEmail(customer, aodData, pdfBlob, installments = [], agent = null)
  ```

**Implementation**:
```javascript
// In sendTransactionalEmail call, add CC when agent provided
const emailOptions = {
  to: {
    email: customer.email,
    name: customer.name
  },
  subject: `Acknowledgment of Debt Agreement - Policy ${aodData.policy_number}`,
  htmlContent,
  textContent,
  attachments: [attachment]
}

// Add CC for logged-in agent
if (agent && agent.email) {
  emailOptions.cc = [{
    email: agent.email,
    name: agent.name || 'Agent'
  }]
}

return await this.sendTransactionalEmail(emailOptions)
```

### Step 2: Update PaymentPlanModal Call
**File**: `src/components/modals/PaymentPlanModal.jsx`

**Changes**:
- Pass `user` object to `sendAODEmail()` call
- Update the call around line 227:
  ```javascript
  const result = await emailService.sendAODEmail(
    fullCustomer, 
    createdPlan, 
    pdfBlob, 
    createdPlan.installments || [],
    user  // Add agent parameter
  )
  ```

### Step 3: Update Success Message
**File**: `src/components/modals/PaymentPlanModal.jsx`

**Changes**:
- Update success message to indicate CC was sent:
  ```javascript
  if (result.success) {
    alert('AOD PDF emailed successfully to customer! (You have been CC\'d)')
  }
  ```

## Technical Considerations

### Email Service Compatibility
- The existing `sendTransactionalEmail()` method already supports CC parameter
- CC parameter accepts array format: `[{ email: string, name: string }]`
- No changes needed to base email infrastructure

### Backward Compatibility
- Agent parameter is optional (`agent = null`)
- Existing calls without agent parameter will continue to work
- No breaking changes to existing functionality

### Error Handling
- If agent email is invalid, email will still send to customer
- CC failure won't prevent primary email delivery
- Existing error handling remains intact

## Testing Strategy

### Manual Testing
1. Create AOD with logged-in agent
2. Verify customer receives email
3. Verify agent receives CC copy
4. Test with missing agent email (should not break)
5. Test with invalid agent email (should not break)

### Edge Cases
- Agent with no email address
- Agent email same as customer email
- Invalid agent data

## Files to Modify

1. **src/services/emailService.js**
   - Modify `sendAODEmail()` method signature
   - Add CC logic for agent

2. **src/components/modals/PaymentPlanModal.jsx**
   - Update `sendAODEmail()` call to pass user
   - Update success message

## Implementation Notes

- This follows the same pattern as payment reminder emails which already have agent CC functionality
- The `sendTransactionalEmail()` method already supports CC, so no infrastructure changes needed
- Agent CC is optional and won't break existing functionality
- Implementation is minimal and focused

## Expected Outcome

After implementation:
- When an agent creates an AOD and sends it via email
- Customer receives the AOD PDF for signature
- Agent receives a CC copy of the same email
- Agent can track what was sent to customer
- No changes to existing email templates or infrastructure needed