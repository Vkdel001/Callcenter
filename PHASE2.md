# NIC Call Center System - Phase 2 Implementation Plan

## 🎯 **Overview**

Phase 2 adds comprehensive multi-agent support with sales agents, multi-line of business (LOB) capabilities, call center exclusive data, and smart search functionality to the existing NIC Call Center system.

## 📋 **New Features Summary**

### **Agent Types**
1. **Call Center Agents**: Access ONLY call center exclusive data (branch 6) for assignment/calling (REVISED)
2. **Internal Agents**: Access ALL customers from their branch (including sales agent customers) for assignment/calling (REVISED)
3. **Sales Agents**: View-only access to their onboarded customers via LOB → Month dashboard (NO fetching/assignment) (NEW)
4. **CSR (Customer Service Representatives)**: Universal access to ALL customers from ALL branches via LOB dashboard interface (NEW)

### **LOB-Specific Admin Types (NEW ARCHITECTURE)**
1. **Super Admin**: Access to ALL LOBs + system administration + all agent management
2. **Life Admin**: Life customers only + **ALL agent management** (sales + internal agents)
3. **Motor Admin**: Motor customers only + **NO agent management**
4. **Health Admin**: Health customers only + **NO agent management**
5. **Call Center Admin**: Branch 6 exclusive data + call center agents only

### **Line of Business Support**
- **Life Insurance** (existing)
- **Health Insurance** (NEW)
- **Motor Insurance** (NEW)
- Single sales agent can have customers across all LOBs

### **Call Center Exclusive Data**
- Special data subset (3K-5K customers) visible only to call center agents
- Uses special branch ID = 0 for segregation

### **User Experience Systems**
- **Call Center Agents**: Traditional "Fetch Next 10" system (only branch 6 exclusive data)
- **Internal Agents**: Traditional "Fetch Next 10" system (ALL branch customers, exclude branch 6)
- **Sales Agents**: Specialized LOB dashboard → Month selection → Customer list (NO fetching)

---

## 🗄️ **PHASE 1: XANO DATABASE CHANGES**

### **1.1 Modify `nic_cc_customer` Table**
```sql
-- Add new fields to existing customer table
ALTER TABLE nic_cc_customer ADD COLUMN:
- sales_agent_id VARCHAR(50) NULL                    -- External sales agent ID (e.g., "SA001")
- line_of_business ENUM('life', 'health', 'motor') NOT NULL DEFAULT 'life'
- assigned_month VARCHAR(6) NULL                     -- Format: "Oct-25" (MMM-YY)
- title_owner1 VARCHAR(10) NULL                      -- Mr, Mrs, Ms, Dr, etc.
- title_owner2 VARCHAR(10) NULL                      -- Second owner title
- name_owner2 VARCHAR(255) NULL                      -- Second owner name
- address TEXT NULL                                  -- Full address
- national_id VARCHAR(20) NULL                       -- National ID number

-- Add indexes for performance
CREATE INDEX idx_sales_agent_id ON nic_cc_customer(sales_agent_id);
CREATE INDEX idx_line_of_business ON nic_cc_customer(line_of_business);
CREATE INDEX idx_assigned_month ON nic_cc_customer(assigned_month);
CREATE INDEX idx_branch_sales_lob ON nic_cc_customer(branch_id, sales_agent_id, line_of_business);
CREATE INDEX idx_lob_month ON nic_cc_customer(line_of_business, assigned_month);
CREATE INDEX idx_sales_lob_month ON nic_cc_customer(sales_agent_id, line_of_business, assigned_month);
```

### **1.2 Modify `nic_cc_agent` Table**
```sql
-- Add new fields to existing agent table
ALTER TABLE nic_cc_agent ADD COLUMN:
- sales_agent_id VARCHAR(50) NULL                    -- External sales agent ID (for sales agents only)
- agent_type ENUM('call_center', 'internal', 'sales_agent', 'csr') NOT NULL DEFAULT 'call_center'  -- Added CSR type
- admin_lob ENUM('super_admin', 'life', 'motor', 'health', 'call_center') NULL  -- LOB-specific admin access (NEW)

-- Add indexes for performance
CREATE INDEX idx_agent_sales_id ON nic_cc_agent(sales_agent_id);
CREATE INDEX idx_agent_type ON nic_cc_agent(agent_type);
CREATE INDEX idx_admin_lob ON nic_cc_agent(admin_lob);

-- Set existing admin to super_admin
UPDATE nic_cc_agent SET admin_lob = 'super_admin' WHERE role = 'admin';
```

### **1.3 Create Special Branch for Call Center Exclusive**
```sql
-- Special branch created in Xano with auto-generated ID
-- Branch ID: 6 (auto-assigned by Xano)
-- Name: 'Call Center Exclusive'
-- Code: 'CCE'
-- Status: Active
```

### **1.4 Sample Data Structure After Changes**

**nic_cc_customer table:**
```sql
id | policy_number | name | email | mobile | amount_due | branch_id | sales_agent_id | line_of_business | assigned_month | title_owner1 | name_owner2 | address | national_id | status
1  | LIFE-001     | John Smith | j@e.com | 57111111 | 5000 | 1 | SA001 | life | 2024-10 | Mr | Jane Smith | 123 Main St | ID123456 | pending
2  | HEALTH-002   | Mary Johnson | m@e.com | 57111112 | 1200 | 1 | SA001 | health | 2024-11 | Mrs | NULL | 456 Oak Ave | ID789012 | pending  
3  | MOTOR-003    | David Brown | d@e.com | 57111113 | 800 | 2 | SA002 | motor | 2024-10 | Dr | NULL | 789 Pine Rd | ID345678 | pending
4  | EXCL-001     | Old Customer | o@e.com | 57111114 | 600 | 6 | NULL | life | 2024-12 | Ms | NULL | 321 Elm St | ID901234 | pending
```

