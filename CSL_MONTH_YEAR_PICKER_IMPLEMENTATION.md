# CSL Month-Year Picker Implementation

## Overview
Change the policy upload `data_as_of_date` field from a full date picker to a Month-Year picker to ensure consistency, prevent errors, and enable proper monthly data management.

**Status:** 📋 Planned - Ready for Implementation  
**Priority:** HIGH  
**Date:** December 7, 2025

---

## Problem Statement

### Current Implementation Issues

**Current UI:**
```
Data As Of Date: [dd/mm/yyyy] 📅
Example: 31/08/2025
```

**Problems:**
1. ❌ Admin can select ANY date (1st, 15th, 31st, etc.)
2. ❌ Inconsistent dates for same month across uploads
3. ❌ UPSERT logic breaks when same month uploaded with different dates
4. ❌ Confusing for agents viewing data
5. ❌ Hard to query and filter by month
6. ❌ No standardization

**Example Failure Scenario:**
```
Upload 1: Admin selects 15/02/2025
  → Stored as: "2025-02-15"
  → 300 policies uploaded

Upload 2 (Correction): Admin selects 28/02/2025
  → Stored as: "2025-02-28"
  → 305 policies uploaded

Result: TWO sets of February data! ❌
  → Agents see 605 policies instead of 305
  → UPSERT doesn't work (different dates)
  → Data inconsistency
```

---

## Proposed Solution

### Month-Year Picker

**New UI:**
```
┌─────────────────────────────────────────────────────┐
│  Upload CSL Policies                                 │
│                                                      │
│  Data Month *                                        │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ February  ▼  │  │   2025    ▼  │                │
│  └──────────────┘  └──────────────┘                │
│                                                      │
│  This data represents: February 2025                │
│  Will be stored as: 2025-02-28 (month-end)         │
│                                                      │
│  CSV File *                                          │
│  [Choose File]  No file chosen                      │
│                                                      │
│  [Upload Policies]                                   │
└─────────────────────────────────────────────────────┘
```

**How It Works:**
1. Admin selects Month (dropdown) and Year (dropdown)
2. System automatically calculates last day of that month
3. Stores as standardized month-end date
4. All uploads for same month use same date

---

## Technical Implementation

### 1. Upload Page Changes

**File:** `src/pages/admin/csl/CSLPolicyUpload.jsx`

**Replace:**
```jsx
// OLD: Date picker
<input 
  type="date" 
  name="dataAsOfDate"
  placeholder="dd/mm/yyyy"
/>
```

**With:**
```jsx
// NEW: Month-Year picker
<div className="flex gap-4">
  <select name="month" required>
    <option value="">Select Month</option>
    <option value="1">January</option>
    <option value="2">February</option>
    <option value="3">March</option>
    <option value="4">April</option>
    <option value="5">May</option>
    <option value="6">June</option>
    <option value="7">July</option>
    <option value="8">August</option>
    <option value="9">September</option>
    <option value="10">October</option>
    <option value="11">November</option>
    <option value="12">December</option>
  </select>
  
  <select name="year" required>
    <option value="2024">2024</option>
    <option value="2025">2025</option>
    <option value="2026">2026</option>
  </select>
</div>

<p className="text-sm text-gray-600 mt-2">
  Will be stored as: {formatMonthEnd(selectedMonth, selectedYear)}
</p>
```

### 2. Date Calculation Function

**Add utility function:**
```javascript
/**
 * Calculate the last day of a given month
 * @param {number} month - Month (1-12)
 * @param {number} year - Year (e.g., 2025)
 * @returns {string} Date in YYYY-MM-DD format
 */
function getMonthEndDate(month, year) {
  // Create date for first day of NEXT month
  const nextMonth = new Date(year, month, 1)
  
  // Subtract one day to get last day of selected month
  const lastDay = new Date(nextMonth - 1)
  
  // Format as YYYY-MM-DD
  const yyyy = lastDay.getFullYear()
  const mm = String(lastDay.getMonth() + 1).padStart(2, '0')
  const dd = String(lastDay.getDate()).padStart(2, '0')
  
  return `${yyyy}-${mm}-${dd}`
}

// Examples:
getMonthEndDate(2, 2025)  // "2025-02-28"
getMonthEndDate(1, 2025)  // "2025-01-31"
getMonthEndDate(2, 2024)  // "2024-02-29" (leap year)
getMonthEndDate(4, 2025)  // "2025-04-30"
```

