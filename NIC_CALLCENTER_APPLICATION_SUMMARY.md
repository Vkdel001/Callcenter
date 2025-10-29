# NIC Call Center System - Complete Application Summary

## 🏢 **Application Overview**
A comprehensive debt collection and payment management system built for National Insurance Corporation (NIC) Mauritius call center operations. The system handles customer debt collection, payment plan creation, automated reminders, and legal document workflows.

## 🏗️ **Technical Architecture**

### **Frontend Stack**
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **State Management**: React Query for server state, React Context for auth
- **Routing**: React Router v6
- **Forms**: React Hook Form
- **Icons**: Lucide React
- **PDF Generation**: jsPDF
- **HTTP Client**: Axios

### **Backend Integration**
- **Primary Backend**: Xano (Backend-as-a-Service)
- **Database**: Xano managed database
- **Authentication**: JWT tokens with OTP verification
- **File Storage**: Xano file storage for PDFs and documents

### **External Integrations**
- **Payment QR Codes**: ZwennPay API
- **Email Service**: Brevo (SendinBlue) API
- **SMS Service**: Brevo SMS API
- **QR Code Generation**: QR Server API + Custom branding

## 📊 **Database Schema**

### **Core Tables**
1. **nic_cc_customer**
   - Customer information, contact details, policy data
   - Assignment status, agent assignments, **branch_id** (critical for access control)
   - Payment history and status tracking

2. **nic_cc_agent**
   - Agent authentication and profile data
   - **agent_type**: 'call_center' | 'internal' (determines access rights)
   - **branch_id**: Required for internal agents, optional for call center agents
   - Role-based permissions (agent/admin)
   - Batch management and current assignments

3. **nic_cc_payment_plan** (AOD - Acknowledgment of Debt)
   - Payment plan details and terms
   - Signature workflow status and dates
   - Payment method configurations

4. **nic_cc_installment**
   - Individual installment records
   - QR code data and payment tracking
   - Reminder counts and status

5. **nic_cc_calllog**
   - Call attempt tracking and outcomes
   - Agent remarks and follow-up scheduling

## 🔐 **Authentication & Security**

### **Multi-Factor Authentication**
- Email/password login with OTP verification
- JWT token-based session management
- Password reset with OTP verification
- Role-based access control (agent/admin)

### **Security Features**
- Secure logging with PII protection
- Input validation and sanitization
- HTTPS enforcement
- XSS protection through React
- Audit trails for all operations

## 🎯 **Core Features**

### **1. Customer Management & Agent Rights System**
- **Customer Database**: Complete customer profile management
- **Role-Based Assignment System**: Two-tier agent access control
  - **Call Center Agents**: Can access ALL customers across all branches
  - **Internal Agents**: Restricted to customers from their assigned branch only
- **Fair Distribution Algorithm**: Intelligent customer assignment based on agent type
- **Branch Management**: Multi-branch operation support with access controls
- **Search & Filtering**: Advanced customer search capabilities
- **Bulk Upload**: CSV import for customer data with branch assignments

### **2. Call Center Operations**
- **Call Logging**: Track call attempts, outcomes, and remarks
- **Status Management**: Customer status workflow (pending → contacted → resolved)
- **Follow-up Scheduling**: Next call date planning
- **Agent Dashboard**: Real-time statistics and assigned customers
- **Batch Management**: Configurable customer batch sizes per agent

### **3. Payment Plan System (AOD Workflow)**
- **AOD Creation**: Flexible payment plan setup with multiple methods:
  - Monthly installments (up to 6 months)
  - Fund value deduction
  - Benefits transfer between policies
- **Legal Document Generation**: Professional PDF AOD documents
- **Signature Workflow**: Complete 30-day signature collection process
- **Status Tracking**: pending_signature → received → expired → active

### **4. Automated Reminder System**
- **Payment Reminders**: Scheduled reminders for overdue payments
- **Signature Reminders**: AOD signature collection automation
- **Multi-channel Communication**: Email + SMS delivery
- **Browser-based Scheduler**: Client-side automation for reliability
- **Configurable Timing**: Flexible reminder intervals and business hours

### **5. Communication System**
- **Professional Email Templates**: HTML emails with NIC branding
- **SMS Integration**: Brevo SMS with Mauritius phone formatting (+230)
- **QR Code Embedding**: Dynamic QR codes in all communications
- **Template Management**: Customizable email and SMS templates
- **Delivery Tracking**: Communication status monitoring

