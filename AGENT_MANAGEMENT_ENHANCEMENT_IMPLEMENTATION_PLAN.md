# Agent Management Enhancement Implementation Plan

## Overview

This document outlines the implementation plan to add missing functionalities to the Agent Management system:

1. Create single agent manually
2. Delete agent functionality
3. Password reset for existing agents
4. Edit name, email, and role in Agent Management


---

## Feature 1: Create Single Agent Manually

### Description
Add a "Create Agent" button and modal form to create one agent at a time with all fields.

### UI Changes

#### File: `src/pages/admin/AgentManagement.jsx`

**Changes Required:**
1. Add "Create Agent" button in header section
2. Add create agent modal (similar to edit modal but for new agent)
3. Add form with all fields:
   - Name (required, 2-100 chars)
   - Email (required, valid email, unique)
   - Role (dropdown: agent, admin, csr_agent, internal_agent, life_admin)
   - Agent Type (dropdown: call_center, sales_agent, csr_agent, internal_agent)
   - Branch (dropdown from branches)
   - Sales Agent ID (optional text)
   - Admin LOB (dropdown: life, health, motor, nonmotor)
   - Active status (checkbox, default true)
4. Add password generation (auto-generate 8-char password)
5. Show generated password in success message
6. Add validation for all fields
7. Add create mutation using React Query

**New State Variables:**
```javascript
const [showCreateModal, setShowCreateModal] = useState(false)
const [generatedPassword, setGeneratedPassword] = useState(null)
```

**New Mutation:**
```javascript
const createAgentMutation = useMutation(
  async (agentData) => {
    return await agentApi.post('/nic_cc_agent', agentData)
  },
  {
    onSuccess: (response) => {
      queryClient.invalidateQueries('agents')
      setShowCreateModal(false)
      // Show password to admin
      alert(`Agent created! Password: ${generatedPassword}`)
      reset()
    }
  }
)
```

---

## Feature 2: Delete Agent Functionality

### Description
Add delete button with confirmation dialog to remove agents from the system.

### UI Changes

#### File: `src/pages/admin/AgentManagement.jsx`

**Changes Required:**
1. Add Trash icon button in Actions column
2. Add confirmation modal before deletion
3. Show warning about data loss
4. Add delete mutation
5. Prevent deletion if agent has active customers assigned
6. Show success/error messages

**New State Variables:**
```javascript
const [showDeleteModal, setShowDeleteModal] = useState(false)
const [deletingAgent, setDeletingAgent] = useState(null)
```

**New Mutation:**
```javascript
const deleteAgentMutation = useMutation(
  async (agentId) => {
    return await agentApi.delete(`/nic_cc_agent/${agentId}`)
  },
  {
    onSuccess: () => {
      queryClient.invalidateQueries('agents')
      setShowDeleteModal(false)
      setDeletingAgent(null)
      alert('Agent deleted successfully!')
    }
  }
)
```

**Confirmation Modal Content:**
- Agent name and email
- Warning message
- "Are you sure?" text
- Cancel and Delete buttons (Delete in red)

---

## Feature 3: Password Reset for Existing Agents

### Description
Add password reset functionality to generate new password for existing agents.

### UI Changes

#### File: `src/pages/admin/AgentManagement.jsx`

**Changes Required:**
1. Add Key/Lock icon button in Actions column
2. Add password reset modal
3. Generate new 8-character password
4. Show new password to admin (must be copied/saved)
5. Add reset mutation
6. Add confirmation before reset

**New State Variables:**
```javascript
const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
const [resettingAgent, setResettingAgent] = useState(null)
const [newPassword, setNewPassword] = useState(null)
```

**New Mutation:**
```javascript
const resetPasswordMutation = useMutation(
  async ({ agentId, newPassword }) => {
    return await agentApi.patch(`/nic_cc_agent/${agentId}`, {
      password_hash: newPassword // Will be hashed in Feature 5
    })
  },
  {
    onSuccess: () => {
      queryClient.invalidateQueries('agents')
      // Keep modal open to show password
      alert('Password reset successfully! Make sure to save the new password.')
    }
  }
)
```

**Password Reset Modal Content:**
- Agent name and email
- Generated password (large, copyable text)
- Copy to clipboard button
- Warning: "Save this password - it won't be shown again"
- Close button

---

## Feature 4: Edit Name, Email, and Role

### Description
Expand edit modal to allow editing more fields beyond just agent_type and branch.

### UI Changes

#### File: `src/pages/admin/AgentManagement.jsx`

