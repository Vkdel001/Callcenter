# Customer Data Enhancement - Monthly Premium & Second Owner NID

## Overview
Enhancement to the `nic_cc_customer` table to include monthly premium information and second owner national ID for improved customer data management and AOD PDF generation.

## Database Schema Changes

### Table: `nic_cc_customer`

**New Columns to Add:**

```sql
-- Add monthly premium column
ALTER TABLE nic_cc_customer 
ADD COLUMN monthly_premium DECIMAL(10,2) NULL 
COMMENT 'Monthly premium amount for the policy';

-- Add second owner national ID column
ALTER TABLE nic_cc_customer 
ADD COLUMN national_id_owner2 VARCHAR(20) NULL 
COMMENT 'National ID of second policy owner (if applicable)';
```

**Updated Table Structure:**
```sql
CREATE TABLE nic_cc_customer (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    policyNumber VARCHAR(50) NOT NULL,
    mobile VARCHAR(20),
    email VARCHAR(255),
    amountDue DECIMAL(10,2),
    status ENUM('pending', 'contacted', 'resolved', 'unreachable'),
    attempts INT DEFAULT 0,
    lastCallDate DATE,
    branch_id INT,
    agent_id INT,
    lob ENUM('life', 'health', 'motor'),
    national_id VARCHAR(20),
    monthly_premium DECIMAL(10,2) NULL,        -- NEW FIELD
    national_id_owner2 VARCHAR(20) NULL,       -- NEW FIELD
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## CSV Template Updates

### Current CSV Template
```csv
name,policyNumber,mobile,email,amountDue,status,branch_id,agent_id,lob,national_id
```

### Enhanced CSV Template
```csv
name,policyNumber,mobile,email,amountDue,status,branch_id,agent_id,lob,national_id,monthly_premium,national_id_owner2
```

### Sample CSV Data
```csv
name,policyNumber,mobile,email,amountDue,status,branch_id,agent_id,lob,national_id,monthly_premium,national_id_owner2
"John Doe","POL001","57123456","john@email.com",5000.00,"pending",1,1,"life","1234567890123",250.00,"9876543210987"
"Jane Smith","POL002","57234567","jane@email.com",3000.00,"contacted",1,2,"health","2345678901234",150.00,""
"Bob Wilson","POL003","57345678","bob@email.com",7500.00,"pending",2,3,"motor","3456789012345",400.00,""
```

### CSV Field Descriptions
- **monthly_premium**: Monthly premium amount (decimal, can be empty)
- **national_id_owner2**: National ID of second owner (text, can be empty for single-owner policies)

## Frontend UI Changes

### 1. Customer Detail Page Enhancement

**Location:** `src/pages/customers/CustomerDetail.jsx`

**Current Customer Information Section:**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium text-gray-700">Name</label>
    <p className="mt-1 text-sm text-gray-900">{customer.name}</p>
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700">Policy Number</label>
    <p className="mt-1 text-sm text-gray-900">{customer.policyNumber}</p>
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700">Mobile</label>
    <p className="mt-1 text-sm text-gray-900">{customer.mobile}</p>
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700">Email</label>
    <p className="mt-1 text-sm text-gray-900">{customer.email}</p>
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700">Amount Due</label>
    <p className="text-lg font-semibold text-red-600">{formatCurrency(customer.amountDue)}</p>
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700">Status</label>
    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full">
      {customer.status}
    </span>
  </div>
</div>
```

