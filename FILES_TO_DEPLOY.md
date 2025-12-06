# Files Modified - CC and Reply-To Feature

## Modified Files (Need to be deployed)

### 1. Core Service
- `src/services/emailService.js`
  - Added agent email/name parameters
  - Added CC and Reply-To logic
  - Updated email templates with agent contact info

### 2. UI Components
- `src/components/sales/LOBDashboard.jsx`
  - Updated handleSendEmail to pass agent info
  
- `src/pages/customers/CustomerDetail.jsx`
  - Updated sendEmailMutation to pass agent info

### 3. Documentation (Optional - for reference)
- `PAYMENT_REMINDER_CC_REPLYTO_FEATURE.md` (NEW)
- `DEPLOYMENT_CHECKLIST_CC_REPLYTO.md` (NEW)
- `FILES_TO_DEPLOY.md` (NEW - this file)

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

# Method 2: Manual SCP
scp -r dist/* user@your-vps:/var/www/nic-callcenter/dist/

# Method 3: Using rsync
rsync -avz --delete dist/ user@your-vps:/var/www/nic-callcenter/dist/
```

## Quick Verification

After deployment, verify these files exist on VPS:
```bash
# On VPS
ls -la /var/www/nic-callcenter/dist/assets/*.js
# Should show newly built JS files with recent timestamp
```

## Git Commit Message (Suggested)

```
feat: Add CC and Reply-To for payment reminder emails

- Updated emailService to support agent CC and Reply-To
- Modified LOBDashboard to pass agent info when sending emails
- Modified CustomerDetail to pass agent info when sending emails
- Added agent contact section to payment reminder email templates
- Agents now receive CC on all payment reminders they send
- Customers can reply directly to their assigned agent

Closes: #[ticket-number]
```

## Summary

**Total Files Modified:** 3 core files
**Database Changes:** None
**Backend Changes:** None
**Breaking Changes:** None
**Backward Compatible:** Yes

All changes are frontend-only and backward compatible.
