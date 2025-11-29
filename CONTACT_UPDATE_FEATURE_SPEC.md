# Customer Contact Information Update Feature - Specification

**Project**: NIC Life Insurance Call Center System  
**Feature**: Contact Information Update Capture  
**Phase**: Phase 1 (MVP)  
**Version**: 1.0  
**Date**: November 28, 2024  
**Status**: 📋 Planning

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Business Problem](#business-problem)
3. [Solution](#solution)
4. [User Stories](#user-stories)
5. [Technical Specification](#technical-specification)
6. [UI/UX Design](#uiux-design)
7. [Data Model](#data-model)
8. [API Endpoints](#api-endpoints)
9. [Implementation Plan](#implementation-plan)
10. [Testing Checklist](#testing-checklist)
11. [Future Enhancements](#future-enhancements)

---

## 🎯 Overview

### Purpose
Enable agents to capture and update customer contact information (email and mobile number) when the existing data is incorrect, missing, or outdated. Store these updates for admin review and eventual synchronization with master systems.

### Scope (Phase 1 - MVP)
- ✅ Agent can update customer email/mobile on Customer Detail page
- ✅ Updated contact info is used immediately for QR code emails
- ✅ Updates are stored in database with audit trail
- ✅ Admin can view and export all contact updates
- ❌ No approval workflow (Phase 2)
- ❌ No automated sync to master system (Phase 3)

### Success Criteria
- Agents can update contact info in < 30 seconds
- Updated contact info is used for QR emails immediately
- Admin can export updates for master system sync
- Zero data loss - all updates are captured with audit trail

---

## 💼 Business Problem

### Current Issues
1. **Outdated Contact Data**: Customer master data contains old/incorrect email addresses and mobile numbers
2. **Failed Communications**: QR codes and payment receipts cannot be sent to customers
3. **Manual Workarounds**: Agents manually note down updates but no systematic capture
4. **Data Quality**: No feedback loop to improve master data quality
5. **Customer Frustration**: Customers don't receive important payment information

### Impact
- Reduced customer satisfaction
- Increased agent workload (manual follow-ups)
- Lost revenue opportunities (customers can't pay easily)
- Poor data quality in master systems

---

## 💡 Solution

### High-Level Approach
1. Add "Update Contact" functionality on Customer Detail page
2. Capture new email/mobile with reason and notes
3. Store updates in Xano database with full audit trail
4. Use updated contact info immediately for QR emails
5. Provide admin report to export updates for master system sync

### Key Benefits
- ✅ Immediate fix for agents (use new contact info right away)
- ✅ Systematic data capture (no more manual notes)
- ✅ Audit trail (who updated what and when)
- ✅ Data quality improvement (gradual master data cleanup)
- ✅ Better customer experience (receive QR codes/receipts)

---

## 👥 User Stories

### Agent Stories

**Story 1: Update Missing Email**
```
As an agent,
When I open a customer detail page and see the email is missing,
I want to capture the customer's email address,
So that I can send them the QR code via email.
```

**Story 2: Update Incorrect Mobile**
```
As an agent,
When a customer tells me their mobile number is wrong,
I want to update it in the system,
So that future SMS notifications reach them.
```

**Story 3: Update Both Contacts**
```
As an agent,
When both email and mobile are outdated,
I want to update both at the same time,
So that I don't have to do it twice.
```

### Admin Stories

**Story 4: View All Updates**
```
As an admin,
I want to see all contact information updates captured by agents,
So that I can review and sync them to the master system.
```

**Story 5: Export Updates**
```
As an admin,
I want to export contact updates to CSV/Excel,
So that I can update the master system in bulk.
```

**Story 6: Track Update Status**
```
As an admin,
I want to mark updates as "synced" after updating the master system,
So that I don't process the same update twice.
```

---

## 🔧 Technical Specification

### Technology Stack
- **Frontend**: React (existing)
- **Backend**: Xano (existing)
- **Email Service**: Brevo (existing)
- **State Management**: React Context (existing)

### Components to Create/Modify

#### New Components
1. `UpdateContactModal.jsx` - Modal for capturing contact updates
2. `ContactUpdateReport.jsx` - Admin page for viewing/exporting updates
3. `contactUpdateService.js` - Service for contact update API calls

#### Modified Components
1. `CustomerDetail.jsx` - Add "Update Contact" button
2. `qrService.js` - Use updated contact info when sending QR emails
3. `AdminDashboard.jsx` - Add link to Contact Update Report
4. `Sidebar.jsx` - Add menu item for Contact Update Report (admin only)

### New Xano Table
- Table name: `customer_contact_updates`
- API endpoints: CRUD operations

---

## 🎨 UI/UX Design

### Customer Detail Page Changes

#### Before (Current)
```
┌─────────────────────────────────────────────────────────┐
│ Customer Information                                    │
├─────────────────────────────────────────────────────────┤
│ Name: Kevin Anderson Curepipe                           │
│ Policy Number: LIB/C7013                                │
│ Mobile: 57372333                                        │
│ Email: vikas.khanna@zwennpay.com                       │
│ Amount Due: MUR 4,491.29                                │
│ Status: pending                                         │
│                                                         │
│ [Create AOD]  [Generate QR]                            │
└─────────────────────────────────────────────────────────┘
```

#### After (With Update Feature)
```
┌─────────────────────────────────────────────────────────┐
│ Customer Information                                    │
├─────────────────────────────────────────────────────────┤
│ Name: Kevin Anderson Curepipe                           │
│ Policy Number: LIB/C7013                                │
│                                                         │
│ Mobile: 57372333                    [📝 Update Contact] │
│ Email: vikas.khanna@zwennpay.com                       │
│                                                         │
│ Amount Due: MUR 4,491.29                                │
│ Status: pending                                         │
│                                                         │
│ [Create AOD]  [Generate QR]                            │
└─────────────────────────────────────────────────────────┘
```

### Update Contact Modal

```
┌─────────────────────────────────────────────────────────┐
│ Update Customer Contact Information              [✕]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Customer: Kevin Anderson Curepipe                       │
│ Policy: LIB/C7013                                       │
│                                                         │
│ ─────────────────────────────────────────────────────── │
│                                                         │
│ Mobile Number                                           │
│ Current: 57372333                                       │
│ New:     [_________________________] (optional)         │
│          Format: 8 digits (e.g., 57372333)             │
│                                                         │
│ Email Address                                           │
│ Current: vikas.khanna@zwennpay.com                     │
│ New:     [_________________________] (optional)         │
│          Format: valid email address                    │
│                                                         │
│ Update Reason *                                         │
│ [▼ Select reason                                    ]   │
│   - Customer provided new contact                       │
│   - Current contact is incorrect                        │
│   - Current contact is missing                          │
│   - Email bounced / SMS failed                          │
│   - Customer requested update                           │
│   - Other                                               │
│                                                         │
│ Additional Notes (optional)                             │
│ [_________________________________________________]     │
│ [_________________________________________________]     │
│ [_________________________________________________]     │
│                                                         │
│ ─────────────────────────────────────────────────────── │
│                                                         │
│ ℹ️ Updated contact info will be used immediately for   │
│    QR code emails and future communications.            │
│                                                         │
│                          [Cancel]  [Save & Continue]    │
└─────────────────────────────────────────────────────────┘
```

### Validation Rules

**Mobile Number:**
- Optional (can be left empty)
- If provided: Must be 8 digits
- Mauritius format: No country code needed
- Example: 57372333

**Email Address:**
- Optional (can be left empty)
- If provided: Must be valid email format
- Example: customer@email.com

**Update Reason:**
- Required field
- Must select from dropdown

**Notes:**
- Optional
- Max 500 characters

**At Least One Update:**
- Must provide either new mobile OR new email (or both)
- Cannot save without any updates

### Success Feedback

After saving:
```
┌─────────────────────────────────────────────────────────┐
│ ✅ Contact information updated successfully!            │
│                                                         │
│ The new contact details will be used for this customer. │
└─────────────────────────────────────────────────────────┘
```

Visual indicator on customer card:
```
┌─────────────────────────────────────────────────────────┐
│ Mobile: 58123456 📝 (Updated today)                     │
│ Email: new@email.com 📝 (Updated today)                 │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Data Model

### Xano Table: `customer_contact_updates`

| Field Name | Type | Required | Description | Example |
|------------|------|----------|-------------|---------|
| `id` | Integer (Auto) | Yes | Primary key | 1 |
| `customer_id` | Text | Yes | Customer ID from master | "12345" |
| `policy_number` | Text | Yes | Policy number | "LIB/C7013" |
| `customer_name` | Text | Yes | Customer name | "Kevin Anderson" |
| `old_mobile` | Text | No | Original mobile | "57372333" |
| `new_mobile` | Text | No | Updated mobile | "58123456" |
| `old_email` | Text | No | Original email | "old@email.com" |
| `new_email` | Text | No | Updated email | "new@email.com" |
| `update_reason` | Text | Yes | Reason for update | "Customer provided new contact" |
| `notes` | Text | No | Additional notes | "Customer called to update" |
| `agent_id` | Integer | Yes | Agent who captured | 24 |
| `agent_name` | Text | Yes | Agent name | "David Brown" |
| `captured_at` | Timestamp | Yes | When captured | "2024-11-28T10:30:00Z" |
| `status` | Text | Yes | Update status | "pending" |
| `synced_at` | Timestamp | No | When synced to master | null |
| `synced_by` | Integer | No | Admin who synced | null |

### Status Values
- `pending` - Captured but not yet synced to master system
- `synced` - Successfully synced to master system
- `rejected` - (Future) Admin rejected the update

### Indexes
- Index on `customer_id` for fast lookups
- Index on `policy_number` for fast lookups
- Index on `status` for filtering
- Index on `captured_at` for date range queries

---

## 🔌 API Endpoints

### 1. Create Contact Update

**Endpoint**: `POST /customer_contact_updates`

**Request Body**:
```json
{
  "customer_id": "12345",
  "policy_number": "LIB/C7013",
  "customer_name": "Kevin Anderson Curepipe",
  "old_mobile": "57372333",
  "new_mobile": "58123456",
  "old_email": "old@email.com",
  "new_email": "new@email.com",
  "update_reason": "Customer provided new contact",
  "notes": "Customer called to update contact info",
  "agent_id": 24,
  "agent_name": "David Brown"
}
```

**Response**:
```json
{
  "id": 1,
  "customer_id": "12345",
  "policy_number": "LIB/C7013",
  "status": "pending",
  "captured_at": "2024-11-28T10:30:00Z",
  "message": "Contact update saved successfully"
}
```

### 2. Get Latest Contact for Customer

**Endpoint**: `GET /customer_contact_updates/latest/{customer_id}`

**Response**:
```json
{
  "customer_id": "12345",
  "latest_mobile": "58123456",
  "latest_email": "new@email.com",
  "updated_at": "2024-11-28T10:30:00Z",
  "updated_by": "David Brown"
}
```

### 3. List All Contact Updates (Admin)

**Endpoint**: `GET /customer_contact_updates`

**Query Parameters**:
- `status` - Filter by status (pending/synced)
- `agent_id` - Filter by agent
- `from_date` - Start date
- `to_date` - End date
- `limit` - Results per page
- `offset` - Pagination offset

**Response**:
```json
{
  "total": 45,
  "updates": [
    {
      "id": 1,
      "customer_id": "12345",
      "policy_number": "LIB/C7013",
      "customer_name": "Kevin Anderson",
      "old_mobile": "57372333",
      "new_mobile": "58123456",
      "old_email": "old@email.com",
      "new_email": "new@email.com",
      "update_reason": "Customer provided new contact",
      "notes": "Customer called",
      "agent_name": "David Brown",
      "captured_at": "2024-11-28T10:30:00Z",
      "status": "pending"
    }
  ]
}
```

### 4. Mark as Synced (Admin)

**Endpoint**: `PATCH /customer_contact_updates/{id}/sync`

**Request Body**:
```json
{
  "synced_by": 1,
  "synced_at": "2024-11-28T15:00:00Z"
}
```

**Response**:
```json
{
  "id": 1,
  "status": "synced",
  "synced_at": "2024-11-28T15:00:00Z",
  "message": "Update marked as synced"
}
```

### 5. Bulk Mark as Synced (Admin)

**Endpoint**: `POST /customer_contact_updates/bulk-sync`

**Request Body**:
```json
{
  "update_ids": [1, 2, 3, 4, 5],
  "synced_by": 1
}
```

**Response**:
```json
{
  "synced_count": 5,
  "message": "5 updates marked as synced"
}
```

---

## 🛠️ Implementation Plan

### Step 1: Database Setup (Xano)

**Tasks**:
1. Create `customer_contact_updates` table in Xano
2. Add all fields as specified in Data Model
3. Set up indexes for performance
4. Create API endpoints (CRUD operations)
5. Test API endpoints with Postman/Xano test console

**Estimated Time**: 1 hour

---

### Step 2: Backend Service Layer

**File**: `src/services/contactUpdateService.js`

**Functions to Create**:
```javascript
// Save new contact update
async saveContactUpdate(updateData)

// Get latest contact for customer
async getLatestContact(customerId)

// Get all updates (admin)
async getAllUpdates(filters)

// Mark update as synced (admin)
async markAsSynced(updateId, adminId)

// Bulk mark as synced (admin)
async bulkMarkAsSynced(updateIds, adminId)

// Export updates to CSV
async exportToCSV(filters)
```

**Estimated Time**: 2 hours

---

### Step 3: Update Contact Modal Component

**File**: `src/components/modals/UpdateContactModal.jsx`

**Features**:
- Form with mobile, email, reason, notes fields
- Validation (email format, mobile format)
- Submit to API
- Success/error handling
- Loading states

**Estimated Time**: 3 hours

---

### Step 4: Modify Customer Detail Page

**File**: `src/pages/customers/CustomerDetail.jsx`

**Changes**:
1. Add "Update Contact" button
2. Open UpdateContactModal on click
3. After update, refresh customer data
4. Show visual indicator if contact was updated
5. Use updated contact when generating QR

**Estimated Time**: 2 hours

---

### Step 5: Modify QR Service

**File**: `src/services/qrService.js`

**Changes**:
1. Before sending QR email, check for updated contact
2. Use updated email/mobile if available
3. Fall back to original if no update exists

**Logic**:
```javascript
async function sendQREmail(customer, qrData) {
  // Check for updated contact
  const latestContact = await contactUpdateService.getLatestContact(customer.id);
  
  // Use updated email if available, otherwise use original
  const emailToUse = latestContact?.latest_email || customer.email;
  
  // Send email to correct address
  await emailService.sendQRCode(emailToUse, qrData);
}
```

**Estimated Time**: 1 hour

---

### Step 6: Admin Report Page

**File**: `src/pages/admin/ContactUpdateReport.jsx`

**Features**:
- Table showing all contact updates
- Filters: status, date range, agent
- Export to CSV button
- Mark as synced button (single and bulk)
- Pagination
- Search by policy number or customer name

**Estimated Time**: 4 hours

---

### Step 7: Navigation Updates

**Files**:
- `src/components/layout/Sidebar.jsx`
- `src/App.jsx` (add route)

**Changes**:
1. Add "Contact Updates" menu item in admin section
2. Add route for ContactUpdateReport page
3. Restrict access to admin users only

**Estimated Time**: 30 minutes

---

### Step 8: Testing

**Test Cases**:
1. Agent can update mobile only
2. Agent can update email only
3. Agent can update both mobile and email
4. Validation works (invalid email, invalid mobile)
5. Cannot save without selecting reason
6. Updated contact is used for QR email
7. Admin can view all updates
8. Admin can filter updates
9. Admin can export to CSV
10. Admin can mark as synced

**Estimated Time**: 2 hours

---

### Total Estimated Time: 15.5 hours (~2 days)

---

## ✅ Testing Checklist

### Agent Testing

- [ ] "Update Contact" button appears on Customer Detail page
- [ ] Clicking button opens modal
- [ ] Can enter new mobile number (8 digits)
- [ ] Can enter new email address
- [ ] Email validation works (rejects invalid emails)
- [ ] Mobile validation works (rejects non-8-digit numbers)
- [ ] Must select update reason
- [ ] Cannot save without at least one update (mobile or email)
- [ ] Success message appears after saving
- [ ] Visual indicator shows contact was updated
- [ ] Updated contact is used when generating QR
- [ ] QR email goes to new email address
- [ ] Can update same customer multiple times
- [ ] Notes field is optional

### Admin Testing

- [ ] "Contact Updates" menu item appears (admin only)
- [ ] Contact Update Report page loads
- [ ] All updates are displayed in table
- [ ] Can filter by status (pending/synced)
- [ ] Can filter by date range
- [ ] Can filter by agent
- [ ] Can search by policy number
- [ ] Can search by customer name
- [ ] Export to CSV works
- [ ] CSV contains all expected columns
- [ ] Can mark single update as synced
- [ ] Can bulk mark multiple updates as synced
- [ ] Status changes to "synced" after marking
- [ ] Pagination works correctly

### Edge Cases

- [ ] Customer with no email (only mobile update)
- [ ] Customer with no mobile (only email update)
- [ ] Customer with neither (both updates)
- [ ] Very long customer names
- [ ] Special characters in email
- [ ] International mobile numbers (should reject)
- [ ] Duplicate updates (same customer, same day)
- [ ] Multiple agents updating same customer

### Performance Testing

- [ ] Modal opens quickly (< 1 second)
- [ ] Save operation completes quickly (< 2 seconds)
- [ ] Admin report loads with 100+ updates
- [ ] Export CSV with 1000+ updates
- [ ] Filtering is responsive

---

## 🚀 Deployment Plan

### Pre-Deployment

1. **Xano Setup**:
   - Create table in production Xano
   - Test API endpoints
   - Verify permissions

2. **Code Review**:
   - Review all new components
   - Check for security issues
   - Verify validation logic

3. **Testing**:
   - Complete all test cases
   - User acceptance testing with 2-3 agents
   - Admin testing

### Deployment Steps

1. **Deploy to Staging**:
   ```bash
   git checkout -b feature/contact-updates
   git add .
   git commit -m "Add contact update feature (Phase 1 MVP)"
   git push origin feature/contact-updates
   ```

2. **Build and Test**:
   ```bash
   npm run build
   # Test on staging environment
   ```

3. **Deploy to Production**:
   ```bash
   git checkout main
   git merge feature/contact-updates
   git push origin main
   # Deploy to VPS
   ```

4. **Post-Deployment Verification**:
   - Test update contact flow
   - Test QR email with updated contact
   - Test admin report
   - Monitor for errors

### Rollback Plan

If issues occur:
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or restore from backup
# Xano table can be deleted if needed
```

---

## 🔮 Future Enhancements (Phase 2 & 3)

### Phase 2: Approval Workflow
- Admin approval required before using updated contact
- Reject updates with reason
- Notification to agent when approved/rejected
- Bulk approve functionality

### Phase 3: Master System Integration
- API integration with master system
- Automated sync (daily/weekly)
- Two-way sync (master system updates reflected in call center)
- Conflict resolution (if master system also updated)

### Phase 4: Smart Features
- Auto-detect email bounces and prompt for update
- Auto-detect SMS failures and prompt for update
- Suggest updates based on patterns
- Machine learning to validate contact info

### Phase 5: Analytics
- Dashboard showing update trends
- Data quality metrics
- Agent performance (most updates captured)
- Success rate of updated contacts

---

## 📝 Notes

### Design Decisions

**Why Modal instead of Inline Edit?**
- More space for reason and notes
- Clear separation from view mode
- Better for capturing audit information
- Prevents accidental edits

**Why No Approval Workflow in MVP?**
- Faster implementation
- Agents need immediate solution
- Can add approval later without breaking changes
- Reduces complexity for Phase 1

**Why Store in Separate Table?**
- Doesn't modify customer master data
- Full audit trail
- Easy to export and sync
- Can track update history

### Security Considerations

- Only authenticated agents can update contacts
- Only admins can view all updates
- All updates logged with agent ID
- Cannot delete updates (audit trail)
- Input validation on both frontend and backend

### Performance Considerations

- Indexes on frequently queried fields
- Pagination for admin report
- Lazy loading for large datasets
- CSV export runs in background for large datasets

---

## 📞 Support & Documentation

### For Agents

**Quick Guide**:
1. Open customer detail page
2. Click "Update Contact" button
3. Enter new email or mobile
4. Select reason
5. Click "Save & Continue"
6. Updated contact is used immediately

### For Admins

**Quick Guide**:
1. Go to Admin → Contact Updates
2. View all pending updates
3. Export to CSV when ready to sync
4. Update master system
5. Mark updates as "Synced"

---

**Document Version**: 1.0  
**Last Updated**: November 28, 2024  
**Author**: Development Team  
**Status**: Ready for Implementation