**Changes Required:**
1. Expand edit modal form to include:
   - Name (text input, required)
   - Email (email input, required, validate uniqueness)
   - Role (dropdown)
   - Agent Type (existing)
   - Branch (existing)
   - Sales Agent ID (text input)
   - Admin LOB (dropdown)
   - Active Status (checkbox)
2. Update form validation
3. Update mutation to send all fields
4. Add email uniqueness check (exclude current agent)

**Updated Form Fields:**
```javascript
reset({
  name: agent.name,
  email: agent.email,
  role: agent.role,
  agent_type: agent.agent_type || 'call_center',
  branch_id: agent.branch_id || '',
  sales_agent_id: agent.sales_agent_id || '',
  admin_lob: agent.admin_lob || '',
  active: agent.active
})
```

**Email Validation:**
- Check if email already exists (excluding current agent)
- Show error if duplicate found
- Validate email format

---

## Password Generation Utility

### Description
Create a simple password generation utility (no hashing - passwords stored as plain text).

### New File: `src/utils/passwordUtils.js`

```javascript
/**
 * Generate a simple 8-character password
 * @returns {string} Generated password
 */
export const generatePassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
```

**Usage:**
- Import in AgentManagement.jsx for create and reset operations
- Passwords stored as plain text in `password_hash` field
- No encryption or hashing applied

---

## Files to be Modified

### Frontend Files (Only 2 files + 1 new)

1. **`src/pages/admin/AgentManagement.jsx`** (MAJOR CHANGES)
   - Add create agent modal and form
   - Add delete confirmation modal
   - Add password reset modal
   - Expand edit modal with more fields
   - Add new mutations (create, delete, reset password)
   - Add new state variables
   - Add validation logic
   - Add password generation
   - Update table actions column

2. **`src/utils/passwordUtils.js`** (NEW FILE)
   - Create password generation utility
   - Export generatePassword function
   - No hashing - plain text passwords

3. **`package.json`** (NO CHANGES)
   - No new dependencies needed

### Backend/Xano Changes

**No backend changes required** - passwords stored as plain text in existing `password_hash` field.

---

## Implementation Steps

### Phase 1: Password Generation Utility (Foundation)
**Priority: HIGH**

1. Create `src/utils/passwordUtils.js` with generatePassword function
2. Test password generation
3. No dependencies to install

### Phase 2: Create Single Agent
**Priority: HIGH**

1. Import passwordUtils in AgentManagement.jsx
2. Add create button to AgentManagement header
3. Create create agent modal component
4. Add form with all fields and validation
5. Implement password generation
6. Add create mutation
7. Test agent creation
8. Test password display
9. Test form validation

### Phase 3: Edit More Fields
**Priority: HIGH**

1. Expand edit modal form
2. Add name, email, role fields
3. Add sales_agent_id, admin_lob fields
4. Add active status checkbox
5. Update validation (especially email uniqueness)
6. Update mutation to send all fields
7. Test editing all fields
8. Test email uniqueness validation

### Phase 4: Password Reset
**Priority: MEDIUM**

1. Add password reset button to actions
2. Create password reset modal
3. Implement password generation
4. Add copy to clipboard functionality
5. Add reset mutation
6. Test password reset
7. Test password display and copy

### Phase 5: Delete Agent
**Priority: MEDIUM**

1. Add delete button to actions
2. Create delete confirmation modal
3. Add warning messages
4. Add delete mutation
5. Test agent deletion
6. Test confirmation flow
7. Add check for active customers (optional)

### Phase 6: Testing & Refinement
**Priority: HIGH**

1. Test all features together
2. Test edge cases (duplicate emails, invalid data)
3. Test error handling
4. Test UI/UX flow
5. Performance testing
6. Cross-browser testing

---

## UI/UX Mockups

### Create Agent Modal
```
┌─────────────────────────────────────────┐
│ Create New Agent                    [X] │
├─────────────────────────────────────────┤
│                                         │
│ Name *                                  │
│ [_________________________________]     │
│                                         │
│ Email *                                 │
│ [_________________________________]     │
│                                         │
│ Role *                                  │
│ [Agent ▼]                              │
│                                         │
│ Agent Type *                            │
│ [Call Center ▼]                        │
│                                         │
│ Branch                                  │
│ [Select Branch ▼]                      │
│                                         │
│ Sales Agent ID                          │
│ [_________________________________]     │
│                                         │
│ Admin LOB                               │
│ [Select LOB ▼]                         │
│                                         │
│ ☑ Active                               │
│                                         │
│ ℹ️ Password will be auto-generated     │
│                                         │
│         [Cancel]  [Create Agent]        │
└─────────────────────────────────────────┘
```

