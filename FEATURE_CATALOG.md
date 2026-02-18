# NIC Call Center System - Feature Catalog

## Overview

Complete inventory of all features in the NIC Call Center System with business context, user roles, and key workflows.

---

## Feature Categories

1. Authentication & Authorization
2. Customer Management
3. Payment Plan Management
4. QR Code Generation & Payments
5. AOD (Acknowledgment of Debt)
6. Call Center (CSL) Module
7. Communication System
8. Reminder System
9. Device Integration (ESP32)
10. Administrative Features
11. Sales Agent Features
12. Follow-up Management

---

## 1. Authentication & Authorization

### Login with Email/Password
**Business Purpose**: Secure access to the system  
**User Roles**: All users  
**Key Flow**:
1. User enters email and password
2. System validates credentials
3. JWT token generated
4. User redirected to role-specific dashboard

**Business Rules**:
- Password must be 8+ characters
- Account locked after 5 failed attempts
- Session expires after 24 hours

### OTP Verification
**Business Purpose**: Two-factor authentication for sensitive operations  
**User Roles**: All users  
**Key Flow**:
1. System sends 6-digit OTP via email
2. User enters OTP
3. System validates OTP
4. Access granted

**Business Rules**:
- OTP expires after 10 minutes
- Maximum 3 OTP attempts
- New OTP can be requested after 1 minute

### Password Reset
**Business Purpose**: Allow users to recover account access  
**User Roles**: All users  
**Key Flow**:
1. User clicks "Forgot Password"
2. Enters email address
3. Receives OTP via email
4. Enters OTP and new password
5. Password updated

### Role-Based Access Control
**Business Purpose**: Restrict features based on user role  
**User Roles**: Admin, Agent, CSL Agent, Sales Agent  
**Permissions**:
- **Admin**: Full system access
- **Agent**: Customer management, payment plans, QR generation
- **CSL Agent**: CSL module only
- **Sales Agent**: Limited customer view, QR generation

---

## 2. Customer Management

### Customer List with Search/Filter
**Business Purpose**: View and manage customer database  
**User Roles**: Admin, Agent, Sales Agent  
**Key Features**:
- Paginated list (50 per page)
- Search by name, policy number, mobile
- Filter by status, policy type, assigned agent
- Sort by various fields

**Business Rules**:
- Agents see only their assigned customers
- Admins see all customers
- Sales agents see customers for Quick QR only

### Customer Detail View
**Business Purpose**: View complete customer information  
**User Roles**: Admin, Agent  
**Key Information**:
- Policy details
- Contact information
- Payment history
- Call logs
- QR transactions
- AOD documents

### Customer Creation/Editing
**Business Purpose**: Add and update customer records  
**User Roles**: Admin, Agent  
**Key Flow**:
1. Enter customer details
2. Validate policy number (unique)
3. Validate email and mobile format
4. Save to database

**Business Rules**:
- Policy number must be unique
- Email format validated
- Mobile must be Mauritius format (+230)
- Amount due must be positive

### Bulk Customer Upload (CSV)
**Business Purpose**: Import large customer datasets  
**User Roles**: Admin  
**Key Flow**:
1. Admin uploads CSV file
2. System validates format
3. System processes records (create/update)
4. System returns summary (created, updated, errors)

**CSV Format**:
```csv
policy_number,name,mobile,email,amount_due,policy_type
POL-001,John Doe,+230 5123 4567,john@example.com,5000,Motor
```

**Business Rules**:
- Upsert logic: Update if policy exists, create if new
- Invalid records skipped with error report
- Maximum 1000 records per upload

### Customer Archiving
**Business Purpose**: Remove inactive customers from active list  
**User Roles**: Admin  
**Key Flow**:
1. Admin selects customer
2. Enters archiving reason
3. Customer moved to archived table
4. Audit trail maintained

**Business Rules**:
- Cannot archive customer with pending payments
- Archived customers can be restored
- Archiving reason required

### Contact Update with History
**Business Purpose**: Track customer contact information changes  
**User Roles**: Agent  
**Key Flow**:
1. Agent updates mobile/email
2. System logs old and new values
3. System records reason for change
4. Admin can review and sync to master system

