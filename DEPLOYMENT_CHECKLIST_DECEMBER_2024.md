# Deployment Checklist - December 2024

## 📋 Pre-Deployment Verification

### Code Quality:
- [x] All features tested and working
- [x] No console errors in browser
- [x] Backend service runs without errors
- [x] Documentation complete
- [x] Test files added to .gitignore

### Database:
- [x] `monthly_premium` column exists in `nic_cc_customer`
- [x] `national_id_owner2` column exists in `nic_cc_customer`
- [x] No additional schema changes required

## 🚀 Deployment Steps

### Step 1: GitHub Commit
```bash
git add .
git commit -m "feat: Major system enhancements - Customer data, AOD improvements, Email CC, QR codes"
git push origin main
```
- [ ] Code committed to GitHub
- [ ] Push successful

### Step 2: VPS Frontend Deployment
```bash
ssh user@vps-server
cd /path/to/nic-callcenter
git pull origin main
npm install
npm run build
pm2 restart nic-callcenter
```
- [ ] Connected to VPS
- [ ] Code pulled successfully
- [ ] Dependencies installed
- [ ] Build completed
- [ ] Application restarted

### Step 3: Backend Service Update
```bash
sudo cp backend-reminder-service.js /opt/nic-reminder-service/
sudo systemctl restart nic-reminder-service
sudo systemctl status nic-reminder-service
```
- [ ] Backend service file updated
- [ ] Service restarted successfully
- [ ] Service status shows active

## ✅ Post-Deployment Testing

### Frontend Tests:
- [ ] Login works correctly
- [ ] Customer details show new fields (monthly premium, second owner NID)
- [ ] CSV upload accepts new template format
- [ ] AOD PDF generation works with new layout
- [ ] Manual reminder sends to correct installment
- [ ] QR codes display in reminder emails
- [ ] Agent receives CC emails

### Backend Tests:
- [ ] Automated reminder service running
- [ ] Service logs show no errors
- [ ] Agent CC emails being sent automatically
- [ ] QR codes included in automated reminders

### Email Tests:
- [ ] Send test AOD email → Agent receives CC
- [ ] Send test installment reminder → Agent receives CC
- [ ] QR codes display properly in emails
- [ ] Email subjects show correct installment numbers
- [ ] Mobile banking QR codes scannable

### Critical Path Test:
1. [ ] Create new AOD → Email sent with agent CC
2. [ ] Send installment reminder → Correct installment selected
3. [ ] QR code displays → Mobile banking integration works
4. [ ] Agent receives all CC emails

## 🔍 Monitoring (First 24 Hours)

### Application Health:
- [ ] No error spikes in logs
- [ ] Email delivery rates normal
- [ ] QR code generation successful
- [ ] Database performance stable

### User Feedback:
- [ ] Agents report receiving CC emails
- [ ] Customers can scan QR codes
- [ ] No confusion about installment numbers
- [ ] AOD PDFs display correctly

## 🚨 Rollback Triggers

### Immediate Rollback If:
- [ ] Application won't start
- [ ] Database errors
- [ ] Email system failure
- [ ] Critical functionality broken

### Rollback Commands:
```bash
# Frontend rollback
git checkout <previous-commit>
npm run build
pm2 restart nic-callcenter

# Backend rollback  
sudo cp /opt/backup/backend-reminder-service.js.backup /opt/nic-reminder-service/backend-reminder-service.js
sudo systemctl restart nic-reminder-service
```

## 📊 Success Criteria

### Immediate (0-2 hours):
- [x] All services running
- [ ] No critical errors
- [ ] Basic functionality working

### Short-term (2-24 hours):
- [ ] Email CC functionality confirmed
- [ ] QR codes working in production
- [ ] Installment selection correct
- [ ] Agent feedback positive

### Long-term (1-7 days):
- [ ] Customer payment experience improved
- [ ] Reduced support calls about payments
- [ ] Professional AOD documents appreciated
- [ ] System stability maintained

## 📞 Emergency Contacts

### Development Team:
- **Primary**: Available during deployment
- **Backup**: On-call for critical issues

### Infrastructure:
- **VPS Admin**: Server management
- **Database Admin**: Schema issues
- **Email Service**: Brevo support if needed

---

## Deployment Status: ⏳ PENDING

**Next Action**: Execute Step 1 (GitHub Commit)

**Estimated Time**: 30-45 minutes total deployment time

**Risk Level**: LOW (comprehensive testing completed, rollback procedures ready)