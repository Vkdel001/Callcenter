# NIC Call Center System - Developer Onboarding Guide

## Welcome! 🎉

This guide will help you set up the NIC Call Center System on your local machine and make your first contribution. Follow these steps carefully, and you'll be up and running within a few hours.

---

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

### Required Software

1. **Node.js 16+ and npm**
   - Download: https://nodejs.org/
   - Verify installation:
     ```bash
     node --version  # Should be v16.0.0 or higher
     npm --version   # Should be 8.0.0 or higher
     ```

2. **Python 3.8+** (for device services)
   - Download: https://www.python.org/downloads/
   - Verify installation:
     ```bash
     python --version  # Should be 3.8.0 or higher
     pip --version
     ```

3. **Git**
   - Download: https://git-scm.com/
   - Verify installation:
     ```bash
     git --version
     ```

4. **Code Editor**
   - Recommended: Visual Studio Code
   - Download: https://code.visualstudio.com/

5. **API Testing Tool** (optional but recommended)
   - Postman: https://www.postman.com/
   - Or use browser DevTools

### Recommended VS Code Extensions

- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- ESLint
- Prettier
- GitLens
- Thunder Client (API testing)

---

## Step-by-Step Setup

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd nic-call-center

# Check current branch
git branch
```

### Step 2: Install Frontend Dependencies

```bash
# Install all npm packages
npm install

# This will install:
# - React 18
# - Vite
# - Tailwind CSS
# - React Router
# - Axios
# - And all other dependencies
```

**Common Issues**:
- If you get permission errors on Windows, run terminal as Administrator
- If you get `EACCES` errors on Mac/Linux, don't use `sudo`. Fix npm permissions instead
- If installation is slow, try: `npm install --legacy-peer-deps`

### Step 3: Install Python Dependencies (for Device Services)

```bash
# Navigate to device client directory
cd device_client

# Install Python dependencies
pip install -r requirements.txt

# This installs:
# - Flask
# - PySerial
# - Requests
# - PyQt5 (for GUI)

# Return to root directory
cd ..
```

**Common Issues**:
- On Windows, you may need to install Visual C++ Build Tools
- On Mac, you may need to install Xcode Command Line Tools
- If PyQt5 fails, you can skip it for now (only needed for device client GUI)


### Step 4: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy the example file
cp .env.example .env

# Or create manually
touch .env
```

Edit `.env` with the following variables:

```bash
# ============================================
# XANO API CONFIGURATION
# ============================================
VITE_API_URL=https://x8ki-letl-twmt.n7.xano.io/api:your-api-id
VITE_API_KEY=your-xano-api-key

# ============================================
# BREVO (EMAIL/SMS) CONFIGURATION
# ============================================
VITE_BREVO_API_KEY=your-brevo-api-key
VITE_BREVO_SENDER_EMAIL=noreply@nic.mu
VITE_BREVO_SENDER_NAME=NIC Insurance

# ============================================
# ZWENNPAY (QR PAYMENTS) CONFIGURATION
# ============================================
VITE_ZWENNPAY_API_KEY=your-zwennpay-api-key
VITE_ZWENNPAY_MERCHANT_ID=your-merchant-id

# ============================================
# APPLICATION CONFIGURATION
# ============================================
VITE_APP_NAME=NIC Call Center
VITE_APP_URL=http://localhost:5173

# ============================================
# RAILWAY WEBHOOK URL
# ============================================
VITE_WEBHOOK_URL=https://your-railway-app.railway.app/webhook

# ============================================
# DEVICE SERVICE CONFIGURATION
# ============================================
VITE_DEVICE_SERVICE_URL=http://localhost:5000

# ============================================
# FEATURE FLAGS (optional)
# ============================================
VITE_ENABLE_DEVICE_INTEGRATION=true
VITE_ENABLE_CSL_MODULE=true
VITE_ENABLE_AOD_FEATURE=true
```

**How to Get API Keys**:

1. **Xano API**:
   - Ask your team lead for Xano account access
   - Login to Xano dashboard
   - Navigate to Settings → API
   - Copy the API URL and generate an API key

2. **Brevo API**:
   - Ask for Brevo account access
   - Login to Brevo dashboard
   - Navigate to SMTP & API → API Keys
   - Create a new API key

3. **ZwennPay API**:
   - Contact ZwennPay support for merchant credentials
   - Or ask your team lead for test credentials