**Business Rules**:
- All changes logged with timestamp
- Agent name recorded
- Pending status until admin syncs

---

## 3. Payment Plan Management

### Create Payment Plans with Installments
**Business Purpose**: Set up structured payment arrangements  
**User Roles**: Admin, Agent  
**Key Flow**:
1. Select customer
2. Enter total amount
3. Choose installment count (2-12)
4. Select start date
5. System calculates installment amounts and due dates
6. Save payment plan

**Business Rules**:
- Minimum 2 installments, maximum 12
- Installment amount = total / count
- Due dates calculated based on frequency (weekly/monthly)
- First due date = start date

### View Payment Plan Details
**Business Purpose**: Monitor payment plan progress  
**User Roles**: Admin, Agent  
**Key Information**:
- Total amount and installment count
- Installment schedule with due dates
- Payment status for each installment
- Remaining balance

### Update Installment Status
**Business Purpose**: Mark installments as paid  
**User Roles**: Admin, Agent  
**Key Flow**:
1. Select installment
2. Mark as paid
3. Enter payment date and method
4. System updates status
5. System sends confirmation email

**Business Rules**:
- Only pending installments can be marked paid
- Payment date cannot be in future
- Transaction ID recorded for audit

### Payment Confirmation
**Business Purpose**: Notify customer of successful payment  
**User Roles**: System (automated)  
**Key Flow**:
1. Payment received via QR code
2. Webhook updates installment status
3. System sends confirmation email to customer
4. System sends notification to agent

---

## 4. QR Code Generation & Payments

### Quick QR for Ad-hoc Payments
**Business Purpose**: Generate QR codes for one-time payments  
**User Roles**: Admin, Agent, Sales Agent  
**Key Flow**:
1. Enter customer details (name, mobile, email)
2. Enter amount
3. System generates QR code via ZwennPay
4. QR code displayed and sent via email/WhatsApp
5. Customer scans and pays
6. Webhook updates payment status

**Business Rules**:
- Amount must be between 10 and 100,000 MUR
- QR code expires after 24 hours
- Transaction logged for audit

### Installment QR Codes
**Business Purpose**: Generate QR codes for specific installments  
**User Roles**: Admin, Agent  
**Key Flow**:
1. Select customer and payment plan
2. Select installment
3. System generates QR code with installment reference
4. QR code sent to customer
5. Payment automatically updates installment status

**Business Rules**:
- QR code amount matches installment amount
- Reference includes policy number and installment number
- Only one active QR per installment

### QR Code Email/WhatsApp Delivery
**Business Purpose**: Send QR codes to customers  
**User Roles**: Agent  
**Key Flow**:
1. Generate QR code
2. Choose delivery method (email/WhatsApp)
3. System sends QR code with payment instructions
4. Delivery status tracked

**Email Template**:
- Subject: Payment QR Code - [Policy Number]
- Body: Payment instructions, QR code image, amount, due date
- Footer: NIC contact information

### QR Transaction Logging
**Business Purpose**: Track all QR code generations and payments  
**User Roles**: Admin, Agent  
**Key Information**:
- QR code URL
- Amount
- Customer and agent
- Status (pending/completed/expired)
- Transaction ID
- Timestamps

### Agent QR Summary Reports
**Business Purpose**: Monitor agent QR code generation activity  
**User Roles**: Admin  
**Key Metrics**:
- QR codes generated per agent
- Total amount in QR codes
- Completion rate
- Average time to payment
- Date range filtering

---

## 5. AOD (Acknowledgment of Debt)

### AOD PDF Generation with Legal Terms
**Business Purpose**: Create legally binding payment agreements  
**User Roles**: Admin, Agent  
**Key Flow**:
1. Select customer and payment plan
2. System generates PDF with:
   - Customer details
   - Payment plan terms
   - Legal clauses
   - Signature section
3. PDF uploaded to Xano storage
4. PDF sent to customer via email

**PDF Contents**:
- NIC logo and letterhead
- Customer name and policy number
- Total amount due
- Installment schedule
- Legal terms and conditions
- Signature section for customer
- Date and witness signature