**Enhanced Customer Information Section:**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium text-gray-700">Name</label>
    <p className="mt-1 text-sm text-gray-900">{customer.name}</p>
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700">Policy Number</label>
    <p className="mt-1 text-sm text-gray-900">{customer.policyNumber}</p>
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700">Mobile</label>
    <p className="mt-1 text-sm text-gray-900">{customer.mobile}</p>
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700">Email</label>
    <p className="mt-1 text-sm text-gray-900">{customer.email}</p>
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700">Amount Due</label>
    <p className="text-lg font-semibold text-red-600">{formatCurrency(customer.amountDue)}</p>
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700">Monthly Premium</label>
    <p className="mt-1 text-sm font-semibold text-blue-600">
      {customer.monthly_premium ? formatCurrency(customer.monthly_premium) : 'Not specified'}
    </p>
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700">Status</label>
    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full">
      {customer.status}
    </span>
  </div>
  {customer.national_id_owner2 && (
    <div>
      <label className="block text-sm font-medium text-gray-700">Second Owner NID</label>
      <p className="mt-1 text-sm text-gray-900">{customer.national_id_owner2}</p>
    </div>
  )}
</div>
```

### 2. Customer Upload Page Enhancement

**Location:** `src/pages/admin/CustomerUpload.jsx`

**CSV Template Download Enhancement:**
```jsx
const downloadTemplate = () => {
  const headers = [
    'name',
    'policyNumber', 
    'mobile',
    'email',
    'amountDue',
    'status',
    'branch_id',
    'agent_id',
    'lob',
    'national_id',
    'monthly_premium',      // NEW
    'national_id_owner2'    // NEW
  ];
  
  const sampleData = [
    [
      'John Doe',
      'POL001',
      '57123456',
      'john@email.com',
      '5000.00',
      'pending',
      '1',
      '1',
      'life',
      '1234567890123',
      '250.00',              // NEW
      '9876543210987'        // NEW
    ],
    [
      'Jane Smith',
      'POL002',
      '57234567',
      'jane@email.com',
      '3000.00',
      'contacted',
      '1',
      '2',
      'health',
      '2345678901234',
      '150.00',              // NEW
      ''                     // NEW (empty for single owner)
    ]
  ];
  
  // Generate and download CSV...
};
```

## AOD PDF Enhancement

### Location: `src/services/aodPdfService.js`

**Current PDF Generation Logic:**
```javascript
const generateAODPDF = (aod, customer, installments = []) => {
  // Current customer info section
  const customerInfo = [
    ['Policy Holder:', customer.name],
    ['Policy Number:', customer.policyNumber],
    ['National ID:', customer.national_id || 'Not provided'],
    ['Mobile:', customer.mobile],
    ['Email:', customer.email]
  ];
  
  // ... rest of PDF generation
};
```

**Enhanced PDF Generation Logic:**
```javascript
const generateAODPDF = (aod, customer, installments = []) => {
  // Enhanced customer info section
  const customerInfo = [
    ['Policy Holder:', customer.name],
    ['Policy Number:', customer.policyNumber],
    ['National ID (Owner 1):', customer.national_id || 'Not provided'],
    ['Mobile:', customer.mobile],
    ['Email:', customer.email]
  ];

  // Add monthly premium if available
  if (customer.monthly_premium) {
    customerInfo.push(['Monthly Premium:', `MUR ${customer.monthly_premium.toLocaleString()}`]);
  }

  // Add second owner NID if available
  if (customer.national_id_owner2) {
    customerInfo.push(['National ID (Owner 2):', customer.national_id_owner2]);
  }
  
  // ... rest of PDF generation with enhanced customer info
};
```

**PDF Layout Enhancement:**
```javascript
// Policy Information Section
doc.text('POLICY INFORMATION', 50, yPosition);
yPosition += 20;

// Create table for customer information
const tableData = [
  ['Policy Holder', customer.name],
  ['Policy Number', customer.policyNumber],
  ['National ID (Primary Owner)', customer.national_id || 'Not provided'],
  ['Mobile Number', customer.mobile],
  ['Email Address', customer.email]
];

// Add monthly premium if available
if (customer.monthly_premium) {
  tableData.push(['Monthly Premium', `MUR ${customer.monthly_premium.toLocaleString()}`]);
}

