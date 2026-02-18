# NIC Call Center System - API Documentation

## Overview

This document provides complete reference for all API endpoints used in the NIC Call Center System. The primary backend is Xano (Backend-as-a-Service), with additional third-party integrations for email, SMS, and payments.

---

## Base URLs

```
Xano API: https://x8ki-letl-twmt.n7.xano.io/api:your-api-id
Railway Webhook: https://your-railway-app.railway.app
Device Service: http://your-vps-ip:5000
```

---

## Authentication

### Authentication Mechanism

The API uses JWT (JSON Web Tokens) for authentication.

**Token Format**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Expiration**: 24 hours

**Token Storage**: localStorage in frontend

### Required Headers

```http
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

---

## Xano API Endpoints

### Authentication Endpoints

#### 1. Login

**Endpoint**: `POST /auth/login`

**Purpose**: Authenticate user and receive JWT token

**Request Body**:
```json
{
  "email": "agent@nic.mu",
  "password": "password123"
}
```

**Success Response** (200 OK):
```json
{
  "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "name": "John Doe",
    "email": "agent@nic.mu",
    "role": "agent",
    "branch_id": 5,
    "branch_name": "Port Louis",
    "active_status": true
  }
}
```

**Error Responses**:
```json
// 401 Unauthorized
{
  "message": "Invalid email or password"
}

// 403 Forbidden
{
  "message": "Account is inactive"
}
```

**Example**:
```javascript
const response = await axios.post(`${API_URL}/auth/login`, {
  email: 'agent@nic.mu',
  password: 'password123'
});

localStorage.setItem('token', response.data.authToken);
localStorage.setItem('user', JSON.stringify(response.data.user));
```


#### 2. Signup

**Endpoint**: `POST /auth/signup`

**Purpose**: Register new user account

**Request Body**:
```json
{
  "name": "Jane Smith",
  "email": "jane@nic.mu",
  "password": "securePassword123",
  "role": "agent",
  "branch_id": 5
}
```

**Success Response** (201 Created):
```json
{
  "message": "User created successfully",
  "user_id": 124
}
```

**Error Responses**:
```json
// 400 Bad Request
{
  "message": "Email already exists"
}