**Development vs Production**:
- For development, you can use test/sandbox API keys
- Never commit `.env` file to Git (it's in `.gitignore`)
- For production, use `.env.production`

### Step 5: Set Up Xano Account and API Access

1. **Get Xano Access**:
   - Ask your team lead to invite you to the Xano workspace
   - Accept the invitation email
   - Set up your Xano account

2. **Explore Xano Dashboard**:
   - Navigate to Database → Tables
   - Review the table structure
   - Navigate to API → Endpoints
   - Test endpoints using Xano's built-in API tester

3. **Test API Connection**:
   ```bash
   # Create a test file: test-api-connection.js
   node test-api-connection.js
   ```

   ```javascript
   // test-api-connection.js
   const axios = require('axios');

   const API_URL = 'your-xano-api-url';

   async function testConnection() {
     try {
       const response = await axios.get(`${API_URL}/health`);
       console.log('✅ API Connection successful!');
       console.log('Response:', response.data);
     } catch (error) {
       console.error('❌ API Connection failed:', error.message);
     }
   }

   testConnection();
   ```

### Step 6: Run Frontend Development Server

```bash
# Start the development server
npm run dev

# You should see:
# VITE v5.0.8  ready in 500 ms
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
```

Open your browser and navigate to `http://localhost:5173/`

**What You Should See**:
- Login page
- NIC Insurance branding
- Email and password fields

**Common Issues**:

1. **Port 5173 already in use**:
   ```bash
   # Kill the process using the port
   # Windows:
   netstat -ano | findstr :5173
   taskkill /PID <PID> /F
   
   # Mac/Linux:
   lsof -ti:5173 | xargs kill -9
   
   # Or use a different port
   npm run dev -- --port 3000
   ```

2. **"Cannot find module" errors**:
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Blank page or white screen**:
   - Check browser console for errors
   - Verify `.env` file exists and has correct values
   - Check that `VITE_API_URL` is set

### Step 7: Run Backend Services Locally (Optional)

Backend services are typically run on the VPS, but you can run them locally for testing:

#### Reminder Service

```bash
# Navigate to root directory
cd /path/to/nic-call-center

# Run the reminder service
node backend-reminder-service.cjs

# You should see:
# Reminder service started
# Checking for reminders every 5 minutes...
```

#### Payment Notification Service

```bash
node backend-payment-notification.cjs

# You should see:
# Payment notification service started
# Listening for payment events...
```

#### Device Service (Python)

```bash
# Navigate to device client directory
cd device_client

# Run the device service
python device_client.py

# You should see:
# Device client started
# Listening on port 5000...
```

**Note**: These services require environment variables to be set. Create a `.env` file in the root directory with the necessary variables.

### Step 8: Test Device Client (Optional)

The device client is only needed if you're working on ESP32 device integration:

```bash
# Navigate to device client directory
cd device_client

# Run the client
python device_client.py

# Or build the executable
python build.bat  # Windows
./build.sh        # Mac/Linux
```

**Requirements**:
- ESP32 device on the same network
- Device service running
- VPS API accessible

---

## Environment Configuration

### Development Environment (.env)

Used when running `npm run dev`:

```bash
VITE_API_URL=https://x8ki-letl-twmt.n7.xano.io/api:dev-instance
VITE_APP_URL=http://localhost:5173
# ... other dev-specific variables
```

### Production Environment (.env.production)

Used when running `npm run build`:

```bash
VITE_API_URL=https://x8ki-letl-twmt.n7.xano.io/api:prod-instance
VITE_APP_URL=https://nic-callcenter.netlify.app
# ... other prod-specific variables
```

### VPS Services Environment

Backend services on VPS use environment variables set in systemd service files:

```bash
# /etc/systemd/system/nic-reminder.service
[Service]
Environment="XANO_API_URL=..."
Environment="BREVO_API_KEY=..."
# ... other variables
```

---

## Running the Application

### Frontend Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Backend Services

```bash
# Run reminder service
node backend-reminder-service.cjs

# Run payment notification service
node backend-payment-notification.cjs

# Run device service
cd device_client && python device_client.py

# Run AOD upload service
node aod-upload-service.cjs
```

### Testing

```bash
# Run all tests
npm test

# Run specific test file
node test-login-flow.js

# Run API tests
node test-api-endpoint-fix.js
```

---

## Common Setup Issues and Solutions

### Issue 1: CORS Errors

**Symptom**: 
```
Access to XMLHttpRequest at 'https://xano...' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

**Solution**:
1. Check Xano CORS settings:
   - Login to Xano dashboard
   - Navigate to Settings → API → CORS
   - Add `http://localhost:5173` to allowed origins
   - Add `https://nic-callcenter.netlify.app` for production

2. Verify API URL in `.env`:
   ```bash
   VITE_API_URL=https://x8ki-letl-twmt.n7.xano.io/api:your-api-id
   ```

### Issue 2: API Connection Failures

**Symptom**:
```
Error: Network Error
or
Error: Request failed with status code 401
```

**Solution**:
1. Verify API URL is correct
2. Check API key is valid
3. Test API endpoint in Postman
4. Check Xano service status
5. Verify internet connection

### Issue 3: Environment Variable Issues

**Symptom**:
```
undefined is not a function
or
Cannot read property 'VITE_API_URL' of undefined
```

**Solution**:
1. Ensure `.env` file exists in root directory
2. Verify all variables start with `VITE_`
3. Restart development server after changing `.env`
4. Check for typos in variable names

### Issue 4: Port Conflicts

**Symptom**:
```
Port 5173 is already in use
```

**Solution**:
```bash
# Use a different port
npm run dev -- --port 3000

# Or kill the process using the port
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:5173 | xargs kill -9
```

### Issue 5: Python Dependency Issues

**Symptom**:
```
ModuleNotFoundError: No module named 'flask'
or
ImportError: DLL load failed
```

**Solution**:
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Use virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

### Issue 6: Build Failures

**Symptom**:
```
npm run build fails with errors
```

**Solution**:
1. Clear build cache:
   ```bash
   rm -rf dist node_modules/.vite
   npm run build
   ```

2. Check for TypeScript errors:
   ```bash
   npm run lint
   ```

3. Verify all imports are correct

4. Check for missing dependencies:
   ```bash
   npm install
   ```

---

## Development Tools

### Browser DevTools

**Chrome DevTools**:
- Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- **Console**: View logs and errors
- **Network**: Monitor API calls
- **Application**: Inspect localStorage and cookies
- **Sources**: Debug JavaScript code

**React DevTools**:
- Install: https://chrome.google.com/webstore (search "React Developer Tools")
- Inspect component tree
- View component props and state
- Profile performance

### Network Debugging

**Monitor API Calls**:
1. Open DevTools → Network tab
2. Filter by XHR/Fetch
3. Click on a request to see:
   - Request headers
   - Request payload
   - Response data
   - Response headers
   - Timing information

**Common API Issues**:
- 401 Unauthorized: Check JWT token
- 404 Not Found: Verify endpoint URL
- 500 Internal Server Error: Check Xano logs
- CORS errors: Check CORS configuration

### Xano API Testing Interface

1. Login to Xano dashboard
2. Navigate to API → Endpoints
3. Click on an endpoint
4. Click "Run & Debug"
5. Enter test parameters
6. View response

**Benefits**:
- Test endpoints without writing code
- See exact request/response
- Debug Xano functions
- Test authentication

### Postman for API Testing

**Import Xano API**:
1. Export API from Xano (OpenAPI format)
2. Import into Postman
3. Set up environment variables
4. Test endpoints

**Example Request**:
```
GET https://x8ki-letl-twmt.n7.xano.io/api:your-api-id/customers
Headers:
  Authorization: Bearer {jwt_token}
  Content-Type: application/json
```

---

## First Tasks for New Developers

### Task 1: Make a Simple UI Change (15 minutes)

**Goal**: Change the login page title

1. Open `src/pages/auth/Login.jsx`
2. Find the title text
3. Change it to "Welcome to NIC Call Center"
4. Save the file
5. See the change in the browser (hot reload)

**Expected Result**: Title should update automatically

### Task 2: Add a New API Endpoint (30 minutes)

**Goal**: Create a test endpoint in Xano

1. Login to Xano dashboard
2. Navigate to API → Add Endpoint
3. Create `GET /api/test`
4. Add a function that returns `{ message: "Hello World" }`
5. Test in Xano's API tester
6. Call from frontend:

```javascript
// src/services/testService.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const testService = {
  async getTest() {
    const response = await axios.get(`${API_URL}/test`);
    return response.data;
  }
};
```

7. Use in a component:

```javascript
import { testService } from '../services/testService';

const TestComponent = () => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    testService.getTest().then(data => {
      setMessage(data.message);
    });
  }, []);

  return <div>{message}</div>;
};
```

### Task 3: Test the Payment Flow (45 minutes)

**Goal**: Generate a QR code for a test customer

1. Login to the application (use test credentials)
2. Navigate to Customers
3. Select a customer
4. Click "Create Payment Plan"
5. Fill in the form:
   - Total Amount: 1000
   - Installments: 4
   - Start Date: Today
6. Submit the form
7. Click "Generate QR Code"
8. Verify QR code is displayed
9. Check Network tab for API calls
10. Verify data in Xano dashboard

**Expected Result**: QR code generated and saved to database

### Task 4: Generate a QR Code (30 minutes)

**Goal**: Understand the QR code generation flow

1. Review `src/services/qrService.js`
2. Review `src/utils/qrGenerator.js`
3. Test QR generation:

```javascript
import { generateQRCode } from '../utils/qrGenerator';

const qrCode = await generateQRCode({
  amount: 1000,
  reference: 'TEST-001',
  customerName: 'John Doe'
});

console.log('QR Code URL:', qrCode);
```

4. Display QR code in a component
5. Test email delivery (if Brevo is configured)

---

## Understanding the Codebase

### Key Files to Review

1. **src/App.jsx**: Main application component, routing
2. **src/main.jsx**: Entry point, providers
3. **src/contexts/AuthContext.jsx**: Authentication state management
4. **src/services/authService.js**: Authentication API calls
5. **src/services/customerService.js**: Customer management API
6. **src/services/qrService.js**: QR code generation
7. **src/utils/qrGenerator.js**: QR code utility functions
8. **src/config/permissions.js**: Role-based permissions

### Code Patterns to Follow

**API Service Pattern**:
```javascript
// src/services/exampleService.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const exampleService = {
  async getData() {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/endpoint`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }
};
```

**Component Pattern**:
```javascript
// src/components/ExampleComponent.jsx
import React, { useState, useEffect } from 'react';
import { exampleService } from '../services/exampleService';

