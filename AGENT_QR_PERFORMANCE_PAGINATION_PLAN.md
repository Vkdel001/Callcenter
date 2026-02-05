# Agent QR Performance - Pagination Implementation Plan

## Overview

The "My QR Performance" screen currently displays only the 10 most recent QR transactions without pagination controls. This document outlines the plan to add full pagination functionality to allow agents to view all their historical QR transactions.

**Date**: February 5, 2026  
**Status**: Planning Phase  
**Priority**: Medium

---

## Current State Analysis

### Current Implementation

**File**: `src/pages/AgentQRSummary.jsx`

**Current Behavior**:
- Fetches ALL QR transactions for the selected time period
- Displays only the **10 most recent** transactions (hardcoded `.slice(0, 10)`)
- No pagination controls
- No way to view older transactions beyond the first 10

**Code Location** (Line 88):
```javascript
recent_transactions: transactions
  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  .slice(0, 10)  // ← HARDCODED LIMIT
```

### Problems Identified

1. **Limited Visibility**: Agents can only see 10 most recent transactions
2. **No Historical Access**: Cannot view older QR transactions
3. **Poor UX**: No indication that more transactions exist
4. **Wasted Data**: API fetches all transactions but only displays 10
5. **No User Control**: Cannot change number of items per page

---

## Proposed Solution

### 1. Add Pagination State Management

**New State Variables**:
```javascript
const [currentPage, setCurrentPage] = useState(1)
const [pageSize, setPageSize] = useState(10)
```

**Page Size Options**: 10, 25, 50, 100 transactions per page

### 2. Update Transaction Display Logic

**Replace**:
```javascript
recent_transactions: transactions
  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  .slice(0, 10)
```

**With**:
```javascript
// Calculate pagination
const totalTransactions = transactions.length
const totalPages = Math.ceil(totalTransactions / pageSize)
const startIndex = (currentPage - 1) * pageSize
const endIndex = startIndex + pageSize

// Get paginated transactions
const paginatedTransactions = transactions
  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  .slice(startIndex, endIndex)
```

### 3. Add Pagination Controls UI

**Location**: Below the transactions table

**Components**:
1. **Page Info Display**: "Showing X to Y of Z transactions"
2. **Page Size Selector**: Dropdown to change items per page
3. **Page Navigation**: Previous/Next buttons + page numbers
4. **Jump to Page**: Direct page number input (optional)

---

## Detailed Implementation Plan

### Phase 1: State Management

**File**: `src/pages/AgentQRSummary.jsx`

**Changes**:
1. Add pagination state variables
2. Add pagination calculation logic
3. Update `calculateStats()` function to use paginated data

**New State**:
```javascript
const [currentPage, setCurrentPage] = useState(1)
const [pageSize, setPageSize] = useState(10)
```

**Reset Logic**:
- Reset to page 1 when filters change (time period, LOB)
- Maintain page when refreshing data

### Phase 2: Update Display Logic

**Modify `calculateStats()` function**:

```javascript
const calculateStats = () => {
  const transactions = qrHistory.transactions || []
  
  // Sort all transactions
  const sortedTransactions = transactions
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  
  // Calculate pagination
  const totalTransactions = sortedTransactions.length
  const totalPages = Math.ceil(totalTransactions / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  
  // Get paginated transactions
  const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex)
  
  const stats = {
    total_generated: transactions.length,
    total_paid: transactions.filter(t => t.status === 'paid').length,
    total_pending: transactions.filter(t => t.status === 'pending').length,
    total_amount_generated: transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
    total_amount_paid: transactions
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => sum + parseFloat(t.payment_amount || t.amount || 0), 0),
    conversion_rate: 0,
    by_lob: {},
    by_qr_type: {},
    
    // Pagination data
    recent_transactions: paginatedTransactions,
    pagination: {
      currentPage,
      pageSize,
      totalTransactions,
      totalPages,
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, totalTransactions)
    }
  }
  
  // ... rest of the function
  
  return stats
}
```

### Phase 3: Add Pagination UI Components

**Location**: After the `</table>` closing tag, before the closing `</div>`

**UI Structure**:

