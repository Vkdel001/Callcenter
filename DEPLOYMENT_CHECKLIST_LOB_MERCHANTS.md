# 🚀 Deployment Checklist - LOB-Specific Merchant Codes

## ✅ **Implementation Complete**

All code changes have been implemented and tested successfully.

---

## 📋 **Changes Made**

### **1. Environment Variables**
- ✅ Updated `.env` with LOB-specific merchant codes
- ✅ Updated `.env.production.template` with LOB-specific merchant codes

### **2. Code Changes**
- ✅ Modified `src/services/qrService.js`:
  - Added `getMerchantIdForLOB()` method
  - Updated `generatePaymentQR()` to use LOB-specific merchant
  - Updated `generateTestQR()` to use LOB-specific merchant
  - Added merchant code configuration in constructor

### **3. Documentation**
- ✅ Created `LOB_MERCHANT_CODES.md` - Complete implementation guide
- ✅ Created `test-lob-merchant-codes.js` - Test script
- ✅ Created `DEPLOYMENT_CHECKLIST_LOB_MERCHANTS.md` - This file

### **4. Testing**
- ✅ All 10 test cases passed
- ✅ Verified merchant code selection for Life, Health, Motor
- ✅ Verified fallback behavior for missing/unknown LOB

---

## 🎯 **Merchant Code Mapping**

| Line of Business | Merchant Code | Environment Variable |
|------------------|---------------|---------------------|
| Life Insurance | 56 | `VITE_ZWENNPAY_MERCHANT_LIFE` |
| Health Insurance | 153 | `VITE_ZWENNPAY_MERCHANT_HEALTH` |
| Motor Insurance | 155 | `VITE_ZWENNPAY_MERCHANT_MOTOR` |

---

## 📦 **Deployment Steps**

### **Step 1: Push to GitHub**

```powershell
# Check status
git status

# Add all changes
git add .env .env.production.template src/services/qrService.js
git add LOB_MERCHANT_CODES.md test-lob-merchant-codes.js DEPLOYMENT_CHECKLIST_LOB_MERCHANTS.md

# Commit
git commit -m "Add LOB-specific merchant codes for ZwennPay QR generation (Life: 56, Health: 153, Motor: 155)"

# Push to GitHub
git push origin main
```

### **Step 2: Deploy to VPS**

```bash
# 1. SSH to VPS
ssh root@your-vps-ip

# 2. Navigate to project
cd /var/www/nic-callcenter

# 3. Pull latest code
git pull origin main

# 4. Update .env file with new merchant codes
nano /var/www/nic-callcenter/.env

# Add/Replace these lines:
# VITE_ZWENNPAY_MERCHANT_LIFE=56
# VITE_ZWENNPAY_MERCHANT_HEALTH=153
# VITE_ZWENNPAY_MERCHANT_MOTOR=155

# Save and exit (Ctrl+X, Y, Enter)

# 5. Build application
npm run build

# 6. Reload Nginx
sudo systemctl reload nginx

# 7. Verify deployment
curl -I https://payments.niclmauritius.site
```

### **Step 3: Verify in Production**

```bash
# Open browser and navigate to your application
# Open browser console (F12)

# Generate QR codes for different LOBs:
# 1. Life Insurance customer - Check console for: 🏦 Merchant ID selected: 56 for LOB: life
# 2. Health Insurance customer - Check console for: 🏦 Merchant ID selected: 153 for LOB: health
# 3. Motor Insurance customer - Check console for: 🏦 Merchant ID selected: 155 for LOB: motor
```

---

## ✅ **Verification Checklist**

### **Pre-Deployment**
- [x] All tests passed locally
- [x] Code reviewed and approved
- [x] Documentation created
- [x] Environment variables configured

### **During Deployment**
- [ ] Code pushed to GitHub successfully
- [ ] VPS pulled latest code
- [ ] .env file updated with new merchant codes
- [ ] Application built successfully
- [ ] Nginx reloaded without errors

### **Post-Deployment**
- [ ] Website loads correctly
- [ ] Life Insurance QR uses merchant 56
- [ ] Health Insurance QR uses merchant 153
- [ ] Motor Insurance QR uses merchant 155
- [ ] Console logs show correct merchant selection
- [ ] QR codes scan correctly
- [ ] No errors in browser console
- [ ] No errors in Nginx logs

---

## 🧪 **Testing in Production**

