# Bulk Agent Creation Feature - Implementation Plan

## 📋 Overview

This document outlines the complete implementation plan for the Bulk Agent Creation feature, allowing Life Admin users to create multiple agent accounts via CSV upload.

## 🎯 Requirements Summary

### Access Control
- **Authorized Users:** Life Admin role only
- **Target Table:** `nic_cc_agent`
- **Capacity:** Support up to 500 records per upload
- **Use Case:** Bulk creation of 180+ agent accounts

### Business Rules
- **Password Policy:** Simple 8-character passwords (no complexity requirements)
- **Default Values:** `current_batch_size = 0`, `active = true`
- **Duplicate Handling:** Skip duplicate emails silently (no errors)
- **Notifications:** No welcome emails to new agents
- **Branch Validation:** No validation required for branch_id
- **Role Restrictions:** Life Admin can create agents with any role

## 🗄️ Database Schema

### Target Table: `nic_cc_agent`
```sql
{
  "id": "integer",                    -- Auto-generated
  "created_at": "timestamp",          -- Auto-generated
  "name": "text",                     -- From CSV (required)
  "email": "email",                   -- From CSV (required, unique)
  "password_hash": "text",            -- Auto-generated
  "role": "enum",                     -- From CSV (optional, default: 'agent')
  "active": "bool",                   -- Default: true
  "updated_at": "timestamp",          -- Auto-generated
  "last_logout_time": "timestamp",    -- Default: null
  "current_batch_size": "integer",    -- Default: 0
  "branch_id": "integer",             -- From CSV (optional, default: 1)
  "agent_type": "enum",               -- From CSV (optional, default: 'call_center')
  "sales_agent_id": "text",           -- From CSV (optional)
  "admin_lob": "enum"                 -- From CSV (optional)
}
```

## 📄 CSV Format Specification

### Required Format
```csv
name,email,role,branch_id,agent_type,sales_agent_id,admin_lob
John Doe,john.doe@nic.mu,agent,1,sales_agent,SA001,life
Jane Smith,jane.smith@nic.mu,csr_agent,2,csr_agent,CSR001,
Mike Johnson,mike.j@nic.mu,admin,3,internal_agent,IA001,health
```

### Field Requirements
| Field | Required | Type | Default | Description |
|-------|----------|------|---------|-------------|
| `name` | ✅ Yes | text | - | Full name of agent |
| `email` | ✅ Yes | email | - | Unique email address |
| `role` | ❌ No | enum | 'agent' | User role in system |
| `branch_id` | ❌ No | integer | 1 | Branch identifier |
| `agent_type` | ❌ No | enum | 'call_center' | Type of agent |
| `sales_agent_id` | ❌ No | text | null | Sales agent identifier |
| `admin_lob` | ❌ No | enum | null | Admin line of business |

### Validation Rules
- **Email:** Valid format, unique in database
- **Name:** 2-100 characters, required
- **Role:** Valid enum value (if provided)
- **Agent Type:** Valid enum value (if provided)
- **Branch ID:** Any integer (no validation)
- **Admin LOB:** Valid enum value (if provided)

## 🏗️ System Architecture

### Component Structure
```
src/pages/admin/BulkAgentCreation.jsx
├── CSVUploader.jsx              -- File upload interface
├── ValidationResults.jsx        -- Show validation summary
├── PreviewTable.jsx            -- Data preview with errors
├── CreationProgress.jsx         -- Batch processing progress
└── ResultsSummary.jsx          -- Final results report
```

### Service Layer
```
src/services/bulkAgentService.js
├── parseCSV()                  -- Parse uploaded CSV file
├── validateRecords()           -- Validate each record
├── checkDuplicates()           -- Check for existing emails
├── generatePasswords()         -- Create secure passwords
├── createAgentsInBatches()     -- Bulk creation with progress
└── generateReport()            -- Create downloadable report
```

### Utility Functions
```
src/utils/csvParser.js          -- CSV parsing utilities
src/utils/passwordGenerator.js  -- Password generation
src/utils/bulkValidator.js      -- Validation logic
```

## 🎨 User Interface Design

