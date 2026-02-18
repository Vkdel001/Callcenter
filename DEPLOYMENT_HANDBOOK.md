# NIC Call Center System - Deployment Handbook

## Overview

This handbook provides comprehensive deployment procedures for all system components. Follow these instructions carefully to ensure successful deployments.

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ PRODUCTION ENVIRONMENT                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (Netlify)                                          │
│  ├─ Domain: https://nic-callcenter.netlify.app             │
│  ├─ Build: npm run build                                    │
│  ├─ Deploy: Auto from Git (main branch)                     │
│  └─ CDN: Global distribution                                │
│                                                              │
│  Backend Services (VPS - Ubuntu 20.04)                       │
│  ├─ Reminder Service (systemd)                              │
│  ├─ Payment Notification Service (systemd)                  │
│  ├─ Device Service (systemd)                                │
│  └─ AOD Upload Service (systemd)                            │
│                                                              │
│  Webhook Service (Railway)                                   │
│  ├─ Domain: https://nic-webhook.railway.app                │
│  ├─ Deploy: Auto from Git                                   │
│  └─ Always-on service                                        │
│                                                              │
│  Database (Xano)                                             │
│  └─ Managed PostgreSQL                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Access

- [ ] GitHub repository access
- [ ] Netlify account access
- [ ] VPS SSH access (root or sudo user)
- [ ] Railway account access
- [ ] Xano dashboard access
- [ ] Domain DNS management access

### Required Tools

- Git
- Node.js 16+
- SSH client
- Text editor

---

## Frontend Deployment (Netlify)

### Initial Setup

1. **Connect Repository to Netlify**:
   ```
   - Login to Netlify
   - Click "New site from Git"
   - Choose GitHub
   - Select repository
   - Configure build settings
   ```

2. **Build Settings**:
   ```
   Build command: npm run build
   Publish directory: dist
   Node version: 16
   ```

3. **Environment Variables**:
   ```
   Navigate to Site settings → Environment variables
   Add all variables from .env.production:
   
   VITE_API_URL=https://x8ki-letl-twmt.n7.xano.io/api:prod-id
   VITE_BREVO_API_KEY=your-key
   VITE_ZWENNPAY_API_KEY=your-key
   ... (all other VITE_ variables)
   ```

4. **Custom Domain** (if applicable):
   ```
   - Navigate to Domain settings
   - Add custom domain
   - Configure DNS records
   - Enable HTTPS (automatic)
   ```

### Deployment Process

**Automatic Deployment**:
```bash
# Push to main branch triggers auto-deploy
git add .
git commit -m "feat: add new feature"
git push origin main

# Netlify automatically:
# 1. Detects push
# 2. Runs npm install
# 3. Runs npm run build
# 4. Deploys to CDN
# 5. Sends notification
```

**Manual Deployment**:
```bash
# Build locally
npm run build

# Deploy via Netlify CLI
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=dist
```

### Deployment Verification

```bash
# Check deployment status
netlify status

# View deployment logs
netlify logs

# Test the site
curl https://nic-callcenter.netlify.app
```

### Rollback Procedure

```
1. Login to Netlify dashboard
2. Navigate to Deploys
3. Find previous successful deployment
4. Click "Publish deploy"
5. Confirm rollback
```

---

## Backend Services Deployment (VPS)

### Server Requirements

- **OS**: Ubuntu 20.04 LTS or higher
- **CPU**: 2 cores minimum
- **RAM**: 4 GB minimum
- **Storage**: 20 GB minimum
- **Node.js**: 16+ installed
- **Python**: 3.8+ installed

### Initial Server Setup

```bash
# SSH to VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt install -y nodejs

# Install Python
apt install -y python3 python3-pip

# Install Git
apt install -y git

# Create application directory
mkdir -p /opt/nic-callcenter
cd /opt/nic-callcenter

# Clone repository
git clone <repository-url> .

# Install dependencies
npm install
cd device_client && pip3 install -r requirements.txt && cd ..
```

