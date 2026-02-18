# Backend Service Account Authentication Guide

## Overview

This guide explains how to implement service account authentication for the backend reminder service to securely access private Xano endpoints.

**Current Issue**: Backend service cannot fetch customers/agents because endpoints are private and require authentication.

**Solution**: Create a dedicated service account, obtain an auth token, and use it in API requests.

---

## Why Service Account Authentication?

### Security Benefits
- ✅ Password stored only in VPS environment (never in code)
- ✅ Auth token can be rotated/revoked anytime
- ✅ Audit trail of all API access in Xano
- ✅ Industry standard JWT bearer token authentication
- ✅ No credentials exposed in GitHub

### Complexity
- **Very Simple** - Only ~7 minutes total
- Minimal code changes (3 lines)
- No complex infrastructure needed

---

## Implementation Steps

### Step 1: Create Service Account in Xano (2 minutes)

1. Login to your Xano workspace
2. Navigate to the `nic_cc_agent` table
3. Add a new record with these details:
   ```
   Email: reminder-service@niclmauritius.site
   Password: [Generate a strong random password - see below]
   First Name: Reminder
   Last Name: Service
   Role: internal_agent
   Status: active
   ```

**Password Generation**:
Use a password generator or run this command:
```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows PowerShell
[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Important**: Save this password securely - you'll need it in Step 2.

---

### Step 2: Get Authentication Token (1 minute)

Use the helper script `get-service-account-token.cjs` to obtain the auth token.

**2.1 Edit the script**:
Open `get-service-account-token.cjs` and update line 13:
```javascript
SERVICE_PASSWORD: 'YOUR_STRONG_PASSWORD_HERE'  // Replace with password from Step 1
```

**2.2 Run the script**:
```bash
node get-service-account-token.cjs
```

**2.3 Copy the auth token**:
The script will output something like:
```
✅ SUCCESS! Auth token obtained:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTH TOKEN: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Copy the entire token string.

---

### Step 3: Add Token to VPS Environment (1 minute)

SSH into your VPS and add the auth token as an environment variable.

**Option A: Add to systemd service file (Recommended)**

```bash
# Edit the service file
sudo nano /etc/systemd/system/nic-reminder.service

# Add this line in the [Service] section:
Environment="XANO_AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Reload systemd
sudo systemctl daemon-reload
```

**Option B: Add to /etc/environment (Alternative)**

```bash
# Edit environment file
sudo nano /etc/environment

# Add this line:
XANO_AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Reload environment
source /etc/environment
```

---

### Step 4: Update Backend Service Code (2 minutes)

Update `backend-reminder-service.cjs` to use the auth token.

**4.1 Add auth token to CONFIG** (around line 20):
```javascript
const CONFIG = {
  // Xano API Configuration
  XANO_BASE_URL: process.env.VITE_XANO_BASE_URL || 'https://xbde-ekcn-8kg2.n7e.xano.io',
  XANO_CUSTOMER_API: process.env.VITE_XANO_CUSTOMER_API || 'Q4jDYUWL',
  XANO_PAYMENT_API: process.env.VITE_XANO_PAYMENT_API || '05i62DIx',
  XANO_AUTH_TOKEN: process.env.XANO_AUTH_TOKEN || '',  // ADD THIS LINE
  
  // ... rest of config
};
```

**4.2 Update makeRequest method** (around line 75):
Find the `makeRequest` method in the `XanoAPI` class and update the headers:

```javascript
const options = {
  hostname: urlObj.hostname,
  port: urlObj.port || 443,
  path: urlObj.pathname + urlObj.search,
  method: method,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'NIC-Reminder-Service/1.0'
  }
};

// ADD THIS BLOCK - Add auth token if available
if (CONFIG.XANO_AUTH_TOKEN) {
  options.headers['Authorization'] = `Bearer ${CONFIG.XANO_AUTH_TOKEN}`;
}
```

That's it! Only 3 lines of code added.

---

### Step 5: Deploy and Test (1 minute)

