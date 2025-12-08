# CSL Implementation Architecture - Master Blueprint

## Overview
Complete architectural guide for implementing the CSL (Branch 13) call center system as a **completely separate module** with zero impact on the existing NIC call center system.

---

## 🎯 Core Principles

### 1. Complete Separation
- **Zero modifications** to existing working code
- **Separate file structure** for all CSL components
- **Independent routes** and navigation
- **Isolated data flow** with separate Xano tables

### 2. Smart Reuse
- **Adapter pattern** to reuse existing services (QR, Email, AOD)
- **Shared utilities** only (no shared state)
- **Proven patterns** from existing codebase

### 3. Branch-Based Access
- CSL agents (branch_id === 13) see only CSL interface
- Other agents see existing interface (unchanged)
- Admins see both sections

---

## 📁 File Structure

### Complete Directory Layout

```
src/
├── pages/
│   ├── csl/                              # NEW - CSL Agent Pages
│   │   ├── CSLDashboard.jsx              # Main dashboard for CSL agents
│   │   ├── CSLPolicyDetail.jsx           # Policy detail with tabs
│   │   └── CSLReports.jsx                # CSL-specific reports
│   │
│   ├── admin/
│   │   ├── csl/                          # NEW - CSL Admin Pages
│   │   │   ├── CSLPolicyUpload.jsx       # Upload policy CSV (40+ fields)
│   │   │   ├── CSLPaymentUpload.jsx      # Upload payment CSV
│   │   │   └── CSLDropdownConfig.jsx     # Manage dropdown options
│   │   │
│   │   ├── CustomerUpload.jsx            # EXISTING - unchanged
│   │   ├── AdminDashboard.jsx            # EXISTING - unchanged
│   │   └── [other admin pages]           # EXISTING - unchanged
│   │
│   ├── customers/                        # EXISTING - unchanged
│   ├── auth/                             # EXISTING - unchanged
│   └── [other pages]                     # EXISTING - unchanged
│
├── services/
│   ├── csl/                              # NEW - CSL Services
│   │   ├── cslService.js                 # Core CSL operations
│   │   ├── cslPolicyService.js           # Policy CRUD operations
│   │   ├── cslInteractionService.js      # Interaction logging
│   │   ├── cslPaymentService.js          # Payment verification
│   │   ├── cslDropdownService.js         # Dropdown management
│   │   └── cslAdapterService.js          # Adapter for existing services
│   │
│   ├── customerService.js                # EXISTING - unchanged
│   ├── qrService.js                      # EXISTING - reused via adapter
│   ├── emailService.js                   # EXISTING - reused via adapter
│   ├── aodPdfService.js                  # EXISTING - reused via adapter
│   └── [other services]                  # EXISTING - unchanged
│
├── components/
│   ├── csl/                              # NEW - CSL Components
│   │   ├── CSLPolicyCard.jsx             # Policy card for dashboard
│   │   ├── CSLInteractionForm.jsx        # Multi-step interaction form
│   │   ├── CSLPaymentVerification.jsx    # Payment status badge
│   │   ├── CSLTabs.jsx                   # Tabbed interface component
│   │   ├── CSLOwnerInfo.jsx              # Owner information display
│   │   └── CSLMetricsCard.jsx            # Dashboard metrics
│   │
│   ├── layout/
│   │   ├── Sidebar.jsx                   # MODIFIED - add CSL menu items
│   │   └── [other layout]                # EXISTING - unchanged
│   │
│   └── [other components]                # EXISTING - unchanged
│
├── utils/
│   ├── cslDataMapper.js                  # NEW - CSL ↔ Customer mapping
│   └── [existing utils]                  # EXISTING - reused as-is
│
└── App.jsx                               # MODIFIED - add CSL routes
```

---

## 🔌 Adapter Pattern Architecture

### Problem Statement
Existing services (QR, Email, AOD) expect `customer` objects with specific fields:
```javascript
{
  id, name, email, mobile, policyNumber, amountDue
}
```

CSL has `csl_policy` objects with different structure:
```javascript
{
  id, policy_number, owner1_first_name, owner1_surname, 
  owner1_email, owner1_mobile_no, arrears_amount, ...
}
```

### Solution: Adapter Service

**File:** `src/services/csl/cslAdapterService.js`