### Environment Variables Setup

```bash
# Create environment file
nano /opt/nic-callcenter/.env

# Add variables:
XANO_API_URL=https://x8ki-letl-twmt.n7.xano.io/api:prod-id
XANO_API_KEY=your-key
BREVO_API_KEY=your-key
ZWENNPAY_API_KEY=your-key
# ... all other variables

# Secure the file
chmod 600 /opt/nic-callcenter/.env
```

### Systemd Service Files

#### 1. Reminder Service

```bash
# Create service file
nano /etc/systemd/system/nic-reminder.service
```

```ini
[Unit]
Description=NIC Reminder Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/nic-callcenter
EnvironmentFile=/opt/nic-callcenter/.env
ExecStart=/usr/bin/node /opt/nic-callcenter/backend-reminder-service.cjs
Restart=always
RestartSec=10
StandardOutput=append:/var/log/nic-reminder.log
StandardError=append:/var/log/nic-reminder.log

[Install]
WantedBy=multi-user.target
```

#### 2. Payment Notification Service

```bash
nano /etc/systemd/system/nic-payment-notification.service
```

```ini
[Unit]
Description=NIC Payment Notification Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/nic-callcenter
EnvironmentFile=/opt/nic-callcenter/.env
ExecStart=/usr/bin/node /opt/nic-callcenter/backend-payment-notification.cjs
Restart=always
RestartSec=10
StandardOutput=append:/var/log/nic-payment-notification.log
StandardError=append:/var/log/nic-payment-notification.log

[Install]
WantedBy=multi-user.target
```

#### 3. Device Service

```bash
nano /etc/systemd/system/nic-device-service.service
```

```ini
[Unit]
Description=NIC Device Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/nic-callcenter
EnvironmentFile=/opt/nic-callcenter/.env
ExecStart=/usr/bin/node /opt/nic-callcenter/backend-device-service.cjs
Restart=always
RestartSec=10
StandardOutput=append:/var/log/nic-device-service.log
StandardError=append:/var/log/nic-device-service.log

[Install]
WantedBy=multi-user.target
```

#### 4. AOD Upload Service

```bash
nano /etc/systemd/system/nic-aod-upload.service
```

```ini
[Unit]
Description=NIC AOD Upload Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/nic-callcenter
EnvironmentFile=/opt/nic-callcenter/.env
ExecStart=/usr/bin/node /opt/nic-callcenter/aod-upload-service.cjs
Restart=always
RestartSec=10
StandardOutput=append:/var/log/nic-aod-upload.log
StandardError=append:/var/log/nic-aod-upload.log

[Install]
WantedBy=multi-user.target
```

### Enable and Start Services

```bash
# Reload systemd
systemctl daemon-reload

# Enable services (start on boot)
systemctl enable nic-reminder
systemctl enable nic-payment-notification
systemctl enable nic-device-service
systemctl enable nic-aod-upload

# Start services
systemctl start nic-reminder
systemctl start nic-payment-notification
systemctl start nic-device-service
systemctl start nic-aod-upload

# Check status
systemctl status nic-reminder
systemctl status nic-payment-notification
systemctl status nic-device-service
systemctl status nic-aod-upload
```

### Service Management Commands

```bash
# Start a service
systemctl start nic-reminder

# Stop a service
systemctl stop nic-reminder

# Restart a service
systemctl restart nic-reminder

# Check status
systemctl status nic-reminder

# View logs
journalctl -u nic-reminder -f

# View log file
tail -f /var/log/nic-reminder.log

# Restart all services
systemctl restart nic-*

# Check all services status
systemctl status nic-*
```

### Updating Backend Services

```bash
# SSH to VPS
ssh root@your-vps-ip

# Navigate to application directory
cd /opt/nic-callcenter

# Pull latest code
git pull origin main

# Install new dependencies (if any)
npm install

# Restart services
systemctl restart nic-*

# Verify services are running
systemctl status nic-*

# Check logs for errors
tail -f /var/log/nic-*.log
```