// Add second owner NID if available  
if (customer.national_id_owner2) {
  tableData.push(['National ID (Second Owner)', customer.national_id_owner2]);
}

// Generate table in PDF
doc.autoTable({
  startY: yPosition,
  head: [['Field', 'Value']],
  body: tableData,
  theme: 'grid',
  styles: { fontSize: 10 }
});
```

## Backend API Changes

### 1. Customer Service Updates

**Location:** `src/services/customerService.js`

**Enhanced Customer Data Fetching:**
```javascript
const getCustomerById = async (customerId) => {
  const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    }
  });
  
  const customer = await response.json();
  
  // Ensure new fields are included
  return {
    ...customer,
    monthly_premium: customer.monthly_premium || null,
    national_id_owner2: customer.national_id_owner2 || null
  };
};
```

### 2. CSV Upload Processing

**Enhanced CSV Processing Logic:**
```javascript
const processCsvRow = (row, headers) => {
  const customerData = {};
  
  headers.forEach((header, index) => {
    const value = row[index]?.trim();
    
    switch(header) {
      case 'monthly_premium':
        customerData[header] = value && !isNaN(value) ? parseFloat(value) : null;
        break;
      case 'national_id_owner2':
        customerData[header] = value || null;
        break;
      default:
        customerData[header] = value;
    }
  });
  
  return customerData;
};
```

## Database Migration Script

```sql
-- Migration script for adding new columns
-- Run this on the production database

USE nic_callcenter_db;

-- Add monthly_premium column
ALTER TABLE nic_cc_customer 
ADD COLUMN monthly_premium DECIMAL(10,2) NULL 
COMMENT 'Monthly premium amount for the policy'
AFTER national_id;

-- Add national_id_owner2 column  
ALTER TABLE nic_cc_customer 
ADD COLUMN national_id_owner2 VARCHAR(20) NULL 
COMMENT 'National ID of second policy owner (if applicable)'
AFTER monthly_premium;

-- Verify the changes
DESCRIBE nic_cc_customer;

-- Optional: Add indexes for better performance
CREATE INDEX idx_monthly_premium ON nic_cc_customer(monthly_premium);
CREATE INDEX idx_national_id_owner2 ON nic_cc_customer(national_id_owner2);
```

## Testing Considerations

### 1. CSV Upload Testing
- Test CSV with both fields populated
- Test CSV with monthly_premium empty
- Test CSV with national_id_owner2 empty
- Test CSV with both fields empty
- Verify data validation and error handling

### 2. UI Display Testing
- Verify monthly premium displays correctly in customer details
- Verify second owner NID shows only when available
- Test formatting of monetary values
- Test responsive design on mobile

### 3. AOD PDF Testing
- Generate AOD PDF for customer with both fields
- Generate AOD PDF for customer with only monthly_premium
- Generate AOD PDF for customer with only national_id_owner2
- Generate AOD PDF for customer with neither field
- Verify PDF layout and formatting

## Implementation Priority

1. **Database Migration** - Add new columns to production
2. **Backend API Updates** - Update customer data fetching
3. **CSV Template Enhancement** - Update upload functionality
4. **Frontend UI Updates** - Add fields to customer details
5. **AOD PDF Enhancement** - Include new fields in PDF generation
6. **Testing & Validation** - Comprehensive testing of all components

## Business Impact

### Benefits
- **Enhanced Customer Data**: More comprehensive customer information
- **Improved AOD Documentation**: Better identification with second owner details
- **Financial Tracking**: Monthly premium visibility for agents
- **Compliance**: Better record keeping for multi-owner policies

### Use Cases
- **Joint Policies**: Proper documentation of both policy owners
- **Premium Tracking**: Agents can see monthly premium amounts
- **AOD Generation**: More complete customer identification in legal documents
- **Customer Service**: Better customer information for call center agents

This enhancement provides a more complete customer data model while maintaining backward compatibility with existing data.