**nic_cc_agent table:**
```sql
id | name | email | agent_type | sales_agent_id | branch_id | active
1  | Call Center Agent | cc@nic.mu | call_center | NULL | NULL | TRUE
2  | Internal Agent    | int@nic.mu | internal | NULL | 1 | TRUE  
3  | Sales Agent John  | sa1@nic.mu | sales_agent | SA001 | NULL | TRUE
4  | Sales Agent Mary  | sa2@nic.mu | sales_agent | SA002 | NULL | TRUE
5  | CSR Port Louis    | csr1@nic.mu | csr | NULL | 1 | TRUE
6  | CSR Curepipe      | csr2@nic.mu | csr | NULL | 2 | TRUE
```

---

## 🔧 **PHASE 2: CODE CHANGES PLAN**

### **2.1 Backend Service Updates**

#### **File: `src/services/customerService.js`**
**Changes Needed:**
1. Update `fetchNext10Customers()` - Keep for call center agents only
2. Add `getAllAssignedCustomers()` - New method for sales/internal agents
3. Update `fetchNext10Customers()` - Add agent type filtering logic:
   - **Call Center**: Filter by `branch_id = 6` + available for assignment
   - **Internal**: Filter by `branch_id` + available for assignment (exclude branch 6)  
   - **Sales Agent**: Return error - redirect to LOB dashboard (no fetching allowed)
4. Add `getSalesAgentLOBSummary()` - New method for sales agent dashboard:
   - Get customer counts by LOB for the sales agent
   - Get customer counts by month within each LOB
   - Return data for LOB cards and month navigation
4. Add LOB filtering capabilities
5. Add smart search functionality

#### **File: `src/services/authService.js`**
**Changes Needed:**
1. Update `login()` - Support sales_agent type detection
2. Update `validateToken()` - Include `sales_agent_id` in user data
3. **No changes to OTP system** (works as-is)

#### **File: `backend-reminder-service.cjs`**
**Changes Needed:**
1. Update customer filtering logic:
   - Add `sales_agent_id` filtering
   - Add branch 6 exclusion for internal agents
   - Maintain existing logic for call center agents
2. Add LOB support in reminder templates

### **2.2 Frontend Component Updates**

#### **File: `src/pages/customers/CustomerList.jsx`**
**Changes Needed:**
1. Add agent type detection in `useEffect`
2. Implement conditional rendering:
   - **Call Center**: Show "Fetch Next 10" button + batch view
   - **Internal**: Show "Fetch Next 10" button + batch view  
   - **Sales Agent**: Redirect to LOB dashboard (no customer list access)
3. Remove smart search (keeping traditional fetch system for internal/call center)
4. Handle sales agent redirect to specialized dashboard

#### **File: `src/pages/Dashboard.jsx`**
**Changes Needed:**
1. Add agent type detection
2. Implement conditional dashboard rendering:
   - **Sales Agent**: LOB dashboard with Life/Health/Motor cards
   - **Internal Agent**: Traditional dashboard with "Fetch Next 10" button
   - **Call Center**: Traditional dashboard with "Fetch Next 10" button
3. Add LOB summary cards for sales agents
4. Add month navigation for sales agents

#### **File: `src/components/layout/Navbar.jsx`**
**Changes Needed:**
1. Add agent type awareness
2. Add LOB quick filters in navigation
3. Show relevant menu items based on agent type

### **2.3 Admin Interface Updates**

#### **File: `src/pages/admin/CustomerUpload.jsx`**
**Changes Needed:**
1. Add LOB field to upload form
2. Add `sales_agent_id` field to upload form
3. Update CSV template and validation
4. Add preview functionality for new fields

#### **File: `src/pages/admin/AgentManagement.jsx`**
**Changes Needed:**
1. Add `agent_type` column to agent table
2. Add `sales_agent_id` column (for sales agents)
3. Update edit modal to support sales agent fields
4. Add filtering by agent type
5. Add bulk upload button for sales agents

#### **File: `src/pages/admin/Reports.jsx`**
**Changes Needed:**
1. Add LOB-specific reports
2. Add sales agent performance reports
3. Add cross-dimensional analysis (Branch + LOB + Agent Type)
4. Update existing reports to include LOB breakdown

### **2.4 New Components to Create**

#### **File: `src/components/sales/LOBDashboard.jsx`**
**New Component Features:**
1. Three LOB cards (Life, Health, Motor) with customer counts
2. Click handlers for LOB selection
3. Professional card design with NIC branding
4. Customer count display per LOB
5. Total portfolio summary

#### **File: `src/components/upload/SalesAgentBulkUpload.jsx`**
**New Component Features:**
1. CSV upload interface for sales agents
2. Template download functionality
3. Validation and error reporting
4. Progress indicator for bulk operations
5. Success/failure summary

#### **File: `src/pages/admin/SalesAgentManagement.jsx`**
**New Component Features:**
1. Sales agent CRUD operations
2. Policy transfer interface
3. Performance metrics dashboard
4. Bulk operations (activate/deactivate)
5. Search and filtering capabilities

### **2.5 Service Layer Enhancements**