---

## Railway Webhook Deployment

### Initial Setup

1. **Create Railway Project**:
   ```
   - Login to Railway
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Select repository
   - Choose branch (main)
   ```

2. **Configure Build**:
   ```
   Build Command: (leave empty, uses package.json)
   Start Command: node webhookcode-enhanced.js
   ```

3. **Environment Variables**:
   ```
   Navigate to Variables tab
   Add:
   
   XANO_API_URL=https://x8ki-letl-twmt.n7.xano.io/api:prod-id
   XANO_API_KEY=your-key
   BREVO_API_KEY=your-key
   PORT=3000
   ```

4. **Custom Domain** (optional):
   ```
   - Navigate to Settings → Domains
   - Add custom domain
   - Configure DNS CNAME record
   ```

### Deployment Process

**Automatic Deployment**:
```bash
# Push to connected branch triggers auto-deploy
git add webhookcode-enhanced.js
git commit -m "fix: update webhook logic"
git push origin main

# Railway automatically:
# 1. Detects push
# 2. Builds application
# 3. Deploys new version
# 4. Switches traffic to new deployment
```

**Manual Deployment**:
```
1. Login to Railway dashboard
2. Navigate to project
3. Click "Deploy"
4. Select commit to deploy
5. Confirm deployment
```

### Monitoring

```
# View logs
- Railway dashboard → Logs tab
- Real-time log streaming
- Filter by severity

# Check deployment status
- Railway dashboard → Deployments tab
- View deployment history
- Check build logs
```

### Rollback

```
1. Navigate to Deployments tab
2. Find previous successful deployment
3. Click "Redeploy"
4. Confirm rollback
```

---

## Device Client Deployment

### Building Windows Executable

```bash
# On Windows development machine
cd device_client

# Install dependencies
pip install -r requirements.txt
pip install pyinstaller

# Build executable
pyinstaller --onefile --windowed --icon=icon.ico device_client.py

# Executable created in dist/device_client.exe
```

### Creating Installer

```bash
# Install Inno Setup
# Download from: https://jrsoftware.org/isdl.php

# Compile installer script
iscc installer.iss

# Installer created in Output/NIC_Device_Client_Setup.exe
```

### Distribution

```
1. Upload installer to shared location:
   - Network drive
   - Cloud storage (Google Drive, Dropbox)
   - Internal file server

2. Send download link to agents

3. Provide installation instructions:
   - Run NIC_Device_Client_Setup.exe
   - Follow installation wizard
   - Launch application
   - Enter agent credentials
   - Link ESP32 device
```

### Auto-Update (Planned)

```
Future implementation:
- Check for updates on startup
- Download new version if available
- Install and restart automatically
```

---

## Environment Variables by Environment

### Development (.env)

```bash
VITE_API_URL=https://x8ki-letl-twmt.n7.xano.io/api:dev-instance
VITE_APP_URL=http://localhost:5173
VITE_BREVO_API_KEY=test-key
VITE_ZWENNPAY_API_KEY=test-key
VITE_WEBHOOK_URL=http://localhost:3000/webhook
VITE_DEVICE_SERVICE_URL=http://localhost:5000
```

### Production (.env.production)

```bash
VITE_API_URL=https://x8ki-letl-twmt.n7.xano.io/api:prod-instance
VITE_APP_URL=https://nic-callcenter.netlify.app
VITE_BREVO_API_KEY=live-key
VITE_ZWENNPAY_API_KEY=live-key
VITE_WEBHOOK_URL=https://nic-webhook.railway.app/webhook
VITE_DEVICE_SERVICE_URL=https://your-vps-ip:5000
```

### VPS Services

```bash
# /opt/nic-callcenter/.env
XANO_API_URL=https://x8ki-letl-twmt.n7.xano.io/api:prod-instance
XANO_API_KEY=prod-api-key
BREVO_API_KEY=live-key
ZWENNPAY_API_KEY=live-key
NODE_ENV=production
```

### Railway