```jsx
{/* Pagination Controls */}
{stats.pagination.totalTransactions > 0 && (
  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      
      {/* Left: Page Info */}
      <div className="text-sm text-gray-700">
        Showing <span className="font-medium">{stats.pagination.startIndex}</span> to{' '}
        <span className="font-medium">{stats.pagination.endIndex}</span> of{' '}
        <span className="font-medium">{stats.pagination.totalTransactions}</span> transactions
      </div>
      
      {/* Center: Page Size Selector */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-700">Show:</label>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value))
            setCurrentPage(1) // Reset to first page
          }}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span className="text-sm text-gray-700">per page</span>
      </div>
      
      {/* Right: Page Navigation */}
      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded-md text-sm font-medium ${
            currentPage === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Previous
        </button>
        
        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {renderPageNumbers()}
        </div>
        
        {/* Next Button */}
        <button
          onClick={() => setCurrentPage(prev => Math.min(stats.pagination.totalPages, prev + 1))}
          disabled={currentPage === stats.pagination.totalPages}
          className={`px-3 py-1 rounded-md text-sm font-medium ${
            currentPage === stats.pagination.totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Next
        </button>
      </div>
      
    </div>
  </div>
)}
```

### Phase 4: Page Number Rendering Logic

**Add helper function**:

```javascript
const renderPageNumbers = () => {
  const totalPages = stats.pagination.totalPages
  const current = currentPage
  const pages = []
  
  // Always show first page
  pages.push(1)
  
  // Show pages around current page
  if (current > 3) {
    pages.push('...')
  }
  
  for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) {
    pages.push(i)
  }
  
  // Show last page
  if (current < totalPages - 2) {
    pages.push('...')
  }
  
  if (totalPages > 1) {
    pages.push(totalPages)
  }
  
  return pages.map((page, index) => {
    if (page === '...') {
      return (
        <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
          ...
        </span>
      )
    }
    
    return (
      <button
        key={page}
        onClick={() => setCurrentPage(page)}
        className={`px-3 py-1 rounded-md text-sm font-medium ${
          currentPage === page
            ? 'bg-blue-600 text-white'
            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        {page}
      </button>
    )
  })
}
```

---

## UI/UX Enhancements

### 1. Empty State

When no transactions exist:
```jsx
<tr>
  <td colSpan="7" className="px-6 py-12 text-center">
    <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
    <p className="text-gray-500">No QR transactions found for the selected period</p>
    <p className="text-sm text-gray-400 mt-1">
      Generate some QR codes to see your performance metrics here
    </p>
  </td>
</tr>
```

### 2. Loading State

While fetching data:
```jsx
{isLoading && (
  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
    <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
  </div>
)}
```

### 3. Responsive Design

**Mobile View**:
- Stack pagination controls vertically
- Show simplified page navigation (Previous/Next only)
- Reduce page size options

**Tablet View**:
- Show page info and navigation side by side
- Show limited page numbers (current ± 1)

**Desktop View**:
- Full pagination controls
- Show more page numbers (current ± 2)

---

## Edge Cases to Handle

### 1. Page Out of Bounds

**Scenario**: User is on page 5, changes filter, now only 2 pages exist

**Solution**:
```javascript
useEffect(() => {
  // Reset to page 1 when filters change
  setCurrentPage(1)
}, [selectedPeriod, selectedLOB])
```

### 2. Page Size Change

**Scenario**: User is on page 3 with 10 items/page, changes to 50 items/page

**Solution**:
```javascript
const handlePageSizeChange = (newSize) => {
  setPageSize(newSize)
  setCurrentPage(1) // Always reset to first page
}
```

### 3. No Transactions

**Scenario**: No transactions exist for selected period

**Solution**: Hide pagination controls, show empty state

### 4. Single Page

**Scenario**: Total transactions fit in one page

**Solution**: Hide pagination controls or show disabled state

---

## Performance Considerations

### Current Performance

**Issue**: Fetching ALL transactions but only displaying 10
- Inefficient for agents with 100+ transactions
- Unnecessary data transfer
- Slow initial load

### Optimization Options

#### Option 1: Client-Side Pagination (Recommended for Phase 1)

**Pros**:
- Simple implementation
- No API changes needed
- Fast page navigation
- Works with existing code

**Cons**:
- Fetches all data upfront
- Slower initial load for large datasets

**When to Use**: When total transactions < 500

#### Option 2: Server-Side Pagination (Future Enhancement)

**Pros**:
- Fast initial load
- Efficient for large datasets
- Reduced data transfer

**Cons**:
- Requires API changes
- More complex implementation
- Slower page navigation (API call per page)

**When to Use**: When total transactions > 500

**API Changes Needed**:
```javascript
// Update qrTransactionService.getAgentHistory()
async getAgentHistory(agentId, filters = {}) {
  const params = {
    ...filters,
    page: filters.page || 1,
    per_page: filters.per_page || 10
  }
  
  const response = await qrTransactionsApi.get(this.baseUrl, { params })
  
  return {
    success: true,
    transactions: response.data,
    pagination: {
      currentPage: params.page,
      pageSize: params.per_page,
      totalTransactions: response.headers['x-total-count'] || response.data.length,
      totalPages: Math.ceil(response.headers['x-total-count'] / params.per_page)
    }
  }
}
```

---

## Testing Plan

### Manual Testing

1. **Basic Pagination**:
   - [ ] Navigate to next page
   - [ ] Navigate to previous page
   - [ ] Click specific page number
   - [ ] Verify correct transactions displayed

2. **Page Size Changes**:
   - [ ] Change from 10 to 25 items
   - [ ] Change from 25 to 50 items
   - [ ] Change from 50 to 100 items
   - [ ] Verify page resets to 1

3. **Filter Changes**:
   - [ ] Change time period (7 days → 30 days)
   - [ ] Change LOB (All → Life)
   - [ ] Verify page resets to 1
   - [ ] Verify correct data displayed

4. **Edge Cases**:
   - [ ] Test with 0 transactions
   - [ ] Test with exactly 10 transactions (1 page)
   - [ ] Test with 11 transactions (2 pages)
   - [ ] Test with 100+ transactions
   - [ ] Test page navigation at boundaries

5. **Responsive Design**:
   - [ ] Test on mobile (< 640px)
   - [ ] Test on tablet (640px - 1024px)
   - [ ] Test on desktop (> 1024px)

### Automated Testing

**Test File**: `test-agent-qr-pagination.js`

```javascript
// Test pagination logic
describe('Agent QR Performance Pagination', () => {
  test('should display correct page info', () => {
    // Test page info display
  })
  
  test('should navigate to next page', () => {
    // Test next button
  })
  
  test('should navigate to previous page', () => {
    // Test previous button
  })
  
  test('should change page size', () => {
    // Test page size selector
  })
  
  test('should reset page on filter change', () => {
    // Test filter change behavior
  })
})
```

---

## Implementation Checklist

### Phase 1: Core Functionality (Pagination)
- [ ] Add pagination state variables
- [ ] Update `calculateStats()` function
- [ ] Add pagination calculation logic
- [ ] Update transaction display to use paginated data
- [ ] Test basic pagination

### Phase 2: UI Components (Pagination)
- [ ] Add page info display
- [ ] Add page size selector
- [ ] Add Previous/Next buttons
- [ ] Add page number buttons
- [ ] Add page number rendering logic
- [ ] Style pagination controls

### Phase 3: Excel Export Feature
- [ ] Install xlsx package (`npm install xlsx`)
- [ ] Create `src/utils/excelExport.js` utility
- [ ] Add export button with dropdown menu
- [ ] Implement "Export Current Page" handler
- [ ] Implement "Export All Transactions" handler
- [ ] Implement "Export with Summary" handler
- [ ] Add loading states during export
- [ ] Add success/error notifications
- [ ] Test export with various data sizes
- [ ] Test on different browsers

### Phase 4: Edge Cases
- [ ] Handle page out of bounds
- [ ] Handle page size changes
- [ ] Handle filter changes
- [ ] Handle empty state
- [ ] Handle single page state
- [ ] Handle export with 0 transactions
- [ ] Handle export with special characters

### Phase 5: Responsive Design
- [ ] Mobile layout (pagination)
- [ ] Tablet layout (pagination)
- [ ] Desktop layout (pagination)
- [ ] Mobile export button placement
- [ ] Test all breakpoints

### Phase 6: Testing
- [ ] Manual testing (pagination)
- [ ] Manual testing (export)
- [ ] Automated tests
- [ ] Performance testing
- [ ] User acceptance testing

### Phase 7: Documentation
- [ ] Update user documentation
- [ ] Update developer documentation
- [ ] Create deployment guide
- [ ] Document Excel export feature

---

## Files to Modify

### Primary Files

1. **src/pages/AgentQRSummary.jsx**
   - Add pagination state
   - Update display logic
   - Add pagination UI components
   - Add helper functions
   - Add export button and menu
   - Add export handlers

2. **src/utils/excelExport.js** (NEW)
   - Create Excel export utility
   - Format transaction data
   - Generate summary sheet
   - Handle file download

### Dependencies to Install

```bash
npm install xlsx
```

### No Changes Needed

- **src/services/qrTransactionService.js** (Phase 1 - client-side pagination)
- API endpoints (Phase 1)

---

## Deployment Plan

### Pre-Deployment

1. Code review
2. Testing completion
3. Documentation update
4. Staging deployment

### Deployment Steps

1. Merge to main branch
2. Deploy to Netlify (auto-deploy)
3. Verify deployment
4. Monitor for errors

### Post-Deployment

1. User notification
2. Monitor usage
3. Gather feedback
4. Plan Phase 2 (server-side pagination) if needed

---

## Excel Export Feature

### Overview

Add ability to export QR transaction data to Excel format for offline analysis, reporting, and record-keeping.

### Export Options

1. **Export Current Page**: Export only the transactions visible on current page
2. **Export All Transactions**: Export all transactions matching current filters
3. **Export Summary**: Export summary statistics along with transactions

### Implementation Details

#### Required Library

**Package**: `xlsx` (SheetJS)

```bash
npm install xlsx
```

**Why xlsx?**
- Most popular Excel library for JavaScript (50M+ downloads/week)
- Supports .xlsx format (Excel 2007+)
- Client-side processing (no server needed)
- Works in all browsers
- Small bundle size (~500KB)

#### Export Button UI

**Location**: Next to the "Refresh" button in the header

```jsx
<div className="flex gap-2">
  <button
    onClick={() => refetch()}
    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
  >
    <RefreshCw className="h-4 w-4" />
    Refresh
  </button>
  
  <div className="relative">
    <button
      onClick={() => setShowExportMenu(!showExportMenu)}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
    >
      <Download className="h-4 w-4" />
      Export to Excel
      <ChevronDown className="h-4 w-4" />
    </button>
    
    {/* Export Dropdown Menu */}
    {showExportMenu && (
      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-10">
        <button
          onClick={() => handleExport('current')}
          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export Current Page ({stats.pagination.endIndex - stats.pagination.startIndex + 1} rows)
        </button>
        <button
          onClick={() => handleExport('all')}
          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export All Transactions ({stats.total_generated} rows)
        </button>
        <button
          onClick={() => handleExport('summary')}
          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 border-t"
        >
          <BarChart3 className="h-4 w-4" />
          Export with Summary
        </button>
      </div>
    )}
  </div>
</div>
```

#### Export Function Implementation

**Create utility file**: `src/utils/excelExport.js`

```javascript
import * as XLSX from 'xlsx'

/**
 * Export QR transactions to Excel
 * @param {Array} transactions - Array of transaction objects
 * @param {Object} stats - Summary statistics object
 * @param {String} exportType - 'current', 'all', or 'summary'
 * @param {Object} filters - Current filter settings
 */
export const exportQRTransactionsToExcel = (transactions, stats, exportType, filters) => {
  // Create workbook
  const workbook = XLSX.utils.book_new()
  
  // Prepare transaction data
  const transactionData = transactions.map((t, index) => ({
    'No.': index + 1,
    'Policy Number': t.policy_number || '-',
    'Customer Name': t.customer_name || '-',
    'QR Type': getQRTypeLabel(t.qr_type),
    'Line of Business': (t.line_of_business || 'unknown').toUpperCase(),
    'Amount (LKR)': parseFloat(t.amount || 0).toFixed(2),
    'Payment Received (LKR)': t.status === 'paid' 
      ? parseFloat(t.payment_amount || t.amount || 0).toFixed(2) 
      : '-',
    'Status': (t.status || 'unknown').toUpperCase(),
    'Generated Date': formatDateForExcel(t.created_at),
    'Paid Date': t.paid_at ? formatDateForExcel(t.paid_at) : '-',
    'Transaction ID': t.id || '-'
  }))
  
  // Create transactions worksheet
  const transactionsSheet = XLSX.utils.json_to_sheet(transactionData)
  
  // Set column widths
  transactionsSheet['!cols'] = [
    { wch: 5 },  // No.
    { wch: 20 }, // Policy Number
    { wch: 25 }, // Customer Name
    { wch: 15 }, // QR Type
    { wch: 15 }, // Line of Business
    { wch: 15 }, // Amount
    { wch: 20 }, // Payment Received
    { wch: 10 }, // Status
    { wch: 20 }, // Generated Date
    { wch: 20 }, // Paid Date
    { wch: 15 }  // Transaction ID
  ]
  
  XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions')
  
  // Add summary sheet if requested
  if (exportType === 'summary') {
    const summaryData = [
      { 'Metric': 'Report Generated', 'Value': new Date().toLocaleString() },
      { 'Metric': '', 'Value': '' },
      { 'Metric': 'FILTERS APPLIED', 'Value': '' },
      { 'Metric': 'Time Period', 'Value': filters.period },
      { 'Metric': 'Line of Business', 'Value': filters.lob === 'all' ? 'All LOBs' : filters.lob.toUpperCase() },
      { 'Metric': '', 'Value': '' },
      { 'Metric': 'SUMMARY STATISTICS', 'Value': '' },
      { 'Metric': 'Total QRs Generated', 'Value': stats.total_generated },
      { 'Metric': 'Total Payments Received', 'Value': stats.total_paid },
      { 'Metric': 'Total Pending', 'Value': stats.total_pending },
      { 'Metric': 'Conversion Rate', 'Value': `${stats.conversion_rate.toFixed(2)}%` },
      { 'Metric': '', 'Value': '' },
      { 'Metric': 'FINANCIAL SUMMARY', 'Value': '' },
      { 'Metric': 'Total Amount Generated (LKR)', 'Value': stats.total_amount_generated.toFixed(2) },
      { 'Metric': 'Total Amount Collected (LKR)', 'Value': stats.total_amount_paid.toFixed(2) },
      { 'Metric': 'Collection Rate', 'Value': `${((stats.total_amount_paid / stats.total_amount_generated) * 100).toFixed(2)}%` },
      { 'Metric': 'Outstanding Amount (LKR)', 'Value': (stats.total_amount_generated - stats.total_amount_paid).toFixed(2) }
    ]
    
    // Add LOB breakdown
    summaryData.push({ 'Metric': '', 'Value': '' })
    summaryData.push({ 'Metric': 'PERFORMANCE BY LINE OF BUSINESS', 'Value': '' })
    Object.entries(stats.by_lob).forEach(([lob, data]) => {
      summaryData.push({
        'Metric': lob.toUpperCase(),
        'Value': `${data.paid}/${data.generated} paid (${((data.paid / data.generated) * 100).toFixed(1)}%) - LKR ${data.amount.toFixed(2)}`
      })
    })
    
    // Add QR Type breakdown
    summaryData.push({ 'Metric': '', 'Value': '' })
    summaryData.push({ 'Metric': 'PERFORMANCE BY QR TYPE', 'Value': '' })
    Object.entries(stats.by_qr_type).forEach(([qrType, data]) => {
      summaryData.push({
        'Metric': getQRTypeLabel(qrType),
        'Value': `${data.paid}/${data.generated} paid (${((data.paid / data.generated) * 100).toFixed(1)}%) - LKR ${data.amount.toFixed(2)}`
      })
    })
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    summarySheet['!cols'] = [{ wch: 35 }, { wch: 50 }]
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
  }
  
  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `QR_Performance_${exportType}_${timestamp}.xlsx`
  
  // Download file
  XLSX.writeFile(workbook, filename)
  
  return filename
}

// Helper functions
const getQRTypeLabel = (qrType) => {
  switch (qrType) {
    case 'quick_qr': return 'Quick QR'
    case 'customer_detail': return 'Customer Detail'
    default: return qrType || 'Unknown'
  }
}

const formatDateForExcel = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
```

#### Component Integration

**In `src/pages/AgentQRSummary.jsx`**:

```javascript
import { Download, ChevronDown, FileSpreadsheet } from 'lucide-react'
import { exportQRTransactionsToExcel } from '../utils/excelExport'

// Add state for export menu
const [showExportMenu, setShowExportMenu] = useState(false)

// Export handler
const handleExport = (exportType) => {
  let transactionsToExport = []
  
  switch (exportType) {
    case 'current':
      // Export only current page
      transactionsToExport = stats.recent_transactions
      break
    case 'all':
      // Export all transactions
      transactionsToExport = (qrHistory.transactions || [])
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      break
    case 'summary':
      // Export all with summary
      transactionsToExport = (qrHistory.transactions || [])
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      break
  }
  
  const filters = {
    period: `Last ${selectedPeriod} days`,
    lob: selectedLOB
  }
  
  try {
    const filename = exportQRTransactionsToExcel(
      transactionsToExport,
      stats,
      exportType,
      filters
    )
    
    // Show success message
    alert(`Successfully exported ${transactionsToExport.length} transactions to ${filename}`)
    
    // Close menu
    setShowExportMenu(false)
  } catch (error) {
    console.error('Export failed:', error)
    alert('Failed to export data. Please try again.')
  }
}

// Close menu when clicking outside
useEffect(() => {
  const handleClickOutside = (event) => {
    if (showExportMenu && !event.target.closest('.export-menu-container')) {
      setShowExportMenu(false)
    }
  }
  
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [showExportMenu])
```

### Excel File Structure

#### Sheet 1: Transactions

| No. | Policy Number | Customer Name | QR Type | Line of Business | Amount (LKR) | Payment Received (LKR) | Status | Generated Date | Paid Date | Transaction ID |
|-----|---------------|---------------|---------|------------------|--------------|------------------------|--------|----------------|-----------|----------------|
| 1   | POL-12345     | John Doe      | Quick QR| LIFE             | 5000.00      | 5000.00                | PAID   | Jan 15, 2026   | Jan 16    | txn_123        |
| 2   | POL-12346     | Jane Smith    | Customer| MOTOR            | 3000.00      | -                      | PENDING| Jan 14, 2026   | -         | txn_124        |

#### Sheet 2: Summary (if requested)

```
Report Generated: Feb 5, 2026, 10:30 AM

FILTERS APPLIED
Time Period: Last 30 days
Line of Business: All LOBs

SUMMARY STATISTICS
Total QRs Generated: 150
Total Payments Received: 120
Total Pending: 30
Conversion Rate: 80.00%

FINANCIAL SUMMARY
Total Amount Generated (LKR): 450,000.00
Total Amount Collected (LKR): 360,000.00
Collection Rate: 80.00%
Outstanding Amount (LKR): 90,000.00

PERFORMANCE BY LINE OF BUSINESS
LIFE: 50/60 paid (83.3%) - LKR 150,000.00
MOTOR: 40/50 paid (80.0%) - LKR 120,000.00
HEALTH: 30/40 paid (75.0%) - LKR 90,000.00

PERFORMANCE BY QR TYPE
Quick QR: 80/100 paid (80.0%) - LKR 240,000.00
Customer Detail: 40/50 paid (80.0%) - LKR 120,000.00
```

### Features

1. **Formatted Columns**: Proper column widths for readability
2. **Number Formatting**: Currency values with 2 decimal places
3. **Date Formatting**: Human-readable date format
4. **Multiple Sheets**: Separate sheets for transactions and summary
5. **Automatic Download**: File downloads automatically to user's device
6. **Timestamped Filename**: Includes date in filename for easy organization

### User Experience Enhancements

1. **Loading State**: Show spinner while generating Excel file
2. **Success Notification**: Confirm successful export
3. **Error Handling**: Show user-friendly error messages
4. **Row Count Display**: Show how many rows will be exported
5. **File Size Warning**: Warn if exporting > 1000 rows

### Testing Plan

1. **Export Current Page**:
   - [ ] Export with 10 transactions
   - [ ] Export with 100 transactions
   - [ ] Verify all columns present
   - [ ] Verify data accuracy

2. **Export All Transactions**:
   - [ ] Export with filters applied
   - [ ] Export without filters
   - [ ] Export with 500+ transactions
   - [ ] Verify performance

3. **Export with Summary**:
   - [ ] Verify summary calculations
   - [ ] Verify LOB breakdown
   - [ ] Verify QR type breakdown
   - [ ] Check formatting

4. **Edge Cases**:
   - [ ] Export with 0 transactions
   - [ ] Export with special characters in names
   - [ ] Export with missing data fields
   - [ ] Export on mobile devices

5. **Browser Compatibility**:
   - [ ] Chrome
   - [ ] Firefox
   - [ ] Safari
   - [ ] Edge

### Package Installation

```bash
npm install xlsx
```

**Bundle Size Impact**: ~500KB (minified)

### Implementation Checklist

- [ ] Install xlsx package
- [ ] Create `src/utils/excelExport.js` utility
- [ ] Add export button to header
- [ ] Add export dropdown menu
- [ ] Implement export handlers
- [ ] Add loading states
- [ ] Add success/error notifications
- [ ] Test all export options
- [ ] Test with large datasets
- [ ] Test on mobile devices
- [ ] Update documentation

### Estimated Effort

- **Development**: 3-4 hours
- **Testing**: 2 hours
- **Documentation**: 1 hour

**Total**: 6-7 hours

---

## Future Enhancements

### Phase 2: Server-Side Pagination

**When**: If agents have > 500 transactions

**Changes**:
- Update API to support pagination parameters
- Modify service to pass pagination params
- Update component to fetch data per page

### Phase 3: Advanced Features

1. **Search/Filter within transactions**
   - Search by policy number
   - Filter by status
   - Filter by amount range

2. **Sorting**
   - Sort by date
   - Sort by amount
   - Sort by status

3. **Advanced Export Options**
   - Export to CSV format
   - Export to PDF format
   - Schedule automated exports
   - Email export to user

4. **Bulk Actions**
   - Select multiple transactions
   - Bulk status update
   - Bulk export selected rows

---

## Success Metrics

### User Experience

- [ ] Agents can view all historical transactions
- [ ] Page navigation is intuitive
- [ ] Page load time < 2 seconds
- [ ] No errors in console

### Performance

- [ ] Initial load time < 2 seconds
- [ ] Page navigation < 500ms
- [ ] No memory leaks
- [ ] Smooth scrolling

### Adoption

- [ ] 80%+ agents use pagination
- [ ] Average pages viewed per session > 2
- [ ] Positive user feedback

---

## Risk Assessment

### Low Risk

- UI changes only (Phase 1)
- No API changes
- No database changes
- Easy to rollback

### Medium Risk

- Performance impact with large datasets
- User confusion with new UI

### Mitigation

- Thorough testing
- User documentation
- Gradual rollout
- Monitor performance

---

## Estimated Effort

### Development

- **Phase 1 (Pagination Core)**: 2-3 hours
- **Phase 2 (Pagination UI)**: 2-3 hours
- **Phase 3 (Excel Export)**: 3-4 hours
- **Phase 4 (Edge Cases)**: 1-2 hours
- **Phase 5 (Responsive)**: 1-2 hours

**Total Development**: 9-14 hours

### Testing

- **Manual Testing (Pagination)**: 2 hours
- **Manual Testing (Export)**: 2 hours
- **Automated Tests**: 2 hours
- **UAT**: 1 hour

**Total Testing**: 7 hours

### Documentation

- **User Docs**: 1 hour
- **Developer Docs**: 1 hour
- **Export Feature Docs**: 1 hour

**Total Documentation**: 3 hours

### **Grand Total**: 19-24 hours

---

## Approval Required

Before proceeding with implementation, please review and approve:

1. ✅ Pagination approach (client-side for Phase 1)
2. ✅ UI design and layout
3. ✅ Page size options (10, 25, 50, 100)
4. ✅ Edge case handling
5. ✅ Testing plan
6. ✅ **Excel export feature with 3 export options**
7. ✅ **Export file structure (Transactions + Summary sheets)**

---

**Document Version**: 1.0  
**Last Updated**: February 5, 2026  
**Status**: Awaiting Approval  
**Next Step**: Implementation upon approval