#### **File: `src/services/salesAgentService.js` (New)**
**New Service Functions:**
1. `createSalesAgent()` - Create individual sales agent
2. `bulkCreateSalesAgents()` - Bulk upload from CSV
3. `updateSalesAgent()` - Update sales agent details
4. `transferPolicies()` - Transfer policies between sales agents
5. `getSalesAgentMetrics()` - Performance analytics
6. `deactivateSalesAgent()` - Handle agent resignation

#### **File: `src/services/salesAgentService.js` (New)**
**New Service Functions:**
1. `getLOBSummary(salesAgentId)` - Get customer counts by LOB
2. `getMonthsForLOB(salesAgentId, lob)` - Get months with customer counts for specific LOB
3. `getCustomersForLOBMonth(salesAgentId, lob, month)` - Get customers for specific LOB + month
4. `getSalesAgentPortfolioStats(salesAgentId)` - Overall portfolio statistics

#### **File: `src/services/reportService.js`**
**Changes Needed:**
1. Add `generateLOBReport()` - Reports by line of business
2. Add `generateSalesAgentReport()` - Sales agent performance
3. Add `generateCrossDimensionalReport()` - Multi-dimensional analysis
4. Update existing reports to include LOB data
5. Add export functionality for new reports

---

## 🎯 **PHASE 3: IMPLEMENTATION SEQUENCE**

### **Phase 3.1: Database Foundation (COMPLETED ✅)**
1. **✅ Backup production database**
2. **✅ Add `sales_agent_id` and `line_of_business` to `nic_cc_customer`**
3. **✅ Add `sales_agent_id` and `agent_type` to `nic_cc_agent`**
4. **✅ Verify special branch (ID: 6) for call center exclusive**
5. **✅ Add all database indexes for performance**
6. **✅ Test database changes with sample data**

**Status**: All database schema changes have been implemented and tested. The following fields are now available:
- **nic_cc_customer**: `sales_agent_id`, `line_of_business`, `assigned_month`, `title_owner1`, `title_owner2`, `name_owner2`, `address`, `national_id`
- **nic_cc_agent**: `agent_type`, `sales_agent_id`, `branch_id` (already existed)
- **Branch 6**: Call Center Exclusive branch created and verified

### **Phase 3.2: Core Service Updates (COMPLETED ✅)**
1. **✅ Update `customerService.js`** - Agent type filtering logic implemented in `fetchNext10Customers()`
   - ✅ LOB services already implemented (`getSalesAgentLOBSummary`, `getSalesAgentCustomersForLOBMonth`)
   - ✅ Branch 6 filtering for call center agents implemented
   - ✅ Branch exclusion logic for internal agents implemented
   - ✅ Sales agent redirect to LOB dashboard implemented
2. **✅ `authService.js`** - Sales agent authentication already working
3. **✅ Sales agent services** - Already implemented in `customerService.js`
4. **✅ Smart search functionality** - Already implemented in LOB dashboard
5. **Update `backend-reminder-service.cjs`** - Add new filtering logic

**Status**: All core service filtering logic has been implemented. Agent type-based access restrictions are now fully functional:
- **Call Center Agents**: Only access Branch 6 exclusive data
- **Internal Agents**: Access their branch data (excluding Branch 6)
- **Sales Agents**: Redirect to LOB dashboard (no fetch access)

### **Phase 3.3: LOB Admin Interface (2-3 days) - HIGH PRIORITY**
1. **Update `authService.js`** - Add `admin_lob` field to user session
2. **Update `AdminDashboard.jsx`** - LOB-specific dashboards and metrics
3. **Update `CustomerUpload.jsx`** - Add strict LOB validation (admin_lob must match line_of_business)
4. **Update `AgentManagement.jsx`** - Restrict to Life Admin + Super Admin only
5. **Create LOB-specific admin views** - Motor/Health/Life/CallCenter admin interfaces

### **Phase 3.4: CSR Implementation (1-2 days) - NEW PRIORITY**
1. **Update `nic_cc_agent` table** - Add 'csr' to agent_type enum
2. **Create CSR test users** - Add CSR users for each branch
3. **Update `authService.js`** - Handle CSR agent type in authentication
4. **Create `getCSRLOBSummary()` function** - Universal LOB data aggregation (all branches)
5. **Create `getCSRCustomersForLOBMonth()` function** - CSR customer filtering (global access)
6. **Update Dashboard routing** - Include CSR → LOB Dashboard flow
7. **Update LOB Dashboard** - Detect and handle CSR vs Sales Agent context
8. **Test CSR workflows** - Complete end-to-end CSR user experience

### **Phase 3.5: Lower Priority Features (DEFERRED)**
1. **Sales Agent Management** - Use direct Xano upload for now
2. **Advanced Reports** - LOB-specific reporting (later phase)
3. **Bulk Upload Interfaces** - Sales agent bulk operations (later phase)
4. **UX Enhancements** - Focus on core functionality first

### **Phase 3.6: User Interface (0.5-1 days) - MOSTLY COMPLETE**
1. **✅ `CustomerList.jsx`** - Already has search functionality
2. **✅ Smart search** - Already implemented in LOB dashboard
3. **✅ `Dashboard.jsx`** - Already has LOB dashboard integration and agent-specific views
4. **✅ `Navbar.jsx`** - Already has agent awareness
5. **✅ LOB Dashboard** - Fully functional with month navigation and customer management