```bash
# Railway environment variables
XANO_API_URL=https://x8ki-letl-twmt.n7.xano.io/api:prod-instance
XANO_API_KEY=prod-api-key
BREVO_API_KEY=live-key
PORT=3000
NODE_ENV=production
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] Environment variables verified
- [ ] Database backup created
- [ ] Deployment window scheduled
- [ ] Team notified
- [ ] Rollback plan prepared

### Frontend Deployment

- [ ] Build succeeds locally
- [ ] Environment variables set in Netlify
- [ ] Push to main branch
- [ ] Monitor Netlify build logs
- [ ] Verify deployment success
- [ ] Test critical user flows
- [ ] Check browser console for errors
- [ ] Verify API connections

### Backend Services Deployment

- [ ] SSH to VPS
- [ ] Pull latest code
- [ ] Install new dependencies
- [ ] Update environment variables
- [ ] Restart services
- [ ] Check service status
- [ ] Monitor logs for errors
- [ ] Test API endpoints
- [ ] Verify email/SMS delivery

### Railway Webhook Deployment

- [ ] Push to connected branch
- [ ] Monitor Railway build logs
- [ ] Verify deployment success
- [ ] Test webhook endpoint
- [ ] Check logs for errors
- [ ] Verify payment processing

### Post-Deployment

- [ ] All services running
- [ ] No errors in logs
- [ ] Critical features tested
- [ ] Performance acceptable
- [ ] Users notified (if needed)
- [ ] Documentation updated
- [ ] Deployment logged

---

## Rollback Procedures

### Frontend Rollback

```
1. Login to Netlify dashboard
2. Navigate to Deploys
3. Find last working deployment
4. Click "Publish deploy"
5. Verify rollback successful
6. Notify team

Time: ~2 minutes
```

### Backend Services Rollback

```bash
# SSH to VPS
ssh root@your-vps-ip

# Navigate to application directory
cd /opt/nic-callcenter

# Revert to previous commit
git log --oneline  # Find commit hash
git revert <commit-hash>
# Or
git reset --hard <previous-commit-hash>

# Restart services
systemctl restart nic-*

# Verify services running
systemctl status nic-*

# Monitor logs
tail -f /var/log/nic-*.log

Time: ~5 minutes
```

### Railway Rollback

```
1. Login to Railway dashboard
2. Navigate to Deployments
3. Find last working deployment
4. Click "Redeploy"
5. Verify rollback successful

Time: ~3 minutes
```

### Database Rollback

```
1. Login to Xano dashboard
2. Navigate to Database → Backups
3. Select backup before deployment
4. Click "Restore"
5. Confirm restoration
6. Verify data integrity

Time: ~10 minutes
Warning: This will lose all data changes since backup
```

---

## Monitoring & Health Checks

### Service Status Monitoring

```bash
# Check all services
systemctl status nic-*

# Check specific service
systemctl status nic-reminder

# View service logs
journalctl -u nic-reminder -f

# View log files
tail -f /var/log/nic-reminder.log
tail -f /var/log/nic-payment-notification.log
tail -f /var/log/nic-device-service.log
tail -f /var/log/nic-aod-upload.log
```

### Application Health Checks

```bash
# Frontend
curl https://nic-callcenter.netlify.app

# Webhook
curl https://nic-webhook.railway.app/health

# Device Service
curl http://your-vps-ip:5000/health

# Xano API
curl https://x8ki-letl-twmt.n7.xano.io/api:prod-id/health
```

### Log Monitoring

```bash
# Watch all logs
tail -f /var/log/nic-*.log

# Search for errors
grep -i error /var/log/nic-*.log

# Search for specific pattern
grep "payment failed" /var/log/nic-*.log

# Count errors in last hour
grep -i error /var/log/nic-reminder.log | grep "$(date -d '1 hour ago' '+%Y-%m-%d %H')"
```

### Performance Monitoring

```bash
# Check CPU usage
top

# Check memory usage
free -h

# Check disk usage
df -h

