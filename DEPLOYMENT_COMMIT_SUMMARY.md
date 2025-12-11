# Deployment Summary - December 11, 2024

## Changes to Deploy

### 1. Merchant ID Fix for Life Insurance
**Files:**
- `.env` - Updated `VITE_ZWENNPAY_MERCHANT_LIFE` from 56 to 151
- `.env.production.template` - Updated merchant ID and documentation

**Impact:** Fixes payment routing discrepancy between Quick QR Generator and Customer Detail QR codes

### 2. Call Log UX Improvement
**Files:**
- `src/pages/customers/CustomerDetail.jsx` - Enhanced with optimistic updates and instant feedback

**Impact:** Call logs now appear immediately without requiring page refresh

### 3. Documentation
**Files:**
- `LOB_MERCHANT_CODES_FIX.md` - Documents merchant ID fix
- `CALL_LOG_UX_IMPROVEMENT.md` - Documents UX enhancement

## Git Commands to Execute

```bash
# Add specific files for this deployment
git add .env
git add .env.production.template
git add src/pages/customers/CustomerDetail.jsx
git add LOB_MERCHANT_CODES_FIX.md
git add CALL_LOG_UX_IMPROVEMENT.md

# Commit with descriptive message
git commit -m "Fix: Merchant ID consistency & Call log UX improvements

- Fix Life insurance merchant ID discrepancy (56 → 151)
- Add optimistic updates for call logs (instant UI feedback)
- Enhance error handling with toast notifications
- Update production environment template

Fixes payment routing issues and improves agent workflow"

# Push to GitHub
git push origin main
```

## VPS Deployment Commands

```bash
# SSH to VPS
ssh your-user@your-vps-ip

# Navigate to project directory
cd /path/to/your/project

# Pull latest changes
git pull origin main

# Update environment variables (if needed)
# Copy .env.production.template to .env and update with production values

# Build the project
npm run build

# Restart services (if using PM2 or similar)
pm2 restart all
# OR restart nginx/apache if needed
sudo systemctl restart nginx
```

## Verification Steps

### 1. Test Merchant ID Fix
- Generate QR from Customer Detail → Should use merchant ID 151
- Generate QR from Quick QR Generator → Should use merchant ID 151
- Both should now be consistent

### 2. Test Call Log UX
- Add a call log → Should appear immediately
- Check for "Saving..." indicator
- Verify success notification appears
- Confirm entry persists after page refresh

## Environment Variables to Update on VPS

Make sure your production `.env` file has:
```
VITE_ZWENNPAY_MERCHANT_LIFE=151
```

## Files NOT to Commit
- Any local development files
- Node modules
- Build artifacts
- Personal configuration files