### **6. QR Code & Payment Integration**
- **ZwennPay Integration**: Real-time QR code generation
- **Branded QR Codes**: Custom QR codes with NIC and MauCAS branding
- **Test Mode**: Development-friendly QR code generation
- **Payment Tracking**: QR code usage and payment status
- **Mobile Banking**: Direct integration with Mauritius banking apps

### **7. Administrative Features**
- **Admin Dashboard**: System overview and metrics
- **Agent Management**: User account and permission management
- **Branch Management**: Multi-branch configuration
- **Reminder Scheduler**: Centralized automation configuration
- **Reports System**: Detailed analytics and reporting
- **System Monitoring**: Performance and health tracking

## 📱 **User Interface Structure**

### **Authentication Pages**
- `/login` - Agent login with OTP verification
- `/signup` - New agent registration
- `/forgot-password` - Password recovery
- `/otp-verify` - OTP verification
- `/reset-password-otp` - Password reset with OTP

### **Main Application (Protected Routes)**
- `/` - Dashboard with statistics and quick actions
- `/customers` - Customer list with search and filtering
- `/customers/:id` - Detailed customer profile and call history
- `/quick-qr` - Quick QR code generator for payments

### **Administrative Pages**
- `/admin` - Administrative dashboard
- `/admin/upload` - Bulk customer data upload
- `/admin/reports` - System reports and analytics
- `/admin/agents` - Agent management
- `/admin/branches` - Branch configuration
- `/admin/scheduler` - Reminder system configuration

### **Public Pages**
- `/reminder/:installmentId` - Public payment reminder page

### **Testing & Development**
- `/test/payment-plan` - Payment plan testing interface

## � **Augent Rights & Customer Access System**

### **Agent Types & Permissions**

#### **Call Center Agents** (`agent_type: 'call_center'`)
- **Access**: ALL customers across ALL branches
- **Branch Assignment**: Optional (can be null or any branch)
- **Customer Pool**: Complete database of available customers
- **Use Case**: External call center staff who handle customers from multiple branches
- **Fetch Logic**: No branch filtering applied

#### **Internal Agents** (`agent_type: 'internal'`)
- **Access**: ONLY customers from their assigned branch
- **Branch Assignment**: REQUIRED (`branch_id` must be set)
- **Customer Pool**: Filtered to `customer.branch_id === agent.branch_id`
- **Use Case**: Branch-specific staff who only handle their branch customers
- **Fetch Logic**: Strict branch filtering applied

### **Customer Fetching Algorithm**
```javascript
// In customerService.fetchNext10Customers()
if (currentAgent.agent_type === 'internal' && currentAgent.branch_id) {
  // Internal agent - filter by branch
  availableCustomers = availableCustomers.filter(customer => 
    customer.branch_id === currentAgent.branch_id
  )
} else {
  // Call center agent - access all customers
  // No filtering applied
}
```

### **Fair Distribution Logic**
1. **Get Available Customers**: Filter by assignment_status = 'available'
2. **Apply Agent Rights**: Branch filtering for internal agents
3. **Sort by Priority**: Highest amount_due first
4. **Round-Robin Assignment**: Skip customers for other agents
5. **Batch Limit**: Maximum 10 customers per fetch

## 🔄 **Business Workflows**

### **Customer Assignment Workflow**
1. **Customer Upload**: Customers uploaded with branch assignments
2. **Agent Type Check**: System determines agent access rights
   - **Call Center Agents** (`agent_type: 'call_center'`): Access to ALL customers
   - **Internal Agents** (`agent_type: 'internal'`): Only customers from `agent.branch_id`
3. **Fair Distribution Algorithm**: 
   - Sorts available customers by amount (highest first)
   - Skips customers for other agents using round-robin logic
   - Respects branch restrictions for internal agents
4. **Batch Assignment**: Agents receive up to 10 customers per batch
5. **Call Outcomes**: Determine next actions (reassign/complete/follow-up)

### **AOD (Payment Plan) Workflow**
1. **Creation**: Agent creates AOD with customer payment terms
2. **PDF Generation**: Professional legal document created
3. **Email Delivery**: AOD sent to customer with signature instructions
4. **Signature Collection**: 30-day collection period with automated reminders
5. **Activation**: Signed AOD activates payment plan and installment reminders
6. **Expiry**: Unsigned AODs expire after 30 days

### **Payment Reminder Workflow**
1. **Installment Creation**: QR codes generated for each installment
2. **Reminder Scheduling**: Automated reminders at 7 days, 3 days, due date, overdue
3. **Multi-channel Delivery**: Email + SMS with QR codes
4. **Payment Tracking**: Status updates and completion monitoring