# Check network connections
netstat -tulpn | grep node
```

### Alerting (Manual)

Current alerting is manual. Check logs regularly:
- Morning: 9 AM
- Afternoon: 2 PM
- Evening: 6 PM

**Planned**: Automated alerting with:
- UptimeRobot for uptime monitoring
- Sentry for error tracking
- Slack/email notifications

---

## Troubleshooting Deployments

### Frontend Build Fails

**Issue**: Build fails on Netlify

**Solutions**:
```bash
# Check build logs in Netlify dashboard
# Common issues:

# 1. Missing environment variables
# → Add in Netlify settings

# 2. Node version mismatch
# → Set Node version in Netlify settings

# 3. Dependency issues
# → Clear cache and rebuild

# 4. Build command error
# → Verify build command in netlify.toml
```

### Backend Service Won't Start

**Issue**: Service fails to start on VPS

**Solutions**:
```bash
# Check service status
systemctl status nic-reminder

# Check logs
journalctl -u nic-reminder -n 50

# Common issues:

# 1. Port already in use
lsof -i :3000
kill -9 <PID>

# 2. Missing environment variables
cat /opt/nic-callcenter/.env

# 3. Permission issues
chmod +x /opt/nic-callcenter/backend-reminder-service.cjs

# 4. Missing dependencies
cd /opt/nic-callcenter && npm install
```

### Railway Deployment Fails

**Issue**: Railway build or deployment fails

**Solutions**:
```
# Check build logs in Railway dashboard
# Common issues:

# 1. Missing environment variables
# → Add in Railway settings

# 2. Build timeout
# → Optimize build process

# 3. Memory limit exceeded
# → Upgrade Railway plan

# 4. Start command error
# → Verify start command in package.json
```

---

## Disaster Recovery

### Complete System Failure

**Scenario**: All services down

**Recovery Steps**:
```
1. Check Xano status (primary dependency)
   - If Xano down, wait for restoration
   - If Xano up, proceed

2. Restore frontend (Netlify)
   - Rollback to last working deployment
   - Or redeploy from Git

3. Restore backend services (VPS)
   - SSH to VPS
   - Check service status
   - Restart all services
   - If still failing, restore from backup

4. Restore webhook (Railway)
   - Rollback to last working deployment

5. Verify all systems operational
   - Test login
   - Test customer list
   - Test QR generation
   - Test payment flow

6. Notify users when restored
```

### Data Loss

**Scenario**: Database data lost or corrupted

**Recovery Steps**:
```
1. Stop all services to prevent further changes
   systemctl stop nic-*

2. Login to Xano dashboard

3. Navigate to Database → Backups

4. Select most recent backup before issue

5. Restore backup

6. Verify data integrity
   - Check customer records
   - Check payment plans
   - Check transactions

7. Restart services
   systemctl start nic-*

8. Notify affected users
```

---

## Deployment Schedule

### Regular Deployments

- **Frequency**: Weekly (Fridays, 6 PM)
- **Duration**: 30 minutes
- **Downtime**: Minimal (< 2 minutes)

### Emergency Deployments

- **Trigger**: Critical bugs, security issues
- **Approval**: Team lead required
- **Notification**: All users notified

### Maintenance Windows

- **Frequency**: Monthly (First Sunday, 2 AM)
- **Duration**: 2 hours
- **Activities**: 
  - System updates
  - Database optimization
  - Log cleanup
  - Backup verification

---

## Contact Information

### Deployment Issues

- **Team Lead**: [Name] - [Email] - [Phone]
- **DevOps**: [Name] - [Email] - [Phone]
- **On-Call**: [Rotation schedule]

### Service Providers

- **Netlify Support**: support@netlify.com
- **Railway Support**: team@railway.app
- **Xano Support**: support@xano.com
- **VPS Provider**: [Provider support]

---

**Document Version**: 1.0  
**Last Updated**: February 4, 2026  
**Maintained By**: Development Team  
**Next Review**: March 2026
