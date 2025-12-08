# CSL Dropdown Management - Frontend UI Design

## Overview
Admin interface for managing configurable dropdown options for CSL interaction forms without writing SQL.

---

## Why Frontend UI Instead of SQL Inserts?

### ✅ Benefits

| Aspect | SQL Inserts | Frontend UI |
|--------|-------------|-------------|
| **Ease of Use** | Requires SQL knowledge | Point and click |
| **Error Risk** | High (syntax errors) | Low (validated forms) |
| **Speed** | Slow (write SQL, test) | Fast (instant changes) |
| **Visibility** | Hard to see all options | Visual list |
| **Reordering** | Manual ORDER BY updates | Drag and drop |
| **Parent-Child** | Complex FK queries | Dropdown selection |
| **Audit Trail** | Manual logging | Built-in tracking |
| **User Training** | Technical training needed | Intuitive UI |
| **Safety** | Can break database | Validated, safe |
| **Flexibility** | Requires deployment | Real-time changes |

### 🎯 Recommendation

**Use Both:**
1. **SQL INSERT** - One-time initial data seeding (fast, bulk)
2. **Frontend UI** - Ongoing management (user-friendly, safe)

---

## Page Design: CSL Dropdown Configuration

### Component: `CSLDropdownConfig.jsx`

**Location:** `src/pages/admin/CSLDropdownConfig.jsx`

**Access:** Admin role only

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  🔧 CSL DROPDOWN CONFIGURATION                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Select Field to Manage:                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Outcome 1                                              ▼ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Outcome 1 Options                        [+ Add New]     │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                            │   │
│  │ ☰ Successfully Contacted                                  │   │
│  │   [Edit] [Delete] [✓ Active]                             │   │
│  │                                                            │   │
│  │ ☰ Not Reachable                                           │   │
│  │   [Edit] [Delete] [✓ Active]                             │   │
│  │   └─ 📁 Sub-Outcomes (3)              [Manage ▼]         │   │
│  │                                                            │   │
│  │ ☰ Wrong Number                                            │   │
│  │   [Edit] [Delete] [✓ Active]                             │   │
│  │                                                            │   │
│  │ ☰ Promise to Pay                                          │   │
│  │   [Edit] [Delete] [✓ Active]                             │   │
│  │   └─ 📁 Sub-Outcomes (5)              [Manage ▼]         │   │
│  │                                                            │   │
│  │ ☰ Dispute                                                 │   │
│  │   [Edit] [Delete] [✓ Active]                             │   │
│  │                                                            │   │
│  │ ☰ Already Paid                                            │   │
│  │   [Edit] [Delete] [✓ Active]                             │   │
│  │                                                            │   │
│  │ ☰ Callback Requested                                      │   │
│  │   [Edit] [Delete] [✗ Inactive]                           │   │
│  │                                                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  💡 Tip: Drag options to reorder. Changes save automatically.   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Features

### 1. Field Selector Dropdown

**Available Fields:**
- Outcome 1
- Sub-Outcome
- Recovery Type
- Standing Order Status
- Reason for Non-Payment
- Mode of Payment
- Promise to Pay Week
- Frequency

**Behavior:**
- Select field to view/manage its options
- Shows count of options for each field
- Auto-loads options when field selected

---

### 2. Option List

**Features:**
- ☰ **Drag Handle** - Reorder by dragging
- **Option Label** - Display text
- **Edit Button** - Opens edit modal
- **Delete Button** - Deletes with confirmation
- **Active Toggle** - Enable/disable option
- **Sub-Options Indicator** - Shows child count
- **Manage Button** - Expand to show children

**Visual States:**
- Active: Normal text, green checkmark
- Inactive: Gray text, red X
- Has Children: Folder icon with count

---

### 3. Add/Edit Modal

