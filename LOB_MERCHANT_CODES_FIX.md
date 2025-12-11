# LOB Merchant Codes Fix - Life Insurance ID Correction

## Issue Identified
**Date**: December 11, 2024  
**Reporter**: User  
**Priority**: High (Revenue Impact)

### Problem Description
Life insurance QR codes were using different merchant IDs in different parts of the system:

- **Quick QR Generator**: Merchant ID **151** (correct)
- **Customer Detail/LOB Dashboard**: Merchant ID **56** (incorrect)

This discrepancy meant Life insurance payments were routing to different merchant accounts, causing potential revenue loss and payment tracking issues.

## Root Cause Analysis

### QR Service Architecture
The `src/services/qrService.js` uses two different merchant code systems:

1. **Database Customers** (`generatePaymentQR`):
   - Used by Customer Detail and LOB Dashboard
   - Reads from environment variable: `VITE_ZWENNPAY_MERCHANT_LIFE`
   - Was set to **56** (incorrect)

2. **Ad-hoc QR** (`generateAdHocQR`):
   - Used by Quick QR Generator
   - Hardcoded in `adHocMerchantCodes.life`
   - Set to **151** (correct)

### Environment Variable Issue
The environment variable `VITE_ZWENNPAY_MERCHANT_LIFE=56` was outdated and didn't match the correct merchant ID confirmed by the user.

## Solution Applied

### Files Updated
1. **`.env`** - Development environment
2. **`.env.production.template`** - Production template

### Changes Made
```diff
# ZwennPay QR Code Configuration - LOB-Specific Merchant Codes
- # Life Insurance: 56, Health Insurance: 153, Motor Insurance: 155
- VITE_ZWENNPAY_MERCHANT_LIFE=56
+ # Life Insurance: 151, Health Insurance: 153, Motor Insurance: 155
+ VITE_ZWENNPAY_MERCHANT_LIFE=151
```

## Verification Steps

### 1. Test Customer Detail QR Generation
- Login as any agent type
- Navigate to customer with Life insurance
- Generate QR code
- Verify merchant ID 151 is used in logs

### 2. Test Quick QR Generator
- Navigate to Quick QR Generator
- Select "Life" as Line of Business
- Generate QR code
- Verify merchant ID 151 is used (should remain unchanged)

### 3. Cross-System Consistency
- Both systems should now use merchant ID **151** for Life insurance
- Payment routing should be consistent across all Life insurance QR codes

## Business Impact

### Before Fix
- **Revenue Risk**: Payments split between two merchant accounts
- **Tracking Issues**: Inconsistent payment reconciliation
- **Customer Confusion**: Different QR codes for same insurance type

### After Fix
- **Unified Payment Flow**: All Life insurance payments route to merchant ID 151
- **Consistent Experience**: Same merchant ID regardless of QR generation method
- **Simplified Reconciliation**: Single merchant account for Life insurance

## Deployment Requirements

### Production Deployment
1. Update production `.env` file with correct merchant ID
2. Restart application to load new environment variables
3. Test QR generation from both Customer Detail and Quick QR Generator

### Verification Commands
```bash
# Check environment variable is loaded correctly
echo $VITE_ZWENNPAY_MERCHANT_LIFE

# Should output: 151
```

## Related Documentation
- `LOB_MERCHANT_CODES.md` - Original merchant code documentation
- `QUICK_QR_ADHOC_IMPLEMENTATION.md` - Quick QR Generator implementation
- `src/services/qrService.js` - QR generation service

## Status
✅ **COMPLETED** - Environment variables updated in both development and production templates

## Next Steps
1. Deploy to production environment
2. Update any documentation referencing old merchant ID (56)
3. Monitor payment routing to ensure consistency
4. Consider consolidating merchant code management to prevent future discrepancies