### Step 1: Upload Interface
```
┌─────────────────────────────────────────────────┐
│ 📊 Bulk Agent Creation (Life Admin Only)       │
├─────────────────────────────────────────────────┤
│                                                 │
│ 📁 Upload CSV File                              │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Choose File] agents.csv                    │ │
│ │ [Upload & Validate]                         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ 📋 CSV Format Requirements:                     │
│ • Required fields: name, email                  │
│ • Optional fields: role, branch_id, etc.       │
│ • Maximum 500 records per upload               │
│ • File size limit: 5MB                         │
│                                                 │
│ 📥 Download Sample CSV Template                 │
└─────────────────────────────────────────────────┘
```

### Step 2: Validation Results
```
┌─────────────────────────────────────────────────┐
│ 📊 Validation Results: agents.csv              │
├─────────────────────────────────────────────────┤
│                                                 │
│ 📈 Summary:                                     │
│ • Total records found: 180                     │
│ • ✅ Valid records: 175                        │
│ • ⚠️  Duplicate emails: 3 (will be skipped)    │
│ • ❌ Invalid records: 2                        │
│                                                 │
│ [📋 View Detailed Report] [🚀 Create Agents]   │
│                                                 │
│ ⚠️  Note: Duplicate emails will be skipped     │
│    without creating new accounts.               │
└─────────────────────────────────────────────────┘
```

### Step 3: Preview Table
```
┌─────────────────────────────────────────────────┐
│ 📋 Agent Preview (Showing first 10 of 175)     │
├─────────────────────────────────────────────────┤
│ Name          │ Email              │ Role   │ Status │
│ John Doe      │ john@nic.mu       │ agent  │ ✅ Valid │
│ Jane Smith    │ jane@nic.mu       │ csr    │ ✅ Valid │
│ Bob Wilson    │ invalid-email     │ agent  │ ❌ Error │
│ Alice Brown   │ alice@nic.mu      │ admin  │ ⚠️  Duplicate │
│                                                 │
│ [📄 Show All] [⬇️ Download Report] [🚀 Create] │
└─────────────────────────────────────────────────┘
```

### Step 4: Creation Progress
```
┌─────────────────────────────────────────────────┐
│ 🔄 Creating Agents... (Batch 15 of 18)         │
├─────────────────────────────────────────────────┤
│                                                 │
│ Progress: ████████████░░░░ 75% (135/175)       │
│                                                 │
│ Status:                                         │
│ • ✅ Successfully created: 135 agents          │
│ • ⚠️  Skipped duplicates: 3 agents             │
│ • ❌ Failed: 0 agents                          │
│                                                 │
│ Current batch: Processing agents 131-140...     │
│                                                 │
│ [❌ Cancel Process]                             │
└─────────────────────────────────────────────────┘
```

### Step 5: Results Summary
```
┌─────────────────────────────────────────────────┐
│ ✅ Bulk Agent Creation Complete                 │
├─────────────────────────────────────────────────┤
│                                                 │
│ 📊 Final Results:                               │
│ • ✅ Successfully created: 175 agents          │
│ • ⚠️  Skipped duplicates: 3 agents             │
│ • ❌ Failed: 2 agents                          │
│ • ⏱️  Total time: 2 minutes 15 seconds         │
│                                                 │
│ 🔐 Security Report:                             │
│ • 175 passwords generated                       │
│ • All accounts set to active                    │
│ • Default batch size applied (0)                │
│                                                 │
│ [📥 Download Password Report] [🔄 Create More]  │
│ [📋 View Agent List] [🏠 Back to Dashboard]    │
└─────────────────────────────────────────────────┘
```

## 🔐 Security Implementation

### Access Control
```javascript
// Route protection
const BulkAgentCreation = () => {
  const { user } = useAuth()
  
  if (user?.role !== 'life_admin') {
    return <AccessDenied message="Life Admin access required" />
  }
  
  return <BulkCreationInterface />
}
```

### Password Generation
```javascript
// Simple 8-character password generator
function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
```

### File Security
- Maximum file size: 5MB
- Only CSV files accepted
- Content validation before processing
- Secure file cleanup after processing

### Audit Trail
```javascript
// Audit logging for bulk operations
const auditLog = {
  action: 'bulk_agent_creation',
  admin_user: user.id,
  admin_email: user.email,
  records_processed: 180,
  records_created: 175,
  records_skipped: 3,
  records_failed: 2,
  timestamp: new Date().toISOString(),
  ip_address: getClientIP(),
  file_name: 'agents.csv'
}
```

