# VPS Deployment Guide - NIC Call Center

## Prerequisites on Ubuntu VPS

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js (Latest LTS)
```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 3. Install Git
```bash
sudo apt install git -y
```

### 4. Install Nginx
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

## Deployment Steps

### 1. Upload Deployment Script
Upload the `deploy.sh` file to your VPS and make it executable:
```bash
chmod +x deploy.sh
```

### 2. Run Initial Deployment
```bash
sudo ./deploy.sh deploy
```

### 3. Configure Environment Variables
```bash
# Copy production environment template
sudo cp .env.production.template /var/www/nic-callcenter/.env

# Edit with your actual production values
sudo nano /var/www/nic-callcenter/.env

# IMPORTANT: Update these values in the .env file:
# - VITE_BREVO_API_KEY (use production API key)
# - VITE_XANO_*_API (use production API keys, not development)
# - VITE_APP_URL (your actual domain)
# - VITE_JWT_SECRET (generate a strong secret)
# - VITE_ENCRYPTION_KEY (generate another strong key)
```

### 4. Update Nginx Configuration
```bash
# Edit the Nginx config to use your domain
sudo nano /etc/nginx/sites-available/nic-callcenter

# Replace 'your-domain.com' with your actual domain
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 5. Set Up SSL Certificate (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 6. Configure Firewall
```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Quick Commands for Updates

### Pull Latest Code and Redeploy
```bash
sudo ./deploy.sh deploy
```

### Just Pull Code (No Build)
```bash
sudo ./deploy.sh pull
```

### Just Build (After Code Changes)
```bash
sudo ./deploy.sh build
```

### Create Backup Before Update
```bash
sudo ./deploy.sh backup
```

## Monitoring and Maintenance

### Check Application Status
```bash
# Check Nginx status
sudo systemctl status nginx

# Check application files
ls -la /var/www/nic-callcenter/

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
# Restart Nginx
sudo systemctl restart nginx

# Reload Nginx (for config changes)
sudo systemctl reload nginx
```

### View Application Logs
```bash
# Check deployment logs
sudo journalctl -u nginx -f

# Check system logs
sudo tail -f /var/log/syslog
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   sudo chown -R www-data:www-data /var/www/nic-callcenter
   sudo chmod -R 755 /var/www/nic-callcenter
   ```

2. **Nginx Configuration Error**
   ```bash
   sudo nginx -t
   # Fix any syntax errors shown
   ```

3. **Build Failures**
   ```bash
   cd /var/www/nic-callcenter
   sudo npm install
   sudo npm run build
   ```

4. **Git Permission Issues**
   ```bash
   cd /var/www/nic-callcenter
   sudo git config --global --add safe.directory /var/www/nic-callcenter
   ```

### Performance Optimization

1. **Enable Gzip Compression** (Already in Nginx config)
2. **Set Up Caching Headers** (Already configured)
3. **Monitor Resource Usage**
   ```bash
   htop
   df -h
   free -h
   ```

## Security Checklist

- [ ] SSL certificate installed and configured
- [ ] Firewall configured (UFW)
- [ ] Regular security updates scheduled
- [ ] Strong passwords for all accounts
- [ ] SSH key authentication enabled
- [ ] Fail2ban installed for brute force protection
- [ ] Regular backups configured
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] API keys rotated regularly

## Backup Strategy

### Automated Backups
```bash
# Create backup script
sudo crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/deploy.sh backup
```

### Manual Backup
```bash
sudo ./deploy.sh backup
```

## Domain Configuration

1. Point your domain's A record to your VPS IP address
2. Update Nginx configuration with your domain name
3. Obtain SSL certificate using Certbot
4. Test HTTPS access

## Environment Variables Setup

Key variables to configure in `/var/www/nic-callcenter/.env`:

- `VITE_XANO_API_URL` - Your Xano API endpoint
- `VITE_BREVO_API_KEY` - Brevo email service API key
- `VITE_APP_URL` - Your production domain URL
- `VITE_BREVO_SMS_API_KEY` - SMS service API key

## Support

For issues with deployment:
1. Check the deployment logs
2. Verify all environment variables are set
3. Ensure all services are running
4. Check firewall and DNS settings