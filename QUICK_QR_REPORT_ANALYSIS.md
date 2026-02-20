# Quick QR Report Analysis

## Current Status

### Existing Reports in Admin Reports Page

The admin Reports page (`src/pages/admin/Reports.jsx`) currently has **4 tabs**:

1. **Agent Summary** - Agent performance metrics (calls, customers, arrears)
2. **Detailed Logs** - Detailed call logs with outcomes and remarks
3. **Customer Status** - Customer status breakdown by assignment status
4. **QR Performance** - QR code generation and payment tracking

## QR Performance Tab - Current Implementation

The **QR Performance** tab DOES exist and includes Quick QR data. It has two views:

### View 1: Agent Summary
- Shows aggregated QR performance by agent
- Metrics include:
  - QRs Generated (total count)
  - Payments Received (count)
  - Conversion Rate (%)
  - Amount Generated (MUR)
  - Amount Collected (MUR)
  - Collection Rate (%)
  - Last Activity Date

### View 2: All Transactions
- Shows detailed transaction-level data
- Includes columns:
  - Date/Time Generated
  - Agent Name & Email
  - Customer Name
  - Policy Number
  - Line of Business
  - **QR Type** (quick_qr or customer_detail)
  - Amount
  - Payment Amount
  - Status (paid/pending/expired)
  - Paid Date

## Quick QR Data Inclusion

**YES - Quick QR is already included in the reports!**

The QR Performance report includes:
- Filter by QR Type with options:
  - "All Types"
  - "Quick QR" (quick_qr)
  - "Customer Detail" (customer_detail)

The data source (`qrTransactionService`) logs ALL QR generations including:
- Quick QR from `/quick-qr` page
- Customer Detail QR from customer detail pages
- Both are stored in `nic_qr_transactions` table with `qr_type` field

## Summary Metrics Displayed

The QR Performance tab shows 6 summary cards:
1. **Total QRs** - All QR codes generated
2. **Payments** - Total payments received
3. **Conv. Rate** - Overall conversion rate (%)
4. **Generated** - Total amount generated (MUR)
5. **Collected** - Total amount collected (MUR)
6. **Coll. Rate** - Overall collection rate (%)

## Filters Available

The QR Performance report can be filtered by:
- **Date Range** (Start Date to End Date)
- **Agent** (dropdown of all agents)
- **Line of Business** (all, life, health, motor, nonmotor)
- **QR Type** (all, quick_qr, customer_detail)

## Export Functionality

The report includes CSV export for:
1. **Agent Summary Export** - Aggregated agent performance data
2. **All Transactions Export** - Detailed transaction-level data

Both exports include the date range and applied filters in the filename.

## Conclusion

**The Quick QR report already exists and is fully functional!**

The admin can:
1. Navigate to Reports page
2. Click on "QR Performance" tab
3. Filter by QR Type = "Quick QR" to see only Quick QR data
4. View agent summary or detailed transactions
5. Export to CSV for further analysis

No code changes are needed - the feature is already implemented and working.

## How to Access

1. Login as Admin
2. Go to **Reports & Analytics** page
3. Click **QR Performance** tab
4. Use filters:
   - Set date range
   - Select "Quick QR" from QR Type dropdown
   - Optionally filter by agent or LOB
5. Toggle between "Agent Summary" and "All Transactions" views
6. Click "Export QR Performance" to download CSV

## Data Source

- Table: `nic_qr_transactions`
- Service: `qrTransactionService.js`
- Endpoints:
  - `getAdminQRPerformanceReport()` - Agent summary
  - `getAllQRTransactions()` - Detailed transactions