```
┌─────────────────────────────────────────────────────────┐
│  Add New Option                                    [×]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Field: Outcome 1                                       │
│                                                          │
│  Option Label *                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ Callback Requested                             │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Option Value *                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ callback_requested                             │    │
│  └────────────────────────────────────────────────┘    │
│  💡 Use lowercase with underscores                      │
│                                                          │
│  Display Order                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ 8                                              │    │
│  └────────────────────────────────────────────────┘    │
│  💡 Auto-calculated, can be changed                     │
│                                                          │
│  Status                                                 │
│  ☑ Active                                               │
│                                                          │
│  [Cancel]                              [Save Option]    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**For Sub-Outcomes:**
```
┌─────────────────────────────────────────────────────────┐
│  Add New Sub-Outcome                               [×]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Field: Sub-Outcome                                     │
│                                                          │
│  Parent Outcome *                                       │
│  ┌────────────────────────────────────────────────┐    │
│  │ Promise to Pay                               ▼ │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Option Label *                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ Will Pay Next Month                            │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Option Value *                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ will_pay_next_month                            │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  [Cancel]                              [Save Option]    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

### 4. Delete Confirmation

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️ Confirm Delete                                 [×]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Are you sure you want to delete this option?           │
│                                                          │
│  Option: "Callback Requested"                           │
│                                                          │
│  ⚠️ Warning: This action cannot be undone.              │
│                                                          │
│  Existing interactions using this option will remain    │
│  unchanged, but agents won't be able to select it       │
│  for new interactions.                                  │
│                                                          │
│  [Cancel]                              [Delete Option]  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

### 5. Nested Sub-Options View

```
┌──────────────────────────────────────────────────────────┐
│  Outcome 1 Options                        [+ Add New]    │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ☰ Promise to Pay                                         │
│    [Edit] [Delete] [✓ Active]                            │
│    └─ 📁 Sub-Outcomes (5)              [Collapse ▲]      │
│                                                            │
│       ☰ Will Pay Today                                    │
│         [Edit] [Delete] [✓ Active]                       │
│                                                            │
│       ☰ Will Pay This Week                                │
│         [Edit] [Delete] [✓ Active]                       │
│                                                            │
│       ☰ Will Pay Next Week                                │
│         [Edit] [Delete] [✓ Active]                       │
│                                                            │
│       ☰ Will Pay End of Month                             │
│         [Edit] [Delete] [✓ Active]                       │
│                                                            │
│       ☰ Financial Difficulty                              │
│         [Edit] [Delete] [✓ Active]                       │
│                                                            │
│       [+ Add Sub-Outcome]                                 │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

---

## User Workflows

### Workflow 1: Add New Outcome

1. Admin selects "Outcome 1" from field dropdown
2. Clicks "+ Add New" button
3. Modal opens with form
4. Fills in:
   - Option Label: "Callback Requested"
   - Option Value: "callback_requested" (auto-generated from label)
   - Display Order: 8 (auto-calculated)
   - Status: Active (checked)
5. Clicks "Save Option"
6. Modal closes
7. New option appears in list
8. Success message: "✅ Option added successfully"
9. CSL agents see new option immediately

---

### Workflow 2: Add Sub-Outcome

1. Admin selects "Sub-Outcome" from field dropdown
2. Clicks "+ Add New" button
3. Modal opens with parent dropdown
4. Selects parent: "Promise to Pay"
5. Fills in:
   - Option Label: "Will Pay Next Month"
   - Option Value: "will_pay_next_month"
6. Clicks "Save Option"
7. New sub-outcome appears under "Promise to Pay"
8. Success message: "✅ Sub-outcome added successfully"

---

### Workflow 3: Reorder Options

1. Admin hovers over option
2. Drag handle (☰) appears
3. Clicks and drags option to new position
4. Drops option
5. System auto-saves new order
6. Success message: "✅ Order updated"
7. Display order updated in database
8. CSL agents see new order immediately

---

### Workflow 4: Edit Option

1. Admin clicks "Edit" button
2. Modal opens with pre-filled data
3. Changes option label to "Successfully Reached"
4. Clicks "Save Option"
5. Option updates in list
6. Success message: "✅ Option updated successfully"

---

### Workflow 5: Disable Option

1. Admin clicks active toggle (✓)
2. Toggle changes to (✗)
3. Option becomes grayed out
4. Confirmation: "Option disabled. Agents won't see this option."
5. CSL agents no longer see option in dropdown
6. Existing interactions with this option remain intact

---

### Workflow 6: Delete Option

1. Admin clicks "Delete" button
2. Confirmation modal appears
3. Admin reads warning
4. Clicks "Delete Option"
5. Option removed from list
6. Success message: "✅ Option deleted successfully"
7. Existing data preserved, but option unavailable for new interactions

---

## Service Layer

### File: `src/services/cslDropdownService.js`

```javascript
import { apiClient } from './apiClient'