const ExampleComponent = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await exampleService.getData();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {data.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
};

export default ExampleComponent;
```

---

## Next Steps

After completing the setup:

1. **Read Documentation**:
   - SYSTEM_ARCHITECTURE.md
   - API_DOCUMENTATION.md
   - FEATURE_CATALOG.md

2. **Explore the Codebase**:
   - Browse through components
   - Review services
   - Understand routing

3. **Join Team Meetings**:
   - Daily standups
   - Code reviews
   - Planning sessions

4. **Pick Your First Ticket**:
   - Start with "good first issue" labels
   - Ask for help when needed
   - Submit pull requests

5. **Set Up Development Tools**:
   - Configure ESLint
   - Set up Prettier
   - Install recommended extensions

---

## Getting Help

### Internal Resources

- **Team Lead**: For access and permissions
- **Senior Developers**: For code reviews and architecture questions
- **Documentation**: Check existing .md files in the repository
- **Xano Dashboard**: For database and API questions

### External Resources

- **React Docs**: https://react.dev
- **Vite Docs**: https://vitejs.dev
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Xano Docs**: https://docs.xano.com
- **Axios Docs**: https://axios-http.com/docs/intro

### Troubleshooting

If you're stuck:
1. Check the error message carefully
2. Search in existing documentation
3. Check browser console and network tab
4. Review Xano logs
5. Ask in team chat
6. Create a detailed issue with:
   - What you're trying to do
   - What you expected
   - What actually happened
   - Error messages
   - Screenshots

---

## Checklist

Before you start coding, make sure you have:

- [ ] Installed Node.js 16+
- [ ] Installed Python 3.8+ (if working on device services)
- [ ] Cloned the repository
- [ ] Installed npm dependencies
- [ ] Created `.env` file with all required variables
- [ ] Got Xano account access
- [ ] Got Brevo API key (if working on emails)
- [ ] Started development server successfully
- [ ] Logged in to the application
- [ ] Reviewed key documentation files
- [ ] Completed at least one of the first tasks
- [ ] Set up Git with your credentials
- [ ] Joined team communication channels

---

**Welcome to the team! Happy coding! 🚀**

---

**Document Version**: 1.0  
**Last Updated**: February 4, 2026  
**Maintained By**: Development Team  
**Next Review**: March 2026
