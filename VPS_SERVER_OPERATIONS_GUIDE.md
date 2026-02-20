# VPS Server Operations Guide - NIC Call Center System

## Overview

Complete guide for managing the VPS server hosting backend services for the NIC Call Center System. This document covers server configuration, service management, nginx setup, SSL certificates, logging, monitoring, and troubleshooting.

---

## Server Information

### Server Specifications

```
Operating System: Ubuntu 20.04 LTS (or higher)
CPU: 2+ cores
RAM: 4 GB minimum
Storage: 20 GB minimum
Node.js: 16.x or higher
Python: 3.8 or higher
```

### Server Access

**SSH Access**:
```bash
# Connect to VPS
ssh root@your-vps-ip

# Or with specific key
ssh -i ~/.ssh/nic-vps-key root@your-vps-ip

# Or with specific user
ssh nic-admin@your-vps-ip
```

**Important Directories**:
```
/opt/nic-callcenter/          # Application directory
/etc/systemd/system/          # Service files
/etc/nginx/                   # Nginx configuration
/var/log/                     # Log files
/var/www/html/                # Web root (if needed)
/etc/letsencrypt/             # SSL certificates
```

---

## Initial Server Setup

### 1. System Update

```bash
# Update package lists
apt update

# Upgrade installed packages
apt upgrade -y

# Install essential tools
apt install -y curl wget git vim htop net-tools ufw
```

### 2. Install Node.js

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -

# Install Node.js
apt install -y nodejs

# Verify installation
node --version  # Should show v16.x.x
npm --version   # Should show 8.x.x
```

### 3. Install Python

```bash
# Install Python 3 and pip
apt install -y python3 python3-pip python3-venv

# Verify installation
python3 --version  # Should show 3.8+
pip3 --version
```

### 4. Install Nginx

```bash
# Install Nginx
apt install -y nginx

# Start Nginx
systemctl start nginx

# Enable on boot
systemctl enable nginx

# Check status
systemctl status nginx
```

### 5. Install Certbot (for SSL)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

### 6. Configure Firewall

```bash
# Enable UFW
ufw enable

# Allow SSH
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Check status
ufw status
```

---

## Application Deployment

### 1. Clone Repository

```bash
# Create application directory
mkdir -p /opt/nic-callcenter
cd /opt/nic-callcenter

# Clone repository
git clone <repository-url> .

# Or if already cloned, pull latest
git pull origin main
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install --production

# Install Python dependencies
cd device_client
pip3 install -r requirements.txt
cd ..
```

### 3. Configure Environment Variables

```bash
# Create .env file
nano /opt/nic-callcenter/.env
```

**Environment Variables**:
```bash
# Xano API Configuration
XANO_API_URL=https://x8ki-letl-twmt.n7.xano.io/api:prod-instance
XANO_API_KEY=your-production-api-key

# Brevo (Email/SMS) Configuration
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=noreply@nic.mu
BREVO_SENDER_NAME=NIC Insurance

# ZwennPay Configuration
ZWENNPAY_API_KEY=your-zwennpay-api-key
ZWENNPAY_MERCHANT_ID=your-merchant-id

# Application Configuration
NODE_ENV=production
PORT=3000

# Logging
LOG_LEVEL=info
```

**Secure the file**:
```bash
chmod 600 /opt/nic-callcenter/.env
chown root:root /opt/nic-callcenter/.env
```

---

## Systemd Services Configuration

### Service Files Location

All service files are in `/etc/systemd/system/`

### 1. Reminder Service

**Create file**: `/etc/systemd/system/nic-reminder.service`

```bash
nano /etc/systemd/system/nic-reminder.service
```

**Content**:
```ini
[Unit]
Description=NIC Reminder Service
Documentation=https://github.com/your-org/nic-callcenter
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

# Resource limits
LimitNOFILE=65536
MemoryLimit=512M

# Security
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### 2. Payment Notification Service