### **Signature Reminder Workflow**
1. **Day 7**: Gentle reminder email
2. **Day 14**: Important notice email
3. **Day 21**: Final notice email
4. **Day 30**: Automatic expiry and notification

## 🛠️ **Service Architecture**

### **Core Services**
- **authService.js**: Authentication, login, OTP verification
- **customerService.js**: Customer CRUD, assignments, call logging
- **paymentPlanService.js**: AOD creation, management, status tracking
- **installmentService.js**: Installment management, payment tracking
- **reminderService.js**: Payment reminder automation
- **signatureReminderService.js**: AOD signature workflow
- **schedulerService.js**: Automated task scheduling
- **emailService.js**: Multi-channel communication
- **qrService.js**: QR code generation and branding
- **aodPdfService.js**: Legal document generation

### **Utility Services**
- **apiClient.js**: Xano API integration
- **secureLogger.js**: Audit logging with PII protection
- **databaseFieldChecker.js**: Data integrity validation
- **schedulerInit.js**: Browser-based automation initialization

## 🔧 **Recent Major Implementations**

### **AOD Signature Workflow (Complete)**
- 30-day signature collection process
- Automated reminder scheduling (3 reminders)
- Document state management with expiry handling
- Professional email templates with legal compliance
- Agent notifications and BCC functionality

### **Automated Reminder System (Fixed & Optimized)**
- **Smart Reminder Logic**: Only 2 reminders per installment (7 days + 3 days before due)
- **No Payment Integration Spam**: Stops after 2 reminders (no endless overdue emails)
- **Customer-Friendly**: "Ignore if paid" message in all communications
- Browser-based scheduler for reliability
- Business hours compliance
- Multi-channel delivery (Email + SMS)
- QR code integration in all reminders
- Failure handling and retry mechanisms

### **Data Integrity Fixes (Critical)**
- Fixed Xano API parameter filtering issues
- Implemented JavaScript-based data filtering
- Orphaned installment detection and linking
- Enhanced data validation and safety checks
- Improved error handling and logging

### **Backend Reminder Service (Latest Fixes)**
- **QR Code Fix**: Use existing QR codes from `installment.qr_code_url` database field
- **Smart Reminder Logic**: Only 2 reminders per installment (prevents spam)
- **Customer Communication**: Added "ignore if paid" message to all emails/SMS
- **Reminder Tracking**: Uses `installment.reminder_sent_count` for proper counting
- **Professional Templates**: First/Final reminder labeling with clear messaging
- **Files**: `backend-reminder-service.cjs` - standalone Node.js service for VPS deployment

## 📧 **Communication Templates**

### **Email Templates**
- **Payment Reminders**: Professional HTML with QR codes and NIC branding
- **AOD Documents**: Legal document delivery with signature instructions
- **Signature Reminders**: Progressive urgency (gentle → important → final)
- **Activation Confirmations**: Payment plan activation notifications
- **Expiry Notifications**: AOD expiry alerts for customers and agents

### **SMS Templates**
- **Payment Reminders**: Concise payment notifications with links
- **Signature Reminders**: AOD signature deadline alerts
- **Status Updates**: Payment confirmation and plan activation

## 🔍 **Data Management**

### **Customer Data Fields**
- Personal: name, email, mobile, address, NIC
- Policy: policy_number, amount_due, status
- Assignment: assigned_agent, **branch_id** (critical for access control), assignment_status
- Tracking: last_call_date, total_attempts, reminder_count

### **Agent Data Fields**
- Authentication: email, password_hash, active status
- Profile: name, role (agent/admin)
- **Access Control**: **agent_type** ('call_center' | 'internal'), **branch_id**
- Management: current_batch_size, last_login

### **Payment Plan Fields**
- Agreement: policy_number, outstanding_amount, agreement_date
- Terms: payment_method, installment_amount, total_installments
- Signature: signature_status, signature_sent_date, signature_reminder_count
- Status: status (pending_signature/active/expired/cancelled)

### **Installment Fields**
- Schedule: installment_number, due_date, amount, status
- Payment: payment_date, payment_method, qr_code_url
- Reminders: reminder_sent_count, last_reminder_sent

## 🚀 **Deployment Architecture**

### **Frontend Deployment**
- **Platform**: VPS with Nginx
- **Build**: `npm run build` → `dist/` folder served by Nginx
- **Environment**: Production environment variables in `.env`
- **Domain**: Custom domain with Let's Encrypt SSL