## 🔄 Processing Workflow

### 1. File Upload & Parsing
```javascript
uploadCSV(file) → parseCSV(content) → validateFormat(data)
```

### 2. Data Validation
```javascript
validateRecords(data) → {
  valid: [],      // Records ready for creation
  duplicates: [], // Existing emails (skip)
  errors: []      // Invalid data (report)
}
```

### 3. Batch Processing
```javascript
createAgentsInBatches(validRecords, batchSize=10) → {
  // Process in batches to avoid overwhelming the API
  for (batch of batches) {
    results = await createAgentBatch(batch)
    updateProgress(results)
  }
}
```

### 4. Report Generation
```javascript
generateReport(results) → {
  summary: { created, skipped, failed },
  passwords: [{ email, password }],
  errors: [{ row, field, message }]
}
```

## 📁 File Structure

### New Files to Create
```
src/pages/admin/BulkAgentCreation.jsx     -- Main page component
src/services/bulkAgentService.js          -- Core business logic
src/components/admin/CSVUploader.jsx      -- File upload component
src/components/admin/AgentPreviewTable.jsx -- Data preview table
src/components/admin/ValidationResults.jsx -- Validation summary
src/components/admin/CreationProgress.jsx  -- Progress indicator
src/components/admin/ResultsSummary.jsx    -- Final results
src/utils/csvParser.js                     -- CSV parsing utilities
src/utils/passwordGenerator.js             -- Password generation
src/utils/bulkValidator.js                 -- Validation logic
```

### Files to Modify
```
src/components/layout/Sidebar.jsx          -- Add navigation menu item
src/App.jsx                                -- Add route definition
src/services/authService.js                -- Role checking utilities
```

## 🧪 Testing Strategy

### Unit Tests
- CSV parsing with various formats
- Validation logic for all field types
- Password generation security
- Duplicate detection accuracy

### Integration Tests
- End-to-end file upload process
- Batch creation with API calls
- Error handling scenarios
- Progress tracking accuracy

### User Acceptance Tests
- Life Admin can access feature
- Other roles cannot access feature
- CSV upload and validation works
- Bulk creation completes successfully
- Reports are accurate and downloadable

## 🚀 Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create basic page structure
- [ ] Implement CSV upload and parsing
- [ ] Add basic validation logic
- [ ] Set up route and navigation

### Phase 2: Validation & Preview (Week 2)
- [ ] Complete validation rules
- [ ] Build preview table component
- [ ] Implement duplicate detection
- [ ] Add error reporting

### Phase 3: Bulk Creation (Week 3)
- [ ] Implement batch processing
- [ ] Add progress tracking
- [ ] Build password generation
- [ ] Create audit logging

### Phase 4: Reports & Polish (Week 4)
- [ ] Generate downloadable reports
- [ ] Add comprehensive error handling
- [ ] Implement security measures
- [ ] Complete testing and documentation

## 📊 Success Metrics

### Performance Targets
- Upload and validate 500 records in < 30 seconds
- Create 180 agents in < 3 minutes
- Generate reports in < 10 seconds
- 99.9% accuracy in duplicate detection

### User Experience Goals
- Intuitive 5-step workflow
- Clear progress indicators
- Comprehensive error messages
- Downloadable password reports

### Security Requirements
- Role-based access control
- Secure password generation
- Complete audit trail
- File upload security

## 🔧 Technical Considerations

### API Rate Limiting
- Process in batches of 10 records
- Add delays between batches if needed
- Implement retry logic for failures

### Memory Management
- Stream large CSV files
- Clean up temporary data
- Optimize for 500+ record files

### Error Recovery
- Continue processing after individual failures
- Provide detailed error reports
- Allow partial completion

### Scalability
- Design for future expansion
- Support multiple file formats
- Enable custom field mapping

## 📝 Documentation Requirements

### User Documentation
- CSV format guide with examples
- Step-by-step usage instructions
- Troubleshooting common issues
- Security best practices

### Developer Documentation
- API endpoint specifications
- Component architecture
- Testing procedures
- Deployment instructions

---

**Document Version:** 1.0  
**Created:** December 19, 2024  
**Status:** Planning Phase  
**Next Review:** Upon implementation completion