**Create file**: `/etc/systemd/system/nic-payment-notification.service`

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
LimitNOFILE=65536
MemoryLimit=512M
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### 3. Device Service

**Create file**: `/etc/systemd/system/nic-device-service.service`

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
LimitNOFILE=65536
MemoryLimit=512M
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### 4. AOD Upload Service

**Create file**: `/etc/systemd/system/nic-aod-upload.service`

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
LimitNOFILE=65536
MemoryLimit=512M
NoNewPrivileges=true
PrivateTmp=true

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

---

## Service Management

### Basic Commands

```bash
# Start a service
systemctl start nic-reminder

# Stop a service
systemctl stop nic-reminder

# Restart a service
systemctl restart nic-reminder

# Reload service configuration
systemctl reload nic-reminder

# Check service status
systemctl status nic-reminder

# View service logs
journalctl -u nic-reminder -f

# View last 100 lines
journalctl -u nic-reminder -n 100

# View logs since boot
journalctl -u nic-reminder -b
```

### Manage All Services

```bash
# Start all NIC services
systemctl start nic-*

# Stop all NIC services
systemctl stop nic-*

# Restart all NIC services
systemctl restart nic-*

# Check status of all NIC services
systemctl status nic-*

# List all NIC services
systemctl list-units "nic-*"
```

### Service Troubleshooting

```bash
# Check if service is running
systemctl is-active nic-reminder

# Check if service is enabled
systemctl is-enabled nic-reminder

# View service configuration
systemctl cat nic-reminder

# Check for failed services
systemctl --failed

# Reset failed state
systemctl reset-failed nic-reminder
```

---

## Nginx Configuration

### Basic Nginx Setup

**Main configuration**: `/etc/nginx/nginx.conf`

**Site configuration**: `/etc/nginx/sites-available/nic-callcenter`

### Create Site Configuration

```bash
nano /etc/nginx/sites-available/nic-callcenter
```

**Content**:
```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Logging
    access_log /var/log/nginx/nic-callcenter-access.log;
    error_log /var/log/nginx/nic-callcenter-error.log;
    
    # Root directory (if serving static files)
    root /var/www/html;
    index index.html;
    
    # API proxy (if needed)
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # File upload endpoint
    location /upload/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Increase upload size limit
        client_max_body_size 10M;
    }
    
    # Static files
    location / {
        try_files $uri $uri/ =404;
    }
}
```

### Enable Site

```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/nic-callcenter /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

### Nginx Management

```bash
# Start Nginx
systemctl start nginx

# Stop Nginx
systemctl stop nginx

# Restart Nginx
systemctl restart nginx

# Reload configuration (no downtime)
systemctl reload nginx

# Check status
systemctl status nginx

# Test configuration
nginx -t

# View error log
tail -f /var/log/nginx/error.log

# View access log
tail -f /var/log/nginx/access.log
```

---

## SSL Certificate Setup

### Obtain SSL Certificate with Certbot

```bash
# Obtain certificate for domain
certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose redirect option (recommended: 2 - Redirect)
```

### Certificate Renewal

```bash
# Test renewal
certbot renew --dry-run

# Renew certificates
certbot renew

# Auto-renewal is configured via cron
# Check cron job
systemctl list-timers | grep certbot
```

### Certificate Management

```bash
# List certificates
certbot certificates

# Revoke certificate
certbot revoke --cert-path /etc/letsencrypt/live/your-domain.com/cert.pem

# Delete certificate
certbot delete --cert-name your-domain.com
```

---

## Logging

### Log Locations

```
Application Logs:
/var/log/nic-reminder.log
/var/log/nic-payment-notification.log
/var/log/nic-device-service.log
/var/log/nic-aod-upload.log

Nginx Logs:
/var/log/nginx/access.log
/var/log/nginx/error.log
/var/log/nginx/nic-callcenter-access.log
/var/log/nginx/nic-callcenter-error.log