```javascript
import { qrService } from '../qrService'
import { emailService } from '../emailService'
import { aodPdfService } from '../aodPdfService'
import { cslInteractionService } from './cslInteractionService'

/**
 * Maps CSL policy data to customer format for existing services
 */
export function mapCSLPolicyToCustomer(cslPolicy) {
  return {
    id: cslPolicy.id,
    name: `${cslPolicy.owner1_first_name} ${cslPolicy.owner1_surname}`,
    email: cslPolicy.owner1_email,
    mobile: cslPolicy.owner1_mobile_no,
    policyNumber: cslPolicy.policy_number,
    amountDue: cslPolicy.arrears_amount,
    // Additional mappings as needed
    address: [
      cslPolicy.owner1_address_1,
      cslPolicy.owner1_address_2,
      cslPolicy.owner1_address_3,
      cslPolicy.owner1_address_4
    ].filter(Boolean).join(', ')
  }
}

/**
 * Generate QR code for CSL policy
 * Reuses existing qrService without modification
 */
export async function generateQRForCSLPolicy(cslPolicy, amount = null) {
  // Map CSL policy to customer format
  const customerData = mapCSLPolicyToCustomer(cslPolicy)
  
  // Override amount if specified
  if (amount) {
    customerData.amountDue = amount
  }
  
  // Call existing QR service (NO CHANGES to qrService.js)
  const qrResult = await qrService.generateQR(customerData)
  
  // Log action in CSL interactions
  await cslInteractionService.logAction(cslPolicy.id, 'qr_generated', {
    amount: customerData.amountDue,
    qrUrl: qrResult.qrCodeUrl,
    timestamp: new Date().toISOString()
  })
  
  return qrResult
}

/**
 * Send email reminder for CSL policy
 * Reuses existing emailService without modification
 */
export async function sendEmailForCSLPolicy(cslPolicy, options = {}) {
  const customerData = mapCSLPolicyToCustomer(cslPolicy)
  
  // Call existing email service (NO CHANGES to emailService.js)
  const result = await emailService.sendPaymentReminderEmail(
    customerData,
    options.qrCodeUrl,
    options.paymentLink,
    {
      agentEmail: options.agentEmail,
      agentName: options.agentName,
      lineOfBusiness: 'life',
      ccAgent: options.ccAgent || true
    }
  )
  
  // Log action in CSL interactions
  await cslInteractionService.logAction(cslPolicy.id, 'email_sent', {
    emailId: result.messageId,
    recipient: customerData.email,
    timestamp: new Date().toISOString()
  })
  
  return result
}

/**
 * Send SMS reminder for CSL policy
 */
export async function sendSMSForCSLPolicy(cslPolicy, message) {
  const customerData = mapCSLPolicyToCustomer(cslPolicy)
  
  // Call existing SMS service
  const result = await emailService.sendSMS(customerData.mobile, message)
  
  // Log action
  await cslInteractionService.logAction(cslPolicy.id, 'sms_sent', {
    mobile: customerData.mobile,
    timestamp: new Date().toISOString()
  })
  
  return result
}

/**
 * Create AOD for CSL policy
 */
export async function createAODForCSLPolicy(cslPolicy, aodData) {
  const customerData = mapCSLPolicyToCustomer(cslPolicy)
  
  // Call existing AOD service
  const result = await aodPdfService.generateAOD({
    ...customerData,
    ...aodData
  })
  
  // Log action
  await cslInteractionService.logAction(cslPolicy.id, 'aod_created', {
    aodId: result.id,
    timestamp: new Date().toISOString()
  })
  
  return result
}

export default {
  mapCSLPolicyToCustomer,
  generateQRForCSLPolicy,
  sendEmailForCSLPolicy,
  sendSMSForCSLPolicy,
  createAODForCSLPolicy
}
```

**Benefits:**
- ✅ Zero changes to existing services
- ✅ All existing functionality available to CSL
- ✅ CSL-specific logging and tracking
- ✅ Easy to test and maintain
- ✅ Single source of truth for business logic

---

## 🚦 Routing Strategy

### App.jsx Modifications (Minimal)