### 3. Upload Process Logic

**Update upload handler:**
```javascript
async function handleUpload(csvData, selectedMonth, selectedYear) {
  // Calculate standardized month-end date
  const dataAsOfDate = getMonthEndDate(selectedMonth, selectedYear)
  
  console.log(`Uploading data for: ${getMonthName(selectedMonth)} ${selectedYear}`)
  console.log(`Stored as: ${dataAsOfDate}`)
  
  // Process each policy
  for (const row of csvData) {
    await upsertPolicy({
      ...row,
      data_as_of_date: dataAsOfDate  // Standardized date
    })
  }
}
```

---

## Agent Dashboard Changes

### Tile-Based Month Selector with Confirmation

**File:** `src/pages/csl/CSLDashboard.jsx`

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  CSL Dashboard                                                       │
│                                                                      │
│  📅 Select Data Month:                                              │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │  📊 CURRENT      │  │  📁 January 2025 │  │  📁 Dec 2024     │ │
│  │                  │  │                  │  │                  │ │
│  │ February 2025    │  │  500 policies    │  │  480 policies    │ │
│  │                  │  │                  │  │                  │ │
│  │  305 policies    │  │  [View Archive]  │  │  [View Archive]  │ │
│  │                  │  │                  │  │                  │ │
│  │  ✓ ACTIVE        │  │  🔒 Archived     │  │  🔒 Archived     │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                      │
│  [Policy List - February 2025]                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Add tile-based month selector:**
```jsx
<div className="mb-6">
  <label className="block text-sm font-medium text-gray-700 mb-3">
    📅 Select Data Month:
  </label>
  
  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {availableMonths.map((month, index) => (
      <div
        key={month.value}
        onClick={() => handleMonthSelect(month)}
        className={`
          relative p-4 rounded-lg border-2 cursor-pointer transition-all
          ${month.isLatest 
            ? 'border-green-500 bg-green-50 shadow-lg' 
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }
          ${selectedMonth === month.value ? 'ring-2 ring-blue-500' : ''}
        `}
      >
        {/* Badge */}
        <div className="flex items-center justify-between mb-2">
          <span className={`
            text-xs font-semibold px-2 py-1 rounded
            ${month.isLatest 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-400 text-white'
            }
          `}>
            {month.isLatest ? '📊 CURRENT' : '📁 ARCHIVED'}
          </span>
          {month.isLatest && (
            <span className="text-green-600 text-xl">✓</span>
          )}
          {!month.isLatest && (
            <span className="text-gray-400 text-xl">🔒</span>
          )}
        </div>
        
        {/* Month Name */}
        <h3 className={`
          text-lg font-bold mb-1
          ${month.isLatest ? 'text-green-900' : 'text-gray-600'}
        `}>
          {month.label}
        </h3>
        
        {/* Policy Count */}
        <p className={`
          text-sm mb-2
          ${month.isLatest ? 'text-green-700' : 'text-gray-500'}
        `}>
          {month.policyCount} policies
        </p>
        
        {/* Action Button */}
        {!month.isLatest && (
          <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            View Archive →
          </button>
        )}
      </div>
    ))}
  </div>
  
  {/* Current Selection Info */}
  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
    <p className="text-sm text-blue-800">
      <strong>Viewing:</strong> {selectedMonthLabel} 
      ({filteredPolicies.length} policies)
    </p>
  </div>
</div>
```