### **Phase 3.7: Testing & Data Migration (1-2 days)**
1. **LOB Admin Testing** - Test all admin type access restrictions
2. **Data Upload Validation** - Test strict LOB enforcement
3. **Agent Management** - Test Life Admin centralized agent management
4. **Integration testing** - End-to-end workflows for all admin types
5. **User acceptance testing** - Real-world scenarios

### **Phase 3.8: Production Deployment (1-2 days)**
1. **Staging deployment** - Full system testing
2. **Production database migration** - During maintenance window
3. **Code deployment** - Staged rollout with monitoring
4. **Post-deployment verification** - All features working
5. **User training** - New features and workflows

---

## 🎯 **SALES AGENT USER EXPERIENCE FLOW**

### **Sales Agent Dashboard Design**

**Landing Page - LOB Selection:**
```
Sales Agent Portfolio Dashboard
┌─────────────────┬─────────────────┬─────────────────┐
│      LIFE       │     HEALTH      │     MOTOR       │
│   Insurance     │   Insurance     │   Insurance     │
│                 │                 │                 │
│  50 customers   │  30 customers   │  20 customers   │
│  $500K total    │  $150K total    │  $80K total     │
│                 │                 │                 │
│   [View Life]   │  [View Health]  │  [View Motor]   │
└─────────────────┴─────────────────┴─────────────────┘
```

**Month Selection Page (after clicking LOB):**
```
Life Insurance - Month Selection
┌─────────────────┬─────────────────┬─────────────────┐
│   October 2024  │  November 2024  │  December 2024  │
│                 │                 │                 │
│  15 customers   │  20 customers   │  15 customers   │
│  $150K total    │  $200K total    │  $150K total    │
│                 │                 │                 │
│  [View Oct]     │  [View Nov]     │  [View Dec]     │
└─────────────────┴─────────────────┴─────────────────┘
```

**Customer List Page (after selecting LOB + Month):**
```
Life Insurance - October 2024 (15 customers)
┌─────────────────────────────────────────────────────┐
│ 🔍 Search: [____________] 📊 Sort: Amount ▼         │
├─────────────────────────────────────────────────────┤
│ Mr John Smith     | LIFE-001  | $5,000 | 📞 Call   │
│ Mrs Mary Johnson  | LIFE-002  | $3,200 | 📞 Call   │
│ Dr David Brown    | LIFE-003  | $1,800 | 📞 Call   │
└─────────────────────────────────────────────────────┘
```

### **Navigation Flow**
```
Sales Agent Login
    ↓
LOB Dashboard (Life/Health/Motor cards with customer counts)
    ↓ (Click LOB - e.g., "Health")
Month Selection (Show months: Oct-25, Nov-25, Dec-25 with customer counts)
    ↓ (Click Month - e.g., "Oct-25")
Customer List (Health + Oct-25 + SA001 customers - VIEW ONLY)
    ↓ (Click Customer)
Customer Detail Page (Full customer info + call logging + AOD creation)

Note: Sales agents can view and work with customers but CANNOT fetch/assign new ones
```

---

## 📊 **ACCESS CONTROL MATRIX**

### **Agent Access Control**
| Agent Type | Regular Branches | Branch 6 (Exclusive) | Customer Access | Assignment Rights | UI Experience |
|------------|------------------|----------------------|-----------------|-------------------|---------------|
| **Call Center** | ❌ No | ✅ Only | Branch 6 customers only | Can fetch/assign branch 6 customers | Traditional fetch system |
| **Internal** | ✅ Their Branch | ❌ No | ALL branch customers (including sales agent customers) | Can fetch/assign branch customers | Traditional fetch system |
| **Sales Agent** | ✅ View Their Customers | ❌ No | View-only their onboarded customers | ❌ Cannot fetch/assign customers | LOB dashboard → Month → Customer list |
| **CSR** | ✅ ALL Branches | ❌ No | ALL customers from ALL branches (all LOBs) | ❌ View/service only (no fetch/assign) | LOB dashboard → Month → Customer list |

### **LOB Admin Access Control (NEW ARCHITECTURE)**
| Admin Type | Customer Data Access | Agent Management | Data Upload Rights | Dashboard View |
|------------|---------------------|------------------|-------------------|----------------|
| **Super Admin** | All LOBs + All Branches | All agents (sales + internal + call center) | Any LOB data to any branch | Complete system overview |
| **Life Admin** | Life customers only (all branches) | **ALL sales agents + ALL internal agents** | Life data only (including to branch 6) | Life-specific metrics |
| **Motor Admin** | Motor customers only (all branches) | ❌ No agent management | Motor data only (including to branch 6) | Motor-specific metrics |
| **Health Admin** | Health customers only (all branches) | ❌ No agent management | Health data only (including to branch 6) | Health-specific metrics |
| **Call Center Admin** | Branch 6 only (all LOBs) | Call center agents only | Any LOB data to branch 6 | Call center operations |

### **Data Upload Validation Rules**
- **Strict LOB Enforcement**: Admin can only upload data matching their `admin_lob`
- **Example**: Motor Admin uploading Health data → ❌ **REJECTED**
- **Branch 6 Campaigns**: Each LOB admin can upload their LOB data to branch 6
- **Validation Logic**: `admin_lob` must match `line_of_business` in uploaded data

---

## 👥 **CSR (CUSTOMER SERVICE REPRESENTATIVE) ARCHITECTURE (NEW)**

### **CSR User Type Overview**
CSRs are universal customer service representatives who provide comprehensive support across all lines of business using the same intuitive LOB dashboard interface as sales agents, but with complete access to ALL customers from ALL branches. This enables any walk-in customer to receive service at any branch location.