class CSLDropdownService {
  
  // Get list of all dropdown fields
  async getDropdownFields() {
    const response = await apiClient.get('/csl_dropdown_options/fields')
    return response.data
  }
  
  // Get all options for a specific field
  async getOptionsForField(fieldName) {
    const response = await apiClient.get(`/csl_dropdown_options/field/${fieldName}`)
    return response.data
  }
  
  // Get child options for a parent
  async getChildOptions(parentId) {
    const response = await apiClient.get(`/csl_dropdown_options/children/${parentId}`)
    return response.data
  }
  
  // Create new option
  async createOption(data) {
    const response = await apiClient.post('/csl_dropdown_options', data)
    return response.data
  }
  
  // Update existing option
  async updateOption(id, data) {
    const response = await apiClient.patch(`/csl_dropdown_options/${id}`, data)
    return response.data
  }
  
  // Delete option
  async deleteOption(id) {
    const response = await apiClient.delete(`/csl_dropdown_options/${id}`)
    return response.data
  }
  
  // Reorder options
  async reorderOptions(fieldName, orderArray) {
    // orderArray: [{ id: 1, display_order: 1 }, { id: 2, display_order: 2 }, ...]
    const response = await apiClient.post('/csl_dropdown_options/reorder', {
      field_name: fieldName,
      order: orderArray
    })
    return response.data
  }
  
  // Toggle active status
  async toggleActive(id, isActive) {
    const response = await apiClient.patch(`/csl_dropdown_options/${id}`, {
      is_active: isActive
    })
    return response.data
  }
}

export const cslDropdownService = new CSLDropdownService()
```

---

## Component Structure

```
src/pages/admin/CSLDropdownConfig.jsx
  ├─ FieldSelector (dropdown)
  ├─ OptionList (draggable list)
  │   ├─ OptionRow (individual option)
  │   │   ├─ DragHandle
  │   │   ├─ OptionLabel
  │   │   ├─ EditButton
  │   │   ├─ DeleteButton
  │   │   ├─ ActiveToggle
  │   │   └─ SubOptionsIndicator
  │   └─ SubOptionsList (nested)
  ├─ AddEditModal
  │   ├─ ParentSelector (for sub-outcomes)
  │   ├─ LabelInput
  │   ├─ ValueInput
  │   ├─ DisplayOrderInput
  │   └─ ActiveCheckbox
  └─ DeleteConfirmModal
```

---

## Validation Rules

### Option Label
- Required
- Max 100 characters
- Can contain spaces, letters, numbers
- Example: "Successfully Contacted"

### Option Value
- Required
- Max 100 characters
- Lowercase only
- Underscores allowed
- No spaces
- Pattern: `^[a-z0-9_]+$`
- Example: "successfully_contacted"
- Auto-generated from label (optional)

### Display Order
- Integer
- Auto-calculated as max + 1
- Can be manually changed
- Unique within field_name

### Parent Option (for sub-outcomes)
- Required for sub-outcomes
- Must be valid parent option ID
- Dropdown populated from parent field

---

## Security & Access Control

### Access Control
```javascript
// In App.jsx routing
{user.role === 'admin' && (
  <Route path="/admin/csl/dropdown-config" element={<CSLDropdownConfig />} />
)}

