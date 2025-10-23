# NIC Call Center - Quick Troubleshooting Reference

## 🚨 Emergency Commands

### Check All Services Status
```bash
# Quick health check
sudo systemctl status nginx nic-reminder
curl -I https://your-domain.com
./reminder-service-manager.sh status
```

### View All Logs
```bash
# Application logs
tail -20 /var/log/nic-reminder-service.log

# System logs
sudo journalctl -u nic-reminder -n 20
sudo tail -20 /var/log/nginx/error.log
```

### Restart Everything
```bash
# Nuclear option - restart all services
sudo systemctl restart nginx
sudo systemctl restart nic-reminder
```

---

## 🔍 Common Issues & Quick Fixes

### 1. Website Not Loading
```bash
# Check and fix
sudo systemctl status nginx
sudo nginx -t
sudo systemctl restart nginx

# If still broken
cd /var/www/nic-callcenter
npm run build
sudo systemctl reload nginx
```

### 2. Reminder Service Failed
```bash
# Check status and logs
sudo systemctl status nic-reminder
tail -10 /var/log/nic-reminder-service.log

# Quick fix
sudo systemctl restart nic-reminder

# If still failing
chmod +x /var/www/nic-callcenter/backend-reminder-service.cjs
sudo systemctl restart nic-reminder
```

### 3. SSL Certificate Issues
```bash
# Check certificate
sudo certbot certificates

# Renew if needed
sudo certbot renew
sudo systemctl restart nginx
```

### 4. No Emails Being Sent
```bash
# Check service logs for email errors
grep -i "email\|brevo" /var/log/nic-reminder-service.log

# Check API key
grep BREVO /var/www/nic-callcenter/.env

# Restart service
sudo systemctl restart nic-reminder
```

### 5. Database Connection Failed
```bash
# Test API connection
curl -I "https://xbde-ekcn-8kg2.n7e.xano.io/api:Q4jDYUWL/nic_cc_customer"

# Check environment variables
grep XANO /var/www/nic-callcenter/.env

# Restart service
sudo systemctl restart nic-reminder
```

---

## 📊 Monitoring Commands

### System Health
```bash
# Resource usage
htop
df -h
free -h

# Service status
systemctl status nginx nic-reminder

# Network connectivity
ping google.com
curl -I https://api.brevo.com
```

### Application Health
```bash
# Website response
curl -I https://payments.niclmauritius.site

# Reminder service activity
./reminder-service-manager.sh logs

# Recent errors
grep -i error /var/log/nic-reminder-service.log | tail -5
```

---

## 🔧 Maintenance Commands

### Update Application
```bash
cd /var/www/nic-callcenter
git pull origin main
npm install
npm run build
sudo systemctl restart nic-reminder
sudo systemctl reload nginx
```

### Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo systemctl restart nginx
```

### Clean Logs (if too large)
```bash
# Check log sizes
du -sh /var/log/nic-reminder-service.log
du -sh /var/log/nginx/*.log

# Rotate logs if needed
sudo logrotate -f /etc/logrotate.conf
```

---

## 🚨 Error Code Reference

### Nginx Errors
- **502 Bad Gateway**: Application not running or misconfigured
- **403 Forbidden**: Permission issues with files
- **404 Not Found**: Missing files or wrong configuration
- **500 Internal Server Error**: Application error

### Reminder Service Errors
- **"require is not defined"**: Wrong file extension (use .cjs)
- **"ECONNREFUSED"**: Network/API connection issue
- **"Invalid JSON response"**: API endpoint or key issue
- **"Email sending failed"**: Brevo API key or configuration issue

### SSL Errors
- **"Certificate not found"**: Run `sudo certbot --nginx -d domain.com`
- **"Certificate expired"**: Run `sudo certbot renew`
- **"Mixed content"**: Update VITE_APP_URL to use HTTPS

---

## 📞 Emergency Contacts & Resources

### Log Locations
- **Reminder Service**: `/var/log/nic-reminder-service.log`
- **Nginx Access**: `/var/log/nginx/access.log`
- **Nginx Error**: `/var/log/nginx/error.log`
- **System**: `sudo journalctl -u service-name`

### Configuration Files
- **Application**: `/var/www/nic-callcenter/.env`
- **Nginx**: `/etc/nginx/sites-available/nic-callcenter`
- **Service**: `/etc/systemd/system/nic-reminder.service`

### External Services
- **Xano Dashboard**: https://xano.io
- **Brevo Dashboard**: https://app.brevo.com
- **Domain DNS**: Your domain provider dashboard
- **Server**: Your VPS provider dashboard

### Useful Commands Reference
```bash
# Service management
sudo systemctl start|stop|restart|status service-name
./reminder-service-manager.sh start|stop|restart|status|logs|follow

# File permissions
sudo chown -R www-data:www-data /var/www/nic-callcenter
sudo chmod -R 755 /var/www/nic-callcenter
chmod +x script-name.sh

# Nginx
sudo nginx -t                    # Test configuration
sudo systemctl reload nginx     # Reload without restart
sudo systemctl restart nginx    # Full restart

# SSL
sudo certbot certificates       # List certificates
sudo certbot renew             # Renew certificates
sudo certbot --nginx -d domain.com  # Get new certificate

# Git
git pull origin main           # Update code
git status                     # Check status
git log --oneline -10         # Recent commits
```

---

## 🎯 Performance Optimization

### If System is Slow
```bash
# Check resource usage
htop
df -h
free -h

# Restart services to free memory
sudo systemctl restart nic-reminder
sudo systemctl restart nginx

# Check for memory leaks
ps aux | grep node
```

### If Emails are Slow
```bash
# Check reminder service logs
grep -i "email" /var/log/nic-reminder-service.log

# The service has 2-second delays between emails (normal)
# Check Brevo API limits in dashboard
```

### If Website is Slow
```bash
# Check Nginx logs for errors
sudo tail -f /var/log/nginx/access.log

# Verify gzip compression is working
curl -H "Accept-Encoding: gzip" -I https://your-domain.com

# Check if build is optimized
ls -lh /var/www/nic-callcenter/dist/assets/
```

---

*Keep this reference handy for quick issue resolution!*