// 400 Bad Request
{
  "message": "Invalid email format"
}
```

#### 3. Verify OTP

**Endpoint**: `POST /auth/verify-otp`

**Purpose**: Verify OTP for login or password reset

**Request Body**:
```json
{
  "email": "agent@nic.mu",
  "otp": "123456"
}
```

**Success Response** (200 OK):
```json
{
  "verified": true,
  "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 4. Forgot Password

**Endpoint**: `POST /auth/forgot-password`

**Purpose**: Request password reset OTP

**Request Body**:
```json
{
  "email": "agent@nic.mu"
}
```

**Success Response** (200 OK):
```json
{
  "message": "OTP sent to email"
}
```

#### 5. Reset Password

**Endpoint**: `POST /auth/reset-password`

**Purpose**: Reset password with OTP

**Request Body**:
```json
{
  "email": "agent@nic.mu",
  "otp": "123456",
  "new_password": "newSecurePassword123"
}
```

**Success Response** (200 OK):
```json
{
  "message": "Password reset successful"
}
```

#### 6. Get Current User

**Endpoint**: `GET /auth/me`

**Purpose**: Get current authenticated user details

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Success Response** (200 OK):
```json
{
  "id": 123,
  "name": "John Doe",
  "email": "agent@nic.mu",
  "role": "agent",
  "branch_id": 5,
  "branch_name": "Port Louis",
  "active_status": true
}
```

---

### Customer Management Endpoints

#### 1. List Customers

**Endpoint**: `GET /customers`

**Purpose**: Get paginated list of customers with filters

**Query Parameters**:
- `page` (integer): Page number (default: 1)
- `per_page` (integer): Items per page (default: 50)
- `search` (string): Search by name, policy number, or mobile
- `status` (string): Filter by status (pending, contacted, resolved)
- `assigned_agent_id` (integer): Filter by assigned agent
- `policy_type` (string): Filter by policy type

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Success Response** (200 OK):
```json
{
  "items": [
    {
      "id": 1,
      "policy_number": "POL-2024-001",
      "name": "John Customer",
      "mobile": "+230 5123 4567",
      "email": "john@example.com",
      "amount_due": 5000.00,
      "policy_type": "Motor",
      "status": "pending",
      "assigned_agent_id": 123,
      "assigned_agent_name": "John Doe",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:45:00Z"
    }
  ],
  "curPage": 1,
  "nextPage": 2,
  "prevPage": null,
  "offset": 0,
  "itemsReceived": 50,
  "itemsTotal": 150
}
```

**Example**:
```javascript
const response = await axios.get(`${API_URL}/customers`, {
  params: {
    page: 1,
    per_page: 50,
    search: 'John',
    status: 'pending'
  },
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```


#### 2. Get Customer Details

**Endpoint**: `GET /customers/{id}`

**Success Response** (200 OK):
```json
{
  "id": 1,
  "policy_number": "POL-2024-001",
  "name": "John Customer",
  "mobile": "+230 5123 4567",
  "email": "john@example.com",
  "amount_due": 5000.00,
  "policy_type": "Motor",
  "status": "pending",
  "assigned_agent_id": 123,
  "payment_plans": [],
  "call_logs": [],
  "qr_transactions": []
}
```

#### 3. Create Customer

**Endpoint**: `POST /customers`

**Request Body**:
```json
{
  "policy_number": "POL-2024-002",
  "name": "Jane Customer",
  "mobile": "+230 5987 6543",
  "email": "jane@example.com",
  "amount_due": 3000.00,
  "policy_type": "Non-Motor",
  "assigned_agent_id": 123
}
```

**Success Response** (201 Created):
```json
{
  "id": 2,
  "message": "Customer created successfully"
}
```

#### 4. Update Customer

**Endpoint**: `PATCH /customers/{id}`

**Request Body**:
```json
{
  "mobile": "+230 5999 8888",
  "email": "newemail@example.com",
  "status": "contacted"
}
```

**Success Response** (200 OK):
```json
{
  "message": "Customer updated successfully"
}
```

#### 5. Bulk Upload Customers

**Endpoint**: `POST /customers/bulk-upload`

**Request Body** (multipart/form-data):
```
file: customers.csv
```

**CSV Format**:
```csv
policy_number,name,mobile,email,amount_due,policy_type
POL-001,John Doe,+230 5123 4567,john@example.com,5000,Motor
POL-002,Jane Smith,+230 5987 6543,jane@example.com,3000,Non-Motor
```

**Success Response** (200 OK):
```json
{
  "message": "Upload successful",
  "created": 45,
  "updated": 5,
  "errors": []
}
```

#### 6. Archive Customer

**Endpoint**: `POST /customers/archive`

**Request Body**:
```json
{
  "customer_id": 1,
  "reason": "Policy fully paid"
}
```

**Success Response** (200 OK):
```json
{
  "message": "Customer archived successfully"
}
```

---

### Payment Plan Endpoints

#### 1. List Payment Plans

**Endpoint**: `GET /payment-plans`

**Query Parameters**:
- `customer_id` (integer): Filter by customer
- `status` (string): Filter by status (active, completed, cancelled)

**Success Response** (200 OK):
```json
{
  "items": [
    {
      "id": 1,
      "customer_id": 1,
      "customer_name": "John Customer",
      "total_amount": 5000.00,
      "installment_count": 5,
      "start_date": "2024-02-01",
      "status": "active",
      "created_by": 123,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### 2. Create Payment Plan

**Endpoint**: `POST /payment-plans`

**Request Body**:
```json
{
  "customer_id": 1,
  "total_amount": 5000.00,
  "installment_count": 5,
  "start_date": "2024-02-01",
  "frequency": "monthly"
}
```

**Success Response** (201 Created):
```json
{
  "id": 1,
  "message": "Payment plan created successfully",
  "installments": [
    {
      "installment_number": 1,
      "amount": 1000.00,
      "due_date": "2024-02-01"
    },
    {
      "installment_number": 2,
      "amount": 1000.00,
      "due_date": "2024-03-01"
    }
  ]
}
```

#### 3. Update Payment Plan

**Endpoint**: `PATCH /payment-plans/{id}`

**Request Body**:
```json
{
  "status": "completed"
}
```

#### 4. Get Installments

**Endpoint**: `GET /installments`

**Query Parameters**:
- `payment_plan_id` (integer): Filter by payment plan
- `status` (string): Filter by status (pending, paid, overdue)
- `due_date_from` (date): Filter from date
- `due_date_to` (date): Filter to date

**Success Response** (200 OK):
```json
{
  "items": [
    {
      "id": 1,
      "payment_plan_id": 1,
      "installment_number": 1,
      "amount": 1000.00,
      "due_date": "2024-02-01",
      "status": "paid",
      "paid_date": "2024-02-01T15:30:00Z",
      "payment_method": "QR Code"
    }
  ]
}
```

#### 5. Update Installment

**Endpoint**: `PATCH /installments/{id}`

**Request Body**:
```json
{
  "status": "paid",
  "paid_date": "2024-02-01T15:30:00Z",
  "payment_method": "QR Code",
  "transaction_id": "TXN-123456"
}
```

---

### QR Code & Payment Endpoints

#### 1. Generate QR Code

**Endpoint**: `POST /qr-codes/generate`

**Request Body**:
```json
{
  "customer_id": 1,
  "amount": 1000.00,
  "installment_id": 1,
  "reference": "POL-2024-001-INS-1"
}
```

**Success Response** (200 OK):
```json
{
  "qr_code_url": "https://zwennpay.com/qr/abc123",
  "qr_code_image": "data:image/png;base64,iVBORw0KG...",
  "transaction_id": "QR-123456",
  "expires_at": "2024-02-02T15:30:00Z"
}
```

#### 2. List QR Transactions

**Endpoint**: `GET /qr-transactions`

**Query Parameters**:
- `customer_id` (integer)
- `agent_id` (integer)
- `status` (string): pending, completed, expired
- `date_from` (date)
- `date_to` (date)

**Success Response** (200 OK):
```json
{
  "items": [
    {
      "id": 1,
      "customer_id": 1,
      "agent_id": 123,
      "qr_code_url": "https://zwennpay.com/qr/abc123",
      "amount": 1000.00,
      "status": "completed",
      "transaction_id": "TXN-123456",
      "created_at": "2024-02-01T10:00:00Z",
      "completed_at": "2024-02-01T15:30:00Z"
    }
  ]
}
```

#### 3. Log QR Transaction

**Endpoint**: `POST /qr-transactions`

**Request Body**:
```json
{
  "customer_id": 1,
  "agent_id": 123,
  "qr_code_url": "https://zwennpay.com/qr/abc123",
  "amount": 1000.00,
  "reference": "POL-2024-001-INS-1"
}
```

---

### AOD (Acknowledgment of Debt) Endpoints

#### 1. Generate AOD PDF

**Endpoint**: `POST /aod/generate`

**Request Body**:
```json
{
  "customer_id": 1,
  "payment_plan_id": 1,
  "include_terms": true
}
```

**Success Response** (200 OK):
```json
{
  "aod_id": 1,
  "pdf_url": "https://xano.io/files/aod-123.pdf",
  "signature_status": "pending_signature",
  "signature_sent_date": "2024-02-01T10:00:00Z"
}
```

#### 2. Mark AOD as Received

**Endpoint**: `POST /aod/mark-received`

**Request Body**:
```json
{
  "aod_id": 1,
  "received_date": "2024-02-15T14:30:00Z"
}
```

#### 3. Upload Signed Document

**Endpoint**: `POST /aod/upload-signed`

**Request Body** (multipart/form-data):
```
aod_id: 1
file: signed-aod.pdf
```

**Success Response** (200 OK):
```json
{
  "message": "Signed document uploaded successfully",
  "signed_document_url": "https://xano.io/files/signed-aod-123.pdf",
  "signature_status": "received"
}
```

#### 4. Get AOD History

**Endpoint**: `GET /aod/history`

**Query Parameters**:
- `customer_id` (integer)
- `status` (string): pending_signature, received, expired, active

**Success Response** (200 OK):
```json
{
  "items": [
    {
      "id": 1,
      "customer_id": 1,
      "payment_plan_id": 1,
      "pdf_url": "https://xano.io/files/aod-123.pdf",
      "signature_status": "received",
      "signature_sent_date": "2024-02-01T10:00:00Z",
      "signature_received_date": "2024-02-15T14:30:00Z",
      "reminder_count": 2,
      "signed_document_url": "https://xano.io/files/signed-aod-123.pdf"
    }
  ]
}
```

---

### Call Center (CSL) Endpoints

#### 1. List CSL Policies

**Endpoint**: `GET /csl/policies`

**Query Parameters**:
- `month_year` (string): Format "YYYY-MM"
- `assigned_agent_id` (integer)
- `status` (string)
- `page` (integer)
- `per_page` (integer)

**Success Response** (200 OK):
```json
{
  "items": [
    {
      "id": 1,
      "policy_number": "CSL-2024-001",
      "customer_name": "John Customer",
      "mobile": "+230 5123 4567",
      "email": "john@example.com",
      "premium_amount": 500.00,
      "policy_type": "Life",
      "status": "pending",
      "month_year": "2024-02",
      "assigned_agent_id": 123
    }
  ]
}
```

#### 2. Create CSL Interaction

**Endpoint**: `POST /csl/interactions`

**Request Body**:
```json
{
  "policy_id": 1,
  "agent_id": 123,
  "interaction_type": "call",
  "outcome": "payment_promised",
  "notes": "Customer agreed to pay by end of week",
  "next_action_date": "2024-02-10"
}
```

#### 3. Get CSL Dashboard Data

**Endpoint**: `GET /csl/dashboard`

**Query Parameters**:
- `month_year` (string): Format "YYYY-MM"
- `agent_id` (integer): Optional, for agent-specific data

**Success Response** (200 OK):
```json
{
  "total_policies": 150,
  "contacted": 80,
  "pending": 70,
  "resolved": 50,
  "total_premium": 75000.00,
  "collected_premium": 45000.00,
  "collection_rate": 60.0
}
```

#### 4. Upload CSL Policies (Bulk)

**Endpoint**: `POST /csl/upload-policies`

**Request Body** (multipart/form-data):
```
file: policies.csv
month_year: 2024-02
```

#### 5. Upload CSL Payments (Bulk)

**Endpoint**: `POST /csl/upload-payments`

**Request Body** (multipart/form-data):
```
file: payments.csv
month_year: 2024-02
```

---

### Admin Endpoints

#### 1. List Agents

**Endpoint**: `GET /agents`

**Success Response** (200 OK):
```json
{
  "items": [
    {
      "id": 123,
      "name": "John Doe",
      "email": "john@nic.mu",
      "role": "agent",
      "branch_id": 5,
      "branch_name": "Port Louis",
      "active_status": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 2. Create Agent

**Endpoint**: `POST /agents`

**Request Body**:
```json
{
  "name": "Jane Smith",
  "email": "jane@nic.mu",
  "password": "tempPassword123",
  "role": "agent",
  "branch_id": 5
}
```

#### 3. Bulk Create Agents

**Endpoint**: `POST /agents/bulk-create`

**Request Body** (multipart/form-data):
```
file: agents.csv
```

**CSV Format**:
```csv
name,email,role,branch_id
John Doe,john@nic.mu,agent,5
Jane Smith,jane@nic.mu,csl_agent,3
```

#### 4. List Branches

**Endpoint**: `GET /branches`

**Success Response** (200 OK):
```json
{
  "items": [
    {
      "id": 5,
      "name": "Port Louis",
      "code": "PL",
      "email": "portlouis@nic.mu",
      "active": true
    }
  ]
}
```

#### 5. Generate Reports

**Endpoint**: `GET /reports`

**Query Parameters**:
- `report_type` (string): agent_performance, qr_summary, collection_report
- `date_from` (date)
- `date_to` (date)
- `agent_id` (integer): Optional

**Success Response** (200 OK):
```json
{
  "report_type": "agent_performance",
  "date_from": "2024-02-01",
  "date_to": "2024-02-29",
  "data": [
    {
      "agent_id": 123,
      "agent_name": "John Doe",
      "customers_contacted": 50,
      "qr_codes_generated": 30,
      "payments_collected": 25,
      "total_amount_collected": 25000.00
    }
  ]
}
```

---

## Third-Party API Integrations

### Brevo (Email/SMS) API

**Base URL**: `https://api.brevo.com/v3`

**Authentication**:
```
api-key: your-brevo-api-key
```

#### Send Email

**Endpoint**: `POST /smtp/email`

**Request Body**:
```json
{
  "sender": {
    "name": "NIC Insurance",
    "email": "noreply@nic.mu"
  },
  "to": [
    {
      "email": "customer@example.com",
      "name": "John Customer"
    }
  ],
  "subject": "Payment Reminder",
  "htmlContent": "<html><body><h1>Payment Reminder</h1></body></html>",
  "attachment": [
    {
      "content": "base64_encoded_content",
      "name": "invoice.pdf"
    }
  ]
}
```

#### Send SMS

**Endpoint**: `POST /transactionalSMS/sms`

**Request Body**:
```json
{
  "sender": "NIC",
  "recipient": "+230 5123 4567",
  "content": "Your payment of Rs 1000 is due on 01/02/2024"
}
```

---

### ZwennPay (QR Payments) API

**Base URL**: `https://api.zwennpay.com/v1`

**Authentication**:
```
Authorization: Bearer your-zwennpay-api-key
```

#### Generate QR Code

**Endpoint**: `POST /qr/generate`

**Request Body**:
```json
{
  "merchant_id": "your-merchant-id",
  "amount": 1000.00,
  "currency": "MUR",
  "reference": "POL-2024-001-INS-1",
  "description": "Insurance Premium Payment",
  "callback_url": "https://your-railway-app.railway.app/webhook"
}
```

**Success Response** (200 OK):
```json
{
  "qr_code_url": "https://zwennpay.com/qr/abc123",
  "qr_code_image": "data:image/png;base64,iVBORw0KG...",
  "transaction_id": "ZP-123456",
  "expires_at": "2024-02-02T15:30:00Z"
}
```

---

### Railway Webhook Endpoint

**Endpoint**: `POST /webhook`

**Purpose**: Receive payment notifications from ZwennPay

**Request Body** (from ZwennPay):
```json
{
  "transaction_id": "ZP-123456",
  "reference": "POL-2024-001-INS-1",
  "amount": 1000.00,
  "status": "completed",
  "payment_method": "QR Code",
  "paid_at": "2024-02-01T15:30:00Z"
}
```

**Processing**:
1. Validate webhook signature
2. Parse reference to extract policy and installment info
3. Update installment status in Xano
4. Send confirmation email via Brevo
5. Log transaction

**Response** (200 OK):
```json
{
  "received": true,
  "processed": true
}
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": true,
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | BAD_REQUEST | Invalid request parameters |
| 401 | UNAUTHORIZED | Missing or invalid authentication token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists |
| 422 | VALIDATION_ERROR | Input validation failed |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | Service temporarily unavailable |

### Retry Strategies

**Transient Errors** (500, 503):
- Retry with exponential backoff
- Max 3 retries
- Initial delay: 1 second
- Backoff multiplier: 2

**Rate Limiting** (429):
- Wait for time specified in `Retry-After` header
- Or wait 60 seconds if header not present

**Authentication Errors** (401):
- Refresh token if available
- Otherwise, redirect to login

---

## Rate Limits & Constraints

### Xano API Limits

- **Requests per minute**: 60
- **Requests per hour**: 3600
- **File upload size**: 10 MB
- **Request timeout**: 30 seconds

### Brevo Limits

- **Emails per day**: 300 (free tier) / Unlimited (paid)
- **SMS per month**: Based on plan
- **API calls per second**: 10

### ZwennPay Limits

- **QR codes per minute**: 30
- **Transaction amount**: Min 10 MUR, Max 100,000 MUR

---

## Example API Calls

### Complete Payment Flow Example

```javascript
// 1. Login
const loginResponse = await axios.post(`${API_URL}/auth/login`, {
  email: 'agent@nic.mu',
  password: 'password123'
});
const token = loginResponse.data.authToken;

// 2. Get customer
const customer = await axios.get(`${API_URL}/customers/1`, {
  headers: { Authorization: `Bearer ${token}` }
});

// 3. Create payment plan
const planResponse = await axios.post(`${API_URL}/payment-plans`, {
  customer_id: 1,
  total_amount: 5000.00,
  installment_count: 5,
  start_date: '2024-02-01'
}, {
  headers: { Authorization: `Bearer ${token}` }
});

// 4. Generate QR code for first installment
const qrResponse = await axios.post(`${API_URL}/qr-codes/generate`, {
  customer_id: 1,
  amount: 1000.00,
  installment_id: planResponse.data.installments[0].id,
  reference: 'POL-2024-001-INS-1'
}, {
  headers: { Authorization: `Bearer ${token}` }
});

// 5. Send QR code via email
await axios.post(`https://api.brevo.com/v3/smtp/email`, {
  sender: { name: 'NIC Insurance', email: 'noreply@nic.mu' },
  to: [{ email: customer.data.email }],
  subject: 'Payment QR Code',
  htmlContent: `<img src="${qrResponse.data.qr_code_image}" />`
}, {
  headers: { 'api-key': BREVO_API_KEY }
});
```

---

## Postman Collection

A Postman collection with all endpoints is available in the repository:

**File**: `postman/NIC-Call-Center-API.postman_collection.json`

**Import Instructions**:
1. Open Postman
2. Click Import
3. Select the JSON file
4. Set up environment variables:
   - `api_url`
   - `auth_token`
   - `brevo_api_key`
   - `zwennpay_api_key`

---

## API Versioning

Currently using **v1** (implicit in URLs).

Future versions will use explicit versioning:
- `/api/v2/customers`
- `/api/v2/payment-plans`

---

## Webhooks

### Supported Webhooks

1. **Payment Webhook** (from ZwennPay)
   - URL: `https://your-railway-app.railway.app/webhook`
   - Method: POST
   - Triggers: Payment completed, Payment failed

2. **Email Webhook** (from Brevo)
   - URL: `https://your-vps.com/email-webhook`
   - Method: POST
   - Triggers: Email delivered, Email bounced, Email opened

### Webhook Security

**Signature Verification**:
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return hash === signature;
}
```

---

**Document Version**: 1.0  
**Last Updated**: February 4, 2026  
**Maintained By**: Development Team  
**Next Review**: March 2026