System Logs:
/var/log/syslog
/var/log/auth.log
```

### View Logs

```bash
# View log in real-time
tail -f /var/log/nic-reminder.log

# View last 100 lines
tail -n 100 /var/log/nic-reminder.log

# View logs with grep
grep -i error /var/log/nic-reminder.log

# View logs with journalctl
journalctl -u nic-reminder -f

# View logs for specific date
journalctl -u nic-reminder --since "2024-02-01" --until "2024-02-02"
```

### Log Rotation

**Create log rotation config**: `/etc/logrotate.d/nic-callcenter`

```bash
nano /etc/logrotate.d/nic-callcenter
```

**Content**:
```
/var/log/nic-*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        systemctl reload nic-* > /dev/null 2>&1 || true
    endscript
}
```

### Test Log Rotation

```bash
# Test configuration
logrotate -d /etc/logrotate.d/nic-callcenter

# Force rotation
logrotate -f /etc/logrotate.d/nic-callcenter
```

---

## Monitoring

### System Monitoring

```bash
# CPU and memory usage
htop

# Disk usage
df -h

# Disk I/O
iostat

# Network connections
netstat -tulpn

# Process list
ps aux | grep node

# System load
uptime

# Memory info
free -h
```

### Service Monitoring

```bash
# Check all services
systemctl status nic-*

# Check service uptime
systemctl show nic-reminder --property=ActiveEnterTimestamp

# Check service memory usage
systemctl status nic-reminder | grep Memory

# Monitor service in real-time
watch -n 1 'systemctl status nic-reminder'
```

### Application Monitoring

```bash
# Check Node.js processes
ps aux | grep node

# Check process memory
pmap -x $(pgrep -f "backend-reminder-service")

# Monitor log for errors
tail -f /var/log/nic-reminder.log | grep -i error

# Count errors in log
grep -c "ERROR" /var/log/nic-reminder.log
```

### Automated Monitoring Script

**Create script**: `/opt/nic-callcenter/monitor.sh`

```bash
#!/bin/bash

# Check if services are running
services=("nic-reminder" "nic-payment-notification" "nic-device-service" "nic-aod-upload")

for service in "${services[@]}"; do
    if ! systemctl is-active --quiet $service; then
        echo "$(date): $service is not running!" >> /var/log/nic-monitor.log
        # Send alert email
        echo "$service is down on $(hostname)" | mail -s "Service Alert" admin@nic.mu
        # Restart service
        systemctl restart $service
    fi
done

# Check disk space
disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $disk_usage -gt 80 ]; then
    echo "$(date): Disk usage is ${disk_usage}%" >> /var/log/nic-monitor.log
    echo "Disk usage is ${disk_usage}% on $(hostname)" | mail -s "Disk Alert" admin@nic.mu
fi

# Check memory usage
mem_usage=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
if [ $mem_usage -gt 90 ]; then
    echo "$(date): Memory usage is ${mem_usage}%" >> /var/log/nic-monitor.log
fi
```

**Make executable**:
```bash
chmod +x /opt/nic-callcenter/monitor.sh
```

**Add to cron**:
```bash
# Edit crontab
crontab -e

# Add line (run every 5 minutes)
*/5 * * * * /opt/nic-callcenter/monitor.sh
```

---

## Backup and Recovery

### Backup Strategy

**What to Backup**:
- Application code: `/opt/nic-callcenter/`
- Environment variables: `/opt/nic-callcenter/.env`
- Service files: `/etc/systemd/system/nic-*.service`
- Nginx configuration: `/etc/nginx/sites-available/nic-callcenter`
- SSL certificates: `/etc/letsencrypt/`
- Logs: `/var/log/nic-*.log`

### Backup Script

**Create script**: `/opt/nic-callcenter/backup.sh`

```bash
#!/bin/bash