### 30-Day Signature Collection Workflow
**Business Purpose**: Ensure AOD documents are signed within legal timeframe  
**User Roles**: System (automated)  
**Key Flow**:
1. AOD sent to customer
2. Status: pending_signature
3. Automated reminders sent at Day 7, 14, 21, 28
4. Customer returns signed document
5. Agent uploads signed document
6. Status: received
7. After 30 days without signature: Status: expired

**Business Rules**:
- Signature must be collected within 30 days
- Reminders sent automatically
- Expired AODs require new generation

### Signature Reminders (Automated)
**Business Purpose**: Prompt customers to return signed AODs  
**User Roles**: System (automated)  
**Reminder Schedule**:
- Day 7: First reminder
- Day 14: Second reminder
- Day 21: Third reminder
- Day 28: Final reminder (urgent)

**Reminder Content**:
- Subject: Reminder: AOD Signature Required
- Body: Reminder to return signed document, deadline, consequences
- Attachment: Original AOD PDF

### Upload Signed Documents
**Business Purpose**: Store customer-signed AOD documents  
**User Roles**: Agent  
**Key Flow**:
1. Agent receives signed AOD from customer
2. Agent scans document
3. Agent uploads via system
4. System validates file (PDF, max 10MB)
5. System updates AOD status to "received"
6. System sends confirmation email

**Business Rules**:
- Only PDF files accepted
- Maximum file size: 10 MB
- Original AOD must exist
- Status must be pending_signature

### AOD History Tracking
**Business Purpose**: Audit trail of all AOD activities  
**User Roles**: Admin, Agent  
**Key Information**:
- AOD generation date
- Signature sent date
- Reminder count and dates
- Signature received date
- Signed document URL
- Current status

### Document State Management
**Business Purpose**: Track AOD lifecycle  
**States**:
- **pending_signature**: Sent to customer, awaiting signature
- **received**: Signed document received
- **expired**: 30 days passed without signature
- **active**: Payment plan active with signed AOD

**State Transitions**:
```
pending_signature → received (signed document uploaded)
pending_signature → expired (30 days passed)
received → active (payment plan activated)
```

---

## 6. Call Center (CSL) Module

### Monthly Policy Upload
**Business Purpose**: Import monthly policy data for call center agents  
**User Roles**: Admin  
**Key Flow**:
1. Admin uploads CSV file with policy data
2. System validates format (40+ fields)
3. System processes records (upsert logic)
4. System assigns policies to agents (auto-assignment)
5. System returns summary

**CSV Fields** (40+ total):
- Policy number, customer name, contact details
- Premium amount, arrears amount
- Owner 1 and Owner 2 information
- Policy dates and status
- Agent information

**Business Rules**:
- Month-year format: YYYY-MM
- Upsert logic: Update if policy exists for month, create if new
- Auto-assignment based on workload balancing

### Payment Upload
**Business Purpose**: Import payment data to match against policies  
**User Roles**: Admin  
**Key Flow**:
1. Admin uploads CSV file with payment data
2. System validates format
3. System matches payments to policies by policy number
4. System updates policy status if payment found
5. System returns summary

**CSV Fields**:
- Policy number
- Payment date
- Payment amount
- Payment reference

**Business Rules**:
- Soft link to policies (no foreign key)
- Payment may exist before policy in system
- Multiple payments per policy allowed

### Policy Assignment to Agents
**Business Purpose**: Distribute workload among call center agents  
**User Roles**: Admin (manual), System (auto)  
**Auto-Assignment Algorithm**:
1. Count policies per agent
2. Assign new policies to agent with lowest count
3. Consider agent branch
4. Balance workload

**Manual Assignment**:
1. Admin selects policies
2. Admin selects agent
3. System updates assigned_agent_id

### Interaction Logging
**Business Purpose**: Record all customer interactions  
**User Roles**: CSL Agent  
**Key Flow**:
1. Agent calls customer
2. Agent logs interaction:
   - Calling date
   - Outcome (promise to pay, no answer, etc.)
   - Amount paid (if any)
   - Follow-up date
   - Notes
3. System saves interaction
4. System updates policy status

**Interaction Fields**:
- Client calling date
- Calling remarks
- Recovery type
- Amount paid
- Outcome and sub-outcome
- Promise to pay amount and week
- Reason for non-payment
- Mode of payment
- Updated contact/email
- Actions taken

