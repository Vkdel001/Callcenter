# Insurance Call Center Web App

A modern web application for insurance call center agents to manage customer dues collection with QR code payment integration.

## Features

- **Agent Authentication** - Secure login system for call center agents
- **Customer Management** - View and manage assigned customers with due amounts
- **Call Logging** - Track call attempts, remarks, and follow-up schedules
- **QR Code Generation** - Generate payment QR codes for customers
- **Multi-channel Communication** - Send QR codes via WhatsApp and Email
- **Real-time Dashboard** - Overview of assigned customers and call statistics
- **Responsive Design** - Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **State Management**: React Query for server state
- **Routing**: React Router v6
- **Forms**: React Hook Form
- **Icons**: Lucide React
- **Backend**: Xano (to be configured)
- **Hosting**: Netlify (recommended)

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Xano account for backend
- Netlify account for hosting (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd insurance-call-center-app
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update the `.env` file with your Xano and API configurations

5. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Demo Credentials

For testing purposes, use:
- Email: `agent@test.com`
- Password: `password`

## Xano Backend Setup

### Required Tables

1. **agents**
   - id (auto-increment)
   - name (text)
   - email (text, unique)
   - password_hash (text)
   - active_status (boolean)
   - created_at (datetime)

2. **customers**
   - id (auto-increment)
   - policy_number (text, unique)
   - name (text)
   - mobile (text)
   - email (text)
   - amount_due (decimal)
   - status (text) - pending, contacted, resolved, unreachable
   - created_at (datetime)

3. **call_logs**
   - id (auto-increment)
   - customer_id (relation to customers)
   - agent_id (relation to agents)
   - status (text)
   - remarks (text)
   - next_follow_up (date)
   - created_at (datetime)

4. **assignments**
   - id (auto-increment)
   - customer_id (relation to customers)
   - agent_id (relation to agents)
   - assigned_date (datetime)
   - priority (integer)

### Required API Endpoints

Update `src/services/authService.js` and `src/services/customerService.js` with your Xano endpoints:

- `POST /auth/login` - Agent authentication
- `GET /auth/validate` - Token validation
- `GET /customers/assigned/{agent_id}` - Get assigned customers
- `GET /customers/{id}` - Get customer details
- `POST /call-logs` - Create call log entry
- `POST /qr-codes/generate` - Generate QR code
- `POST /notifications/whatsapp` - Send WhatsApp message
- `POST /notifications/email` - Send email

## Deployment

### Netlify Deployment

1. Build the project:
```bash
npm run build
```

2. Deploy to Netlify:
   - Connect your GitHub repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Add environment variables in Netlify dashboard

### Environment Variables for Production

Set these in your Netlify dashboard:
- `REACT_APP_API_URL` - Your Xano instance URL
- `REACT_APP_QR_API_URL` - QR code generation service
- `REACT_APP_WHATSAPP_API_URL` - WhatsApp API endpoint
- `REACT_APP_EMAIL_API_URL` - Email service endpoint

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   └── layout/         # Layout components
├── contexts/           # React contexts
├── pages/              # Page components
│   ├── auth/          # Authentication pages
│   └── customers/     # Customer management pages
├── services/          # API services
└── App.jsx            # Main app component
```

## Adding New Features

The app is designed for easy extensibility:

1. **New Pages**: Add to `src/pages/` and update routing in `App.jsx`
2. **New API Services**: Add to `src/services/`
3. **New Components**: Add to `src/components/`
4. **New Context**: Add to `src/contexts/`

## Integration Points

### ZwennPay QR Code API
The app integrates with ZwennPay for QR code generation. Due to CORS restrictions, you have two options:

**Option 1: Test Mode (Current)**
- Set `VITE_QR_TEST_MODE=true` in `.env`
- Generates test QR codes that look like real ZwennPay QRs
- Good for development and testing

**Option 2: Backend Proxy (Production)**
- Create a backend endpoint that calls ZwennPay API
- Update `qrService.js` to call your backend instead of ZwennPay directly
- Avoids CORS issues by making server-to-server calls

**Option 3: Xano Integration**
- Add ZwennPay API calls to your Xano backend
- Create Xano function that generates QR codes
- Call Xano endpoint from frontend

### WhatsApp Integration
Update the WhatsApp service calls with your preferred WhatsApp Business API provider.

### Email Service
Configure with your email service provider (SendGrid, Mailgun, etc.).

## Security Considerations

- All API calls include authentication tokens
- Sensitive data is not stored in localStorage
- HTTPS is enforced in production
- Input validation on all forms
- XSS protection through React's built-in escaping

## Support

For questions or issues, please refer to the documentation or contact the development team.