**5.1 Copy updated file to VPS**:
```bash
scp backend-reminder-service.cjs root@your-vps-ip:/var/www/nic-callcenter/
```

**5.2 Restart the service**:
```bash
sudo systemctl restart nic-reminder.service
```

**5.3 Check logs**:
```bash
sudo tail -f /var/log/nic-reminder-service.log
```

Look for:
```
Data fetched successfully | Data: {"customersCount":XX,"installmentsCount":XX,"paymentPlansCount":XX,"agentsCount":XX}
```

All counts should now be > 0 (not 0 anymore).

---

### Step 6: Make Endpoints Private in Xano (30 seconds)

Now that authentication is working, secure the endpoints:

1. Go to Xano workspace
2. Navigate to API endpoints
3. Find these endpoints:
   - `nic_cc_customer` (GET all)
   - `nic_cc_agent` (GET all)
4. Change from "Public" to "Private" (requires authentication)
5. Save changes

---

## Verification

### Test Authentication is Working

Run this command on VPS:
```bash
# Check service logs for successful data fetch
sudo journalctl -u nic-reminder.service -n 50 | grep "Data fetched"
```

Expected output:
```
Data fetched successfully | Data: {"customersCount":92,"installmentsCount":334,"paymentPlansCount":92,"agentsCount":15}
```

### Test Reminder Sending

Wait for the next reminder cycle (every 30 minutes) or check logs:
```bash
sudo tail -f /var/log/nic-reminder-service.log | grep "reminder"
```

Expected output:
```
Found X installments needing reminders
Payment reminder sent | customerId: XX, email: xxx@example.com
```

---

## Security Best Practices

### Token Rotation

Rotate the auth token every 90 days:

1. Login to Xano with service account
2. Get new token using `get-service-account-token.cjs`
3. Update VPS environment variable
4. Restart service

### Token Storage

- ✅ Store in environment variables only
- ✅ Never commit to Git
- ✅ Never log the full token
- ✅ Use systemd service file or /etc/environment

### Monitoring

Check service logs regularly:
```bash
# Check for authentication errors
sudo journalctl -u nic-reminder.service | grep -i "auth\|401\|403"

# Check service status
sudo systemctl status nic-reminder.service
```

---

## Troubleshooting

### Issue: "customersCount: 0" still appearing

**Cause**: Auth token not loaded or invalid

**Solution**:
```bash
# Check if token is set
sudo systemctl show nic-reminder.service | grep XANO_AUTH_TOKEN

# If empty, add to service file and reload
sudo nano /etc/systemd/system/nic-reminder.service
sudo systemctl daemon-reload
sudo systemctl restart nic-reminder.service
```

### Issue: "401 Unauthorized" errors

**Cause**: Token expired or invalid

**Solution**:
1. Get new token using `get-service-account-token.cjs`
2. Update VPS environment variable
3. Restart service

### Issue: Service account login fails

**Cause**: Account doesn't exist or wrong credentials

**Solution**:
1. Verify service account exists in Xano `nic_cc_agent` table
2. Check email is exactly: `reminder-service@niclmauritius.site`
3. Verify password is correct
4. Check account status is "active"

---

## Rollback Plan

If authentication causes issues, you can quickly rollback:

1. **Make endpoints public again in Xano** (30 seconds)
   - This immediately restores service functionality
   
2. **Remove auth code** (optional, if needed)
   - Revert `backend-reminder-service.cjs` to previous version
   - Restart service

---

## Summary

**Total Time**: ~7 minutes
**Code Changes**: 3 lines
**Security Improvement**: High
**Complexity**: Low

This implementation provides proper authentication without significant complexity, following industry best practices for service-to-service authentication.

---

## Files Modified

- `backend-reminder-service.cjs` - Added auth token support (3 lines)
- `/etc/systemd/system/nic-reminder.service` - Added environment variable (1 line)

## Files Created

- `get-service-account-token.cjs` - Helper script to obtain auth token

## Xano Changes

- Created service account in `nic_cc_agent` table
- Changed `nic_cc_customer` and `nic_cc_agent` endpoints to private
