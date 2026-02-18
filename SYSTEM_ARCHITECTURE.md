# NIC Call Center System - System Architecture

## Overview
The NIC Call Center System is a comprehensive insurance arrears and renewals management platform built with modern web technologies. This document provides a complete technical overview of the system architecture, components, and integrations.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Web Browser (Desktop/Mobile)  │  Android App (Capacitor)       │
│  - React 18 + Vite             │  - WebView wrapper             │
│  - Tailwind CSS                │  - Native features             │
│  - React Router v6             │                                │
└────────────────┬────────────────┴────────────────┬───────────────┘
                 │                                  │
                 │ HTTPS                           │ HTTPS
                 │                                  │
┌────────────────▼──────────────────────────────────▼───────────────┐
│                    FRONTEND APPLICATION                            │
│                    (Netlify Hosting)                               │
│  - Static React SPA                                                │
│  - Environment-based configuration                                 │
│  - JWT-based authentication                                        │
└────────────────┬───────────────────────────────────────────────────┘
                 │
                 │ REST API (HTTPS)
                 │
┌────────────────▼───────────────────────────────────────────────────┐
│                    BACKEND LAYER                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  XANO (Backend-as-a-Service)                                │  │
│  │  - PostgreSQL Database                                      │  │
│  │  - REST API Endpoints                                       │  │
│  │  - Authentication & Authorization                           │  │
│  │  - Business Logic Functions                                 │  │
│  │  - File Storage                                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  NODE.JS BACKEND SERVICES (VPS)                             │  │
│  │  ┌───────────────────────────────────────────────────────┐  │  │
│  │  │  Reminder Service (nic-reminder.service)              │  │  │
│  │  │  - Payment reminders                                  │  │  │
│  │  │  - Signature reminders                                │  │  │
│  │  │  - Scheduled email/SMS delivery                       │  │  │
│  │  └───────────────────────────────────────────────────────┘  │  │
│  │  ┌───────────────────────────────────────────────────────┐  │  │
│  │  │  Payment Notification Service                         │  │  │
│  │  │  - QR payment webhooks                                │  │  │
│  │  │  - Payment confirmation emails                        │  │  │
│  │  └───────────────────────────────────────────────────────┘  │  │
│  │  ┌───────────────────────────────────────────────────────┐  │  │
│  │  │  Device Service (Python)                              │  │  │
│  │  │  - ESP32 device communication                         │  │  │
│  │  │  - Device registration & linking                      │  │  │
│  │  │  - QR code display management                         │  │  │
│  │  └───────────────────────────────────────────────────────┘  │  │
│  │  ┌───────────────────────────────────────────────────────┐  │  │
│  │  │  AOD Upload Service                                   │  │  │
│  │  │  - Signed document processing                         │  │  │
│  │  │  - File upload to Xano                                │  │  │
│  │  └───────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  RAILWAY WEBHOOK SERVICE                                    │  │
│  │  - ZwennPay payment webhooks                                │  │
│  │  - Payment status updates                                   │  │
│  │  - Transaction logging                                      │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                 │
                 │ API Calls
                 │
┌────────────────▼───────────────────────────────────────────────────┐
│                  THIRD-PARTY INTEGRATIONS                           │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Brevo      │  │  ZwennPay    │  │  ESP32       │             │
│  │   (Email/    │  │  (QR Code    │  │  Devices     │             │
│  │    SMS)      │  │   Payments)  │  │  (Hardware)  │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
                 │
                 │
┌────────────────▼───────────────────────────────────────────────────┐
│                  DEVICE CLIENT LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│  Windows Desktop Application (Python + PyQt5)                       │
│  - Auto-linking with ESP32 devices                                  │
│  - QR code generation and display                                   │
│  - Multi-device management                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **Framework**: React 18.2.0
- **Build Tool**: Vite 5.0.8
- **Styling**: Tailwind CSS 3.4.1
- **Routing**: React Router v6.21.3
- **HTTP Client**: Axios 1.6.5
- **State Management**: React Context API + Hooks
- **UI Components**: Custom components with Tailwind
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **QR Code Generation**: qrcode library
- **PDF Generation**: jsPDF, html2canvas
- **Mobile**: Capacitor 6.0.0 (Android)