### Dashboard with Metrics
**Business Purpose**: Monitor call center performance  
**User Roles**: Admin, CSL Agent  
**Metrics**:
- Total policies for month
- Contacted vs pending
- Resolved count
- Total premium amount
- Collected premium amount
- Collection rate (%)
- Agent performance breakdown

**Filters**:
- Month-year selection
- Agent filter
- Branch filter

### Agent Reports
**Business Purpose**: Individual agent performance tracking  
**User Roles**: Admin  
**Report Contents**:
- Policies assigned
- Policies contacted
- Policies resolved
- Total premium
- Collected premium
- Collection rate
- Average interactions per policy
- Date range

### Dropdown Configuration
**Business Purpose**: Manage dropdown options for interaction logging  
**User Roles**: Admin  
**Configurable Dropdowns**:
- Outcome options
- Sub-outcome options (dependent on outcome)
- Recovery type options
- Mode of payment options
- Reason for non-payment options

**Features**:
- Add/edit/delete options
- Set display order
- Enable/disable options
- Parent-child relationships (dependent dropdowns)

---

## 7. Communication System

### Email with HTML Templates
**Business Purpose**: Send professional emails to customers  
**User Roles**: System (automated), Agent (manual)  
**Email Types**:
- Payment reminders
- Signature reminders
- Payment confirmations
- QR code delivery
- OTP verification
- Password reset

**Template Structure**:
- HTML layout with NIC branding
- Dynamic content (customer name, amount, dates)
- Embedded images (logo, QR codes)
- Footer with contact information

**Email Service**: Brevo API

### SMS via Brevo
**Business Purpose**: Send SMS notifications to customers  
**User Roles**: System (automated)  
**SMS Types**:
- Payment reminders
- Payment confirmations
- OTP codes

**SMS Format**:
```
NIC Insurance: Your payment of Rs [amount] is due on [date]. 
Pay via QR code sent to your email. Call 123-4567 for assistance.
```

**Business Rules**:
- Maximum 160 characters
- Mauritius mobile numbers only
- SMS credits managed in Brevo

### WhatsApp Integration
**Business Purpose**: Send QR codes via WhatsApp  
**User Roles**: Agent  
**Key Flow**:
1. Generate QR code
2. Click "Send via WhatsApp"
3. System opens WhatsApp Web with pre-filled message
4. Agent sends message

**Message Template**:
```
Hello [Customer Name],

Please use this QR code to pay your insurance premium of Rs [amount].

[QR Code Image]

Due date: [Date]

Thank you,
NIC Insurance
```

### QR Code Embedding in Emails
**Business Purpose**: Include QR codes directly in email body  
**Technical Implementation**:
- QR code generated as base64 image
- Embedded in HTML email as `<img src="data:image/png;base64,...">`
- Gmail-compatible format

### CC/Reply-To Configuration
**Business Purpose**: Allow branch-specific email handling  
**User Roles**: Admin  
**Configuration**:
- CC: Branch email address
- Reply-To: Branch email or agent email
- Configurable per email type

**Example**:
```
From: noreply@nic.mu
Reply-To: portlouis@nic.mu
CC: manager@nic.mu
```

---

## 8. Reminder System

### Payment Reminders (Scheduled)
**Business Purpose**: Automated payment due date reminders  
**User Roles**: System (automated)  
**Schedule**:
- 3 days before due date
- On due date
- 1 day after due date (overdue)

**Reminder Content**:
- Customer name and policy number
- Amount due
- Due date
- Payment instructions
- QR code (if available)

### Signature Reminders (Automated)
**Business Purpose**: Prompt customers to return signed AODs  
**User Roles**: System (automated)  
**Schedule**: Day 7, 14, 21, 28 after AOD sent

### Browser-Based Scheduler
**Business Purpose**: Schedule reminders from frontend  
**User Roles**: Admin  
**Key Features**:
- View scheduled reminders
- Add new reminders
- Edit reminder schedule
- Cancel reminders
- View reminder history

**Scheduler UI**:
- Calendar view
- List view with filters
- Reminder status (pending/sent/failed)