### **Backend Service Deployment**
- **Platform**: Ubuntu VPS server
- **Service**: `backend-reminder-service.cjs` as systemd service
- **Automation**: Cron-like scheduling for reminder processing
- **Logging**: `/var/log/nic-reminder-service.log`
- **Management**: `systemctl` commands for service control

### **Environment Configuration**
```
VITE_XANO_BASE_URL=https://xbde-ekcn-8kg2.n7e.xano.io
VITE_XANO_CUSTOMER_API=Q4jDYUWL
VITE_XANO_PAYMENT_API=05i62DIx
VITE_BREVO_API_KEY=your_brevo_api_key
VITE_SENDER_EMAIL=arrears@niclmauritius.site
VITE_ZWENNPAY_MERCHANT_ID=151
VITE_QR_TEST_MODE=false
```

## 🔧 **Development Tools**

### **Testing & Debugging**
- **Payment Plan Test**: `/test/payment-plan` - Complete AOD workflow testing
- **Database Checker**: `window.dbCheck` - Runtime data integrity validation
- **QR Test Mode**: Mock QR generation for development
- **Secure Logging**: PII-safe logging for production debugging

### **Development Scripts**
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm run lint` - Code linting

## 📈 **Performance Optimizations**

### **Frontend Optimizations**
- Client-side data filtering for improved response times
- Lazy loading for large datasets
- Optimized PDF generation with chunked processing
- Cached authentication tokens
- Efficient React Query caching

### **Backend Optimizations**
- JavaScript filtering instead of unreliable Xano filtering
- Batch processing for bulk operations
- Efficient database queries
- Connection pooling and retry logic

## 🔮 **Future Enhancements**

### **Planned Features**
- Mobile app for field agents
- Advanced analytics dashboard
- Integration with more payment providers
- Automated policy reinstatement
- Customer self-service portal

### **Technical Improvements**
- Real-time notifications with WebSockets
- Advanced reporting with data visualization
- Machine learning for payment prediction
- API rate limiting and caching
- Enhanced security with 2FA

## 🆘 **Troubleshooting Guide**

### **Common Issues**
1. **QR Code Generation Fails**: Check ZwennPay API credentials and network
2. **Email Delivery Issues**: Verify Brevo API key and sender configuration
3. **Customer Assignment Problems**: Check branch assignments and agent status
4. **Reminder Not Sending**: Verify scheduler is running and business hours
5. **AOD Signature Issues**: Check email delivery and customer instructions

### **Data Integrity Issues**
- **Orphaned Installments**: Use cleanup functions in paymentPlanService
- **Missing QR Codes**: Regenerate using qrService for existing installments
- **Assignment Conflicts**: Use fair distribution algorithm to reassign

### **Performance Issues**
- **Slow Customer Loading**: Check Xano API response times
- **PDF Generation Slow**: Optimize installment data size
- **Memory Issues**: Clear React Query cache periodically

## 📞 **Support & Maintenance**

### **Key Contacts**
- **Development Team**: Technical issues and feature requests
- **System Admin**: Server and deployment issues
- **Business Users**: Workflow and process questions

### **Monitoring**
- **Application Logs**: Browser console and secure logging
- **Server Logs**: `/var/log/nic-reminder-service.log`
- **API Monitoring**: Xano dashboard and Brevo analytics
- **Performance Metrics**: React Query devtools and network monitoring

---

## 🎯 **Quick Reference for New Sessions**

### **Most Important Files**
- `src/App.jsx` - Main application routing
- `src/services/` - All business logic and API integrations
- `backend-reminder-service.cjs` - Standalone reminder service
- `src/pages/test/PaymentPlanTest.jsx` - Complete workflow testing

### **Key Concepts**
- **AOD**: Acknowledgment of Debt = Payment Plan with legal document
- **Installments**: Individual payment schedule items with QR codes
- **Signature Workflow**: 30-day collection process for AOD documents
- **Agent Types**: Call Center (all customers) vs Internal (branch-specific)
- **Fair Distribution**: Algorithm for assigning customers based on agent rights
- **Browser Scheduler**: Client-side automation for reliable reminders
- **Branch Filtering**: Access control mechanism for internal agents

### **Critical Data Relationships**
- Customer → Payment Plan (AOD) → Installments → QR Codes
- Agent → Customer Assignments → Call Logs
- Payment Plan → Signature Status → Reminder Schedule

This system is production-ready and handles the complete debt collection workflow for NIC Mauritius call center operations.