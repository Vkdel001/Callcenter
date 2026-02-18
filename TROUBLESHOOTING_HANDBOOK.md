# NIC Call Center System - Troubleshooting Handbook

## Overview

Quick reference guide for common issues and solutions. Use this handbook to quickly diagnose and resolve problems.

---

## Quick Diagnosis Flowchart

```
Issue Reported
    │
    ├─ Cannot login → Check Authentication Issues
    ├─ Page not loading → Check Frontend Issues
    ├─ API errors → Check Backend Issues
    ├─ Email not sending → Check Email Issues
    ├─ QR code not working → Check QR Code Issues
    ├─ Device not linking → Check Device Issues
    └─ Slow performance → Check Performance Issues
```

---

## Frontend Issues

### Issue: "Cannot connect to API"

**Symptoms**:
- Error message: "Network Error" or "Cannot connect to server"
- API calls failing
- Blank pages

**Diagnosis**:
```bash
# Check if API URL is set
echo $VITE_API_URL

# Test API connectivity
curl https://x8ki-letl-twmt.n7.xano.io/api:your-id/health
```

**Solutions**:

1. **Check .env file**:
   ```bash
   # Verify VITE_API_URL is set correctly
   cat .env | grep VITE_API_URL
   
   # Should be:
   VITE_API_URL=https://x8ki-letl-twmt.n7.xano.io/api:your-id
   ```

2. **Restart development server**:
   ```bash
   # Stop server (Ctrl+C)
   # Start again
   npm run dev
   ```

3. **Check Xano service status**:
   - Login to Xano dashboard
   - Check if service is running
   - Check for maintenance notifications

4. **Check CORS settings**:
   - Login to Xano dashboard
   - Navigate to Settings → API → CORS
   - Ensure your domain is whitelisted

---

### Issue: "Login fails"

**Symptoms**:
- "Invalid email or password" error
- Login button not responding
- Redirected back to login page

**Diagnosis**:
```javascript
// Check browser console for errors
// Open DevTools → Console

// Check network tab
// Open DevTools → Network → Filter by XHR
// Look for /auth/login request
```

**Solutions**:

1. **Verify credentials**:
   - Check email format
   - Check password (case-sensitive)
   - Try password reset

2. **Check Xano endpoint**:
   ```bash
   # Test login endpoint
   curl -X POST https://x8ki-letl-twmt.n7.xano.io/api:your-id/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@nic.mu","password":"test123"}'
   ```

3. **Check user account status**:
   - Login to Xano dashboard
   - Check users table
   - Verify active_status = true

4. **Clear browser cache**:
   ```javascript
   // Clear localStorage
   localStorage.clear();
   
   // Reload page
   location.reload();
   ```

---

### Issue: "QR code not generating"

**Symptoms**:
- "Failed to generate QR code" error
- QR code image not displaying
- Blank QR code area

**Diagnosis**:
```javascript
// Check browser console
// Look for ZwennPay API errors

// Check network tab
// Look for QR generation API call
```

**Solutions**:

1. **Check ZwennPay API key**:
   ```bash
   # Verify API key is set
   echo $VITE_ZWENNPAY_API_KEY
   ```

2. **Check amount validation**:
   - Amount must be between 10 and 100,000 MUR
   - Amount must be positive
   - Amount format: decimal with 2 places

3. **Check ZwennPay service status**:
   - Contact ZwennPay support
   - Check for maintenance notifications

4. **Test QR generation manually**:
   ```javascript
   // In browser console
   import { generateQRCode } from './utils/qrGenerator';
   
   const qr = await generateQRCode({
     amount: 1000,
     reference: 'TEST-001',
     customerName: 'Test Customer'
   });
   
   console.log(qr);
   ```

---

### Issue: "Blank page after build"

**Symptoms**:
- Production build shows blank page
- No errors in console
- Development works fine

**Diagnosis**:
```bash
# Check build output
npm run build

# Check for errors in build log
```

**Solutions**:

1. **Check base URL in vite.config.js**:
   ```javascript
   // vite.config.js
   export default defineConfig({
     base: '/',  // Should be '/' for Netlify
     // ...
   });
   ```

2. **Check public path**:
   ```javascript
   // Ensure assets are loaded from correct path
   // Check Network tab for 404 errors
   ```

3. **Check environment variables**:
   ```bash
   # Verify all VITE_ variables are set in Netlify
   # Navigate to Site settings → Environment variables
   ```

4. **Clear build cache**:
   ```bash
   rm -rf dist node_modules/.vite
   npm install
   npm run build
   ```

---

## Backend Service Issues

### Issue: Service not starting

**Symptoms**:
- `systemctl status nic-reminder` shows "failed"
- Service crashes immediately after start
- No logs generated

**Diagnosis**:
```bash
# Check service status
systemctl status nic-reminder

# Check logs
journalctl -u nic-reminder -n 50

# Check for port conflicts
lsof -i :3000
```

**Solutions**:

1. **Check environment variables**:
   ```bash
   # Verify .env file exists
   cat /opt/nic-callcenter/.env
   
   # Check for missing variables
   grep -E "XANO_API_URL|BREVO_API_KEY" /opt/nic-callcenter/.env
   ```

2. **Check file permissions**:
   ```bash
   # Ensure service file is executable
   chmod +x /opt/nic-callcenter/backend-reminder-service.cjs
   
   # Check ownership
   ls -la /opt/nic-callcenter/
   ```

3. **Check Node.js version**:
   ```bash
   # Verify Node.js 16+
   node --version
   
   # If wrong version, install correct version
   curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
   apt install -y nodejs
   ```

4. **Check dependencies**:
   ```bash
   cd /opt/nic-callcenter
   npm install
   ```

5. **Restart service**:
   ```bash
   systemctl daemon-reload
   systemctl restart nic-reminder
   systemctl status nic-reminder
   ```

---

### Issue: Email not sending

**Symptoms**:
- Emails not received by customers
- "Email send failed" in logs
- Brevo API errors

**Diagnosis**:
```bash
# Check reminder service logs
tail -f /var/log/nic-reminder.log | grep -i email

# Check Brevo API key
echo $BREVO_API_KEY
```

**Solutions**:

1. **Verify Brevo API key**:
   ```bash
   # Test Brevo API
   curl -X GET https://api.brevo.com/v3/account \
     -H "api-key: your-brevo-api-key"
   
   # Should return account info
   ```

2. **Check Brevo credits**:
   - Login to Brevo dashboard
   - Check email credits remaining
   - Check SMS credits (if using SMS)

3. **Check email format**:
   ```javascript
   // Verify email address format
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   console.log(emailRegex.test('customer@example.com'));
   ```

4. **Check Brevo logs**:
   - Login to Brevo dashboard
   - Navigate to Logs → Email Logs
   - Check delivery status
   - Check for bounces or blocks

5. **Check sender email**:
   ```bash
   # Verify sender email is verified in Brevo
   echo $VITE_BREVO_SENDER_EMAIL
   
   # Should be verified domain
   ```

---

### Issue: SMS not sending

**Symptoms**:
- SMS not received
- "SMS send failed" in logs
- Brevo SMS errors

**Diagnosis**:
```bash
# Check logs for SMS errors
tail -f /var/log/nic-reminder.log | grep -i sms
```

**Solutions**:

1. **Check SMS credits**:
   - Login to Brevo dashboard
   - Check SMS credits remaining
   - Purchase more credits if needed

2. **Check phone number format**:
   ```javascript
   // Must be in international format
   const phone = "+230 5123 4567";  // Correct
   const phone = "5123 4567";       // Incorrect
   ```

3. **Check SMS sender name**:
   ```bash
   # Verify sender name is approved
   # Max 11 characters
   # Alphanumeric only
   ```

4. **Test SMS API**:
   ```bash
   curl -X POST https://api.brevo.com/v3/transactionalSMS/sms \
     -H "api-key: your-brevo-api-key" \
     -H "Content-Type: application/json" \
     -d '{
       "sender": "NIC",
       "recipient": "+230 5123 4567",
       "content": "Test SMS"
     }'
   ```