### Multi-Channel Delivery
**Business Purpose**: Send reminders via multiple channels  
**Channels**:
- Email (primary)
- SMS (if email fails or as backup)
- WhatsApp (manual)

**Delivery Logic**:
1. Try email first
2. If email fails, try SMS
3. Log delivery status
4. Retry failed deliveries

---

## 9. Device Integration (ESP32)

### Device Auto-Linking
**Business Purpose**: Automatically connect ESP32 devices to agent accounts  
**User Roles**: Agent  
**Key Flow**:
1. Agent installs Windows client
2. Client discovers ESP32 devices on network (UDP broadcast)
3. Agent selects device to link
4. Client sends link request to VPS
5. VPS creates device record in Xano
6. Device linked to agent account

**Business Rules**:
- One device per agent (default)
- Device identified by MAC address
- Device must be on same network

### QR Code Display on Device
**Business Purpose**: Show QR codes on physical display for customer scanning  
**User Roles**: Agent  
**Key Flow**:
1. Agent generates QR code in web app
2. Web app sends QR code to device service
3. Device service sends QR to ESP32 via HTTP
4. ESP32 displays QR code on e-ink screen
5. Customer scans QR code
6. Payment processed

**Technical Details**:
- ESP32 with e-ink display
- HTTP API for QR display
- QR code remains on screen until cleared
- Low power consumption

### Multi-Device Support
**Business Purpose**: Allow agents to manage multiple devices  
**User Roles**: Agent  
**Key Features**:
- Link multiple devices to one agent
- Select device for QR display
- View device status (online/offline)
- Unlink devices

**Use Cases**:
- Agent with multiple workstations
- Shared devices in branch office
- Backup devices

### Device Management
**Business Purpose**: Monitor and control ESP32 devices  
**User Roles**: Admin, Agent  
**Key Features**:
- View all linked devices
- Check device status
- Unlink devices
- Clear device display
- View device activity log

### Windows Client Application
**Business Purpose**: Desktop app for device management  
**User Roles**: Agent  
**Key Features**:
- Auto-discovery of ESP32 devices
- Device linking
- QR code sending
- Device status monitoring
- System tray integration

**Technical Stack**:
- Python 3.8+
- PyQt5 for GUI
- PySerial for ESP32 communication
- Requests for API calls

---

## 10. Administrative Features

### Agent Management
**Business Purpose**: Manage agent accounts  
**User Roles**: Admin  
**Key Features**:
- Create agent accounts
- Edit agent details
- Deactivate/activate agents
- Reset agent passwords
- View agent activity

**Agent Fields**:
- Name, email, password
- Role (agent, csl_agent, sales_agent)
- Branch assignment
- Active status

### Branch Management
**Business Purpose**: Manage branch locations  
**User Roles**: Admin  
**Key Features**:
- Create branches
- Edit branch details
- Deactivate branches
- View branch agents
- View branch performance

**Branch Fields**:
- Name, code
- Email, phone
- Address
- Active status

### Bulk Agent Creation
**Business Purpose**: Import multiple agent accounts  
**User Roles**: Admin  
**Key Flow**:
1. Admin uploads CSV file
2. System validates format
3. System creates agent accounts
4. System sends welcome emails with temporary passwords
5. System returns summary

**CSV Format**:
```csv
name,email,role,branch_id
John Doe,john@nic.mu,agent,5
Jane Smith,jane@nic.mu,csl_agent,13
```

### Reports and Analytics
**Business Purpose**: Generate business intelligence reports  
**User Roles**: Admin  
**Report Types**:
- Agent performance report
- QR code summary report
- Collection report
- CSL monthly report
- Payment plan report

**Report Features**:
- Date range selection
- Agent/branch filtering
- Export to CSV/PDF
- Email report

### Reminder Scheduler Configuration
**Business Purpose**: Configure automated reminder system  
**User Roles**: Admin  
**Configuration Options**:
- Reminder frequency
- Reminder channels (email/SMS)
- Reminder templates
- Reminder schedule (days before due date)

### System Monitoring
**Business Purpose**: Monitor system health and performance  
**User Roles**: Admin  
**Monitoring Features**:
- Service status (VPS services)
- API response times
- Error logs
- Email delivery status
- Database performance