BACKUP_DIR="/backup/nic-callcenter"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="nic-backup-${DATE}.tar.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
tar -czf $BACKUP_DIR/$BACKUP_FILE \
    /opt/nic-callcenter/ \
    /etc/systemd/system/nic-*.service \
    /etc/nginx/sites-available/nic-callcenter \
    /etc/letsencrypt/ \
    --exclude=/opt/nic-callcenter/node_modules \
    --exclude=/opt/nic-callcenter/.git

# Keep only last 7 backups
cd $BACKUP_DIR
ls -t | tail -n +8 | xargs rm -f

echo "Backup created: $BACKUP_FILE"
```

**Make executable**:
```bash
chmod +x /opt/nic-callcenter/backup.sh
```

**Schedule daily backup**:
```bash
# Edit crontab
crontab -e

# Add line (run daily at 2 AM)
0 2 * * * /opt/nic-callcenter/backup.sh
```

### Restore from Backup

```bash
# Stop services
systemctl stop nic-*

# Extract backup
tar -xzf /backup/nic-callcenter/nic-backup-YYYYMMDD_HHMMSS.tar.gz -C /

# Reload systemd
systemctl daemon-reload

# Start services
systemctl start nic-*

# Reload Nginx
systemctl reload nginx
```

---

## Security

### Firewall Configuration

```bash
# Check firewall status
ufw status

# Allow SSH
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow specific IP only (for SSH)
ufw allow from 192.168.1.100 to any port 22

# Deny all other incoming
ufw default deny incoming

# Allow all outgoing
ufw default allow outgoing

# Enable firewall
ufw enable
```

### SSH Security

**Edit SSH config**: `/etc/ssh/sshd_config`

```bash
# Disable root login
PermitRootLogin no

# Disable password authentication (use keys only)
PasswordAuthentication no

# Change default port (optional)
Port 2222

# Allow specific users only
AllowUsers nic-admin
```

**Restart SSH**:
```bash
systemctl restart sshd
```

### Fail2Ban Setup

```bash
# Install Fail2Ban
apt install -y fail2ban

# Create local config
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit config
nano /etc/fail2ban/jail.local
```

**Configure for SSH**:
```ini
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

**Start Fail2Ban**:
```bash
systemctl start fail2ban
systemctl enable fail2ban
systemctl status fail2ban
```

### Security Updates

```bash
# Enable automatic security updates
apt install -y unattended-upgrades

# Configure
dpkg-reconfigure -plow unattended-upgrades

# Check status
systemctl status unattended-upgrades
```

---

## Performance Optimization

### Node.js Optimization

**PM2 Process Manager** (alternative to systemd):

```bash
# Install PM2
npm install -g pm2

# Start services with PM2
pm2 start backend-reminder-service.cjs --name nic-reminder
pm2 start backend-payment-notification.cjs --name nic-payment
pm2 start backend-device-service.cjs --name nic-device
pm2 start aod-upload-service.cjs --name nic-aod

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup

# Monitor
pm2 monit

# View logs
pm2 logs

# Restart all
pm2 restart all
```

### Nginx Optimization

**Edit**: `/etc/nginx/nginx.conf`

```nginx
# Worker processes (set to number of CPU cores)
worker_processes auto;

# Worker connections
events {
    worker_connections 2048;
    use epoll;
}

http {
    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;
    
    # Buffer sizes
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    output_buffers 1 32k;
    postpone_output 1460;
    
    # Timeouts
    client_header_timeout 3m;
    client_body_timeout 3m;
    send_timeout 3m;
    
    # Keep alive
    keepalive_timeout 65;
    keepalive_requests 100;
    
    # Cache
    open_file_cache max=1000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;
}
```

### System Optimization

**Increase file descriptors**:

```bash
# Edit limits
nano /etc/security/limits.conf
```

**Add**:
```
* soft nofile 65536
* hard nofile 65536
```

**Increase swap** (if needed):