---

### Issue: Reminder not triggering

**Symptoms**:
- Scheduled reminders not sent
- No reminder logs
- Customers not receiving reminders

**Diagnosis**:
```bash
# Check reminder service status
systemctl status nic-reminder

# Check logs
tail -f /var/log/nic-reminder.log

# Check cron schedule
# (if using cron instead of systemd)
crontab -l
```

**Solutions**:

1. **Verify service is running**:
   ```bash
   systemctl status nic-reminder
   
   # If not running, start it
   systemctl start nic-reminder
   ```

2. **Check reminder schedule**:
   ```javascript
   // In backend-reminder-service.cjs
   // Verify cron schedule
   cron.schedule('0 9 * * *', () => {
     // Runs daily at 9 AM
   });
   ```

3. **Check database for due reminders**:
   ```sql
   -- Check for installments due soon
   SELECT * FROM installments
   WHERE status = 'pending'
   AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days';
   
   -- Check for AODs needing reminders
   SELECT * FROM aod_documents
   WHERE signature_status = 'pending_signature'
   AND signature_sent_date < CURRENT_DATE - INTERVAL '7 days';
   ```

4. **Manually trigger reminder**:
   ```bash
   # SSH to VPS
   ssh root@your-vps-ip
   
   # Run reminder service manually
   cd /opt/nic-callcenter
   node backend-reminder-service.cjs
   ```

---

## Database Issues

### Issue: "Record not found"

**Symptoms**:
- "Customer not found" error
- "Payment plan not found" error
- 404 errors from API

**Diagnosis**:
```sql
-- Check if record exists
SELECT * FROM customers WHERE id = 123;

-- Check if table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

**Solutions**:

1. **Verify record ID**:
   - Check if ID is correct
   - Check if record was deleted
   - Check if using correct table

2. **Check Xano table structure**:
   - Login to Xano dashboard
   - Navigate to Database → Tables
   - Verify table exists
   - Verify field names match code

3. **Check relationships**:
   ```sql
   -- Verify foreign key relationships
   SELECT * FROM customers c
   LEFT JOIN payment_plans pp ON pp.customer_id = c.id
   WHERE c.id = 123;
   ```

---

### Issue: "Duplicate key error"

**Symptoms**:
- "Policy number already exists" error
- "Email already exists" error
- 409 Conflict errors

**Diagnosis**:
```sql
-- Check for duplicate policy numbers
SELECT policy_number, COUNT(*) as count
FROM customers
GROUP BY policy_number
HAVING COUNT(*) > 1;

-- Check for duplicate emails
SELECT email, COUNT(*) as count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
```

**Solutions**:

1. **Update existing record instead of creating new**:
   ```javascript
   // Use upsert logic
   const existing = await findByPolicyNumber(policyNumber);
   if (existing) {
     await update(existing.id, data);
   } else {
     await create(data);
   }
   ```

2. **Check unique constraints**:
   - Login to Xano dashboard
   - Check table indexes
   - Verify unique constraints are set

3. **Clean up duplicates**:
   ```sql
   -- Find duplicates
   SELECT policy_number, id
   FROM customers
   WHERE policy_number IN (
     SELECT policy_number
     FROM customers
     GROUP BY policy_number
     HAVING COUNT(*) > 1
   )
   ORDER BY policy_number, id;
   
   -- Keep first, delete rest (manual review required)
   ```

---

### Issue: "Slow queries"

**Symptoms**:
- Pages loading slowly
- API timeouts
- Database CPU high

**Diagnosis**:
```sql
-- Check slow queries (if query logging enabled)
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size(table_name::regclass)) as size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(table_name::regclass) DESC;
```

**Solutions**:

1. **Add indexes**:
   ```sql
   -- Add index on frequently queried fields
   CREATE INDEX idx_customers_policy_number ON customers(policy_number);
   CREATE INDEX idx_customers_assigned_agent ON customers(assigned_agent_id);
   CREATE INDEX idx_installments_due_date ON installments(due_date);
   ```

2. **Optimize queries**:
   ```sql
   -- Use EXPLAIN to analyze query
   EXPLAIN ANALYZE
   SELECT * FROM customers WHERE assigned_agent_id = 123;
   
   -- Look for "Seq Scan" (bad) vs "Index Scan" (good)
   ```

3. **Add pagination**:
   ```javascript
   // Limit results
   const customers = await getCustomers({
     page: 1,
     per_page: 50
   });
   ```

4. **Use caching**:
   ```javascript
   // Cache frequently accessed data
   const cachedCustomers = localStorage.getItem('customers');
   if (cachedCustomers) {
     return JSON.parse(cachedCustomers);
   }
   ```

---

## Device Integration Issues

### Issue: Device not linking

**Symptoms**:
- "Device not found" error
- Device not appearing in list
- Link request fails

**Diagnosis**:
```bash
# Check if device is on network
ping <device-ip>

