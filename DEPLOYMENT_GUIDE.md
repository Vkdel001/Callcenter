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

## Contact Information

For technical support:
- **Repository**: https://github.com/Vkdel001/Callcenter
- **Documentation**: Check README.md and project documentation
- **Logs Location**: `/var/log/nic-reminder-service.log`
- **Service Management**: Use `./reminder-service-manager.sh` script

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