**Archive Confirmation Modal:**
```jsx
{showArchiveModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
      {/* Header */}
      <div className="flex items-center mb-4">
        <span className="text-3xl mr-3">⚠️</span>
        <h2 className="text-xl font-bold text-gray-900">
          Access Historical Data
        </h2>
      </div>
      
      {/* Content */}
      <div className="mb-6">
        <p className="text-gray-700 mb-4">
          You are about to view archived data from:
        </p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="font-bold text-yellow-900 text-lg">
            📁 {archiveMonthToOpen?.label}
          </p>
          <p className="text-yellow-700 text-sm">
            {archiveMonthToOpen?.policyCount} policies (Historical)
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This is old data for reference only.
            Active work should be done on the current month.
          </p>
        </div>
        
        <label className="block text-sm font-medium text-gray-700 mb-2">
          To confirm, type: <span className="font-mono bg-gray-100 px-2 py-1 rounded">Old Data</span>
        </label>
        <input
          type="text"
          value={confirmationText}
          onChange={(e) => setConfirmationText(e.target.value)}
          placeholder="Type here..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          autoFocus
        />
        
        {confirmationText && confirmationText !== 'Old Data' && (
          <p className="text-red-600 text-sm mt-2">
            ❌ Text doesn't match. Please type exactly: "Old Data"
          </p>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleCancelArchive}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirmArchive}
          disabled={confirmationText !== 'Old Data'}
          className={`
            flex-1 px-4 py-2 rounded-lg font-medium
            ${confirmationText === 'Old Data'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          Confirm Access
        </button>
      </div>
    </div>
  </div>
)}
```

**Load available months:**
```javascript
async function loadAvailableMonths() {
  // Get unique data_as_of_date values
  const response = await cslPolicyApi.get('/csl_policies')
  const policies = response.data || []
  
  // Extract unique months with policy counts
  const monthMap = {}
  policies.forEach(policy => {
    const date = policy.data_as_of_date
    if (!monthMap[date]) {
      monthMap[date] = { date, count: 0 }
    }
    monthMap[date].count++
  })
  
  // Convert to array and sort (newest first)
  const uniqueMonths = Object.values(monthMap)
    .sort((a, b) => b.date.localeCompare(a.date))
  
  // Format for tiles
  return uniqueMonths.map((item, index) => ({
    value: item.date,
    label: formatMonthYear(item.date),  // "February 2025"
    policyCount: item.count,
    isLatest: index === 0
  }))
}

function formatMonthYear(dateString) {
  const date = new Date(dateString)
  const month = date.toLocaleString('en-US', { month: 'long' })
  const year = date.getFullYear()
  return `${month} ${year}`
}
```

**Handle month selection with confirmation:**
```javascript
const [selectedMonth, setSelectedMonth] = useState(null)
const [showArchiveModal, setShowArchiveModal] = useState(false)
const [archiveMonthToOpen, setArchiveMonthToOpen] = useState(null)
const [confirmationText, setConfirmationText] = useState('')

function handleMonthSelect(month) {
  if (month.isLatest) {
    // Current month - no confirmation needed
    setSelectedMonth(month.value)
    setConfirmationText('')
  } else {
    // Archived month - show confirmation modal
    setArchiveMonthToOpen(month)
    setShowArchiveModal(true)
  }
}

function handleConfirmArchive() {
  if (confirmationText === 'Old Data') {
    setSelectedMonth(archiveMonthToOpen.value)
    setShowArchiveModal(false)
    setConfirmationText('')
    setArchiveMonthToOpen(null)
  }
}

function handleCancelArchive() {
  setShowArchiveModal(false)
  setConfirmationText('')
  setArchiveMonthToOpen(null)
}

// Auto-select latest month on load
useEffect(() => {
  if (availableMonths.length > 0 && !selectedMonth) {
    const latestMonth = availableMonths.find(m => m.isLatest)
    if (latestMonth) {
      setSelectedMonth(latestMonth.value)
    }
  }
}, [availableMonths])
```

**Filter policies by selected month:**
```javascript
// Filter policies for selected month
const filteredPolicies = allPolicies.filter(p => 
  p.data_as_of_date === selectedMonth
)
```

---

## Data Standardization

### Month-End Dates

**Standardized Format:**
```javascript
{
  "January 2025":   "2025-01-31",
  "February 2025":  "2025-02-28",
  "March 2025":     "2025-03-31",
  "April 2025":     "2025-04-30",
  "May 2025":       "2025-05-31",
  "June 2025":      "2025-06-30",
  "July 2025":      "2025-07-31",
  "August 2025":    "2025-08-31",
  "September 2025": "2025-09-30",
  "October 2025":   "2025-10-31",
  "November 2025":  "2025-11-30",
  "December 2025":  "2025-12-31"
}
```

**Leap Year Handling:**
```javascript
"February 2024": "2024-02-29"  // Leap year
"February 2025": "2025-02-28"  // Regular year
```

---

## Benefits

### 1. Consistency ✅
- All data for a month uses same date
- No confusion about which date to use
- Standardized across all uploads

### 2. UPSERT Works Correctly ✅
```javascript
// First upload: February 2025
data_as_of_date = "2025-02-28"
→ 300 policies created