### Backend
- **Primary Backend**: Xano (Backend-as-a-Service)
  - PostgreSQL database
  - REST API
  - Authentication (JWT)
  - File storage
  - Background tasks

- **Backend Services**: Node.js 16+
  - Express.js for webhook handling
  - Axios for API calls
  - Node-cron for scheduling
  - Systemd for service management

- **Device Service**: Python 3.8+
  - Flask for REST API
  - PySerial for ESP32 communication
  - Requests for HTTP calls

### Infrastructure
- **Frontend Hosting**: 
  - Automatic deployments from Git
  - CDN distribution
  - SSL certificates
  - Environment variables

- **Backend Services**: Ubuntu VPS
  - Systemd service management
  - Nginx reverse proxy
  - PM2 process manager (optional)

- **Webhook Hosting**: Railway
  - Git-based deployments
  - Environment variables
  - Automatic SSL
  - Log management

- **Database**: Xano PostgreSQL (managed)

### Third-Party Services
- **Email/SMS**: Brevo (formerly Sendinblue)
- **QR Payments**: ZwennPay
- **Hardware**: ESP32 microcontrollers

---

## Component Architecture

### Frontend Application Structure

```
src/
├── components/           # Reusable UI components
│   ├── auth/            # Authentication components
│   ├── customer/        # Customer-related components
│   ├── csl/             # Call center module components
│   ├── layout/          # Layout components (Navbar, Sidebar)
│   ├── modals/          # Modal dialogs
│   ├── sales/           # Sales agent components
│   └── alerts/          # Alert and notification components
│
├── pages/               # Page components (routes)
│   ├── auth/            # Login, Signup, OTP pages
│   ├── admin/           # Admin dashboard and management
│   ├── customers/       # Customer list and details
│   ├── csl/             # CSL module pages
│   └── Dashboard.jsx    # Main dashboard
│
├── services/            # API service layer
│   ├── authService.js   # Authentication API calls
│   ├── customerService.js
│   ├── qrService.js
│   ├── emailService.js
│   ├── csl/             # CSL-specific services
│   └── ...
│
├── contexts/            # React Context providers
│   └── AuthContext.jsx  # Authentication state
│
├── hooks/               # Custom React hooks
│   └── useFollowUpNotifications.js
│
├── utils/               # Utility functions
│   ├── qrGenerator.js   # QR code generation
│   ├── dateHelpers.js   # Date formatting
│   ├── textSanitizer.js # Text sanitization
│   └── ...
│
├── config/              # Configuration files
│   └── permissions.js   # Role-based permissions
│
├── styles/              # Global styles
│   └── mobile.css       # Mobile-specific styles
│
├── App.jsx              # Main app component
└── main.jsx             # Entry point
```


### Backend Services Architecture

#### 1. Reminder Service (`backend-reminder-service.cjs`)
```
Purpose: Automated reminder delivery system
- Scheduled execution (configurable intervals)
- Fetches due reminders from Xano
- Sends payment reminders via Brevo
- Sends signature reminders for AOD
- Updates reminder status in database
- Error handling and retry logic
```

#### 2. Payment Notification Service (`backend-payment-notification.cjs`)
```
Purpose: Payment confirmation notifications
- Listens for payment events
- Sends confirmation emails
- Updates payment status
- Logs transactions
```

#### 3. Device Service (`backend-device-service.cjs`)
```
Purpose: ESP32 device management
- Device registration and linking
- QR code display commands
- Device status monitoring
- Multi-device coordination
- WebSocket communication with devices
```

#### 4. AOD Upload Service (`aod-upload-service.cjs`)
```
Purpose: Signed document processing
- Receives uploaded signed AOD documents
- Validates file format and size
- Uploads to Xano file storage
- Updates AOD status
- Sends confirmation notifications
```