```javascript
// EXISTING imports - unchanged
import Dashboard from './pages/Dashboard'
import CustomerList from './pages/customers/CustomerList'
// ... all existing imports

// NEW imports - CSL pages only
import CSLDashboard from './pages/csl/CSLDashboard'
import CSLPolicyDetail from './pages/csl/CSLPolicyDetail'
import CSLReports from './pages/csl/CSLReports'
import CSLPolicyUpload from './pages/admin/csl/CSLPolicyUpload'
import CSLPaymentUpload from './pages/admin/csl/CSLPaymentUpload'
import CSLDropdownConfig from './pages/admin/csl/CSLDropdownConfig'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* EXISTING auth routes - unchanged */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        {/* ... */}
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          {/* EXISTING routes - unchanged */}
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          {/* ... all existing routes ... */}
          
          {/* NEW: CSL Routes - Completely separate */}
          <Route path="csl">
            <Route index element={<CSLDashboard />} />
            <Route path="policy/:id" element={<CSLPolicyDetail />} />
            <Route path="reports" element={<CSLReports />} />
          </Route>
          
          {/* NEW: CSL Admin Routes */}
          <Route path="admin/csl">
            <Route path="upload-policies" element={<CSLPolicyUpload />} />
            <Route path="upload-payments" element={<CSLPaymentUpload />} />
            <Route path="dropdown-config" element={<CSLDropdownConfig />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
```

**Impact:** Minimal - only adds new routes, no changes to existing routes

---

## 🎨 Sidebar Navigation

### Sidebar.jsx Modifications

```javascript
// In src/components/layout/Sidebar.jsx

function Sidebar() {
  const { user } = useAuth()
  
  return (
    <aside>
      {/* EXISTING menu items for non-CSL users - unchanged */}
      {user.branch_id !== 13 && (
        <>
          <MenuItem to="/">Dashboard</MenuItem>
          <MenuItem to="/customers">Customers</MenuItem>
          <MenuItem to="/quick-qr">Quick QR</MenuItem>
          {/* ... all existing menu items ... */}
        </>
      )}
      
      {/* NEW: CSL menu items - only for branch_id === 13 */}
      {user.branch_id === 13 && user.role === 'internal_agent' && (
        <>
          <MenuItem icon={<Phone />} to="/csl">
            CSL Dashboard
          </MenuItem>
          <MenuItem icon={<FileText />} to="/csl/reports">
            CSL Reports
          </MenuItem>
        </>
      )}
      
      {/* EXISTING admin menu - unchanged */}
      {user.role === 'admin' && (
        <>
          <MenuItem to="/admin">Admin Dashboard</MenuItem>
          <MenuItem to="/admin/upload">Upload Customers</MenuItem>
          <MenuItem to="/admin/agents">Manage Agents</MenuItem>
          
          {/* NEW: CSL admin menu items */}
          <MenuSection title="CSL Management">
            <MenuItem to="/admin/csl/upload-policies">
              Upload CSL Policies
            </MenuItem>
            <MenuItem to="/admin/csl/upload-payments">
              Upload CSL Payments
            </MenuItem>
            <MenuItem to="/admin/csl/dropdown-config">
              CSL Dropdowns
            </MenuItem>
          </MenuSection>
        </>
      )}
    </aside>
  )
}
```

**Result:**
- CSL agents see only CSL menu
- Other agents see existing menu (unchanged)
- Admins see both sections
- Zero confusion or overlap

---

