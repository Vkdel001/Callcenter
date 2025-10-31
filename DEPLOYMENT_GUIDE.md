# NIC Call Center - Complete Deployment Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Initial Server Setup](#initial-server-setup)
4. [Application Deployment](#application-deployment)
5. [Backend Reminder Service](#backend-reminder-service)
6. [SSL Certificate Setup](#ssl-certificate-setup)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Security Considerations](#security-considerations)
10. [Backup & Recovery](#backup--recovery)

---

## System Overview

The NIC Call Center system consists of:
- **Frontend**: React.js application served by Nginx
- **Backend Service**: Node.js reminder service running as systemd service
- **Database**: Xano cloud database
- **Email Service**: Brevo API for email delivery
- **SSL**: Let's Encrypt certificates with auto-renewal

### Architecture
```
Internet → Nginx (SSL) → React App (Frontend)
                      ↓
                   Xano API (Database)
                      ↓
              Node.js Service (Reminders)
                      ↓
                 Brevo API (Email)
```

---

## Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04 LTS or newer
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB SSD
- **Network**: Public IP address
- **Domain**: Optional but recommended

### Required Software
- Node.js 18.x LTS
- Nginx
- Git
- Certbot (for SSL)
- UFW (firewall)

### External Services
- **Xano Account**: For database and API
- **Brevo Account**: For email delivery
- **Domain Provider**: For DNS management (optional)

---

## Initial Server Setup

### 1. Update System
```bash
# Connect to your server
ssh root@your-server-ip

# Update package lists and upgrade system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git ufw htop
```

### 2. Install Node.js
```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

### 3. Install Nginx
```bash
# Install Nginx
sudo apt install nginx -y

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify Nginx is running
sudo systemctl status nginx
```

### 4. Configure Firewall
```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw --force enable

# Check firewall status
sudo ufw status
```

### 5. Create Application Directory
```bash
# Create web directory
sudo mkdir -p /var/www

# Set proper ownership
sudo chown -R $USER:$USER /var/www
```

---

## Application Deployment

### 1. Clone Repository
```bash
# Navigate to web directory
cd /var/www

# Clone the repository
git clone https://github.com/Vkdel001/Callcenter.git nic-callcenter

# Navigate to project directory
cd nic-callcenter

# Add safe directory for Git (if needed)
git config --global --add safe.directory /var/www/nic-callcenter
```

### 2. Configure Environment Variables
```bash
# Copy production environment template
cp .env.production.template .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**
```bash
# Application Environment
NODE_ENV=production
VITE_APP_ENV=production

# Brevo Email Service
VITE_BREVO_API_KEY=your-brevo-api-key-here
VITE_SENDER_EMAIL=your-sender@domain.com
VITE_SENDER_NAME="Your Company Name"
VITE_REPLY_TO_EMAIL=reply@domain.com
VITE_REPLY_TO_NAME="Your Company"

# Xano Configuration
VITE_XANO_BASE_URL=https://your-xano-instance.xano.io
VITE_XANO_AGENT_API=your-agent-api-key
VITE_XANO_CUSTOMER_API=your-customer-api-key
VITE_XANO_ASSIGNMENT_API=your-assignment-api-key
VITE_XANO_CALLLOG_API=your-calllog-api-key
VITE_XANO_BRANCH_API=your-branch-api-key
VITE_XANO_PAYMENT_API=your-payment-api-key

# ZwennPay Configuration
VITE_ZWENNPAY_MERCHANT_ID=your-merchant-id
VITE_QR_TEST_MODE=false

# Application URLs (update after domain setup)
VITE_APP_URL=https://your-domain.com

# Reminder Service
VITE_AUTO_START_SCHEDULER=true
```

### 3. Install Dependencies and Build
```bash
# Install Node.js dependencies
npm install

# Build the application
npm run build

# Verify build was successful
ls -la dist/
```

### 4. Configure Nginx
```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment script (handles Nginx configuration)
sudo ./deploy.sh deploy
```

**Manual Nginx Configuration (if needed):**
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/nic-callcenter
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    root /var/www/nic-callcenter/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

```bash
# Enable the site
sudo ln -sf /etc/nginx/sites-available/nic-callcenter /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Backend Reminder Service

### 1. Install Reminder Service
```bash
# Make installation script executable
chmod +x install-reminder-service.sh
chmod +x reminder-service-manager.sh
chmod +x backend-reminder-service.cjs

# Install the service
sudo ./install-reminder-service.sh
```

### 2. Verify Service Installation
```bash
# Check service status
sudo systemctl status nic-reminder

# View service logs
tail -f /var/log/nic-reminder-service.log

# Use management script
./reminder-service-manager.sh status
```

### 3. Service Management Commands
```bash
# Start service
sudo systemctl start nic-reminder
./reminder-service-manager.sh start

# Stop service
sudo systemctl stop nic-reminder
./reminder-service-manager.sh stop

# Restart service
sudo systemctl restart nic-reminder
./reminder-service-manager.sh restart

# View logs
./reminder-service-manager.sh logs
./reminder-service-manager.sh follow

# Check status
./reminder-service-manager.sh status
```

### 4. Service Configuration
The reminder service configuration is in `backend-reminder-service.cjs`:

```javascript
const CONFIG = {
  CHECK_INTERVAL: 30 * 60 * 1000, // 30 minutes
  BUSINESS_HOURS_START: 9,         // 9 AM
  BUSINESS_HOURS_END: 17,          // 5 PM
  LOG_FILE: '/var/log/nic-reminder-service.log'
};
```

---

## SSL Certificate Setup

### 1. DNS Configuration
Before setting up SSL, ensure your domain points to your server:
- Add A record: `your-domain.com` → `your-server-ip`
- Add A record: `www.your-domain.com` → `your-server-ip`

### 2. Install Certbot
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y
```

### 3. Obtain SSL Certificate
```bash
# Get certificate for your domain
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose redirect option (recommended: redirect HTTP to HTTPS)
```

### 4. Verify SSL Setup
```bash
# Test certificate renewal
sudo certbot renew --dry-run

# Check certificate status
sudo certbot certificates

# Verify auto-renewal is configured
sudo systemctl status certbot.timer
```

### 5. Update Environment Variables
```bash
# Update .env with HTTPS URL
nano .env

# Change VITE_APP_URL to use HTTPS
VITE_APP_URL=https://your-domain.com

# Rebuild application
npm run build
```

---

## Code Changes & Deployment Process

### Overview
This section covers the complete workflow for making code changes, testing, and deploying updates to the production VPS server.

### Current Hosting Architecture
```
Local Development → GitHub Repository → VPS Production Server
                                    ↓
                              Nginx serves static files from:
                              /var/www/nic-callcenter/dist/
```

### 1. Development Workflow

#### **Local Development**
```bash
# Start development server
npm run dev

# Test changes locally
# - Verify functionality works
# - Test on different screen sizes
# - Check browser console for errors

# Run linting (optional)
npm run lint
```

#### **Pre-Deployment Checklist**
- ✅ All features working locally
- ✅ No console errors
- ✅ Responsive design tested
- ✅ New functionality tested with different user types
- ✅ Environment variables updated (if needed)

### 2. Git Workflow & Version Control

#### **Commit Changes**
```bash
# Check what files changed
git status

# Add specific files (recommended)
git add src/pages/auth/Login.jsx
git add src/services/customerService.js
git add src/components/sales/LOBDashboard.jsx

# Or add all changes
git add .

# Commit with descriptive message
git commit -m "Add CSR functionality, fix QR button loading states, update login title"

# Push to GitHub
git push origin main
```

#### **Commit Message Best Practices**
```bash
# Good commit messages:
git commit -m "Add CSR universal access to LOB dashboard"
git commit -m "Fix QR generation button loading state per customer"
git commit -m "Update login page title to reflect portal purpose"
git commit -m "Document current reminder service setup in deployment guide"

# Avoid vague messages:
git commit -m "fixes"
git commit -m "updates"
git commit -m "changes"
```

### 3. VPS Server Update Process

#### **Step 1: Connect to VPS**
```bash
# SSH to your VPS server
ssh root@your-vps-ip

# Navigate to project directory
cd /var/www/nic-callcenter
```

#### **Step 2: Pull Latest Changes**
```bash
# Check current status
git status
git log --oneline -5

# Pull latest changes from GitHub
git pull origin main

# Verify changes were pulled
git log --oneline -3
```

#### **Step 3: Update Dependencies (If Needed)**
```bash
# Only if package.json changed
npm install

# Check for any dependency issues
npm audit
```

#### **Step 4: Build Application**
```bash
# Build the React application
npm run build

# Verify build completed successfully
ls -la dist/

# Check build size (should be reasonable)
du -sh dist/
```

#### **Step 5: Restart Services**
```bash
# Reload Nginx to serve new files (no downtime)
sudo systemctl reload nginx

# Verify Nginx is running
sudo systemctl status nginx
```

### 4. Backend Service Management

#### **When to Restart Backend Services**
- ✅ **Frontend Changes Only**: No restart needed
- ✅ **Backend Changes**: Restart reminder service

#### **Frontend-Only Changes (No Restart Needed)**
- React component updates
- CSS/styling changes
- Frontend service modifications
- UI text changes
- New pages or routes

#### **Backend Changes (Restart Required)**
- `backend-reminder-service.cjs` modifications
- Environment variable changes
- New npm packages affecting backend

#### **Restart Backend Service (If Needed)**
```bash
# Check current backend process
ps -ef | grep "reminder"

# Stop current process
sudo pkill -f 'reminder-service'

# Start new process
cd /var/www/nic-callcenter
sudo -u www-data nohup node backend-reminder-service.cjs > /dev/null 2>&1 &

# Verify new process started
ps -ef | grep "reminder" | grep -v grep

# Check logs for successful startup
tail -f /var/log/nic-reminder-service.log
```

### 5. Deployment Verification

#### **Test Website Functionality**
```bash
# Check website is accessible
curl -I https://your-domain.com

# Expected response: HTTP/2 200
```

#### **Browser Testing**
1. **Open website in browser**
2. **Test login functionality**
3. **Verify new features work**
4. **Check browser console for errors**
5. **Test on mobile/tablet (responsive design)**

#### **Check Logs for Issues**
```bash
# Check Nginx error logs
sudo tail -20 /var/log/nginx/error.log

# Check Nginx access logs
sudo tail -20 /var/log/nginx/access.log

# Check reminder service logs (if backend changes)
tail -20 /var/log/nic-reminder-service.log
```

### 6. Rollback Procedures

#### **If Deployment Fails**
```bash
# Option 1: Rollback to previous commit
git log --oneline -10  # Find previous working commit
git reset --hard <previous-commit-hash>
npm run build
sudo systemctl reload nginx

# Option 2: Restore from backup (if available)
cd /var/www
sudo tar -xzf /var/backups/nic-callcenter/app-backup-YYYYMMDD-HHMMSS.tar.gz
sudo systemctl reload nginx
```

#### **Emergency Rollback**
```bash
# Quick rollback to last known working state
cd /var/www/nic-callcenter
git reset --hard HEAD~1  # Go back 1 commit
npm run build
sudo systemctl reload nginx
```

### 7. Common Deployment Scenarios

#### **Scenario 1: Frontend UI Changes**
```bash
# Example: Login page title change, button fixes, new components
git pull origin main
npm run build
sudo systemctl reload nginx
# ✅ No backend restart needed
```

#### **Scenario 2: New Features (Frontend + Backend)**
```bash
# Example: New user types, API changes, service modifications
git pull origin main
npm install  # If new dependencies
npm run build
sudo systemctl reload nginx

# Restart backend if backend files changed
sudo pkill -f 'reminder-service'
sudo -u www-data nohup node backend-reminder-service.cjs > /dev/null 2>&1 &
```

#### **Scenario 3: Environment Configuration Changes**
```bash
# Example: New API keys, service URLs
git pull origin main
# Update .env file with new variables
nano /var/www/nic-callcenter/.env
npm run build
sudo systemctl reload nginx

# Restart backend to pick up new environment variables
sudo pkill -f 'reminder-service'
sudo -u www-data nohup node backend-reminder-service.cjs > /dev/null 2>&1 &
```

### 8. Deployment Troubleshooting

#### **Build Fails**
```bash
# Check for syntax errors
npm run lint

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### **Website Not Loading**
```bash
# Check Nginx configuration
sudo nginx -t

# Check if files exist
ls -la /var/www/nic-callcenter/dist/

# Check Nginx logs
sudo tail -50 /var/log/nginx/error.log
```

#### **Backend Service Issues**
```bash
# Check if process is running
ps -ef | grep "reminder"

# Check logs for errors
tail -50 /var/log/nic-reminder-service.log

# Test manual startup
cd /var/www/nic-callcenter
node backend-reminder-service.cjs  # Run in foreground to see errors
```

### 9. Best Practices

#### **Development**
- ✅ Test thoroughly locally before deploying
- ✅ Use descriptive commit messages
- ✅ Make small, focused commits
- ✅ Test with different user types (admin, agent, sales, CSR)

#### **Deployment**
- ✅ Deploy during low-traffic periods
- ✅ Always verify deployment success
- ✅ Keep backups of working versions
- ✅ Monitor logs after deployment

#### **Maintenance**
- ✅ Regular dependency updates
- ✅ Monitor server resources
- ✅ Keep deployment documentation updated
- ✅ Test rollback procedures periodically

---

## Monitoring & Maintenance

### 1. System Monitoring
```bash
# Check system resources
htop
df -h
free -h

# Check service status
sudo systemctl status nginx
sudo systemctl status nic-reminder

# Check logs
sudo journalctl -u nginx -f
sudo journalctl -u nic-reminder -f
tail -f /var/log/nic-reminder-service.log
```

### 2. Application Updates
```bash
# Pull latest code
cd /var/www/nic-callcenter
git pull origin main

# Update dependencies (if package.json changed)
npm install

# Rebuild application
npm run build

# Restart services if needed
sudo systemctl reload nginx
sudo systemctl restart nic-reminder
```

### 3. Log Management
```bash
# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# View reminder service logs
tail -f /var/log/nic-reminder-service.log

# Rotate logs (if they get too large)
sudo logrotate -f /etc/logrotate.conf
```

### 4. Performance Monitoring
```bash
# Check Nginx status
curl -I https://your-domain.com

# Check reminder service performance
./reminder-service-manager.sh status

# Monitor system resources
watch -n 5 'free -h && df -h'
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Application Not Loading

**Symptoms:**
- Browser shows "This site can't be reached"
- Nginx 502/503 errors

**Diagnosis:**
```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx configuration
sudo nginx -t

# Check if files exist
ls -la /var/www/nic-callcenter/dist/

# Check Nginx logs
sudo tail -20 /var/log/nginx/error.log
```

**Solutions:**
```bash
# Restart Nginx
sudo systemctl restart nginx

# Rebuild application
cd /var/www/nic-callcenter
npm run build

# Check file permissions
sudo chown -R www-data:www-data /var/www/nic-callcenter
sudo chmod -R 755 /var/www/nic-callcenter
```

#### 2. SSL Certificate Issues

**Symptoms:**
- Browser shows "Not Secure"
- SSL certificate errors

**Diagnosis:**
```bash
# Check certificate status
sudo certbot certificates

# Test SSL configuration
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check Nginx SSL configuration
sudo nginx -t
```

**Solutions:**
```bash
# Renew certificate
sudo certbot renew

# Restart Nginx
sudo systemctl restart nginx

# Re-obtain certificate if expired
sudo certbot --nginx -d your-domain.com
```

#### 3. Reminder Service Not Working

**Symptoms:**
- Service shows as "failed" or "inactive"
- No reminder emails being sent
- Service keeps restarting

**Diagnosis:**
```bash
# Check service status
sudo systemctl status nic-reminder

# Check service logs
sudo journalctl -u nic-reminder -n 50

# Check application logs
tail -50 /var/log/nic-reminder-service.log

# Test environment variables
./reminder-service-manager.sh logs
```

**Common Solutions:**

**A. Service Won't Start:**
```bash
# Check Node.js version
node --version  # Should be 18.x

# Check file permissions
chmod +x /var/www/nic-callcenter/backend-reminder-service.cjs

# Check environment file
ls -la /var/www/nic-callcenter/.env

# Restart service
sudo systemctl restart nic-reminder
```

**B. API Connection Issues:**
```bash
# Test Xano API manually
curl -I "https://your-xano-instance.xano.io/api:your-api-key/nic_cc_customer"

# Check environment variables
grep VITE_XANO /var/www/nic-callcenter/.env

# Verify API keys in Xano dashboard
```

**C. Email Sending Issues:**
```bash
# Check Brevo API key
grep VITE_BREVO_API_KEY /var/www/nic-callcenter/.env

# Test email configuration
curl -X POST "https://api.brevo.com/v3/smtp/email" \
  -H "api-key: your-brevo-api-key" \
  -H "Content-Type: application/json"

# Check service logs for email errors
grep -i "email" /var/log/nic-reminder-service.log
```

**D. Business Hours Issues:**
```bash
# Check current time and timezone
date
timedatectl

# Set correct timezone if needed
sudo timedatectl set-timezone Indian/Mauritius

# Check business hours logic in logs
grep -i "business" /var/log/nic-reminder-service.log
```

#### 4. Database Connection Issues

**Symptoms:**
- API calls failing
- "Failed to fetch customers" in logs

**Diagnosis:**
```bash
# Test API endpoints manually
curl -I "https://your-xano-instance.xano.io/api:your-api-key/nic_cc_customer"

# Check network connectivity
ping your-xano-instance.xano.io

# Check DNS resolution
nslookup your-xano-instance.xano.io
```

**Solutions:**
```bash
# Verify API keys in .env file
grep XANO /var/www/nic-callcenter/.env

# Test with different API endpoint
# Check Xano dashboard for correct endpoints

# Restart service after fixing configuration
sudo systemctl restart nic-reminder
```

#### 5. Performance Issues

**Symptoms:**
- Slow page loading
- High server resource usage
- Service timeouts

**Diagnosis:**
```bash
# Check system resources
htop
df -h
free -h

# Check Nginx performance
sudo tail -f /var/log/nginx/access.log

# Check service memory usage
ps aux | grep node
```

**Solutions:**
```bash
# Optimize Nginx configuration
# Enable gzip compression (already configured)

# Monitor service memory
# Service has 512MB limit configured

# Restart services if needed
sudo systemctl restart nginx
sudo systemctl restart nic-reminder

# Check for memory leaks
./reminder-service-manager.sh logs | grep -i memory
```

### Emergency Procedures

#### 1. Service Recovery
```bash
# Stop all services
sudo systemctl stop nic-reminder
sudo systemctl stop nginx

# Check system resources
df -h
free -h

# Start services one by one
sudo systemctl start nginx
sudo systemctl start nic-reminder

# Verify everything is working
curl -I https://your-domain.com
./reminder-service-manager.sh status
```

#### 2. Rollback Deployment
```bash
# Go to previous Git commit
cd /var/www/nic-callcenter
git log --oneline -10  # Find previous working commit
git checkout previous-commit-hash

# Rebuild application
npm install
npm run build

# Restart services
sudo systemctl restart nic-reminder
sudo systemctl reload nginx
```

#### 3. Database Recovery
```bash
# If Xano API is down, check status
curl -I https://your-xano-instance.xano.io

# Check Xano dashboard for service status
# Contact Xano support if needed

# Temporarily disable reminder service if needed
sudo systemctl stop nic-reminder
```

---

## Security Considerations

### 1. Server Security
```bash
# Keep system updated
sudo apt update && sudo apt upgrade -y

# Configure automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades

# Monitor failed login attempts
sudo tail -f /var/log/auth.log
```

### 2. Application Security
- **Environment Variables**: Never commit `.env` files to Git
- **API Keys**: Rotate API keys regularly
- **SSL Certificates**: Monitor expiration dates
- **Access Control**: Use strong passwords and SSH keys

### 3. Firewall Configuration
```bash
# Review firewall rules
sudo ufw status verbose

# Only allow necessary ports
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Block unnecessary services
sudo ufw deny 3000  # Block development ports
```

### 4. Monitoring Security
```bash
# Check for suspicious activity
sudo tail -f /var/log/nginx/access.log | grep -E "(404|403|500)"

# Monitor service logs for errors
grep -i "error\|fail" /var/log/nic-reminder-service.log

# Check system logs
sudo journalctl -f | grep -i "error\|fail\|security"
```

---

## Backup & Recovery

### 1. Application Backup
```bash
# Create backup script
sudo nano /usr/local/bin/backup-nic-app.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/nic-callcenter"
APP_DIR="/var/www/nic-callcenter"
DATE=$(date +%Y%m%d-%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup application files
tar -czf "$BACKUP_DIR/app-backup-$DATE.tar.gz" -C "$APP_DIR" .

# Backup Nginx configuration
cp /etc/nginx/sites-available/nic-callcenter "$BACKUP_DIR/nginx-config-$DATE"

# Backup environment file
cp "$APP_DIR/.env" "$BACKUP_DIR/env-backup-$DATE"

# Keep only last 7 backups
find "$BACKUP_DIR" -name "app-backup-*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/app-backup-$DATE.tar.gz"
```

```bash
# Make script executable
sudo chmod +x /usr/local/bin/backup-nic-app.sh

# Set up daily backup cron job
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-nic-app.sh
```

### 2. Database Backup
```bash
# Xano provides automatic backups
# Export data from Xano dashboard regularly
# Store exports in secure location
```

### 3. SSL Certificate Backup
```bash
# Backup Let's Encrypt certificates
sudo cp -r /etc/letsencrypt /var/backups/letsencrypt-$(date +%Y%m%d)
```

### 4. Recovery Procedures
```bash
# Restore application from backup
cd /var/www
sudo tar -xzf /var/backups/nic-callcenter/app-backup-YYYYMMDD-HHMMSS.tar.gz

# Restore Nginx configuration
sudo cp /var/backups/nic-callcenter/nginx-config-YYYYMMDD-HHMMSS /etc/nginx/sites-available/nic-callcenter

# Restore environment file
sudo cp /var/backups/nic-callcenter/env-backup-YYYYMMDD-HHMMSS /var/www/nic-callcenter/.env

# Restart services
sudo systemctl restart nginx
sudo systemctl restart nic-reminder
```

---

## Backend Reminder Service & SMS Monitoring

### Overview
The NIC Call Center system includes an automated reminder service that sends payment and signature reminders via email and SMS using the Brevo API. This section documents the **current production setup** and covers monitoring, troubleshooting, and verifying the service functionality.

### Current Production Setup

#### **Reminder Service Configuration**
- **Service Type**: Manual Node.js process (not systemd service)
- **Process Owner**: www-data user
- **Service File**: `/var/www/nic-callcenter/backend-reminder-service.cjs`
- **Log Location**: `/var/log/nic-reminder-service.log`
- **Execution Frequency**: Every 30 minutes
- **Started**: October 28, 2025 (running continuously)

#### **SMS Service Configuration**
- **Provider**: Brevo (SendinBlue) SMS API
- **API Endpoint**: `https://api.brevo.com/v3/transactionalSMS/sms`
- **Phone Format**: International (+230 for Mauritius)
- **SMS Templates**: 
  - Frontend: `src/services/emailService.js` (Line ~767)
  - Backend: `backend-reminder-service.cjs` (Line ~680)
- **Character Limit**: Sender max 11 characters
- **Unicode Support**: Configurable

#### **Current Process Details**
```bash
# Actual running process (as of Oct 31, 2025):
www-data  467330  1  0 Oct28 ?  00:00:02 /usr/bin/node /var/www/nic-callcenter/backend-reminder-service.cjs

# Process characteristics:
- PID: 467330
- Parent: 1 (init process)
- User: www-data
- Started: Oct 28, 2025
- CPU Time: 00:00:02 (very low usage)
- Status: Stable, no restarts
```

### Service Architecture
```
Backend Reminder Service (Node.js)
├── Payment Reminders (Every 30 minutes)
├── Signature Reminders (AOD documents)
├── Email Service (Brevo API)
├── SMS Service (Brevo API)
└── Logging (/var/log/nic-reminder-service.log)
```

### 1. Check Service Status

#### **Verify Service is Running (Current Setup)**
```bash
# Check if reminder process is active
ps -ef | grep "reminder"

# Expected output (current production):
# www-data  467330  1  0 Oct28 ?  00:00:02 /usr/bin/node /var/www/nic-callcenter/backend-reminder-service.cjs

# Alternative check
pgrep -f "reminder-service"
# Expected: 467330 (or similar PID)

# Note: systemctl commands will NOT work as this is not a systemd service
# sudo systemctl status nic-reminder-service  # ❌ Will fail: "Unit could not be found"
```

#### **Monitor Process Stability**
```bash
# Monitor process over time
watch -n 5 "ps -fp $(pgrep -f 'reminder-service')"

# Check process uptime and resource usage
ps -eo pid,ppid,cmd,etime,pcpu,pmem | grep reminder
```

### 2. Log File Analysis

#### **Main Log File Location**
```bash
# Primary log file
/var/log/nic-reminder-service.log
```

#### **View Recent Activity**
```bash
# View last 50 log entries
tail -50 /var/log/nic-reminder-service.log

# View today's logs
grep "$(date +%Y-%m-%d)" /var/log/nic-reminder-service.log

# Monitor real-time activity
tail -f /var/log/nic-reminder-service.log
```

#### **Check for Specific Activity**
```bash
# Look for successful reminders
grep -E "(reminder sent|SMS sent|email sent)" /var/log/nic-reminder-service.log

# Check for errors
grep -i error /var/log/nic-reminder-service.log

# Check API connectivity
grep -E "(Xano|Brevo)" /var/log/nic-reminder-service.log

# Check reminder cycles
grep "Starting reminder cycle" /var/log/nic-reminder-service.log
```

### 3. Current Production Log Analysis

#### **Actual Production Logs (Oct 31, 2025)**
```
2025-10-31T06:16:35.202Z [INFO] Processing signature reminders...
2025-10-31T06:16:35.694Z [INFO] Found 0 pending signatures
2025-10-31T06:16:35.695Z [INFO] Reminder cycle completed successfully
2025-10-31T06:46:33.276Z [INFO] Starting reminder cycle...
2025-10-31T06:46:33.277Z [INFO] Processing payment reminders...
2025-10-31T06:46:35.158Z [INFO] Found 0 installments needing reminders
2025-10-31T06:46:35.158Z [INFO] DEBUG: Sample customers | Data: {"totalCustomers":21,"sampleEmails":["jane@example.com","bob@example.com","jennifer.flacq@test.com","john.portlouis@test.com","exclusive.beta@test.com"]}
2025-10-31T06:46:35.158Z [INFO] Processing signature reminders...
2025-10-31T06:46:35.552Z [INFO] Found 0 pending signatures
2025-10-31T06:46:35.552Z [INFO] Reminder cycle completed successfully
```

#### **Log Analysis - Current Status**
- ✅ **Service Running**: Cycles every 30 minutes (06:16 → 06:46)
- ✅ **Database Connected**: Found 21 total customers
- ✅ **API Working**: Successfully querying Xano database
- ✅ **No Overdue Payments**: 0 installments needing reminders (good news!)
- ✅ **No Pending Signatures**: 0 AOD documents awaiting signatures
- ✅ **Stable Operation**: "Reminder cycle completed successfully"

#### **What "0 installments needing reminders" Means**
This indicates that **all customers are up to date with payments** - which is excellent for business! The service is working correctly and will automatically start sending reminders when payments become overdue.

#### **Expected Logs When Reminders Are Sent**
```
2025-10-31T07:16:33.276Z [INFO] Found 3 installments needing reminders
2025-10-31T07:16:35.158Z [INFO] Payment reminder sent | Data: {"customerId":123,"email":"customer@email.com"}
2025-10-31T07:16:36.234Z [INFO] Payment SMS sent | Data: {"customerId":123,"mobile":"+23012345678"}
```

### 4. SMS Service Verification

#### **SMS Content Generation Locations**
1. **Frontend SMS Templates**: `src/services/emailService.js` (Line ~767)
2. **Backend SMS Templates**: `backend-reminder-service.cjs` (Line ~680)

#### **SMS Template Examples**
**Payment Reminder SMS:**
```
NIC Life Insurance: OVERDUE - MUR 5,000 was due 2025-10-15. 
Pay now: https://payments.niclmauritius.site/reminder/123. 
Ignore if already paid.
```

**Installment Reminder SMS:**
```
NIC Life Insurance
Payment Due: MUR 1,500
Due Date: 2025-11-01
Installment 2 of 6

Pay now: https://payments.niclmauritius.site/reminder/456
Ignore if already paid.

Policy: LIFE-001234
```

#### **Brevo SMS API Configuration**
```bash
# Check Brevo API configuration
grep -E "BREVO.*API" /var/www/nic-callcenter/.env

# Expected variables:
# VITE_BREVO_API_KEY=your-brevo-api-key
```

### 5. Troubleshooting Common Issues

#### **Service Not Running**
```bash
# If process not found, check for service files
ls -la /etc/systemd/system/nic-reminder*

# If systemd service exists
sudo systemctl status nic-reminder-service
sudo systemctl start nic-reminder-service

# If running as manual process, restart
cd /var/www/nic-callcenter
sudo -u www-data nohup node backend-reminder-service.cjs > /dev/null 2>&1 &
```

#### **No Log Activity**
```bash
# Check log file permissions
ls -la /var/log/nic-reminder-service.log

# Create log file if missing
sudo touch /var/log/nic-reminder-service.log
sudo chown www-data:www-data /var/log/nic-reminder-service.log
sudo chmod 644 /var/log/nic-reminder-service.log
```

#### **API Connection Issues**
```bash
# Test Xano API connectivity
curl -H "Content-Type: application/json" "https://your-xano-url/api:your-key/nic_cc_installment"

# Test Brevo API connectivity
curl -X POST "https://api.brevo.com/v3/smtp/email" \
  -H "api-key: your-brevo-api-key" \
  -H "Content-Type: application/json"
```

### 6. Service Performance Monitoring

#### **Check Service Frequency**
```bash
# Verify 30-minute intervals
grep "Starting reminder cycle" /var/log/nic-reminder-service.log | tail -10

# Calculate time differences between cycles
awk '/Starting reminder cycle/ {print $1 " " $2}' /var/log/nic-reminder-service.log | tail -5
```

#### **Monitor Resource Usage**
```bash
# Check memory and CPU usage
ps -p $(pgrep -f 'reminder-service') -o pid,ppid,pcpu,pmem,cmd

# Monitor network connections
sudo netstat -p | grep $(pgrep -f 'reminder-service')
```

### 7. Manual Testing

#### **Test SMS Functionality**
Use the frontend testing interface:
1. Navigate to `/test/payment-plan` in your application
2. Configure SMS test with Mauritius phone number (+230XXXXXXXX)
3. Click "Test SMS" button
4. Check logs for SMS delivery confirmation

#### **Current Process Management (Manual Setup)**
```bash
# Check current process
ps -fp $(pgrep -f 'reminder-service')

# Stop current process
sudo pkill -f 'reminder-service'

# Start new process (current method)
cd /var/www/nic-callcenter
sudo -u www-data nohup node backend-reminder-service.cjs > /dev/null 2>&1 &

# Verify new process started
ps -ef | grep "reminder" | grep -v grep

# Note: Process will automatically restart checking every 30 minutes
```

#### **Process Restart Procedure (Current Setup)**
```bash
# 1. Find current process ID
CURRENT_PID=$(pgrep -f 'reminder-service')
echo "Current PID: $CURRENT_PID"

# 2. Stop current process
sudo kill $CURRENT_PID

# 3. Verify process stopped
ps -fp $CURRENT_PID  # Should show "No such process"

# 4. Start new process
cd /var/www/nic-callcenter
sudo -u www-data nohup node backend-reminder-service.cjs > /dev/null 2>&1 &

# 5. Get new process ID
NEW_PID=$(pgrep -f 'reminder-service')
echo "New PID: $NEW_PID"

# 6. Monitor new process
tail -f /var/log/nic-reminder-service.log
```

### 8. Service Health Indicators

#### **✅ Healthy Service Signs**
- Process running continuously for days/weeks
- Regular "Starting reminder cycle" entries every 30 minutes
- "Reminder cycle completed successfully" messages
- Database connectivity showing customer counts
- No error messages in logs

#### **❌ Problem Indicators**
- Process not found or frequently restarting
- Error messages about API connectivity
- "Failed to send" messages in logs
- No log activity for extended periods
- High CPU/memory usage

### 9. Brevo SMS Integration Details

#### **SMS API Endpoint**
```
POST https://api.brevo.com/v3/transactionalSMS/sms
```

#### **Phone Number Formatting**
- **Input**: Various formats (57111111, +23057111111, etc.)
- **Output**: International format (+23057111111)
- **Validation**: Mauritius country code (+230) automatically added

#### **SMS Delivery Tracking**
```bash
# Check SMS delivery logs
grep "SMS sent successfully" /var/log/nic-reminder-service.log

# Check SMS failures
grep "SMS sending failed" /var/log/nic-reminder-service.log
```

### 10. Current Environment Configuration

#### **Required Environment Variables**
```bash
# Check current Brevo configuration
grep -E "BREVO.*API" /var/www/nic-callcenter/.env

# Expected variables:
VITE_BREVO_API_KEY=your-brevo-api-key-here
VITE_SENDER_EMAIL=arrears@niclmauritius.site
VITE_SENDER_NAME=NIC Life Insurance Mauritius
```

#### **SMS Service Configuration Files**
```bash
# Frontend SMS service
/var/www/nic-callcenter/src/services/emailService.js

# Backend SMS service  
/var/www/nic-callcenter/backend-reminder-service.cjs

# Environment configuration
/var/www/nic-callcenter/.env
```

### 11. Differences: Current vs Intended Setup

#### **Current Production Setup (Manual Process)**
- ✅ **Running**: Manual Node.js process since Oct 28, 2025
- ✅ **Stable**: No crashes, continuous operation
- ✅ **Logging**: Working to `/var/log/nic-reminder-service.log`
- ❌ **Management**: No systemctl commands (not systemd service)
- ❌ **Auto-restart**: No automatic restart on failure

#### **Intended Setup (Systemd Service)**
- ✅ **Service Management**: `sudo systemctl start/stop/restart nic-reminder`
- ✅ **Auto-restart**: Automatic restart on failure
- ✅ **Boot Startup**: Starts automatically on server boot
- ✅ **Better Logging**: Integration with journalctl
- ❌ **Current Status**: Not implemented in production

#### **Migration to Systemd (Optional)**
```bash
# To convert current setup to systemd service:
cd /var/www/nic-callcenter

# Stop current manual process
sudo pkill -f 'reminder-service'

# Install as systemd service
sudo ./install-reminder-service.sh

# Start systemd service
sudo systemctl start nic-reminder
sudo systemctl enable nic-reminder

# Verify systemd service
sudo systemctl status nic-reminder
```

---

## Contact Information

For technical support:
- **Repository**: https://github.com/Vkdel001/Callcenter
- **Documentation**: Check README.md and project documentation
- **Current Logs**: `/var/log/nic-reminder-service.log`
- **Current Process**: Manual Node.js process (PID: check with `pgrep -f reminder-service`)
- **SMS Service**: Brevo API integration (frontend + backend)

---

## Appendix

### A. File Locations
- **Application**: `/var/www/nic-callcenter/`
- **Nginx Config**: `/etc/nginx/sites-available/nic-callcenter`
- **Service Config**: `/etc/systemd/system/nic-reminder.service`
- **Logs**: `/var/log/nic-reminder-service.log`
- **SSL Certificates**: `/etc/letsencrypt/live/your-domain.com/`

### B. Port Usage
- **80**: HTTP (redirects to HTTPS)
- **443**: HTTPS (main application)
- **22**: SSH (server access)

### C. Service Dependencies
- **Nginx**: Serves the React application
- **Node.js**: Runs the reminder service
- **Systemd**: Manages the reminder service
- **Certbot**: Manages SSL certificates
- **UFW**: Manages firewall rules

### D. External Dependencies
- **Xano**: Database and API backend
- **Brevo**: Email delivery service
- **Let's Encrypt**: SSL certificate authority
- **GitHub**: Code repository

---

*Last Updated: October 2025*
*Version: 1.0*