#### 5. Railway Webhook Service (`webhookcode-enhanced.js`)
```
Purpose: ZwennPay payment webhook handler
- Receives payment notifications from ZwennPay
- Validates webhook signatures
- Updates payment status in Xano
- Logs transactions
- Sends confirmation emails
- Handles multi-month policies
```

### Device Client Architecture

#### Windows Desktop Application
```
Technology: Python 3.8+ with PyQt5
Components:
- GUI: PyQt5 for user interface
- ESP32 Handler: Serial communication with devices
- VPS API Client: Communication with backend
- Auto-linking: Automatic device discovery and registration
- QR Display: Sends QR codes to ESP32 devices
- Multi-device Support: Manages multiple devices per agent

Build Process:
- PyInstaller for executable creation
- Inno Setup for installer package
- Auto-update mechanism (planned)
```

---

## Data Flow Diagrams

### 1. Authentication Flow

```
User → Frontend → Xano
  │       │         │
  │       │         ├─ Validate credentials
  │       │         ├─ Generate JWT token
  │       │         └─ Return user data + token
  │       │         
  │       ├─ Store token in localStorage
  │       ├─ Set AuthContext
  │       └─ Redirect to dashboard
  │
  └─ Access protected routes
```

### 2. Payment Processing Flow

```
Agent → Frontend → Xano
  │       │         │
  │       │         ├─ Create payment plan
  │       │         └─ Return plan ID
  │       │
  │       ├─ Generate QR code (ZwennPay API)
  │       ├─ Display QR to customer
  │       └─ Send QR via email/WhatsApp
  │
Customer scans QR → ZwennPay
  │                    │
  │                    ├─ Process payment
  │                    └─ Send webhook to Railway
  │
Railway Webhook → Xano
  │                 │
  │                 ├─ Update installment status
  │                 ├─ Log transaction
  │                 └─ Trigger confirmation email
  │
Brevo → Customer (confirmation email)
```

### 3. QR Code Generation and Payment Flow

```
┌─────────┐
│  Agent  │
└────┬────┘
     │
     │ 1. Create payment plan
     ▼
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       │ 2. POST /api/payment-plans
       ▼
┌─────────────┐
│    Xano     │
└──────┬──────┘
       │
       │ 3. Return plan_id
       ▼
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       │ 4. Generate QR code
       │    (ZwennPay API)
       ▼
┌─────────────┐
│  ZwennPay   │
└──────┬──────┘
       │
       │ 5. Return QR code URL
       ▼
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       │ 6. Display QR + Send via email
       ▼
┌─────────────┐
│   Brevo     │
└──────┬──────┘
       │
       │ 7. Email with QR code
       ▼
┌─────────────┐
│  Customer   │
└──────┬──────┘
       │
       │ 8. Scan QR code
       ▼
┌─────────────┐
│  ZwennPay   │
└──────┬──────┘
       │
       │ 9. Process payment
       ▼
┌─────────────┐
│  Railway    │
│  Webhook    │
└──────┬──────┘
       │
       │ 10. POST payment status
       ▼
┌─────────────┐
│    Xano     │
└──────┬──────┘
       │
       │ 11. Update installment
       │     Send confirmation
       ▼
┌─────────────┐
│   Brevo     │
└──────┬──────┘
       │
       │ 12. Confirmation email
       ▼
┌─────────────┐
│  Customer   │
└─────────────┘
```

### 4. AOD Signature Workflow

```
Agent creates payment plan
  │
  ├─ Generate AOD PDF (jsPDF)
  │   - Customer details
  │   - Payment plan terms
  │   - Legal clauses
  │   - Signature section
  │
  ├─ Upload PDF to Xano
  │
  ├─ Create AOD record
  │   - Status: pending_signature
  │   - Signature_sent_date: now
  │   - Reminder_count: 0
  │
  └─ Send signature request email
      - PDF attachment
      - Instructions
      - Deadline (30 days)

Reminder Service (automated)
  │
  ├─ Check for pending signatures
  │
  ├─ Send reminders at:
  │   - Day 7
  │   - Day 14
  │   - Day 21
  │   - Day 28
  │
  └─ Update reminder_count

Customer signs and returns document
  │
  ├─ Agent uploads signed document
  │
  ├─ AOD Upload Service processes
  │
  ├─ Update AOD record
  │   - Status: received
  │   - Signature_received_date: now
  │   - Signed_document_url: uploaded file
  │
  └─ Send confirmation email

After 30 days (if not received)
  │
  ├─ Status: expired
  │
  └─ Notify agent for follow-up
```