### **Test Case 1: Life Insurance**
```
Customer: John Smith
Policy: LIFE-001
LOB: life
Expected Merchant: 56

Steps:
1. Navigate to customer detail page
2. Click "Generate QR Code"
3. Check console: Should show "🏦 Merchant ID selected: 56 for LOB: life"
4. Scan QR code with mobile banking app
5. Verify payment goes to Life Insurance merchant account
```

### **Test Case 2: Health Insurance**
```
Customer: Mary Johnson
Policy: HEALTH/2024/002
LOB: health
Expected Merchant: 153

Steps:
1. Navigate to customer detail page
2. Click "Generate QR Code"
3. Check console: Should show "🏦 Merchant ID selected: 153 for LOB: health"
4. Scan QR code with mobile banking app
5. Verify payment goes to Health Insurance merchant account
```

### **Test Case 3: Motor Insurance**
```
Customer: David Brown
Policy: M-2024-003
LOB: motor
Expected Merchant: 155

Steps:
1. Navigate to customer detail page
2. Click "Generate QR Code"
3. Check console: Should show "🏦 Merchant ID selected: 155 for LOB: motor"
4. Scan QR code with mobile banking app
5. Verify payment goes to Motor Insurance merchant account
```

---

## 🔍 **Monitoring**

### **What to Monitor**
1. **Console Logs** - Check for merchant code selection messages
2. **QR Generation Success Rate** - Ensure no failures
3. **Payment Routing** - Verify payments go to correct merchant accounts
4. **Error Logs** - Check Nginx and browser console for errors

### **Console Log Examples**
```javascript
// Successful merchant selection
🏦 Merchant ID selected: 56 for LOB: life
🏦 Merchant ID selected: 153 for LOB: health
🏦 Merchant ID selected: 155 for LOB: motor

// Fallback to default (Life)
🏦 Merchant ID selected: 56 for LOB: undefined
🏦 Merchant ID selected: 56 for LOB: unknown
```

---

## 🐛 **Troubleshooting**

### **Issue: All QR codes use merchant 56**

**Cause:** Environment variables not set or not loaded

**Solution:**
```bash
# Check .env file
cat /var/www/nic-callcenter/.env | grep MERCHANT

# Should show:
# VITE_ZWENNPAY_MERCHANT_LIFE=56
# VITE_ZWENNPAY_MERCHANT_HEALTH=153
# VITE_ZWENNPAY_MERCHANT_MOTOR=155

# If missing, add them and rebuild
nano /var/www/nic-callcenter/.env
npm run build
sudo systemctl reload nginx
```

### **Issue: Customer has no lineOfBusiness field**

**Cause:** Customer data missing LOB information

**Solution:**
- System defaults to Life (merchant 56) - safe fallback
- Update customer data in database to include LOB
- Verify customer upload includes LOB field

### **Issue: Wrong merchant code used**

**Cause:** LOB value doesn't match expected values

**Solution:**
```javascript
// Check customer data
console.log('Customer LOB:', customerData.lineOfBusiness)

// Valid values: 'life', 'health', 'motor' (case-insensitive)
// Invalid values default to 'life' (merchant 56)
```

---

## 📞 **Support Contacts**

### **Technical Issues**
- Check console logs for merchant selection
- Run test script: `node test-lob-merchant-codes.js`
- Review `LOB_MERCHANT_CODES.md` documentation

### **ZwennPay Integration**
- Verify merchant codes 153 and 155 are activated
- Test QR codes with actual payment gateway
- Contact ZwennPay support if payment routing issues

### **Business Questions**
- Confirm merchant codes with finance team
- Verify payment routing to correct accounts
- Review reconciliation reports

---

## 📊 **Success Criteria**

✅ **Deployment Successful If:**
1. All three merchant codes work correctly
2. Console logs show correct merchant selection
3. QR codes scan successfully
4. Payments route to correct merchant accounts
5. No errors in browser or server logs
6. Backward compatibility maintained (old QRs still work)

---

## 🎉 **Completion**

Once all checklist items are verified:
- [ ] Mark deployment as complete
- [ ] Notify stakeholders
- [ ] Monitor for 24 hours
- [ ] Document any issues encountered
- [ ] Update runbook if needed

---

**Deployment Date**: _________________  
**Deployed By**: _________________  
**Verified By**: _________________  
**Status**: ⏳ Pending / ✅ Complete / ❌ Issues

---

**Last Updated**: November 19, 2025  
**Version**: 1.0  
**Next Review**: After first production deployment
