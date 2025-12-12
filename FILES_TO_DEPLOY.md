# Files Modified - CC and Reply-To Feature + AOD Logo Fix

## Modified Files (Need to be deployed)

### 1. Core Service
- `src/services/emailService.js`
  - Added agent email/name parameters
  - Added CC and Reply-To logic
  - Updated email templates with agent contact info

- `src/services/aodPdfService.js`
  - Updated logo loading paths for web deployment
  - Added better error logging for logo loading
  - Fixed logo accessibility on server

### 2. UI Components
- `src/components/sales/LOBDashboard.jsx`
  - Updated handleSendEmail to pass agent info
  
- `src/pages/customers/CustomerDetail.jsx`
  - Updated sendEmailMutation to pass agent info

### 3. Static Assets (CRITICAL - Must be deployed)
- `public/NIC_LOGO.png` (NEW - Required for AOD PDF logo)
- `public/images/NIC_LOGO.png` (NEW - Alternative path for logo)

### 4. Documentation (Optional - for reference)
- `PAYMENT_REMINDER_CC_REPLYTO_FEATURE.md` (NEW)
- `DEPLOYMENT_CHECKLIST_CC_REPLYTO.md` (NEW)
- `FILES_TO_DEPLOY.md` (UPDATED - this file)
- `test-aod-logo-fix.js` (NEW - for testing)

## Unchanged Files (No deployment needed)

These files were NOT modified:
- `src/pages/QuickQRGenerator.jsx` (already had options support)
- `src/services/customerService.js` (no changes needed)
- All other files remain unchanged

## Deployment Command

```bash
# Build production bundle
npm run build

# Deploy to VPS (choose one method)

# Method 1: Using deploy script
./deploy.sh

# Method 2: Manual SCP (IMPORTANT: Include public folder)
scp -r dist/* user@your-vps:/var/www/nic-callcenter/dist/
scp public/NIC_LOGO.png user@your-vps:/var/www/nic-callcenter/dist/NIC_LOGO.png
scp -r public/images/* user@your-vps:/var/www/nic-callcenter/dist/images/

# Method 3: Using rsync (Recommended - includes all files)
rsync -avz --delete dist/ user@your-vps:/var/www/nic-callcenter/dist/
rsync -avz public/NIC_LOGO.png user@your-vps:/var/www/nic-callcenter/dist/
rsync -avz public/images/ user@your-vps:/var/www/nic-callcenter/dist/images/
```

## Quick Verification

After deployment, verify these files exist on VPS:
```bash
# On VPS - Check JS files
ls -la /var/www/nic-callcenter/dist/assets/*.js
# Should show newly built JS files with recent timestamp

# CRITICAL - Check logo files exist
ls -la /var/www/nic-callcenter/dist/NIC_LOGO.png
ls -la /var/www/nic-callcenter/dist/images/NIC_LOGO.png
# Both should exist for AOD PDF logo to work

# Test logo accessibility via web
curl -I http://your-domain/NIC_LOGO.png
curl -I http://your-domain/images/NIC_LOGO.png
# Should return 200 OK, not 404
```

## Git Commit Message (Suggested)

```
feat: Add CC/Reply-To for emails + Fix AOD PDF logo on server

Email Features:
- Updated emailService to support agent CC and Reply-To
- Modified LOBDashboard to pass agent info when sending emails
- Modified CustomerDetail to pass agent info when sending emails
- Added agent contact section to payment reminder email templates
- Agents now receive CC on all payment reminders they send
- Customers can reply directly to their assigned agent

AOD Logo Fix:
- Fixed logo not showing in AOD agreement on server
- Added NIC_LOGO.png to public folder for web accessibility
- Updated logo loading paths in aodPdfService
- Added better error logging for logo loading issues

Closes: #[ticket-number]
```

## Summary

**Total Files Modified:** 4 core files + 2 static assets
**Database Changes:** None
**Backend Changes:** None
**Breaking Changes:** None
**Backward Compatible:** Yes

### Changes Breakdown:
- **Email CC/Reply-To**: 3 frontend files modified
- **AOD Logo Fix**: 1 service file + 2 logo assets added
- **Critical**: Logo files MUST be deployed to public folder

All changes are frontend-only and backward compatible.

### ⚠️ DEPLOYMENT CRITICAL
The AOD logo issue will only be fixed after:
1. `public/NIC_LOGO.png` is deployed to server
2. `public/images/NIC_LOGO.png` is deployed to server  
3. Files are accessible via web (not 404)

**Test after deployment**: Generate an AOD PDF to verify logo appears.