# Check device service status
systemctl status nic-device-service

# Check device service logs
tail -f /var/log/nic-device-service.log
```

**Solutions**:

1. **Verify device is powered on**:
   - Check ESP32 power LED
   - Check device display

2. **Verify device is on same network**:
   - Check WiFi connection
   - Check IP address
   - Ping device from client machine

3. **Check UDP broadcast**:
   ```python
   # Test UDP discovery
   import socket
   
   sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
   sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
   sock.sendto(b'DISCOVER', ('255.255.255.255', 8888))
   
   data, addr = sock.recvfrom(1024)
   print(f"Device found at {addr}: {data}")
   ```

4. **Check firewall**:
   ```bash
   # Allow UDP broadcast
   # Windows:
   netsh advfirewall firewall add rule name="NIC Device Discovery" dir=in action=allow protocol=UDP localport=8888
   
   # Linux:
   ufw allow 8888/udp
   ```

5. **Restart device service**:
   ```bash
   systemctl restart nic-device-service
   ```

---

### Issue: QR not displaying on device

**Symptoms**:
- QR code sent but not showing on device
- Device shows old QR code
- Device screen blank

**Diagnosis**:
```bash
# Check device service logs
tail -f /var/log/nic-device-service.log

# Test device HTTP endpoint
curl http://<device-ip>/display-qr \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"qr_url":"https://example.com/qr/test"}'
```

**Solutions**:

1. **Verify device is online**:
   ```bash
   ping <device-ip>
   ```

2. **Check device HTTP server**:
   ```bash
   curl http://<device-ip>/status
   ```

3. **Restart ESP32 device**:
   - Power cycle device
   - Wait 30 seconds
   - Try again

4. **Check QR code format**:
   - Verify QR code URL is valid
   - Verify QR code image is accessible
   - Test QR code with phone scanner

5. **Clear device display**:
   ```bash
   curl http://<device-ip>/clear \
     -X POST
   ```

---

### Issue: Multiple devices conflict

**Symptoms**:
- QR code sent to wrong device
- Multiple devices showing same QR
- Device selection not working

**Diagnosis**:
```bash
# Check device registry
cat device_data/device-registry.json