// Correction upload: February 2025
data_as_of_date = "2025-02-28"  // Same date!
→ 300 policies UPDATED, 5 new policies INSERTED
→ Total: 305 policies ✓
```

### 3. Prevents Stale Data ✅
```javascript
// January upload: 500 policies
data_as_of_date = "2025-01-31"

// February upload: 300 policies
data_as_of_date = "2025-02-28"

// Agent selects "February 2025"
→ Shows only 300 policies ✓
→ 200 resolved policies don't appear ✓
```

### 4. Simple Queries ✅
```javascript
// Get February policies
WHERE data_as_of_date = "2025-02-28"

// Get Q1 policies
WHERE data_as_of_date IN ("2025-01-31", "2025-02-28", "2025-03-31")

// Get policies from last 3 months
WHERE data_as_of_date >= "2024-11-30"
ORDER BY data_as_of_date DESC
```

### 5. Better UX ✅
- Admin: Clear month selection, no date confusion
- Agent: Visual tile-based selector, current month highlighted
- Archive Protection: Confirmation required for old data access
- Reports: Clean month-over-month comparisons

### 6. Error Prevention ✅
- Can't select wrong day of month
- Can't create inconsistent dates
- Can't accidentally work on archived data
- Typing confirmation prevents mistakes
- Enforces business logic

---

## Implementation Checklist

### Phase 1: Upload Page
- [ ] Replace date picker with month/year dropdowns
- [ ] Add `getMonthEndDate()` utility function
- [ ] Update upload handler to calculate month-end date
- [ ] Add preview text showing calculated date
- [ ] Test with various months (including February, leap years)
- [ ] Update validation logic

### Phase 2: Agent Dashboard
- [ ] Create tile-based month selector component
- [ ] Implement `loadAvailableMonths()` function with policy counts
- [ ] Add `formatMonthYear()` display function
- [ ] Style current month tile (green, checkmark, "CURRENT" badge)
- [ ] Style archived month tiles (gray, lock icon, "ARCHIVED" badge)
- [ ] Create archive confirmation modal
- [ ] Add "Old Data" text input validation
- [ ] Implement month selection logic with confirmation
- [ ] Filter policies by selected month
- [ ] Default to latest month on load
- [ ] Show policy count on each tile
- [ ] Add responsive grid layout (mobile-friendly)

### Phase 3: Policy Detail Page
- [ ] Display data month in policy header
- [ ] Show "Data as of: February 2025" label
- [ ] Ensure interactions work across months

### Phase 4: Reports
- [ ] Update reports to use month selector
- [ ] Add month-over-month comparison
- [ ] Trend analysis by month

### Phase 5: Testing
- [ ] Test upload with different months
- [ ] Test correction uploads (same month)
- [ ] Test leap year (February 2024)
- [ ] Test month transitions (Dec → Jan)
- [ ] Test agent dashboard filtering
- [ ] Test with multiple months of data
- [ ] Verify UPSERT logic works correctly

### Phase 6: Documentation
- [ ] Update user guide
- [ ] Update admin training materials
- [ ] Document month-end date logic
- [ ] Add troubleshooting guide

---

## Migration Strategy

### For Existing Data

**If data already exists with various dates:**

**Option 1: Normalize Existing Data**
```sql
-- Update all dates to month-end
UPDATE csl_policies
SET data_as_of_date = LAST_DAY(data_as_of_date)
```

**Option 2: Leave As-Is**
- New uploads use month-end dates
- Old data remains unchanged
- Dashboard shows all unique dates
- Gradually normalizes over time

**Recommendation:** Option 1 (normalize) for clean start

---

## Edge Cases

### 1. Leap Years
```javascript
getMonthEndDate(2, 2024)  // "2024-02-29" ✓
getMonthEndDate(2, 2025)  // "2025-02-28" ✓
```
**Handled:** Automatic by JavaScript Date object

### 2. Year Rollover
```javascript
December 2024 → "2024-12-31"
January 2025  → "2025-01-31"
```
**Handled:** Chronological sorting works correctly

### 3. Multiple Uploads Same Day
```javascript
// Morning upload: February 2025
data_as_of_date = "2025-02-28"