---

## 11. Sales Agent Features

### LOB (Line of Business) Dashboard
**Business Purpose**: Quick access to customer data for sales agents  
**User Roles**: Sales Agent  
**Key Features**:
- Customer list filtered by LOB
- Search by policy number
- Quick QR generation
- Minimal customer details (privacy)

**LOB Types**:
- Motor Insurance
- Non-Motor Insurance
- Life Insurance

### Customer List View
**Business Purpose**: View customers for Quick QR generation  
**User Roles**: Sales Agent  
**Key Features**:
- Search by policy number
- View customer name and policy type
- Generate QR code button
- No access to sensitive data (amounts, contact details)

**Business Rules**:
- Sales agents cannot edit customer data
- Sales agents cannot view payment history
- Sales agents can only generate QR codes

### Quick QR Generation
**Business Purpose**: Generate QR codes for ad-hoc payments  
**User Roles**: Sales Agent  
**Key Flow**:
1. Enter customer name and mobile
2. Enter amount
3. Generate QR code
4. Send via email/WhatsApp

**Business Rules**:
- No customer record required
- Transaction logged for audit
- QR code expires after 24 hours

### Policy Type Selection
**Business Purpose**: Filter customers by insurance product type  
**User Roles**: Sales Agent  
**Policy Types**:
- Motor
- Non-Motor
- Life

---

## 12. Follow-up Management

### Follow-up Dashboard
**Business Purpose**: Track customers requiring follow-up  
**User Roles**: Agent, CSL Agent  
**Key Features**:
- List of customers with upcoming follow-ups
- Overdue follow-ups highlighted
- Filter by date range
- Sort by priority

**Follow-up Sources**:
- Call logs with next_follow_up date
- CSL interactions with follow_up_date
- AOD signature reminders

### Follow-up Alerts on Login
**Business Purpose**: Notify agents of pending follow-ups  
**User Roles**: Agent, CSL Agent  
**Key Flow**:
1. Agent logs in
2. System checks for follow-ups due today
3. Alert displayed with count
4. Agent clicks to view follow-up list

**Alert Format**:
```
You have 5 follow-ups due today!
[View Follow-ups]
```

### User Filtering
**Business Purpose**: Show only relevant follow-ups to each agent  
**User Roles**: Agent, CSL Agent  
**Filtering Logic**:
- Agents see follow-ups for their assigned customers
- CSL agents see follow-ups for their assigned policies
- Admins see all follow-ups

### Next Action Tracking
**Business Purpose**: Plan and track next steps for each customer  
**User Roles**: Agent, CSL Agent  
**Key Features**:
- Set next action date
- Set next action type (call, email, visit)
- Add notes for next action
- Mark action as completed

---

## Feature Access Matrix

| Feature | Admin | Agent | CSL Agent | Sales Agent |
|---------|-------|-------|-----------|-------------|
| Customer Management | ✅ | ✅ | ❌ | 🔸 (Read-only) |
| Payment Plans | ✅ | ✅ | ❌ | ❌ |
| QR Generation | ✅ | ✅ | ❌ | ✅ (Quick QR only) |
| AOD Management | ✅ | ✅ | ❌ | ❌ |
| CSL Module | ✅ | ❌ | ✅ | ❌ |
| Agent Management | ✅ | ❌ | ❌ | ❌ |
| Reports | ✅ | 🔸 (Own data) | 🔸 (Own data) | ❌ |
| System Config | ✅ | ❌ | ❌ | ❌ |

Legend:
- ✅ Full access
- 🔸 Limited access
- ❌ No access

---

## Known Limitations

1. **QR Code Expiration**: QR codes expire after 24 hours (ZwennPay limitation)
2. **Email Delivery**: Dependent on Brevo service availability
3. **Device Linking**: Requires same network for auto-discovery
4. **CSV Upload**: Maximum 1000 records per upload
5. **File Upload**: Maximum 10 MB per file
6. **Concurrent Users**: Optimized for 100 concurrent users
7. **Mobile App**: Android only (iOS planned)

---

**Document Version**: 1.0  
**Last Updated**: February 4, 2026  
**Maintained By**: Development Team