# Check for duplicate MAC addresses
```

**Solutions**:

1. **Verify device IDs are unique**:
   ```javascript
   // Check device registry
   const devices = JSON.parse(fs.readFileSync('device_data/device-registry.json'));
   const macAddresses = devices.map(d => d.mac_address);
   const duplicates = macAddresses.filter((mac, index) => macAddresses.indexOf(mac) !== index);
   console.log('Duplicates:', duplicates);
   ```

2. **Unlink and relink devices**:
   - Unlink all devices
   - Clear device registry
   - Relink devices one by one

3. **Check device selection in UI**:
   ```javascript
   // Verify correct device ID is sent
   console.log('Selected device:', selectedDeviceId);
   ```

---

## Deployment Issues

### Issue: Build fails on Netlify

**Symptoms**:
- Netlify build fails
- "Build failed" notification
- Site not deploying

**Diagnosis**:
```bash
# Check Netlify build logs
# Navigate to Netlify dashboard → Deploys → Failed deploy → View logs
```

**Solutions**:

1. **Check Node version**:
   ```bash
   # In Netlify settings, set Node version
   # Site settings → Build & deploy → Environment → Node version
   # Set to: 16
   ```

2. **Check environment variables**:
   ```bash
   # Verify all VITE_ variables are set
   # Site settings → Environment variables
   ```

3. **Check build command**:
   ```bash
   # Should be: npm run build
   # Site settings → Build & deploy → Build settings
   ```

4. **Clear cache and rebuild**:
   ```bash
   # In Netlify dashboard
   # Deploys → Trigger deploy → Clear cache and deploy site
   ```

---

### Issue: Backend service won't start on VPS

**Symptoms**:
- Service fails to start
- Service crashes immediately
- No logs generated

**Diagnosis**:
```bash
# Check service status
systemctl status nic-reminder

# Check logs
journalctl -u nic-reminder -n 50 --no-pager