### Delete Confirmation Modal
```
┌─────────────────────────────────────────┐
│ Delete Agent                        [X] │
├─────────────────────────────────────────┤
│                                         │
│ ⚠️  Are you sure?                       │
│                                         │
│ You are about to delete:                │
│                                         │
│ Name: John Doe                          │
│ Email: john.doe@nic.mu                  │
│                                         │
│ This action cannot be undone.           │
│ All agent data will be permanently      │
│ removed from the system.                │
│                                         │
│         [Cancel]  [Delete Agent]        │
│                      (red button)       │
└─────────────────────────────────────────┘
```

### Password Reset Modal
```
┌─────────────────────────────────────────┐
│ Reset Password                      [X] │
├─────────────────────────────────────────┤
│                                         │
│ Agent: John Doe                         │
│ Email: john.doe@nic.mu                  │
│                                         │
│ New Password:                           │
│ ┌─────────────────────────────────┐   │
│ │   AbC3k9Xm                      │   │
│ └─────────────────────────────────┘   │
│                                         │
│ [📋 Copy to Clipboard]                 │
│                                         │
│ ⚠️  Important:                          │
│ Save this password securely.            │
│ It will not be shown again.             │
│                                         │
│              [Close]                    │
└─────────────────────────────────────────┘
```

### Updated Actions Column
```
┌──────────────────────────────────┐
│ Actions                          │
├──────────────────────────────────┤
│ [✏️ Edit] [🔑 Reset] [🗑️ Delete] │
└──────────────────────────────────┘
```

---

## Validation Rules

### Create/Edit Agent

**Name:**
- Required
- 2-100 characters
- No special characters except spaces, hyphens, apostrophes

**Email:**
- Required
- Valid email format
- Unique in database (case-insensitive)
- Max 255 characters

**Role:**
- Required
- Must be one of: agent, admin, csr_agent, internal_agent, life_admin

**Agent Type:**
- Required
- Must be one of: call_center, sales_agent, csr_agent, internal_agent

**Branch ID:**
- Optional
- Must be valid branch ID from database
- Required if agent_type is 'internal'

**Sales Agent ID:**
- Optional
- Max 50 characters
- Alphanumeric and hyphens only

**Admin LOB:**
- Optional
- Must be one of: life, health, motor, nonmotor
- Only applicable for admin roles

**Active:**
- Boolean
- Default: true

---

## Error Handling

### Create Agent Errors
- Duplicate email → "Email already exists"
- Invalid email format → "Please enter a valid email"
- Missing required fields → "This field is required"
- API error → "Failed to create agent: [error message]"

### Edit Agent Errors
- Duplicate email → "Email already in use by another agent"
- Invalid data → "Please check all fields"
- API error → "Failed to update agent: [error message]"

### Delete Agent Errors
- Agent has active customers → "Cannot delete agent with active customers"
- API error → "Failed to delete agent: [error message]"

### Password Reset Errors
- API error → "Failed to reset password: [error message]"

---

## Security Considerations

### Password Security
1. **Generation:** 8 characters, alphanumeric, no ambiguous chars
2. **Storage:** Plain text in `password_hash` field (NOT SECURE - future improvement needed)
3. **Display:** Only show password once to admin during creation/reset
4. **Transmission:** Use HTTPS for all API calls

**⚠️ Security Warning:** Passwords are stored as plain text. This is NOT secure and should be improved in the future with proper hashing (bcrypt, Argon2, etc.).

### Access Control
1. Only Admin and Life Admin can create/delete agents
2. Only Admin can reset passwords
3. Agents cannot edit their own role or permissions
4. Log all admin actions (create, edit, delete, password reset)

### Data Validation
1. Server-side validation for all inputs
2. Sanitize all user inputs
3. Prevent SQL injection
4. Validate email uniqueness on server
5. Rate limiting for password reset

---

## Testing Checklist

### Create Agent
- [ ] Create agent with all fields
- [ ] Create agent with only required fields
- [ ] Duplicate email validation
- [ ] Invalid email format validation
- [ ] Password generation works
- [ ] Password is hashed before storage
- [ ] Success message shows password
- [ ] Agent appears in list immediately