### 5. Device Linking Flow

```
Agent installs Windows Client
  │
  ├─ Client starts
  │
  ├─ Discovers ESP32 devices on network
  │   (UDP broadcast)
  │
  ├─ Displays available devices
  │
  └─ Agent selects device to link

Agent clicks "Link Device"
  │
  ├─ Client sends link request to VPS
  │   - Agent ID
  │   - Device MAC address
  │   - Device IP
  │
  ├─ VPS validates agent
  │
  ├─ VPS creates device record in Xano
  │   - device_id
  │   - agent_id
  │   - mac_address
  │   - status: linked
  │
  └─ VPS returns success

Agent generates QR code
  │
  ├─ Frontend calls QR generation API
  │
  ├─ QR code created
  │
  ├─ Frontend sends QR to device service
  │   - device_id
  │   - qr_code_url
  │
  ├─ Device service sends to ESP32
  │   (HTTP POST to device IP)
  │
  └─ ESP32 displays QR code on screen
```

---

## Third-Party Integrations

### 1. Xano (Primary Backend)

**Purpose**: Backend-as-a-Service providing database, API, and business logic

**Integration Points**:
- REST API endpoints for all data operations
- JWT authentication
- File storage for PDFs and documents
- Background tasks for scheduled operations

**Configuration**:
```javascript
// Frontend
VITE_API_URL=https://x8ki-letl-twmt.n7.xano.io/api:your-api-id

// Authentication header
Authorization: Bearer {jwt_token}
```

**Key Features Used**:
- Database tables and relationships
- API endpoints with custom functions
- Authentication and authorization
- File upload and storage
- Scheduled background tasks

### 2. Brevo (Email and SMS)

**Purpose**: Transactional email and SMS delivery

**Integration Points**:
- Send transactional emails
- Send SMS messages
- Email templates
- Delivery tracking

**Configuration**:
```javascript
BREVO_API_KEY=your-api-key
BREVO_SENDER_EMAIL=noreply@nic.mu
BREVO_SENDER_NAME=NIC Insurance
```

**API Endpoints Used**:
- `POST /v3/smtp/email` - Send email
- `POST /v3/transactionalSMS/sms` - Send SMS
- `GET /v3/smtp/statistics/events` - Check delivery status

**Email Types**:
- Payment reminders
- Signature reminders
- Payment confirmations
- QR code delivery
- OTP verification
- Password reset

### 3. ZwennPay (QR Code Payments)

**Purpose**: QR code payment processing for Mauritius

**Integration Points**:
- QR code generation
- Payment webhooks
- Transaction status

**Configuration**:
```javascript
ZWENNPAY_API_KEY=your-api-key
ZWENNPAY_MERCHANT_ID=your-merchant-id
ZWENNPAY_WEBHOOK_URL=https://your-railway-app.railway.app/webhook
```

**Flow**:
1. Generate QR code with amount and reference
2. Customer scans and pays
3. ZwennPay sends webhook to Railway
4. Railway updates Xano database
5. Confirmation email sent via Brevo

### 4. Railway (Webhook Hosting)

**Purpose**: Reliable webhook endpoint for payment notifications

**Why Railway**: 
- Always-on service (unlike VPS which may restart)
- Automatic SSL
- Easy deployment from Git
- Environment variable management
- Built-in logging

**Configuration**:
```javascript
XANO_API_URL=https://x8ki-letl-twmt.n7.xano.io/api:your-api-id
XANO_API_KEY=your-api-key
BREVO_API_KEY=your-api-key
```