### **CSR Access Model**
```
CSR Characteristics:
├── Location: Any branch location (universal service)
├── Data Access: ALL customers from ALL branches (complete portfolio)
├── UI Experience: LOB Dashboard (same as Sales Agents)
├── Geographic Scope: GLOBAL ACCESS (all branches)
├── LOB Scope: Life + Health + Motor (all products)
└── Permissions: View + Customer Service (no assignment/fetching)
```

### **CSR vs Other Agent Types**
| Feature | CSR | Sales Agent | Internal Agent | Call Center |
|---------|-----|-------------|----------------|-------------|
| **UI Experience** | LOB Dashboard | LOB Dashboard | Traditional List | Traditional List |
| **Data Access** | **ALL customers (all branches)** | Own customers only | Branch customers only | Branch 6 only |
| **LOB Scope** | All LOBs | All LOBs | All LOBs | All LOBs |
| **Assignment Rights** | ❌ View/Service only | ❌ View only | ✅ Can fetch/assign | ✅ Can fetch/assign |
| **Geographic Scope** | **GLOBAL ACCESS** | Customer-based | Branch-based | Call center only |

### **CSR Workflow Design**
```
CSR Login (Any Branch Location)
    ↓
LOB Dashboard (Life/Health/Motor cards with ALL customer counts from ALL branches)
    ↓ (Click LOB - e.g., "Health")
Month Selection (Show months with ALL Health customers from ALL branches)
    ↓ (Click Month - e.g., "Oct-25")
Customer List (ALL Health + Oct-25 customers regardless of branch)
    ↓ (Click Customer)
Customer Detail Page (Universal customer service for any policy, any branch)
```

### **CSR Data Access Examples**
```
ANY CSR (Universal Access):
- Life Insurance: 150 customers (ALL Life customers from ALL branches)
- Health Insurance: 120 customers (ALL Health customers from ALL branches)  
- Motor Insurance: 100 customers (ALL Motor customers from ALL branches)
- Total Portfolio: 370 customers (complete system portfolio)

Sales Agent SA001:
- Life Insurance: 7 customers (Only SA001's Life customers)
- Health Insurance: 6 customers (Only SA001's Health customers)
- Motor Insurance: 5 customers (Only SA001's Motor customers)
- Total Portfolio: 18 customers (own customers only)

Internal Agent Branch 1:
- Life Insurance: 45 customers (Branch 1 Life customers only)
- Health Insurance: 32 customers (Branch 1 Health customers only)
- Motor Insurance: 28 customers (Branch 1 Motor customers only)
- Total Portfolio: 105 customers (branch-specific only)
```

### **CSR Implementation Requirements**

**Database Changes:**
```sql
-- Add CSR agent type
ALTER TABLE nic_cc_agent MODIFY agent_type 
ENUM('call_center', 'internal', 'sales_agent', 'csr');

-- Sample CSR Data:
INSERT INTO nic_cc_agent (name, email, agent_type, branch_id, role) VALUES
('CSR Port Louis', 'csr.portlouis@nic.mu', 'csr', 1, 'agent'),
('CSR Curepipe', 'csr.curepipe@nic.mu', 'csr', 2, 'agent'),
('CSR Flacq', 'csr.flacq@nic.mu', 'csr', 3, 'agent');
```

**Service Layer Updates:**
```javascript
// CSR LOB Summary Function (Universal Access)
const getCSRLOBSummary = () => {
  // Get ALL customers from ALL branches (except call center exclusive)
  const allAccessibleCustomers = allCustomers.filter(customer => 
    customer.branch_id !== 6  // Exclude only call center exclusive data
  )
  
  // Group by LOB and month for dashboard display
  return groupCustomersByLOBAndMonth(allAccessibleCustomers)
}

// CSR Customer Access Function (Global Access)
const getCSRCustomersForLOBMonth = (lob, month) => {
  return allCustomers.filter(customer =>
    customer.line_of_business === lob &&
    customer.assigned_month === month &&
    customer.branch_id !== 6  // Exclude only call center exclusive data
  )
}
```

**UI Integration:**
```javascript
// Dashboard Routing Logic
if (user.agent_type === 'sales_agent' || user.agent_type === 'csr') {
  return <LOBDashboard />
}

// LOB Dashboard Data Source Detection
const getLOBData = (user) => {
  if (user.agent_type === 'sales_agent') {
    return getSalesAgentLOBSummary(user.sales_agent_id)
  }
  
  if (user.agent_type === 'csr') {
    return getCSRLOBSummary()  // No parameters - universal access
  }
}
```

### **CSR Business Benefits**

**For Branches:**
- **Universal Customer Service**: Any CSR can serve any customer from any branch
- **Complete System Access**: Full customer portfolio across all LOBs and branches
- **Familiar Interface**: Same LOB dashboard as sales agents
- **Walk-in Flexibility**: Customers can visit any branch for service

**For Customers:**
- **Branch Independence**: Can receive service at any NIC branch location
- **Complete Service**: CSR has access to full customer history regardless of origin branch
- **Consistent Experience**: Same service quality and access at all locations
- **No Transfers Needed**: Single CSR can handle any policy from any branch

**For Management:**
- **Universal Service Coverage**: Complete customer service capability at every branch
- **Operational Flexibility**: CSRs can cover for each other across branches
- **Comprehensive Analytics**: System-wide customer service metrics
- **Scalable Model**: Easy to add CSRs at any location with full capability

---

## 🏢 **LOB ADMIN ARCHITECTURE (NEW)**

