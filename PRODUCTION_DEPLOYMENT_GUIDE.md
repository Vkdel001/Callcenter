# Production Deployment Guide - Brevo API Security Fix

Complete step-by-step guide to deploy the secure email service to production.

---

## Part 1: Verify .gitignore (CRITICAL - Do First!)

### Step 1.1: Check .gitignore

Make sure these files are in `.gitignore`:

```bash
# Check current .gitignore
type .gitignore | findstr "\.env"
```

### Step 1.2: Update .gitignore if needed

The `.gitignore` should contain:
```
.env
.env.local
.env.development
.env.production
.env.email-service
*.env
```

If `.env.email-service` is missing, add it now.

---

## Part 2: Push Code to GitHub

### Step 2.1: Check Git Status

```powershell
git status
```

You should see:
- `backend-email-service.cjs` (modified)
- `src/services/emailService.js` (modified)
- `.env` (should NOT appear - it's in .gitignore)
- `.env.email-service` (should NOT appear - it's in .gitignore)

### Step 2.2: Stage Changes

```powershell
# Add modified files
git add backend-email-service.cjs
git add src/services/emailService.js
git add .env.example
git add .env.production.template
git add .env.email-service.example
git add install-email-service.sh
git add test-email-service.cjs

# Add any documentation files
git add *.md
```

### Step 2.3: Commit Changes

```powershell
git commit -m "security: Move Brevo API key to secure backend service

- Created backend-email-service.cjs for secure email handling
- Updated emailService.js to call backend instead of Brevo directly
- API key now only stored server-side in .env.email-service
- Added installation script for VPS deployment
- Tested locally - OTP login working successfully

BREAKING CHANGE: Requires backend email service to be deployed
"
```

### Step 2.4: Push to GitHub

```powershell
git push origin main
```

Or if you're on a different branch:
```powershell
git push origin your-branch-name
```

---

## Part 3: Pull Code on VPS

### Step 3.1: SSH into VPS

```bash
ssh root@your-vps-ip
# Or
ssh your-username@your-vps-ip
```

### Step 3.2: Navigate to Project Directory

```bash
cd /var/www/nic-callcenter
# Or wherever your project is located
```

### Step 3.3: Pull Latest Code

```bash
# Stash any local changes (if any)
git stash

# Pull latest code
git pull origin main

# Check what was pulled
git log -1
```

---

## Part 4: Create .env.email-service on VPS

### Step 4.1: Create the File

```bash
nano .env.email-service
```

### Step 4.2: Add Configuration

Paste this content (replace with your actual values):

```env
# NIC Email Service - Production Configuration
# NEVER commit this file to git!

# Brevo API Configuration
BREVO_API_KEY=xk--xxxxx

# Email Sender Configuration
SENDER_EMAIL=arrears@niclmauritius.site
SENDER_NAME=NIC Life Insurance Mauritius

# Reply-To Configuration
REPLY_TO_EMAIL=nicarlife@nicl.mu
REPLY_TO_NAME=NIC Life Insurance

# Service Configuration
PORT=3003

# Logging
LOG_FILE=/var/log/nic-email-service.log

# CORS - Allowed Origins (comma-separated)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

### Step 4.3: Verify File

```bash
cat .env.email-service | head -5
```

Should show the first 5 lines (without exposing full API key in logs).

---

## Part 5: Install Backend Email Service

### Step 5.1: Make Installation Script Executable

```bash
chmod +x install-email-service.sh
```

### Step 5.2: Run Installation

```bash
sudo ./install-email-service.sh
```

This will:
- Install Node.js dependencies
- Create systemd service
- Start the service
- Enable auto-start on boot

### Step 5.3: Verify Service is Running

```bash
# Check service status
sudo systemctl status nic-email-service

# Check if port 3003 is listening
sudo netstat -tlnp | grep 3003

# View logs
sudo journalctl -u nic-email-service -f
```

Press `Ctrl+C` to stop viewing logs.

---

## Part 6: Update Nginx Configuration

### Step 6.1: Open Nginx Config

```bash
sudo nano /etc/nginx/sites-available/nic-callcenter
```

### Step 6.2: Add Email Service Proxy

Add this location block inside your `server` block:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # ... existing configuration ...

    # Email Service Proxy (ADD THIS)
    location /api/email {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # ... rest of configuration ...
}
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

### Step 6.3: Test Nginx Configuration

```bash
sudo nginx -t
```

Should show:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 6.4: Reload Nginx

```bash
sudo systemctl reload nginx
```

### Step 6.5: Verify Nginx is Running

```bash
sudo systemctl status nginx
```

---

## Part 7: Update Production Environment

### Step 7.1: Create/Update .env.production on VPS

```bash
nano .env.production
```

Update the email service URL:

```env
# Email Service Configuration (Backend Service - NO API KEY!)
VITE_EMAIL_SERVICE_URL=https://yourdomain.com/api/email
VITE_SENDER_EMAIL=arrears@niclmauritius.site
VITE_SENDER_NAME=NIC Life Insurance Mauritius
VITE_REPLY_TO_EMAIL=nicarlife@nicl.mu
VITE_REPLY_TO_NAME=NIC Life Insurance

# ... rest of your production config ...
```

Save and exit.

---

## Part 8: Build and Deploy Frontend

### Step 8.1: Install Dependencies (if needed)

```bash
npm install
```

### Step 8.2: Build Production Frontend

```bash
npm run build
```

This creates the `dist/` folder with optimized production files.

### Step 8.3: Verify Build

```bash
# Check dist folder was created
ls -la dist/

# Verify API key is NOT in build
grep -r "xkeysib-" dist/ || echo "✓ No API keys found in build"
```

Should show: `✓ No API keys found in build`

### Step 8.4: Deploy Frontend

If using nginx to serve static files:

```bash
# Backup current deployment
sudo cp -r /var/www/nic-callcenter/dist /var/www/nic-callcenter/dist.backup.$(date +%Y%m%d_%H%M%S)

# Deploy new build
sudo rm -rf /var/www/nic-callcenter/dist
sudo cp -r dist /var/www/nic-callcenter/

# Set permissions
sudo chown -R www-data:www-data /var/www/nic-callcenter/dist
sudo chmod -R 755 /var/www/nic-callcenter/dist
```

---

## Part 9: Test Production Deployment

### Step 9.1: Test Email Service Endpoint

```bash
curl https://yourdomain.com/api/email/health
```

Should return:
```json
{"status":"healthy","service":"nic-email-service","timestamp":"..."}
```

### Step 9.2: Test from Browser

1. Open: `https://yourdomain.com`
2. Go to Login page
3. Click "Forgot Password"
4. Enter your email
5. Check email for OTP
6. Verify OTP works

### Step 9.3: Check Backend Logs

```bash
# View email service logs
sudo journalctl -u nic-email-service -n 50

# View nginx access logs
sudo tail -f /var/log/nginx/access.log

# View nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Part 10: Security Cleanup

### Step 10.1: Delete Old Exposed API Keys from Brevo

1. Go to: https://app.brevo.com/settings/keys/api
2. Find and DELETE these old keys:
   - Any key starting with `xkeysib-cec8326f9c37...`
   - Any key starting with `xkeysib-888ec6203d2c...` (if it's the old one)
3. Keep only your NEW working key

### Step 10.2: Verify No API Keys in Git History

```bash
# On your local machine
git log --all --full-history --source --pretty=format:"%h %s" -- .env.email-service
```

Should show nothing (file was never committed).

### Step 10.3: Remove System Environment Variable (if exists)

On your local Windows machine:

```powershell
# Check if it exists
$env:BREVO_API_KEY

# If it shows a value, remove it:
# 1. Press Win+X → System
# 2. Advanced system settings → Environment Variables
# 3. Delete BREVO_API_KEY from User or System variables
# 4. Restart PowerShell
```

---

## Part 11: Monitoring and Maintenance

### Check Service Status

```bash
# Email service status
sudo systemctl status nic-email-service

# View recent logs
sudo journalctl -u nic-email-service -n 100

# Follow logs in real-time
sudo journalctl -u nic-email-service -f
```

### Restart Service (if needed)

```bash
sudo systemctl restart nic-email-service
```

### Update Service (after code changes)

```bash
cd /var/www/nic-callcenter
git pull origin main
sudo systemctl restart nic-email-service
```

---

## Troubleshooting

### Issue: Service won't start

```bash
# Check logs
sudo journalctl -u nic-email-service -n 50

# Check if .env.email-service exists
ls -la .env.email-service

# Check if port 3003 is available
sudo netstat -tlnp | grep 3003
```

### Issue: Nginx 502 Bad Gateway

```bash
# Check if email service is running
sudo systemctl status nic-email-service

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart both services
sudo systemctl restart nic-email-service
sudo systemctl reload nginx
```

### Issue: CORS errors in browser

Update `.env.email-service` on VPS:
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,http://yourdomain.com
```

Then restart:
```bash
sudo systemctl restart nic-email-service
```

### Issue: Emails not sending

```bash
# Check service logs
sudo journalctl -u nic-email-service -f

# Test API key directly
curl -X GET "https://api.brevo.com/v3/account" \
  -H "api-key: YOUR_API_KEY"
```

---

## Quick Reference Commands

```bash
# Service Management
sudo systemctl status nic-email-service
sudo systemctl restart nic-email-service
sudo systemctl stop nic-email-service
sudo systemctl start nic-email-service

# Logs
sudo journalctl -u nic-email-service -f
sudo journalctl -u nic-email-service -n 100

# Nginx
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl restart nginx

# Test Endpoints
curl https://yourdomain.com/api/email/health
curl -X POST https://yourdomain.com/api/email/send \
  -H "Content-Type: application/json" \
  -d '{"to":[{"email":"test@example.com"}],"subject":"Test","htmlContent":"<p>Test</p>"}'
```

---

## Deployment Checklist

- [ ] Verified `.env.email-service` is in `.gitignore`
- [ ] Committed and pushed code to GitHub
- [ ] Pulled latest code on VPS
- [ ] Created `.env.email-service` on VPS with new API key
- [ ] Installed backend email service
- [ ] Verified service is running on port 3003
- [ ] Updated nginx configuration
- [ ] Tested nginx configuration
- [ ] Reloaded nginx
- [ ] Updated `.env.production` with email service URL
- [ ] Built production frontend
- [ ] Verified no API keys in build
- [ ] Deployed frontend to VPS
- [ ] Tested email service health endpoint
- [ ] Tested OTP login in production
- [ ] Deleted old exposed API keys from Brevo
- [ ] Removed system environment variable (if exists)
- [ ] Verified logs show no errors

---

## Success Criteria

✅ Backend service running on VPS  
✅ Nginx proxying `/api/email` to port 3003  
✅ Health endpoint returns "healthy"  
✅ OTP emails sending successfully  
✅ OTP login working in production  
✅ No API keys in frontend build  
✅ Old API keys deleted from Brevo  
✅ Service auto-starts on reboot  

---

**Deployment Complete!** Your Brevo API key is now secure and the email service is running in production.