```bash
# Create swap file
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check service status
systemctl status nic-reminder

# View detailed logs
journalctl -u nic-reminder -n 50 --no-pager

# Check for port conflicts
lsof -i :3000

# Check file permissions
ls -la /opt/nic-callcenter/

# Check environment variables
cat /opt/nic-callcenter/.env

# Test service manually
cd /opt/nic-callcenter
node backend-reminder-service.cjs
```

### High CPU Usage

```bash
# Identify process
top

# Check Node.js processes
ps aux | grep node | sort -k3 -r

# Profile Node.js process
node --prof backend-reminder-service.cjs

# Analyze profile
node --prof-process isolate-*.log > processed.txt
```

### High Memory Usage

```bash
# Check memory
free -h

# Check process memory
ps aux --sort=-%mem | head

# Check for memory leaks
node --inspect backend-reminder-service.cjs

# Clear cache
sync; echo 3 > /proc/sys/vm/drop_caches
```

### Disk Space Issues

```bash
# Check disk usage
df -h

# Find large files
du -h / | sort -rh | head -20

# Clean old logs
find /var/log -type f -name "*.log" -mtime +30 -delete

# Clean package cache
apt clean
apt autoclean
```

### Network Issues

```bash
# Check network connectivity
ping google.com

# Check DNS
nslookup google.com

# Check open ports
netstat -tulpn

# Check firewall
ufw status

# Test API connectivity
curl https://x8ki-letl-twmt.n7.xano.io/api:your-id/health
```

---

## Maintenance Tasks

### Daily Tasks

- [ ] Check service status
- [ ] Review error logs
- [ ] Monitor disk space
- [ ] Check backup completion

### Weekly Tasks

- [ ] Review all logs
- [ ] Check system updates
- [ ] Review security logs
- [ ] Test backup restoration
- [ ] Check SSL certificate expiry

### Monthly Tasks

- [ ] Apply system updates
- [ ] Review and rotate logs
- [ ] Performance analysis
- [ ] Security audit
- [ ] Capacity planning review

### Quarterly Tasks

- [ ] Full system backup
- [ ] Disaster recovery test
- [ ] Security penetration test
- [ ] Performance optimization review

---

## Quick Reference Commands

```bash
# Service Management
systemctl status nic-*              # Check all services
systemctl restart nic-*             # Restart all services
journalctl -u nic-reminder -f       # View logs

# Nginx
nginx -t                            # Test configuration
systemctl reload nginx              # Reload Nginx

# Logs
tail -f /var/log/nic-reminder.log   # View logs
grep -i error /var/log/nic-*.log    # Search errors

# System
htop                                # System monitor
df -h                               # Disk usage
free -h                             # Memory usage
netstat -tulpn                      # Network connections

# Updates
apt update && apt upgrade -y        # Update system
systemctl restart nic-*             # Restart services

# Backup
/opt/nic-callcenter/backup.sh       # Run backup
```

---

## Emergency Procedures

### Complete System Failure

1. **Check server status**:
   ```bash
   ping your-vps-ip
   ssh root@your-vps-ip
   ```

2. **Check all services**:
   ```bash
   systemctl status nic-*
   ```

3. **Restart services**:
   ```bash
   systemctl restart nic-*
   ```

4. **Check logs for errors**:
   ```bash
   tail -n 100 /var/log/nic-*.log
   ```

5. **If services won't start, restore from backup**:
   ```bash
   tar -xzf /backup/nic-callcenter/latest-backup.tar.gz -C /
   systemctl daemon-reload
   systemctl restart nic-*
   ```

### Service Crash Loop

1. **Stop the service**:
   ```bash
   systemctl stop nic-reminder
   ```

2. **Check logs**:
   ```bash
   journalctl -u nic-reminder -n 100
   ```

3. **Test manually**:
   ```bash
   cd /opt/nic-callcenter
   node backend-reminder-service.cjs
   ```

4. **Fix issue and restart**:
   ```bash
   systemctl start nic-reminder
   ```

---

 