### **Admin Type Responsibilities**

**Super Admin:**
- **Data Access**: All LOBs + All branches + System administration
- **Agent Management**: All agents (sales + internal + call center)
- **Upload Rights**: Any LOB data to any branch
- **Dashboard**: Complete system overview with cross-LOB analytics

**Life Admin:**
- **Data Access**: Life customers only (all branches including branch 6 campaigns)
- **Agent Management**: **ALL sales agents + ALL internal agents** (centralized user management)
- **Upload Rights**: Life data only (strict validation: `line_of_business = 'life'`)
- **Dashboard**: Life-specific metrics and performance

**Motor Admin:**
- **Data Access**: Motor customers only (all branches including branch 6 campaigns)
- **Agent Management**: ❌ None (Life Admin manages all agents)
- **Upload Rights**: Motor data only (strict validation: `line_of_business = 'motor'`)
- **Dashboard**: Motor-specific metrics and performance

**Health Admin:**
- **Data Access**: Health customers only (all branches including branch 6 campaigns)
- **Agent Management**: ❌ None (Life Admin manages all agents)
- **Upload Rights**: Health data only (strict validation: `line_of_business = 'health'`)
- **Dashboard**: Health-specific metrics and performance

**Call Center Admin:**
- **Data Access**: Branch 6 only (all LOBs in call center exclusive branch)
- **Agent Management**: Call center agents only
- **Upload Rights**: Any LOB data to branch 6 (for campaign management)
- **Dashboard**: Call center operations and campaign metrics

### **Data Upload Validation Logic**
```javascript
const validateLOBUpload = (adminUser, customerData) => {
  // Super Admin can upload anything
  if (adminUser.admin_lob === 'super_admin') return { success: true }
  
  // Strict LOB enforcement for other admins
  for (const customer of customerData) {
    if (customer.line_of_business !== adminUser.admin_lob) {
      return {
        success: false,
        error: `${adminUser.admin_lob.toUpperCase()} Admin cannot upload ${customer.line_of_business} data. Policy: ${customer.policy_number}`
      }
    }
  }
  
  return { success: true }
}
```

### **Agent Management Access Control**
```javascript
const canManageAgents = (adminUser) => {
  return adminUser.admin_lob === 'super_admin' || adminUser.admin_lob === 'life'
}

// Only Life Admin and Super Admin see agent management menu
{canManageAgents(user.admin_lob) && (
  <NavLink to="/admin/agents">Manage Agents</NavLink>
)}
```

---

## � ***BUSINESS LOGIC CLARIFICATION**

### **Customer Ownership vs Assignment (CRITICAL)**
**Key Principle**: Customer ownership and assignment are NOT mutually exclusive.

**Customer Ownership (Permanent)**:
- `sales_agent_id`: Who onboarded/owns the customer (permanent relationship)
- `branch_id`: Which branch the customer belongs to (geographical/organizational)

**Customer Assignment (Temporary)**:
- `assigned_agent`: Who is currently assigned to call this customer (temporary workflow)
- `assignment_status`: Current workflow status (available/assigned/completed)

**Access Rights**:
- **Internal agents**: Can see ALL branch customers (including sales agent customers)
- **Sales agents**: Can see ALL their customers (regardless of current assignment status)
- **Assignment doesn't affect ownership**: Sales agents retain access even when customers are assigned to internal agents

### **Example Scenario**:
```
Customer: "John Smith"
- branch_id: 1 (Flacq branch)
- sales_agent_id: SA001 (Sales Agent John onboarded this customer)
- assigned_agent: internal_agent_5 (Currently assigned for calling)
- assignment_status: assigned

Access Rights:
✅ Internal Agent Flacq: Can see (branch 1 customer) + can fetch for calling
✅ Sales Agent John: Can see (his onboarded customer) + can work with customer
✅ Call Center Agent: Cannot see (not branch 6)

Both agents can work with the same customer simultaneously!
```

### **Agent Workflow Differences**:
- **Internal/Call Center**: Use "Fetch Next 10" system for assignment-based calling
- **Sales Agents**: Use LOB dashboard for relationship-based customer management
- **No conflict**: Both can work with same customers through different workflows

---

## 📈 **DATA MIGRATION STRATEGY**

### **Existing Data Updates**
```sql
-- Set default LOB for existing customers
UPDATE nic_cc_customer SET line_of_business = 'life' WHERE line_of_business IS NULL;

-- Update existing agents to call_center type (default)
UPDATE nic_cc_agent SET agent_type = 'call_center' WHERE agent_type IS NULL;

-- Update internal agents based on branch assignment
UPDATE nic_cc_agent SET agent_type = 'internal' WHERE branch_id IS NOT NULL AND branch_id != 6;
```

### **Sales Agent Data Import**
```csv
# sales_agents_import.csv
name,email,password,sales_agent_id,agent_type
John Sales Agent,john.sales@nic.mu,temp123,SA001,sales_agent
Mary Sales Agent,mary.sales@nic.mu,temp123,SA002,sales_agent
David Sales Agent,david.sales@nic.mu,temp123,SA003,sales_agent
```