# Check for errors
grep -i error /var/log/nic-reminder.log
```

**Solutions**:

1. **Check port availability**:
   ```bash
   # Check if port is in use
   lsof -i :3000
   
   # Kill process if needed
   kill -9 <PID>
   ```

2. **Check environment variables**:
   ```bash
   # Verify .env file
   cat /opt/nic-callcenter/.env
   
   # Check for missing variables
   ```

3. **Check file permissions**:
   ```bash
   # Ensure files are readable
   chmod +x /opt/nic-callcenter/*.cjs
   
   # Check ownership
   chown -R root:root /opt/nic-callcenter
   ```

4. **Check dependencies**:
   ```bash
   cd /opt/nic-callcenter
   npm install
   ```

5. **Restart service**:
   ```bash
   systemctl daemon-reload
   systemctl restart nic-reminder
   ```

---

### Issue: Railway deployment fails

**Symptoms**:
- Railway build fails
- Deployment crashes
- Webhook not responding

**Diagnosis**:
```bash
# Check Railway logs
# Railway dashboard → Logs tab
```

**Solutions**:

1. **Check environment variables**:
   ```bash
   # Verify all variables are set in Railway
   # Project → Variables tab
   ```

2. **Check start command**:
   ```bash
   # Should be: node webhookcode-enhanced.js
   # Project → Settings → Start Command
   ```

3. **Check build logs**:
   ```bash
   # Look for errors in build process
   # Railway dashboard → Deployments → Build logs
   ```

4. **Redeploy**:
   ```bash
   # Trigger manual redeploy
   # Railway dashboard → Deployments → Redeploy
   ```

---

## Debug Procedures

### How to Check Service Logs

**VPS Services**:
```bash
# View logs in real-time
tail -f /var/log/nic-reminder.log

# View last 100 lines
tail -n 100 /var/log/nic-reminder.log

# Search for errors
grep -i error /var/log/nic-reminder.log

# View logs with systemd
journalctl -u nic-reminder -f
```

**Railway Webhook**:
```bash
# Railway dashboard → Logs tab
# Filter by severity: Error, Warning, Info
```

**Netlify Frontend**:
```bash
# Netlify dashboard → Deploys → Deploy log
# Check for build errors
```

### How to Test API Endpoints

**Using curl**:
```bash
# Test login
curl -X POST https://api.xano.io/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@nic.mu","password":"test123"}'

# Test with authentication
curl -X GET https://api.xano.io/customers \
  -H "Authorization: Bearer <token>"
```

**Using Postman**:
1. Import API collection
2. Set environment variables
3. Test endpoints
4. Check responses

**Using Browser DevTools**:
1. Open DevTools (F12)
2. Navigate to Network tab
3. Filter by XHR/Fetch
4. Click on request
5. View request/response

### How to Inspect Database Records

**Xano Dashboard**:
1. Login to Xano
2. Navigate to Database → Tables
3. Select table
4. View records
5. Edit/delete as needed

**SQL Query** (if direct access):
```sql
-- View recent customers
SELECT * FROM customers
ORDER BY created_at DESC
LIMIT 10;

-- View payment plans with installments
SELECT pp.*, COUNT(i.id) as installment_count
FROM payment_plans pp
LEFT JOIN installments i ON i.payment_plan_id = pp.id
GROUP BY pp.id;
```

### How to Trace Email Delivery

**Brevo Dashboard**:
1. Login to Brevo
2. Navigate to Logs → Email Logs
3. Search by email address
4. View delivery status
5. Check for bounces/blocks

**Check Email Status**:
```bash
# Use Brevo API
curl -X GET "https://api.brevo.com/v3/smtp/statistics/events?email=customer@example.com" \
  -H "api-key: your-brevo-api-key"
```

### How to Monitor System Health

**Check Service Status**:
```bash
# All services
systemctl status nic-*

# Specific service
systemctl status nic-reminder
```

**Check System Resources**:
```bash
# CPU and memory
top

# Disk usage
df -h

# Network connections
netstat -tulpn | grep node
```

**Check API Health**:
```bash
# Frontend
curl https://nic-callcenter.netlify.app

# Webhook
curl https://nic-webhook.railway.app/health

# Xano
curl https://api.xano.io/health
```

---

## Service Restart Procedures

### Restart Reminder Service

```bash
# SSH to VPS
ssh root@your-vps-ip

# Restart service
systemctl restart nic-reminder

# Check status
systemctl status nic-reminder

# View logs
tail -f /var/log/nic-reminder.log
```

### Restart All Services

```bash
# Restart all NIC services
systemctl restart nic-*

# Check all statuses
systemctl status nic-*
```

### Restart Frontend (Netlify)

```bash
# Option 1: Trigger redeploy
# Netlify dashboard → Deploys → Trigger deploy

# Option 2: Push to Git
git push origin main
```

### Restart Webhook (Railway)

```bash
# Railway dashboard → Deployments → Redeploy
```

---

## Log Locations

### Frontend Logs
- **Browser Console**: F12 → Console tab
- **Netlify Deploy Logs**: Netlify dashboard → Deploys → Deploy log

### Backend Service Logs
- **Reminder Service**: `/var/log/nic-reminder.log`
- **Payment Notification**: `/var/log/nic-payment-notification.log`
- **Device Service**: `/var/log/nic-device-service.log`
- **AOD Upload**: `/var/log/nic-aod-upload.log`

### Third-Party Logs
- **Xano**: Xano dashboard → Logs
- **Railway**: Railway dashboard → Logs tab
- **Brevo**: Brevo dashboard → Logs → Email Logs

### System Logs
```bash
# Systemd logs
journalctl -u nic-reminder -n 100

# System log
tail -f /var/log/syslog

# Auth log
tail -f /var/log/auth.log
```

---

## Emergency Contacts

### Internal Team
- **Team Lead**: [Name] - [Email] - [Phone]
- **DevOps**: [Name] - [Email] - [Phone]
- **On-Call**: [Rotation schedule]

### Service Providers
- **Netlify Support**: support@netlify.com
- **Railway Support**: team@railway.app
- **Xano Support**: support@xano.com
- **Brevo Support**: support@brevo.com
- **ZwennPay Support**: [Contact info]
- **VPS Provider**: [Provider support]

### Escalation Procedure

1. **Level 1**: Check this troubleshooting guide
2. **Level 2**: Contact team lead
3. **Level 3**: Contact service provider support
4. **Level 4**: Emergency escalation to management

---

## Quick Reference Commands

```bash
# Check all services
systemctl status nic-*

# Restart all services
systemctl restart nic-*

# View logs
tail -f /var/log/nic-*.log

# Check API
curl https://api.xano.io/health

# Check disk space
df -h

# Check memory
free -h

# Check processes
ps aux | grep node

# Kill process
kill -9 <PID>
```

---

**Document Version**: 1.0  
**Last Updated**: February 4, 2026  
**Maintained By**: Development Team