### 5. Netlify (Frontend Hosting)

**Purpose**: Static site hosting with CDN

**Features Used**:
- Automatic deployments from Git
- Environment variables
- Custom domain
- SSL certificates
- Redirects for SPA routing

**Configuration**:
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## Database Schema Overview

### Core Tables

1. **users** - Agents and administrators
2. **customers** - Insurance policyholders
3. **payment_plans** - Payment arrangements
4. **installments** - Individual payment installments
5. **call_logs** - Customer interaction history
6. **qr_transactions** - QR code payment tracking
7. **aod_documents** - Acknowledgment of Debt documents
8. **csl_policies** - Call center monthly policies
9. **csl_interactions** - Call center interactions
10. **branches** - Branch locations

### Key Relationships

```
users (agents)
  ├─ 1:N → customers (assigned_agent_id)
  ├─ 1:N → call_logs (agent_id)
  ├─ 1:N → qr_transactions (agent_id)
  └─ 1:N → csl_policies (assigned_agent_id)

customers
  ├─ 1:N → payment_plans
  ├─ 1:N → call_logs
  ├─ 1:N → qr_transactions
  └─ 1:N → aod_documents

payment_plans
  ├─ 1:N → installments
  └─ 1:1 → aod_documents

csl_policies
  └─ 1:N → csl_interactions
```

### Indexes

Critical indexes for performance:
- `customers.policy_number` (unique)
- `customers.assigned_agent_id`
- `installments.due_date`
- `installments.status`
- `qr_transactions.created_at`
- `csl_policies.month_year`

---

## Security Architecture

### Authentication

**Mechanism**: JWT (JSON Web Tokens)

**Flow**:
1. User submits credentials
2. Xano validates and generates JWT
3. Frontend stores token in localStorage
4. Token included in all API requests
5. Token expires after 24 hours

**Token Structure**:
```json
{
  "user_id": 123,
  "email": "agent@nic.mu",
  "role": "agent",
  "branch_id": 5,
  "exp": 1234567890
}
```

### Authorization

**Role-Based Access Control (RBAC)**:

```javascript
// src/config/permissions.js
const PERMISSIONS = {
  admin: ['*'], // All permissions
  agent: [
    'customers:read',
    'customers:update',
    'payment_plans:create',
    'qr_codes:generate',
    'aod:create'
  ],
  csl_agent: [
    'csl_policies:read',
    'csl_interactions:create',
    'csl_reports:read'
  ],
  sales_agent: [
    'customers:read',
    'qr_codes:generate'
  ]
};
```

**Route Protection**:
- Frontend: `RoleProtectedRoute` component
- Backend: Xano function-level permissions

### API Security

**Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**CORS Configuration**:
- Xano: Configured allowed origins
- Frontend domain whitelisted
- Credentials allowed

**Rate Limiting**:
- Xano: Built-in rate limiting
- Webhook: Custom rate limiting logic

### Data Encryption

**In Transit**:
- All API calls over HTTPS
- TLS 1.2+

**At Rest**:
- Xano database encryption
- Sensitive fields hashed (passwords)

**Sensitive Data Handling**:
- Passwords: Bcrypt hashing
- API keys: Environment variables
- PII: Masked in logs

### Input Validation

**Frontend**:
- Form validation with React
- Email format validation
- Phone number format validation
- Amount validation

**Backend**:
- Xano input validation
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)

---

## Performance Considerations

### Frontend Optimization

- Code splitting with React.lazy()
- Image optimization
- Lazy loading for large lists
- Debounced search inputs
- Cached API responses

### Backend Optimization

- Database indexes on frequently queried fields
- Pagination for large datasets
- Batch operations for bulk uploads
- Connection pooling
- Query optimization

### Caching Strategy

- Browser caching for static assets
- API response caching (short TTL)
- LocalStorage for user preferences
- Service worker for offline support (planned)

---

## Scalability Considerations

### Current Capacity