### **Customer Data with New Fields**
```csv
# customer_import_enhanced.csv
policy_number,name,email,mobile,amount_due,branch_id,sales_agent_id,line_of_business,assigned_month,title_owner1,title_owner2,name_owner2,address,national_id
LIFE-001,John Smith,john@email.com,57111111,5000,1,SA001,life,2024-10,Mr,,Jane Smith,123 Main Street Port Louis,ID123456789
HEALTH-002,Mary Johnson,mary@email.com,57111112,1200,1,SA001,health,2024-11,Mrs,,,456 Oak Avenue Curepipe,ID789012345
MOTOR-003,David Brown,david@email.com,57111113,800,2,SA002,motor,2024-10,Dr,,,789 Pine Road Flacq,ID345678901
EXCL-001,Old Customer,old@email.com,57111114,600,6,,life,2024-12,Ms,,,321 Elm Street Mahebourg,ID901234567
```

---

## 🎯 **ESTIMATED EFFORT (UPDATED)**

| Phase | Task | Status | Estimated Days |
|-------|------|--------|----------------|
| 3.1 | Database Changes | ✅ **COMPLETED** | ~~1-2 days~~ |
| 3.2 | Backend Services | ✅ **COMPLETED** | ~~1-2 days~~ |
| 3.3 | LOB Admin Interface | ✅ **COMPLETED** | ~~2-3 days~~ |
| 3.4 | CSR Implementation | ⏳ **NEW PRIORITY** | 1-2 days |
| 3.5 | Lower Priority Features | ⏳ **DEFERRED** | Later phase |
| 3.6 | User Interface | ✅ **MOSTLY COMPLETE** | ~~0.5-1 days~~ |
| 3.7 | Testing & Migration | ⏳ **PENDING** | 1-2 days |
| 3.8 | Production Deployment | ⏳ **PENDING** | 1 day |
| **TOTAL** | **Remaining Implementation** | | **3-5 days** |

**Priority Focus**: CSR implementation for branch-based customer service across all LOBs. Advanced features deferred to later phases.

---

## 🔧 **ROLLBACK PLAN**

1. **Database backup** before all changes
2. **Git tags** for each phase
3. **Feature flags** for gradual rollout
4. **Monitoring** for real-time issue detection
5. **Quick rollback scripts** for emergency situations

---

## 🎯 **KEY BUSINESS BENEFITS**

### **Sales Agent Benefits**
- **Portfolio Management**: Complete view of assigned customers across all LOBs
- **Relationship Focus**: Direct control over customer relationships
- **Performance Tracking**: Individual metrics and analytics
- **Flexible Workflow**: Smart search and filtering capabilities

### **Internal Agent Benefits**
- **Branch Oversight**: Complete visibility of branch operations
- **Multi-LOB Management**: Handle all business lines efficiently
- **Smart Search**: Find customers quickly with advanced filters
- **Performance Monitoring**: Branch-wide analytics and reporting

### **Call Center Benefits**
- **Expanded Access**: Additional exclusive customer data (3K-5K customers)
- **Unified Operations**: Same workflow for all customer types
- **Fair Distribution**: Existing batch system maintained
- **Comprehensive Reporting**: All data included in standard reports

### **Administrative Benefits**
- **Scalable Management**: Handle large numbers of sales agents
- **Flexible Data Loading**: Support for various data sources
- **Comprehensive Reporting**: Multi-dimensional analysis capabilities
- **Easy Policy Transfer**: Handle agent changes efficiently

---

## 📞 **SUPPORT & MAINTENANCE**

### **Monitoring Points**
- **Database Performance**: Monitor query performance with new indexes
- **Search Performance**: Track smart search response times
- **User Adoption**: Monitor usage patterns by agent type
- **Data Integrity**: Validate sales agent assignments and LOB data

### **Maintenance Tasks**
- **Regular Data Cleanup**: Remove inactive sales agents and orphaned data
- **Performance Optimization**: Monitor and optimize search queries
- **Report Generation**: Ensure LOB and sales agent reports perform well
- **User Training**: Ongoing support for new features

---

*This document serves as the complete implementation guide for Phase 2 enhancements to the NIC Call Center System. All changes maintain backward compatibility while adding powerful new capabilities for multi-agent, multi-LOB operations.*

**Last Updated**: October 29, 2025  
**Version**: 2.1  
**Status**: LOB Admin Core Features Complete - Testing & Cleanup Phase

## 🎯 **CURRENT IMPLEMENTATION STATUS**

### **✅ COMPLETED COMPONENTS**
- **Database Schema**: All new fields added to customer and agent tables
- **LOB Dashboard**: Fully functional with Life/Health/Motor navigation
- **Sales Agent Authentication**: Working with agent type detection
- **Month-based Navigation**: Sales agents can browse customers by LOB and month
- **Smart Search**: Advanced filtering in customer lists
- **QR Code Integration**: Payment QR generation for sales agent customers
- **Agent Type Support**: Call center, internal, and sales agent types implemented
- **Service Layer Filtering**: Agent type-based customer access restrictions implemented
- **Branch 6 Exclusive Access**: Call center agent filtering fully functional
- **Agent Access Control**: All three agent types have proper data access restrictions
- **LOB Admin Authentication**: `admin_lob` field working in user sessions ✅ **NEW**
- **OTP Testing Bypass**: Fixed OTP `123456` for all admin emails ✅ **NEW**
- **LOB Customer Filtering**: `getCustomersForAdmin()` function implemented and tested ✅ **NEW**
- **LOB Admin Dashboard**: Dynamic dashboard showing LOB-specific metrics ✅ **NEW**
- **Customer Upload Validation**: LOB-based upload restrictions and validation ✅ **NEW**
- **Enhanced CSV Template**: Updated template with all new database fields ✅ **NEW**

### **🔄 IN PROGRESS**
- **Testing & Validation**: End-to-end workflow testing for all admin types