// Afternoon correction: February 2025
data_as_of_date = "2025-02-28"  // Same!
```
**Handled:** UPSERT updates existing records

### 4. Future Months
```javascript
// Current: December 2025
// Admin uploads: January 2026
data_as_of_date = "2026-01-31"
```
**Handled:** Allow future months for planning

---

## User Training

### Admin Training

**Before Upload:**
1. Select the month this data represents
2. Select the year
3. System shows calculated month-end date
4. Upload CSV file
5. All policies tagged with that month

**Key Points:**
- Always use same month for corrections
- Month-end date calculated automatically
- One month = One date (consistency)

### Agent Training

**Dashboard Usage:**
1. Current month tile is highlighted in green with checkmark
2. Click current month tile to view active policies (no confirmation needed)
3. To view historical data:
   - Click on archived month tile (gray with lock icon)
   - Read the warning message
   - Type "Old Data" exactly in the confirmation box
   - Click "Confirm Access"
4. Log interactions (linked to policy, not month)

**Key Points:**
- Latest month shown by default and highlighted
- Visual distinction between current and archived data
- Must confirm to access old data (prevents accidents)
- Can view previous months for reference after confirmation
- Interactions preserved across months
- Tiles show policy count for each month

---

## Success Metrics

### Before Implementation:
- ❌ Inconsistent dates for same month
- ❌ UPSERT failures
- ❌ Stale data visible to agents
- ❌ Confusion about which date to use

### After Implementation:
- ✅ 100% consistent month-end dates
- ✅ UPSERT works every time
- ✅ Agents see only current month data by default
- ✅ Visual tile-based month selection
- ✅ Archive protection with confirmation modal
- ✅ Prevents accidental work on old data
- ✅ Clear month selection process
- ✅ Clean month-over-month reporting

---

## Tile-Based UX Benefits

### Why Tiles Over Dropdown?

**Visual Hierarchy:**
- Current month immediately visible (green, prominent)
- Archived months clearly distinguished (gray, muted)
- No need to open dropdown to see options

**Error Prevention:**
- Confirmation modal prevents accidental archive access
- Typing "Old Data" ensures intentional action
- Educational message about data freshness

**Mobile Friendly:**
- Large touch targets (tiles)
- Responsive grid layout
- Works well on tablets and phones

**Information Density:**
- Shows policy count at a glance
- Status indicators (CURRENT, ARCHIVED)
- Visual icons (checkmark, lock)

**User Psychology:**
- Green = safe to work on
- Gray + lock = proceed with caution
- Confirmation = deliberate action required

### Comparison

**Old Approach (Dropdown):**
```
❌ All months look the same
❌ Easy to accidentally select wrong month
❌ No visual warning about old data
❌ Small click target
❌ Hidden until opened
```

**New Approach (Tiles):**
```
✅ Current month visually distinct
✅ Confirmation required for archives
✅ Clear warning about old data
✅ Large, easy-to-click tiles
✅ All options visible at once
✅ Policy counts shown
✅ Mobile-friendly
```

---

## Files to Modify

### Frontend:
1. `src/pages/admin/csl/CSLPolicyUpload.jsx` - Upload UI
2. `src/pages/csl/CSLDashboard.jsx` - Tile-based month selector + confirmation modal
3. `src/pages/csl/CSLPolicyDetail.jsx` - Display month
4. `src/pages/csl/CSLReports.jsx` - Month filtering
5. `src/utils/dateHelpers.js` - NEW: Date utility functions
6. `src/components/csl/ArchiveConfirmationModal.jsx` - NEW: Reusable confirmation modal

### Backend:
- No changes needed (database field remains same)

### Documentation:
1. `CSL_MONTHLY_DATA_HANDLING.md` - Update
2. User training materials
3. Admin guide

---

## Timeline

**Estimated Effort:** 1-2 days

**Phase 1 (Day 1):**
- Morning: Implement upload page changes
- Afternoon: Test upload logic

**Phase 2 (Day 2):**
- Morning: Implement dashboard month selector
- Afternoon: Testing and documentation

---

## Approval Required

**Stakeholders:**
- [ ] Product Owner - Approve UX changes
- [ ] Admin Users - Review upload process
- [ ] Agent Users - Review dashboard changes
- [ ] Technical Lead - Approve implementation

---

## Notes

- This change is **backward compatible** (database field unchanged)
- Existing data can be normalized or left as-is
- No impact on interactions or payment data
- Improves data quality and user experience
- Industry standard for monthly reporting systems

---

**Document Version:** 1.0  
**Last Updated:** December 7, 2025  
**Status:** 📋 Ready for Implementation  
**Priority:** HIGH - Implement before production monthly uploads