- **Users**: 100+ concurrent agents
- **Customers**: 50,000+ records
- **Transactions**: 10,000+ per month
- **API Calls**: 1M+ per month

### Scaling Strategy

**Horizontal Scaling**:
- Frontend: CDN distribution (Netlify)
- Backend services: Multiple VPS instances
- Database: Xano managed scaling

**Vertical Scaling**:
- VPS: Upgrade CPU/RAM as needed
- Database: Xano plan upgrade

**Bottlenecks to Monitor**:
- Database query performance
- API rate limits
- Email delivery limits
- File storage capacity

---

## Monitoring and Logging

### Application Logs

**Frontend**:
- Browser console (development)
- Error tracking (planned: Sentry)

**Backend Services**:
- `/var/log/nic-reminder.log`
- `/var/log/nic-payment-notification.log`
- `/var/log/nic-device-service.log`
- `/var/log/nic-aod-upload.log`

**Railway Webhook**:
- Railway dashboard logs
- Custom logging to Xano

### Health Checks

**Service Status**:
```bash
sudo systemctl status nic-reminder
sudo systemctl status nic-payment-notification
sudo systemctl status nic-device-service
sudo systemctl status nic-aod-upload
```

**API Health**:
- Xano: Built-in monitoring
- Custom health check endpoints

### Alerting

**Current**:
- Email alerts for service failures
- Manual monitoring

**Planned**:
- Automated health checks
- Slack/email notifications
- Uptime monitoring (UptimeRobot)

---

## Disaster Recovery

### Backup Strategy

**Database**:
- Xano: Automatic daily backups
- Retention: 30 days
- Manual backup before major changes

**Code**:
- Git repository (GitHub)
- Multiple branches for safety

**Configuration**:
- Environment variables documented
- Deployment scripts in repository

### Recovery Procedures

**Database Restore**:
1. Access Xano dashboard
2. Navigate to backups
3. Select backup date
4. Restore database

**Service Recovery**:
1. SSH to VPS
2. Pull latest code from Git
3. Restart services
4. Verify functionality

**Frontend Recovery**:
1. Rollback deployment in Netlify
2. Or redeploy from Git

---

## Development Workflow

### Git Workflow

**Branches**:
- `main` - Production code
- `development` - Development code
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches
- `hotfix/*` - Production hotfixes

**Commit Convention**:
```
type(scope): description

Examples:
feat(csl): add policy upload feature
fix(qr): resolve QR generation issue
docs(api): update API documentation
```

### Deployment Pipeline

**Frontend**:
1. Push to `main` branch
2. Netlify auto-deploys
3. Verify deployment

**Backend Services**:
1. SSH to VPS
2. Pull latest code
3. Restart services
4. Check logs

**Railway Webhook**:
1. Push to connected branch
2. Railway auto-deploys
3. Verify webhook functionality

---

## Technology Decisions

### Why React?
- Component-based architecture
- Large ecosystem
- Strong community support
- Easy to find developers

### Why Xano?
- Rapid development
- No backend code needed
- Built-in authentication
- Managed database
- Cost-effective for MVP

### Why Netlify?
- Easy deployment
- Free tier sufficient
- Automatic SSL
- CDN included

### Why Railway for Webhooks?
- Always-on service
- Easy deployment
- Better than VPS for webhooks
- Built-in logging

### Why Python for Device Client?
- Cross-platform
- PySerial for ESP32 communication
- Easy to package as executable
- Familiar to team

 
## Glossary

- **AOD**: Acknowledgment of Debt - Legal document for payment plans
- **CSL**: Call Center module for monthly policy management
- **ESP32**: Microcontroller for QR code display devices
- **JWT**: JSON Web Token for authentication
- **LOB**: Line of Business (insurance product types)
- **QR**: Quick Response code for payments
- **VPS**: Virtual Private Server for backend services
- **Xano**: Backend-as-a-Service platform

---

**Document Version**: 1.0  
**Last Updated**: February 4, 2026  
**Maintained By**: Development Team  
**Next Review**: March 2026