// In component
const { user } = useAuth()
if (user.role !== 'admin') {
  return <Navigate to="/dashboard" />
}
```

### Permissions
- Only **admin** role can access
- All CRUD operations require admin role
- API endpoints validate admin role server-side

---

## Error Handling

### Validation Errors
```javascript
{
  "error": "Validation failed",
  "details": {
    "option_value": "Must be lowercase with underscores only"
  }
}
```

### Duplicate Errors
```javascript
{
  "error": "Option already exists",
  "message": "An option with value 'callback_requested' already exists for field 'outcome_1'"
}
```

### Delete Errors
```javascript
{
  "error": "Cannot delete",
  "message": "This option has child options. Delete children first."
}
```

---

## UI Libraries & Dependencies

### Drag and Drop
```bash
npm install react-beautiful-dnd
```

### Icons
```bash
npm install lucide-react
```

### Form Handling
```bash
npm install react-hook-form
```

### Notifications
```bash
npm install react-hot-toast
```

---

## Implementation Phases

### Phase 1: Basic CRUD (Week 1)
- [ ] Create CSLDropdownConfig page
- [ ] Field selector dropdown
- [ ] List options for selected field
- [ ] Add new option modal
- [ ] Edit option modal
- [ ] Delete option with confirmation
- [ ] Basic validation

### Phase 2: Advanced Features (Week 2)
- [ ] Drag-and-drop reordering
- [ ] Enable/disable toggle
- [ ] Parent-child management
- [ ] Nested sub-options view
- [ ] Auto-generate option_value from label

### Phase 3: Polish (Week 3)
- [ ] Search/filter options
- [ ] Bulk operations (enable/disable multiple)
- [ ] Export options to JSON
- [ ] Import options from JSON
- [ ] Change history log
- [ ] Better error messages
- [ ] Loading states
- [ ] Empty states

---

## Testing Checklist

### Functional Testing
- [ ] Add new option
- [ ] Edit existing option
- [ ] Delete option
- [ ] Reorder options
- [ ] Enable/disable option
- [ ] Add sub-outcome with parent
- [ ] Delete parent with children (should fail)
- [ ] Duplicate option value (should fail)

### UI Testing
- [ ] Responsive design
- [ ] Drag and drop works smoothly
- [ ] Modals open/close correctly
- [ ] Validation messages display
- [ ] Success messages display
- [ ] Loading states show

### Integration Testing
- [ ] Options appear in CSL interaction form
- [ ] Disabled options don't appear
- [ ] Sub-outcomes appear when parent selected
- [ ] Order matches display_order
- [ ] Changes reflect immediately

---

## Benefits Summary

### For Admins
✅ No SQL knowledge required  
✅ Visual interface  
✅ Instant changes  
✅ Safe (validated)  
✅ Easy to train new admins  

### For Developers
✅ Less maintenance  
✅ No deployment for dropdown changes  
✅ Audit trail built-in  
✅ Extensible architecture  

### For CSL Agents
✅ Always up-to-date options  
✅ Relevant choices only  
✅ Organized dropdowns  
✅ Fast form completion  

---

## Future Enhancements

### Phase 4: Advanced Features
- [ ] Conditional logic (show option X only if Y selected)
- [ ] Option descriptions/tooltips
- [ ] Multi-language support
- [ ] Option usage statistics
- [ ] Bulk import from CSV
- [ ] Version history with rollback
- [ ] Option templates
- [ ] Duplicate detection

---

**Document Version:** 1.0  
**Last Updated:** December 6, 2025  
**Status:** Ready for Implementation  
**Priority:** Medium (after core CSL features)
