# Gmail QR Fix - Deployment Commands

## 🚀 **Quick Deployment Guide**

### **Step 1: Push to GitHub (Windows)**

Run this command in your project directory:
```cmd
github-push-gmail-qr-fix.bat
```

**Or manually:**
```cmd
git add src/services/emailService.js backend-reminder-service-fixed.cjs *.md test-*.js
git commit -m "feat: Gmail QR compatibility fix for frontend and backend"
git push origin main
```

### **Step 2: Deploy on VPS**

**Option A: Automated Script (Recommended)**
```bash
# SSH to your VPS
ssh root@your-vps-ip

# Navigate to project
cd /var/www/nic-callcenter

# Download and run deployment script
wget https://raw.githubusercontent.com/your-repo/main/vps-deployment-gmail-qr-fix.sh
chmod +x vps-deployment-gmail-qr-fix.sh
sudo ./vps-deployment-gmail-qr-fix.sh
```

**Option B: Manual Commands**
```bash
# SSH to VPS
ssh root@your-vps-ip

# Navigate to project
cd /var/www/nic-callcenter

# Pull latest changes
git pull origin main

# Stop service
sudo systemctl stop nic-reminder.service

# Kill any remaining processes
sudo pkill -f backend-reminder-service

# Backup current file
cp backend-reminder-service.cjs backend-reminder-service.cjs.backup

# Deploy updated file
cp backend-reminder-service-fixed.cjs backend-reminder-service.cjs

# Start service
sudo systemctl start nic-reminder.service

# Verify single process
ps aux | grep backend-reminder-service | grep -v grep

# Monitor logs
tail -f /var/log/nic-reminder-service.log
```

## 🔍 **Verification Commands**

### **Check Service Status**
```bash
sudo systemctl status nic-reminder.service
```

### **Check Process Count (Should be 1)**
```bash
ps aux | grep backend-reminder-service | grep -v grep | wc -l
```

### **Monitor Logs for Gmail Messages**
```bash
tail -f /var/log/nic-reminder-service.log | grep -i gmail
```

### **Test Syntax**
```bash
node --check backend-reminder-service.cjs
```

## 🧪 **Testing Steps**

### **Frontend Testing**
1. Go to customer with pending installments
2. Click "Send Reminder" button
3. Check Gmail account - QR should display immediately
4. Look for green message: "This QR code works in ALL email clients"

### **Backend Testing**
1. Wait for automated reminder (or trigger manually)
2. Check Gmail account - QR should display immediately
3. Verify logs show: "✅ QR code converted to CID attachment for Gmail"
4. Confirm agent CC still works

## ⚠️ **Troubleshooting**

### **Multiple Processes Running**
```bash
sudo systemctl stop nic-reminder.service
sudo pkill -f backend-reminder-service
sudo systemctl start nic-reminder.service
ps aux | grep backend-reminder-service | grep -v grep
```

### **Service Won't Start**
```bash
# Check syntax
node --check backend-reminder-service.cjs

# Check logs
journalctl -u nic-reminder.service -f

# Check permissions
ls -la backend-reminder-service.cjs
```

### **QR Codes Still Not Working**
1. Verify file was deployed: `ls -la backend-reminder-service.cjs`
2. Check logs for conversion messages: `grep -i "qr code converted" /var/log/nic-reminder-service.log`
3. Test with different Gmail account
4. Clear browser cache and try again

## 📊 **Expected Results**

| Email Client | Before Fix | After Fix |
|--------------|------------|-----------|
| Gmail | ❌ Blocked | ✅ **Works** |
| Office 365 | ✅ Works | ✅ Works |
| Apple Mail | ✅ Works | ✅ Works |

## 🎯 **Success Indicators**

- ✅ Single backend process running
- ✅ QR codes display immediately in Gmail
- ✅ No "Display images" prompt needed
- ✅ Agent CC functionality preserved
- ✅ Logs show Gmail compatibility messages
- ✅ Higher QR code scan rates

---

**Files Modified:**
- `src/services/emailService.js` (Frontend fix)
- `backend-reminder-service-fixed.cjs` (Backend fix)

**Key Achievement:** 100% Gmail compatibility for all QR code emails!