## 💾 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      XANO BACKEND                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Existing Tables              CSL Tables (NEW)               │
│  ├─ customers                 ├─ csl_policies                │
│  ├─ users (shared)            ├─ csl_interactions            │
│  ├─ payment_plans             ├─ csl_payments                │
│  ├─ installments              ├─ csl_dropdown_options        │
│  └─ ...                       ├─ csl_policy_history          │
│                               └─ csl_uploads                 │
│                                                               │
│  NO RELATIONSHIPS between existing and CSL tables            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ API Calls (separate endpoints)
                            │
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND SERVICES                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Existing Services            CSL Services (NEW)             │
│  ├─ customerService           ├─ cslPolicyService            │
│  ├─ qrService ◄───────────────┼─ cslAdapterService           │
│  ├─ emailService ◄────────────┤   (maps CSL → Customer)      │
│  ├─ aodPdfService ◄───────────┤                              │
│  └─ ...                       ├─ cslInteractionService       │
│                               ├─ cslPaymentService           │
│                               └─ cslDropdownService          │
│                                                               │
│  Adapter pattern enables reuse without modification          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ Component Calls
                            │
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND PAGES                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Existing Pages               CSL Pages (NEW)                │
│  ├─ Dashboard                 ├─ CSLDashboard                │
│  ├─ CustomerList              ├─ CSLPolicyDetail             │
│  ├─ CustomerDetail            ├─ CSLReports                  │
│  ├─ CustomerUpload            ├─ CSLPolicyUpload             │
│  └─ ...                       ├─ CSLPaymentUpload            │
│                               └─ CSLDropdownConfig           │
│                                                               │
│  Separate routing: /customers/* vs /csl/*                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Payment Upload → Interaction Update Logic

### Requirement
When admin uploads `csl_payments` CSV, automatically update `csl_interactions` where payment is received.

### Implementation

**File:** `src/pages/admin/csl/CSLPaymentUpload.jsx`

```javascript
async function processPaymentUpload(paymentsData, uploadedByAdminId) {
  const results = {
    uploaded: 0,
    interactionsUpdated: 0,
    policiesNotFound: [],
    errors: []
  }
  
  for (const payment of paymentsData) {
    try {
      // 1. Upload payment to csl_payments table
      const paymentRecord = await cslPaymentService.createPayment({
        policy_number: payment.policy_number,
        payment_date: payment.payment_date,
        payment_amount: payment.payment_amount,
        payment_reference: payment.payment_reference,
        payment_method: payment.payment_method,
        payment_status: payment.payment_status || 'verified',
        uploaded_by_admin_id: uploadedByAdminId,
        uploaded_at: new Date().toISOString()
      })
      results.uploaded++
      
      // 2. Find the policy by policy_number
      const policy = await cslPolicyService.getByPolicyNumber(
        payment.policy_number
      )
      
      if (!policy) {
        results.policiesNotFound.push(payment.policy_number)
        continue
      }
      
      // 3. Find latest interaction for this policy
      const latestInteraction = await cslInteractionService
        .getLatestInteractionForPolicy(policy.id)
      
      if (latestInteraction) {
        // 4. Determine recovery type
        const recoveryType = payment.payment_amount >= policy.arrears_amount
          ? 'full'
          : 'partial'
        
        // 5. Update interaction with payment info
        await cslInteractionService.updateInteraction(
          latestInteraction.id,
          {
            amount_paid_per_nic_system: payment.payment_amount,
            recovery_type: recoveryType,
            // Add to actions_taken JSON
            actions_taken: {
              ...latestInteraction.actions_taken,
              payment_verified: {
                amount: payment.payment_amount,
                date: payment.payment_date,
                reference: payment.payment_reference,
                method: payment.payment_method,
                verified_at: new Date().toISOString(),
                verified_by_admin_id: uploadedByAdminId
              }
            }
          }
        )
        results.interactionsUpdated++
      }
      
    } catch (error) {
      results.errors.push({
        policy_number: payment.policy_number,
        error: error.message
      })
    }
  }
  
  return results
}
```

**Benefits:**
- ✅ Automatic interaction updates
- ✅ Audit trail in `actions_taken` JSON
- ✅ Error handling for missing policies
- ✅ Summary report for admin
- ✅ Maintains data integrity

---

## 📊 Implementation Phases

### Phase 1: Foundation & Admin Tools (Week 1-2)
**Status:** 🔜 Ready to Start

**Tasks:**
1. ✅ Xano tables created (DONE)
2. ⏳ Seed dropdown data in Xano
3. ⏳ Create `cslAdapterService.js`
4. ⏳ Create `cslPolicyService.js`
5. ⏳ Build `CSLPolicyUpload.jsx`
6. ⏳ Build `CSLPaymentUpload.jsx`
7. ⏳ Test upload flows with sample CSVs

**Deliverable:** Admin can upload policies and payments

---

### Phase 2: CSL Dashboard (Week 2-3)
**Status:** 🔜 Pending Phase 1

**Tasks:**
1. Create `CSLDashboard.jsx`
2. Create `CSLPolicyCard.jsx` component
3. Implement filters (status, arrears, follow-up)
4. Implement search (policy number, name, NIC)
5. Add pagination
6. Add summary metrics cards
7. Test with uploaded data

**Deliverable:** CSL agents can view assigned policies

---

### Phase 3: Policy Detail & Interactions (Week 3-4)
**Status:** 🔜 Pending Phase 2

**Tasks:**
1. Create `CSLPolicyDetail.jsx` with tabs
2. Create `CSLTabs.jsx` component
3. Build Overview tab
4. Build Owner 1 & Owner 2 tabs
5. Build Payments tab
6. Build AOD tab
7. Build Interactions history tab
8. Create `CSLInteractionForm.jsx` (multi-step wizard)
9. Integrate adapter service for QR/Email/AOD
10. Test all features

**Deliverable:** Complete policy detail view with interaction logging

---

### Phase 4: Dropdown Management (Week 4)
**Status:** 🔜 Pending Phase 3

**Tasks:**
1. Create `CSLDropdownConfig.jsx`
2. Create `cslDropdownService.js`
3. Implement CRUD operations
4. Add drag-and-drop reordering
5. Add parent-child relationship management
6. Test dropdown changes reflect in interaction form

**Deliverable:** Admin can manage dropdowns via UI

---

### Phase 5: Reports & Polish (Week 5)
**Status:** 🔜 Pending Phase 4

**Tasks:**
1. Create `CSLReports.jsx`
2. Implement dashboard metrics
3. Create report generation methods
4. Add export functionality (CSV/PDF)
5. Responsive design testing
6. Accessibility audit
7. Performance optimization

**Deliverable:** Complete CSL system ready for production

---

## ✅ Risk Mitigation

### Low Risk
- ✅ Completely isolated from existing system
- ✅ Separate database tables (no FK to existing tables)
- ✅ Separate routes and navigation
- ✅ Can be deployed/removed independently

### Medium Risk
- ⚠️ Adapter pattern complexity
  - **Mitigation:** Comprehensive unit tests, clear documentation
- ⚠️ Large CSV uploads (40+ columns)
  - **Mitigation:** Batch processing, progress indicators, validation

### Managed Risk
- ⚠️ Data volume (thousands of policies)
  - **Mitigation:** Pagination, indexes, caching
- ⚠️ Dropdown parent-child logic
  - **Mitigation:** Clear UI, validation, testing

---

## 🎯 Success Criteria

- [ ] CSL agents can view assigned policies
- [ ] CSL agents can log interactions with all required fields
- [ ] Payment verification works correctly
- [ ] Dropdowns are configurable by admin
- [ ] QR/Email/AOD features work for CSL
- [ ] Payment upload updates interactions automatically
- [ ] Reports show accurate metrics
- [ ] System performs well with 1000+ policies
- [ ] **Zero impact on existing system**

---

## 📝 Code Examples

### Example: CSL Policy Service

```javascript
// src/services/csl/cslPolicyService.js

import { apiClient } from '../apiClient'

const BASE_URL = '/api:WCN7osGn/csl_policies'

class CSLPolicyService {
  
  async getAllPolicies(filters = {}, pagination = {}) {
    const params = new URLSearchParams({
      ...filters,
      page: pagination.page || 1,
      per_page: pagination.perPage || 20
    })
    
    const response = await apiClient.get(`${BASE_URL}?${params}`)
    return response.data
  }
  
  async getPolicyById(id) {
    const response = await apiClient.get(`${BASE_URL}/${id}`)
    return response.data
  }
  
  async getByPolicyNumber(policyNumber) {
    const response = await apiClient.get(`${BASE_URL}`, {
      params: { policy_number: policyNumber }
    })
    return response.data[0] // Assuming unique policy_number
  }
  
  async createPolicy(policyData) {
    const response = await apiClient.post(BASE_URL, policyData)
    return response.data
  }
  
  async updatePolicy(id, policyData) {
    const response = await apiClient.patch(`${BASE_URL}/${id}`, policyData)
    return response.data
  }
  
  async bulkUpload(policiesArray) {
    // Process in batches of 50
    const batchSize = 50
    const results = []
    
    for (let i = 0; i < policiesArray.length; i += batchSize) {
      const batch = policiesArray.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(policy => this.upsertPolicy(policy))
      )
      results.push(...batchResults)
    }
    
    return results
  }
  
  async upsertPolicy(policyData) {
    // Check if policy exists
    const existing = await this.getByPolicyNumber(policyData.policy_number)
    
    if (existing) {
      // Update existing
      return await this.updatePolicy(existing.id, policyData)
    } else {
      // Create new
      return await this.createPolicy(policyData)
    }
  }
}

export const cslPolicyService = new CSLPolicyService()
export default cslPolicyService
```

---

## 🚀 Next Immediate Steps

1. **Seed Dropdown Data** - Populate `csl_dropdown_options` with initial values
2. **Create Adapter Service** - Build `cslAdapterService.js`
3. **Build First Admin Page** - `CSLPolicyUpload.jsx`
4. **Test Upload Flow** - With sample CSV data

---

**Document Version:** 1.0  
**Last Updated:** December 6, 2025  
**Status:** Master Implementation Blueprint  
**Confidence Level:** 95%

**This document serves as the single source of truth for CSL implementation.**