### **⏳ REMAINING TASKS**
- **CSR Implementation**: Add CSR user type with branch-based LOB dashboard access ⏳ **NEW**
- **Testing & Validation**: End-to-end workflow testing for all agent types (including CSR)
- **Admin Interface Updates**: LOB-specific admin views and controls
- **Production Deployment**: Final rollout and monitoring

## 📊 **COMPLETE DATABASE SCHEMA (UPDATED)**

### **nic_cc_customer Table Structure:**
```sql
{
  id: integer,
  created_at: timestamp,
  policy_number: text,
  name: text,
  mobile: text,
  email: email,
  amount_due: decimal,
  status: enum,
  last_call_date: date,
  total_attempts: integer,
  updated_at: timestamp,
  assignment_status: enum,
  assigned_agent: integer,
  assigned_at: timestamp,
  priority_score: decimal,
  escalation_reason: text,
  update_count: integer,
  branch_id: integer,
  has_payment_plan: bool,
  active_payment_plans_count: integer,
  sales_agent_id: text,           -- NEW: Sales agent identifier
  line_of_business: enum,         -- NEW: life/health/motor
  assigned_month: text,           -- NEW: Format "Oct-25"
  title_owner1: text,             -- NEW: Mr/Mrs/Ms/Dr
  title_owner2: text,             -- NEW: Second owner title
  name_owner2: text,              -- NEW: Second owner name
  address: text,                  -- NEW: Full address
  national_id: text               -- NEW: National ID number
}
```

### **nic_cc_agent Table Structure:**
```sql
{
  id: integer,
  name: text,
  email: text,
  password/password_hash: text,
  role: text,
  active: boolean,
  agent_type: enum,               -- call_center/internal/sales_agent
  sales_agent_id: text,           -- For sales agents only
  branch_id: integer,             -- For internal agents
  admin_lob: text,                -- NEW: super_admin/life/motor/health/call_center
  current_batch_size: integer
}
```

## 🧪 **TESTING COMPLETED**
- ✅ Motor Admin login: `admin_lob: "motor"` confirmed working
- ✅ OTP bypass: `123456` working for all admin emails
- ✅ Database fields: All new fields confirmed in Xano
- ✅ Authentication flow: Complete LOB admin authentication working
- ✅ LOB filtering tested: Motor(5), Life(7), Health(6), CallCenter(5), SuperAdmin(18) customers ✅ **NEW**
- ✅ Admin dashboard: LOB-specific metrics and conditional navigation verified ✅ **NEW**
- ✅ Upload validation: LOB restrictions working, Motor Admin cannot upload Life data ✅ **NEW**
- ✅ CSV template: All new fields included, LOB-specific templates generated ✅ **NEW**

## 📊 **LOB ADMIN IMPLEMENTATION DETAILS**

### **Completed Features:**

**1. Authentication & Session Management:**
- `admin_lob` field added to user session data
- All admin types (super_admin, life, motor, health, call_center) working
- OTP bypass implemented for testing (`123456` for all admin emails)

**2. Customer Data Filtering:**
- `getCustomersForAdmin(adminUser)` function implemented
- LOB-based filtering: Motor Admin sees only Motor customers
- Branch-based filtering: Call Center Admin sees only Branch 6 customers
- Super Admin sees all customers across all LOBs

**3. Dynamic Admin Dashboard:**
- LOB-specific titles and descriptions
- Real-time metrics: customer count, total amount due, pending customers, average amount
- Conditional navigation: Agent Management only for Life Admin + Super Admin
- Admin type badges and contextual information

**4. Data Structure Support:**
- Complete field mapping for all new database fields
- Support for: `sales_agent_id`, `line_of_business`, `assigned_month`, `title_owner1`, `title_owner2`, `name_owner2`, `address`, `national_id`
- Payment plan fields: `has_payment_plan`, `active_payment_plans_count`

**5. Customer Upload System:**
- LOB-based upload validation: Admins can only upload data matching their LOB
- Enhanced CSV template with all new database fields
- LOB-specific template generation (motor_customer_template.csv, life_customer_template.csv, etc.)
- Comprehensive field validation and error reporting
- Support for all new fields in upload process

### **Verified Data Distribution:**
```
Motor Admin:      5 customers (Motor LOB only)
Life Admin:       7 customers (Life LOB only)  
Health Admin:     6 customers (Health LOB only)
Call Center Admin: 5 customers (Branch 6 only)
Super Admin:      18 customers (ALL customers)
Total Verification: 5 + 7 + 6 = 18 ✅
```

### **Upload Validation Rules:**
```
✅ Motor Admin + Motor data     → ALLOWED
❌ Motor Admin + Life data      → REJECTED ("MOTOR Admin cannot upload life data")
❌ Motor Admin + Health data    → REJECTED ("MOTOR Admin cannot upload health data")
✅ Super Admin + Any LOB data   → ALLOWED
✅ Call Center Admin + Any LOB  → ALLOWED (to branch 6)
```

### **Enhanced CSV Template Fields:**
```csv
# Complete field list now supported:
policy_number,name,mobile,email,amount_due,status,last_call_date,total_attempts,
sales_agent_id,line_of_business,assigned_month,title_owner1,title_owner2,
name_owner2,address,national_id,branch_id

# LOB-specific templates generated:
- motor_customer_template.csv (Motor Admin)
- life_customer_template.csv (Life Admin)  
- health_customer_template.csv (Health Admin)
- call_center_customer_template.csv (Call Center Admin)
```