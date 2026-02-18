# Xano Authentication Setup Guide - CRITICAL SECURITY FIX

**Date**: January 17, 2026  
**Priority**: 🔴 CRITICAL - All APIs are currently PUBLIC  
**Issue**: Custom token system doesn't match Xano's authentication  
**Impact**: Anyone with API URLs can access all customer data

---

## Current Problem

Your application creates a **custom token** (base64 encoded JSON):
```javascript
const token = btoa(JSON.stringify({
  id: agent.id,
  email: agent.email,
  timestamp: Date.now()
}))
```

But Xano expects its own **authToken** from a proper `/auth/login` endpoint.

**Result**: When you enable authentication on endpoints, they reject your custom token with "401 Unauthorized".

---

## Solution Overview

You have **TWO OPTIONS**:

### Option 1: Use Xano's Built-in Authentication (RECOMMENDED)
- Proper security
- Industry standard
- Built-in token management
- Automatic token refresh
- Better security features

### Option 2: Keep Custom Tokens + Add API Key Authentication
- Quick fix
- Less secure
- Requires API key management
- Not recommended for production

---

## OPTION 1: Xano Built-in Authentication (RECOMMENDED)

### Step 1: Create Authentication Endpoint in Xano

1. **Open Xano** → Go to your workspace
2. **Click "API" in left sidebar**
3. **Click "+ Add API Group"** (if you don't have an auth group)
4. **Name it**: `auth`
5. **Click the new "auth" group**
6. **Click "+ Add Endpoint"**

### Step 2: Create Login Endpoint

**Endpoint Configuration:**
- **Path**: `/login`
- **Method**: `POST`
- **Authentication**: `No Authentication Required` (login endpoints are public)

**Function Stack:**

1. **Add Input** (click "+ Add Input"):
   - Name: `email`
   - Type: `text`
   - Required: ✅ Yes
   
2. **Add Input**:
   - Name: `password`
   - Type: `text`
   - Required: ✅ Yes

3. **Query Database** (click "+ Add Function" → "Query Database"):
   - Table: `nic_cc_agent`
   - Filter: `email` equals `{email}` (from input)
   - Limit: 1
   - Save result as: `user`

4. **Conditional** (check if user exists):
   - Condition: `user` is empty
   - If TRUE: Return error "Invalid credentials" (status 401)

5. **Conditional** (check password):
   - Condition: `user.password` not equals `{password}` (from input)
   - If TRUE: Return error "Invalid credentials" (status 401)

6. **Conditional** (check if active):
   - Condition: `user.active` not equals `true`
   - If TRUE: Return error "Account inactive" (status 403)

7. **Authentication: Create Auth Token**:
   - User ID: `user.id`
   - Expiration: `7 days` (or your preference)
   - Save as: `authToken`

8. **Response**:
   ```json
   {
     "authToken": "{authToken}",
     "user": {
       "id": "{user.id}",
       "name": "{user.name}",
       "email": "{user.email}",
       "role": "{user.role}",
       "agent_type": "{user.agent_type}",
       "sales_agent_id": "{user.sales_agent_id}",
       "branch_id": "{user.branch_id}",
       "admin_lob": "{user.admin_lob}"
     }
   }
   ```

### Step 3: Create "Me" Endpoint (Token Validation)

**Endpoint Configuration:**
- **Path**: `/me`
- **Method**: `GET`
- **Authentication**: `Auth Token` ✅ (ENABLE THIS)

**Function Stack:**

1. **Get Authenticated User**:
   - This automatically gets the user from the auth token
   - Save as: `user`

2. **Response**:
   ```json
   {
     "id": "{user.id}",
     "name": "{user.name}",
     "email": "{user.email}",
     "role": "{user.role}",
     "agent_type": "{user.agent_type}",
     "sales_agent_id": "{user.sales_agent_id}",
     "branch_id": "{user.branch_id}",
     "admin_lob": "{user.admin_lob}"
   }
   ```

### Step 4: Enable Authentication on ALL Data Endpoints

For **EVERY** endpoint that accesses data:

1. **Open the endpoint** (e.g., `/nic_cc_customer`, `/get_nic_cc_customers`, etc.)
2. **Click "Settings" or "Authentication" section**
3. **Enable "Auth Token"** ✅
4. **Save**

**Endpoints to secure** (at minimum):
- ✅ `/nic_cc_customer` (GET, POST, PATCH, DELETE)
- ✅ `/get_nic_cc_customers` (GET)
- ✅ `/nic_cc_agent` (GET, POST, PATCH, DELETE)
- ✅ `/nic_cc_branch` (GET, POST, PATCH, DELETE)
- ✅ `/nic_cc_payment` (GET, POST, PATCH, DELETE)
- ✅ `/qr_transactions` (GET, POST, PATCH, DELETE)
- ✅ ALL other data endpoints

**Leave PUBLIC** (no auth):
- `/auth/login` (users need to login)
- `/auth/signup` (if you have public signup)

### Step 5: Update Frontend Code

**File**: `src/services/authService.js`

**Replace the login function:**

```javascript
async login(credentials) {
  try {
    secureLogger.authLog('LOGIN_ATTEMPT', null, credentials.email)
    
    // Use Xano's auth endpoint
    const response = await agentApi.post('/auth/login', {
      email: credentials.email,
      password: credentials.password
    })
    
    const { authToken, user } = response.data
    
    if (!authToken || !user) {
      throw new Error('Invalid response from server')
    }
    
    secureLogger.authLog('LOGIN_SUCCESS', user.id, user.email)
    
    // Send OTP for additional security
    const otpResult = await otpService.sendOTP(user.email, user.name)
    
    if (!otpResult.success) {
      throw new Error('Failed to send verification code')
    }
    
    // Return OTP requirement
    return {
      requiresOTP: true,
      email: user.email,
      name: user.name,
      userData: user,
      token: authToken,  // This is now Xano's authToken
      message: 'Verification code sent to your email'
    }
  } catch (error) {
    secureLogger.error('Login failed:', error)
    
    if (error.response?.status === 401) {
      throw new Error('Invalid email or password')
    }
    
    throw new Error('Login failed. Please try again.')
  }
}
```

**Replace the validateToken function:**

```javascript
async validateToken(token) {
  try {
    // Use Xano's /me endpoint to validate token
    const response = await agentApi.get('/auth/me')
    const user = response.data
    
    if (!user) {
      throw new Error('User not found')
    }
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      agent_type: user.agent_type || 'call_center',
      sales_agent_id: user.sales_agent_id || null,
      branch_id: user.branch_id || null,
      admin_lob: user.admin_lob || null
    }
  } catch (error) {
    console.error('Token validation failed:', error)
    throw new Error('Invalid token')
  }
}
```

### Step 6: Update API Client

**File**: `src/services/apiClient.js`

The interceptor is already correct! It adds the Bearer token:

```javascript
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)
```

This will now send Xano's authToken instead of your custom token.

### Step 7: Test the Authentication

1. **Clear browser storage**:
   ```javascript
   localStorage.clear()
   ```

2. **Login again** with your credentials

3. **Check localStorage**:
   ```javascript
   console.log(localStorage.getItem('auth_token'))
   // Should show Xano's authToken (long random string)
   ```

4. **Test an API call**:
   ```javascript
   // In browser console after login
   fetch('https://xbde-ekcn-8kg2.n7e.xano.io/api:Q4jDYUWL/nic_cc_customer', {
     headers: {
       'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
     }
   })
   .then(r => r.json())
   .then(d => console.log('✅ Authenticated!', d))
   .catch(e => console.error('❌ Auth failed:', e))
   ```

---

## OPTION 2: Quick Fix with API Keys (NOT RECOMMENDED)

If you want to keep your custom token system temporarily:

### In Xano:

1. **For each endpoint**, instead of "Auth Token":
   - Use **"API Key"** authentication
   - Set a secret API key (e.g., `your-secret-key-12345`)

### In Frontend:

Add API key to headers:

```javascript
// In apiClient.js
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Add API key
    config.headers['X-API-Key'] = 'your-secret-key-12345'
    return config
  }
)
```

**Problems with this approach:**
- ❌ API key is visible in frontend code
- ❌ Anyone can extract it from your JavaScript
- ❌ Not secure for production
- ❌ No user-level access control

---

## Security Checklist

After implementing Option 1:

- [ ] All data endpoints require authentication
- [ ] Login endpoint is public (no auth required)
- [ ] Frontend uses Xano's authToken
- [ ] Token is stored in localStorage
- [ ] Token is sent in Authorization header
- [ ] 401 errors redirect to login
- [ ] Test with multiple users
- [ ] Test token expiration
- [ ] Verify unauthorized users can't access data

---

## Testing Commands

### Test 1: Login and Get Token
```javascript
// In browser console
fetch('https://xbde-ekcn-8kg2.n7e.xano.io/api:dNA8QCWg/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'your-email@example.com',
    password: 'your-password'
  })
})
.then(r => r.json())
.then(d => {
  console.log('✅ Login successful!')
  console.log('Token:', d.authToken)
  localStorage.setItem('auth_token', d.authToken)
})
```

### Test 2: Access Protected Endpoint
```javascript
// After login
fetch('https://xbde-ekcn-8kg2.n7e.xano.io/api:Q4jDYUWL/get_nic_cc_customers?sales_agent_id=24', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  }
})
.then(r => r.json())
.then(d => console.log('✅ Data:', d))
```

### Test 3: Verify Token
```javascript
fetch('https://xbde-ekcn-8kg2.n7e.xano.io/api:dNA8QCWg/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  }
})
.then(r => r.json())
.then(d => console.log('✅ User:', d))
```

---

## Common Issues & Solutions

### Issue: "Invalid token" after enabling auth

**Cause**: Using custom token instead of Xano's authToken

**Solution**: 
1. Clear localStorage
2. Login again to get Xano's authToken
3. Verify token format (should be long random string, not base64 JSON)

### Issue: "CORS error" on login

**Cause**: Xano CORS settings

**Solution**: In Xano → Settings → CORS:
- Add your domain (e.g., `https://your-app.netlify.app`)
- Or use `*` for development (not recommended for production)

### Issue: Token expires too quickly

**Solution**: In Xano login endpoint:
- Increase token expiration (e.g., 7 days, 30 days)
- Add refresh token logic

---

## Next Steps

1. ✅ **Implement Option 1** (Xano authentication)
2. ✅ **Update frontend code** (authService.js)
3. ✅ **Test thoroughly** with multiple users
4. ✅ **Enable auth on ALL endpoints**
5. ✅ **Deploy to production**
6. ✅ **Monitor for auth errors**

---

## Summary

**Current State**: 🔴 All APIs are PUBLIC - CRITICAL SECURITY RISK

**Target State**: ✅ All APIs require Xano authentication

**Estimated Time**: 2-3 hours for full implementation

**Priority**: IMMEDIATE - This is a data breach waiting to happen

---

**Need Help?** 

If you get stuck on any step, let me know which step and what error you're seeing.
