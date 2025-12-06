# Deployment Checklist - CC and Reply-To Feature

## Pre-Deployment

### Code Review
- [x] emailService.js updated with CC and Reply-To logic
- [x] LOBDashboard.jsx passes agent info
- [x] CustomerDetail.jsx passes agent info
- [x] No syntax errors (verified with getDiagnostics)
- [x] Code formatted and cleaned

### Local Testing
- [ ] Test Quick QR email generation
- [ ] Test payment reminder from LOB Dashboard
- [ ] Test payment reminder from Customer Detail
- [ ] Verify agent receives CC
- [ ] Verify Reply-To header works
- [ ] Test with different user roles

### Documentation
- [x] Feature documentation created
- [x] Deployment guide created
- [x] Changes documented

## Deployment Steps

### Step 1: Backup Current Production
```bash
# On VPS
cd /var/www/nic-callcenter/
cp -r dist dist.backup.$(date +%Y%m%d_%H%M%S)
```

### Step 2: Build Production Bundle
```bash
# On local machine
npm run build
```

### Step 3: Deploy to VPS
```bash
# Using deploy script
./deploy.sh

# OR manually
scp -r dist/* user@your-vps:/var/www/nic-callcenter/dist/
```

### Step 4: Verify Deployment
- [ ] Application loads without errors
- [ ] Login works
- [ ] Dashboard loads
- [ ] Quick QR Generator accessible

## Post-Deployment Testing

### Test 1: Quick QR Email (New Policy)
- [ ] Login as sales agent
- [ ] Go to Quick QR Generator
- [ ] Generate QR for test customer
- [ ] Send email
- [ ] Verify agent receives CC
- [ ] Verify customer receives email
- [ ] Verify Reply-To is agent's email
- [ ] Test replying to email

### Test 2: Payment Reminder (LOB Dashboard)
- [ ] Login as sales agent
- [ ] Go to LOB Dashboard
- [ ] Select a customer with outstanding payment
- [ ] Generate QR
- [ ] Send email
- [ ] Verify agent receives CC
- [ ] Verify customer receives email
- [ ] Verify Reply-To is agent's email

### Test 3: Payment Reminder (Customer Detail)
- [ ] Login as agent
- [ ] Go to Customer Detail page
- [ ] Generate QR
- [ ] Send email
- [ ] Verify agent receives CC
- [ ] Verify customer receives email
- [ ] Verify Reply-To is agent's email

### Test 4: Different Roles
- [ ] Test with sales_agent role
- [ ] Test with internal_agent role
- [ ] Test with csr role
- [ ] Test with call_center role

### Test 5: Different LOBs
- [ ] Test with Life insurance
- [ ] Test with Health insurance
- [ ] Test with General insurance

## Monitoring

### Immediate (First Hour)
- [ ] Check browser console for errors
- [ ] Monitor Brevo dashboard for email delivery
- [ ] Check agent feedback
- [ ] Monitor error logs

### First Day
- [ ] Verify email delivery rates
- [ ] Check for any reported issues
- [ ] Monitor CC functionality
- [ ] Verify Reply-To working

### First Week
- [ ] Gather agent feedback
- [ ] Check email engagement rates
- [ ] Monitor for any edge cases
- [ ] Document any issues

## Rollback Procedure

If critical issues occur:

### Quick Rollback
```bash
# On VPS
cd /var/www/nic-callcenter/
rm -rf dist
cp -r dist.backup.YYYYMMDD_HHMMSS dist
# Restart nginx if needed
sudo systemctl restart nginx
```

### Verify Rollback
- [ ] Application loads
- [ ] Emails send without CC (old behavior)
- [ ] No errors in console

## Success Criteria

- [ ] All emails send successfully
- [ ] Agents receive CC copies
- [ ] Reply-To headers work correctly
- [ ] No increase in error rates
- [ ] Agent feedback is positive
- [ ] Customer emails delivered

## Issues Log

| Date | Issue | Resolution | Status |
|------|-------|------------|--------|
|      |       |            |        |

## Sign-off

- [ ] Deployment completed by: ________________
- [ ] Testing completed by: ________________
- [ ] Approved by: ________________
- [ ] Date: ________________

## Notes

Add any deployment notes here:
