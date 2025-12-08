# CSL UX Improvements Plan

## Problem Statement
Current CSL implementation has poor UX that frustrates agents:
1. ❌ Policies don't move after interaction - agent can't track what's done
2. ❌ 5-step form requires excessive scrolling - wastes time
3. ❌ QR generation hidden in Step 5 - not intuitive, never gets used

## Solution: Simplified Agent Workflow

### Phase 1: Dashboard Tab Organization (PRIORITY 1)
**Goal:** Agent knows exactly which policies to work on

**Changes to `CSLDashboard.jsx`:**
- Add tab navigation at top of policy list
- **Tabs:**
  - 🔵 **To Contact** (no interactions yet) - DEFAULT VIEW
  - 🟢 **Contacted Today** (interacted today)
  - 🟡 **Follow-Up** (has follow-up date)
  - ⚪ **All Policies** (everything)

**Logic:**
- Filter policies based on interaction history
- Show count badges on each tab
- Default to "To Contact" so agent sees unworked policies first

**Files to modify:**
- `src/pages/csl/CSLDashboard.jsx` - Add tab state and filtering logic

---

### Phase 2: Quick Actions Panel (PRIORITY 2)
**Goal:** Instant QR generation like other users have

**Changes to `CSLPolicyDetail.jsx`:**
- Add **Quick Actions** sticky panel at top of policy detail page
- **Actions:**
  - 🔲 **Generate QR** → Shows QR immediately in modal
  - 📧 **Send Email** → Opens email modal with QR
  - 💬 **Send SMS** → Opens SMS modal
  - 📱 **WhatsApp** → Opens WhatsApp modal

**QR Generation Flow:**
1. Click "Generate QR" button
2. QR appears immediately in modal (like QuickQRGenerator)
3. Modal shows:
   - QR code image
   - Amount (editable)
   - Buttons: "Send Email", "Send WhatsApp", "Download", "Close"

**Files to modify:**
- `src/pages/csl/CSLPolicyDetail.jsx` - Add Quick Actions panel
- Create `src/components/csl/CSLQuickActionsPanel.jsx` - New component
- Create `src/components/csl/CSLQRModal.jsx` - QR display modal

---

### Phase 3: Simplified Interaction Form (PRIORITY 3)
**Goal:** No scrolling, all fields visible at once

**Changes to `CSLInteractionForm.jsx`:**
- **Remove 5-step wizard** - Replace with single scrollable page
- **Layout:**
  - Left column: Call details (date, outcome, remarks)
  - Right column: Recovery details (payment, PTP, follow-up)
  - Bottom: Contact updates (optional)
- **Remove "Actions" step** - Actions moved to Quick Actions panel
- Sticky "Save Interaction" button at bottom

**Files to modify:**
- `src/components/csl/CSLInteractionForm.jsx` - Complete redesign

---

## Implementation Order

### Step 1: Dashboard Tabs (30 min)
```javascript
// Add to CSLDashboard.jsx
const [activeTab, setActiveTab] = useState('to-contact')

const tabs = [
  { id: 'to-contact', label: 'To Contact', filter: (p) => p.interactionCount === 0 },
  { id: 'contacted', label: 'Contacted Today', filter: (p) => isContactedToday(p) },
  { id: 'follow-up', label: 'Follow-Up', filter: (p) => hasFollowUp(p) },
  { id: 'all', label: 'All Policies', filter: (p) => true }
]
```

### Step 2: Quick Actions Panel (45 min)
```javascript
// Add to CSLPolicyDetail.jsx
<CSLQuickActionsPanel 
  policy={policy}
  onQRGenerated={(qr) => setShowQRModal(true)}
  onEmailSent={() => showSuccess('Email sent')}
/>
```

### Step 3: Simplified Form (30 min)
```javascript
// Replace multi-step with single page
<div className="grid grid-cols-2 gap-6">
  <div>/* Call details */</div>
  <div>/* Recovery details */</div>
</div>
```

---

## Expected Results

**Before:**
- Agent clicks policy → Scrolls through 5 steps → Can't find QR → Policy still shows → Confused

**After:**
- Agent sees "To Contact" tab → Clicks policy → Clicks "Generate QR" → QR appears → Sends email → Logs call (one page) → Policy moves to "Contacted Today" → Clear!

---

