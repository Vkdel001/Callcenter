# Contact Update Feature - Deployment Guide

**Date**: November 29, 2024  
**Feature**: Customer Contact Information Update with Email/Amount Correction  
**Status**: ✅ Ready for Production Deployment

---

## 📋 Pre-Deployment Checklist

### 1. Xano Database Setup
- ✅ Table `nic_customer_contact_updates` created
- ✅ API endpoints configured
- ✅ API key added to environment variables

### 2. Environment Variables
Ensure these are set in your VPS `.env` file:

```bash
VITE_XANO_CONTACT_UPDATE_API=jj0IjsgD
```

### 3. Code Changes Committed
- ✅ Commit: `120d48a` - "feat: Add contact update feature with email/amount correction"
- ✅ Pushed to GitHub main branch

---

## 🚀 VPS Deployment Steps

### Step 1: SSH into VPS

```bash
ssh root@your-vps-ip
# Or use your configured SSH alias
```

### Step 2: Navigate to Application Directory

```bash
cd /var/www/callcenter
# Or wherever your app is deployed
```

### Step 3: Pull Latest Changes

```bash
git pull origin main
```

Expected output:
```
remote: Enumerating objects: 26, done.
remote: Counting objects: 100% (26/26), done.
...
Updating 4acd49c..120d48a
Fast-forward
 9 files changed, 2840 insertions(+), 19 deletions(-)
```

### Step 4: Install Dependencies (if needed)

```bash
npm install
```

### Step 5: Build for Production

```bash
npm run build
```

This will create optimized production files in the `dist/` directory.

### Step 6: Restart Web Server

**For Nginx:**
```bash
sudo systemctl restart nginx
```

**For PM2 (if using):**
```bash
pm2 restart callcenter
```

### Step 7: Clear Browser Cache

After deployment, users should:
1. Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Or clear browser cache completely

---

## ✅ Post-Deployment Verification

### 1. Test Contact Update Feature

1. **Login as Agent**
   - Navigate to any customer detail page
   - Click "Update Contact" button
   - Modal should open

2. **Update Customer Info**
   - Enter new email: `test@example.com`
   - Enter new amount: `1000`
   - Select reason: "Customer provided new contact"
   - Click "Save & Continue"
   - Should see success message

3. **Generate QR Code**
   - Click "Generate QR" button
   - QR should show amount: `1000` (updated amount)
   - Check console for any errors

4. **Send Email**
   - Click "Send via Email" button
   - Email should:
     - Go to: `test@example.com` (updated email)
     - Show amount: `MUR 1,000` (updated amount)
     - Show policy number (not "undefined")
     - Display QR code inline (no "Display images" needed)

### 2. Test Admin Report (if implemented)

1. **Login as Admin**
2. **Navigate to**: Admin → Contact Updates
3. **Verify**:
   - All updates are displayed
   - Filters work (status, date, agent)
   - Export to CSV works
   - Mark as synced works

---

## 🐛 Troubleshooting

### Issue: "Update Contact" button not showing

**Solution:**
```bash
# Clear browser cache
Ctrl + Shift + R

# Or check if build completed successfully
npm run build
```

### Issue: Email not going to updated address

**Check:**
1. Browser console for errors
2. Xano API key is correct in `.env`
3. Contact update was saved successfully

**Debug:**
```javascript
// In browser console
localStorage.getItem('user')  // Check user is logged in
```

### Issue: QR code not showing in email

**Check:**
1. Email service (Brevo) is configured correctly
2. QR code generation is working
3. Gmail may need "Display images" clicked (first time only)

### Issue: Wrong amount showing

**Check:**
1. Multiple updates exist for customer
2. Latest update has correct `created_at` timestamp
3. Browser console shows correct amount being used

---

## 📊 Monitoring

### Key Metrics to Watch

1. **Contact Update Creation Rate**
   - Monitor Xano table for new records
   - Expected: 10-50 updates per day (depending on agent activity)

2. **Email Delivery Success**
   - Check Brevo dashboard for email delivery rates
   - Expected: >95% delivery success

3. **Error Rates**
   - Monitor browser console for JavaScript errors
   - Monitor server logs for API errors

### Xano Monitoring

```sql
-- Check total updates
SELECT COUNT(*) FROM nic_customer_contact_updates;

-- Check pending updates
SELECT COUNT(*) FROM nic_customer_contact_updates WHERE status = 'pending';

-- Check updates by agent
SELECT agent_name, COUNT(*) as update_count 
FROM nic_customer_contact_updates 
GROUP BY agent_name 
ORDER BY update_count DESC;
```

---

## 🔄 Rollback Plan

If issues occur after deployment:

### Option 1: Revert Git Commit

```bash
cd /var/www/callcenter
git revert 120d48a
npm run build
sudo systemctl restart nginx
```

### Option 2: Restore Previous Build

```bash
cd /var/www/callcenter
git checkout 4acd49c  # Previous commit
npm run build
sudo systemctl restart nginx
```

### Option 3: Disable Feature

In Xano, you can disable the API endpoint temporarily without code changes.

---

## 📝 Known Limitations

1. **Xano `captured_at` Field Issue**
   - The `captured_at` field is set to `0` (Unix epoch)
   - Workaround: Using `created_at` field instead for sorting
   - Future: Fix Xano table default value for `captured_at`

2. **No Approval Workflow**
   - Updates are used immediately (no admin approval)
   - Phase 2 will add approval workflow if needed

3. **No Master System Sync**
   - Updates stored in Xano only
   - Admin must manually export and sync to master system
   - Phase 3 will add automated sync

---

## 🎯 Success Criteria

Deployment is successful if:

- ✅ Agents can update customer contact info
- ✅ Updated info is used for QR generation
- ✅ Updated info is used for email sending
- ✅ Emails display correctly with QR codes
- ✅ Admin can view and export updates
- ✅ No JavaScript errors in console
- ✅ No increase in error rates

---

## 📞 Support

If you encounter issues during deployment:

1. **Check logs**: Browser console and server logs
2. **Verify environment**: `.env` file has correct API keys
3. **Test locally**: Ensure feature works in development
4. **Contact support**: Share error messages and screenshots

---

**Deployment Completed By**: _________________  
**Date**: _________________  
**Time**: _________________  
**Status**: ⬜ Success  ⬜ Issues (describe below)

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