### Edit Agent
- [ ] Edit name successfully
- [ ] Edit email successfully
- [ ] Edit email to duplicate (should fail)
- [ ] Edit role successfully
- [ ] Edit agent type successfully
- [ ] Edit branch successfully
- [ ] Edit sales_agent_id successfully
- [ ] Edit admin_lob successfully
- [ ] Toggle active status
- [ ] All changes persist after refresh

### Delete Agent
- [ ] Delete confirmation shows correct agent
- [ ] Cancel button works
- [ ] Delete removes agent from list
- [ ] Delete removes agent from database
- [ ] Cannot delete agent with customers (if implemented)
- [ ] Success message appears

### Password Reset
- [ ] Reset generates new password
- [ ] New password is displayed
- [ ] Copy to clipboard works
- [ ] Password is hashed before storage
- [ ] Agent can login with new password
- [ ] Old password no longer works

### Security
- [ ] Passwords are generated securely
- [ ] Passwords stored as plain text (documented limitation)
- [ ] Only authorized users can access features
- [ ] All API calls use authentication
- [ ] Input validation prevents injection
- [ ] Error messages don't leak sensitive info

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Backup database

### Deployment Steps
1. [ ] Deploy backend changes (if any)
2. [ ] Test backend endpoints
3. [ ] Deploy frontend changes
4. [ ] Clear browser cache
5. [ ] Test all features in production
6. [ ] Monitor error logs
7. [ ] Notify admin users of new features

### Post-Deployment
- [ ] Verify all features work
- [ ] Check error logs
- [ ] Monitor performance
- [ ] Gather user feedback
- [ ] Document any issues

---

## Estimated Effort

### Development Time
- **Phase 1 (Password Utility):** 1 hour
- **Phase 2 (Create Agent):** 6-8 hours
- **Phase 3 (Edit More Fields):** 4-6 hours
- **Phase 4 (Password Reset):** 4-6 hours
- **Phase 5 (Delete Agent):** 3-4 hours
- **Phase 6 (Testing):** 4-6 hours

**Total:** 22-31 hours (3-4 days)

### Complexity
- **Password Utility:** Low (simple generation)
- **Create Agent:** Medium (form validation, password generation)
- **Edit More Fields:** Low (extend existing modal)
- **Password Reset:** Medium (security considerations)
- **Delete Agent:** Low (confirmation modal)

---

## Dependencies

### NPM Packages
- No new packages required
- `react-hook-form` - Already installed
- `react-query` - Already installed
- `lucide-react` - Already installed (for icons)

### Backend Requirements
- No backend changes required
- Passwords stored as plain text in `password_hash` field
- Email uniqueness validation (existing)
- Proper error responses (existing)

---

## Future Enhancements

### Phase 7 (Future)
1. **Password Hashing** - Implement bcrypt or Argon2 for secure password storage
2. **Bulk Edit** - Edit multiple agents at once
3. **Bulk Delete** - Delete multiple agents at once
4. **Email Notifications** - Send welcome email with credentials
5. **Password Policy** - Configurable password requirements
6. **Audit Trail** - Log all admin actions to database
7. **Agent Activity Log** - View login history and actions
8. **Search & Filter** - Find agents quickly
9. **Pagination** - Handle large agent lists
10. **Sort Columns** - Click to sort by any column
11. **Export Agents** - Download agent list as CSV

---

## Notes

- All changes maintain backward compatibility
- Existing bulk agent creation continues to work
- No database schema changes required
- **Passwords stored as plain text (security limitation)**
- Test thoroughly before production deployment
- No backend/Xano changes needed
- Document all new features for users
- Provide training for admin users

---

## Questions for Clarification

1. **Delete Validation:** Should we prevent deletion if agent has active customers?
2. **Email Notifications:** Should we send welcome emails to new agents?
3. **Audit Logging:** Should we log admin actions to database or just console?
4. **Password Policy:** Any specific requirements (length, complexity)?
5. **Role Permissions:** Can Life Admin delete agents or only Admin?
6. **Active Status:** Should inactive agents be hidden from lists?
7. **Bulk Operations:** Priority for bulk edit/delete features?
8. **Password Hashing:** When should we implement this security improvement?

---

## Approval Required

Before proceeding with implementation, please confirm:

- [ ] Approve overall approach
- [ ] Approve UI/UX mockups
- [ ] Approve password hashing strategy (frontend vs backend)
- [ ] Approve validation rules
- [ ] Approve security measures
- [ ] Approve testing checklist
- [ ] Approve deployment plan
- [ ] Any additional requirements or changes

---

**Document Version:** 1.0  
**Created:** 2026-02-20  
**Status:** Awaiting Approval