## Files to Create
1. `src/components/csl/CSLQuickActionsPanel.jsx` - Quick action buttons
2. `src/components/csl/CSLQRModal.jsx` - QR display modal

## Files to Modify
1. `src/pages/csl/CSLDashboard.jsx` - Add tabs
2. `src/pages/csl/CSLPolicyDetail.jsx` - Add Quick Actions panel
3. `src/components/csl/CSLInteractionForm.jsx` - Simplify to single page

---

## Timeline
- **Phase 1 (Dashboard Tabs):** 30 minutes
- **Phase 2 (Quick Actions):** 45 minutes  
- **Phase 3 (Simplified Form):** 30 minutes
- **Total:** ~2 hours

---

## Success Criteria
✅ Agent can see which policies need attention (tabs)
✅ Agent can generate QR in 1 click (Quick Actions)
✅ Agent can log call without scrolling (single page form)
✅ Agent knows what they've worked on (policy moves to "Contacted")


---

## Phase 4: Auto-Assignment on Interaction (PRIORITY 4)
**Goal:** Automatically assign unassigned policies to agents when they log interactions

### Problem
- Agent sees 344 unassigned policies in "To Contact" tab
- Agent logs interaction on unassigned policy
- Policy stays in "To Contact" tab (doesn't move to "Contacted Today")
- Other agents can work on same policy (duplicate work)

### Solution
When an agent logs an interaction on an **unassigned policy**, automatically assign it to that agent.

**Changes to `cslPolicyService.js`:**
- Add `assignPolicyToAgent(policyId, agentId)` function
- Updates `assigned_agent_id` field in database

**Changes to `CSLInteractionForm.jsx`:**
- After creating interaction, check if policy is unassigned
- If unassigned, call `assignPolicyToAgent()`
- Refresh parent component to update dashboard

**Changes to `CSLPolicyDetail.jsx`:**
- Add callback to refresh policy data after interaction saved
- Update policy assignment status in UI

### Workflow After Fix
1. Agent sees 344 policies in "To Contact" tab (unassigned pool)
2. Agent clicks policy → Opens detail page
3. Agent logs interaction → Saves to database
4. **System auto-assigns policy to agent** ✨
5. Policy moves from "To Contact" → "Contacted Today"
6. Policy now belongs to agent (shows in "My Policies" count)
7. Other agents can't work on it (prevents duplicate work)

### Files to Modify
1. `src/services/csl/cslPolicyService.js` - Add assignment function
2. `src/components/csl/CSLInteractionForm.jsx` - Call assignment after interaction
3. `src/pages/csl/CSLPolicyDetail.jsx` - Refresh after interaction

### Expected Behavior
- **Before:** Policy stays in unassigned pool after interaction
- **After:** Policy automatically assigned to agent who worked on it

---

## Implementation Order - Phase 4

### Step 1: Add Assignment Service (15 min)
```javascript
// Add to cslPolicyService.js
async assignPolicyToAgent(policyId, agentId) {
  const response = await api.patch(`/csl_policies/${policyId}`, {
    assigned_agent_id: agentId
  })
  return response
}
```

### Step 2: Update Interaction Form (10 min)
```javascript
// In CSLInteractionForm.jsx handleSubmit()
await cslService.interaction.createInteraction(interactionData)

// Auto-assign if unassigned
if (!policy.assigned_agent_id) {
  await cslService.policy.assignPolicyToAgent(policy.id, user.id)
}

if (onSuccess) onSuccess()
```

### Step 3: Refresh Policy Detail (5 min)
```javascript
// In CSLPolicyDetail.jsx
const handleInteractionSuccess = async () => {
  setShowInteractionForm(false)
  await loadPolicyData() // Refresh to show new assignment
}
```

---

## Timeline - Phase 4
- **Step 1 (Assignment Service):** 15 minutes
- **Step 2 (Interaction Form):** 10 minutes  
- **Step 3 (Policy Detail Refresh):** 5 minutes
- **Total:** ~30 minutes

---

## Success Criteria - Phase 4
✅ Unassigned policy auto-assigns when agent logs interaction
✅ Policy moves from "To Contact" → "Contacted Today" after interaction
✅ Policy shows in agent's "My Policies" count
✅ Other agents can't see it in "To Contact" anymore
✅ No duplicate work on same policy
