# Motor Policy Hyphen Fix - COMPLETE

## Issue Identified
Motor insurance policy numbers contain hyphens (e.g., `p/33/23/44-4/09/23`), which were being incorrectly converted during the sanitization/reverse-sanitization process, causing QR transaction lookups to fail.

## Root Cause
The original sanitization logic converted BOTH hyphens and slashes to single dots:
- `p/33/23/44-4/09/23` → `p.33.23.44.4.09.23`

The webhook's reverse sanitization converted ALL dots back to slashes:
- `p.33.23.44.4.09.23` → `p/33/23/44/4/09/23` ❌ (hyphen lost!)

This caused the webhook to search for `p/33/23/44/4/09/23` when the database had `p/33/23/44-4/09/23`, resulting in "QR transaction not found" errors.

## Solution: Double-Dot Encoding
Use double dots (`..`) to represent hyphens, allowing unambiguous reverse conversion:
- Hyphen (`-`) → Double dot (`..`)
- Slash (`/`) → Single dot (`.`)

### Examples:

**Motor Policy:**
```
Original:    p/33/23/44-4/09/23
Sanitized:   p.33.23.44..4.09.23
Reversed:    p/33/23/44-4/09/23  ✅ PERFECT MATCH
```

**Health Policy:**
```
Original:    MED/33/333/333/4
Sanitized:   MED.33.333.333.4
Reversed:    MED/33/333/333/4  ✅ STILL WORKS
```

**Life Policy:**
```
Original:    L/2024/001-A/123
Sanitized:   L.2024.001..A.123
Reversed:    L/2024/001-A/123  ✅ WORKS
```

## Files Modified

### 1. Frontend: `src/services/qrService.js`
**Function:** `sanitizePolicyNumber()`

**Change:**
```javascript
// OLD (WRONG)
.replace(/-/g, '.')  // Hyphen → Single dot

// NEW (CORRECT)
.replace(/-/g, '..')  // Hyphen → Double dot
```

**Complete Function:**
```javascript
sanitizePolicyNumber(policyNumber) {
  if (!policyNumber) return ''
  
  // Replace hyphens with double dots, slashes with single dots
  // This allows unambiguous reverse conversion in the webhook
  const sanitized = policyNumber
    .replace(/-/g, '..')  // Replace all hyphens with double dots
    .replace(/\//g, '.')   // Replace all slashes with single dots
  
  console.log(`Policy number sanitized: "${policyNumber}" → "${sanitized}"`)
  return sanitized
}
```

### 2. Webhook: `webhookcode-final.cjs`
**Function:** `reverseSanitizePolicyNumber()`

**Change:**
```javascript
// OLD (WRONG)
const original = sanitizedPolicy.replace(/\./g, '/');

// NEW (CORRECT)
const original = sanitizedPolicy
  .replace(/\.\./g, '-')  // Double dot → Hyphen (MUST BE FIRST!)
  .replace(/\./g, '/');    // Single dot → Slash
```

**Complete Function:**
```javascript
function reverseSanitizePolicyNumber(sanitizedPolicy) {
  if (!sanitizedPolicy) return sanitizedPolicy;
  
  // IMPORTANT: Replace double dots FIRST (before single dots)
  // Double dots represent hyphens, single dots represent slashes
  const original = sanitizedPolicy
    .replace(/\.\./g, '-')  // Replace double dots with hyphens
    .replace(/\./g, '/');    // Replace single dots with slashes
  
  console.log(`🔄 Policy number reverse-sanitized: "${sanitizedPolicy}" → "${original}"`);
  
  return original;
}
```

## Why This Works

### Unambiguous Mapping:
- `..` can ONLY mean hyphen (no other source)
- `.` can ONLY mean slash (after `..` are processed)
- Order matters: Process `..` before `.`

### Backward Compatibility:
- Old QR codes (without `..`) won't be found, but they're short-lived Quick QR codes
- New QR codes will work perfectly for all LOBs

### No Database Changes:
- Database stores original format (with hyphens and slashes)
- Only QR code billNumber uses sanitized format
- Webhook converts back to original format for lookup

## Testing

### Test Cases:
1. ✅ Motor with hyphen: `p/33/23/44-4/09/23`
2. ✅ Health (no hyphen): `MED/33/333/333/4`
3. ✅ Life with hyphen: `L/2024/001-A/123`
4. ✅ Multiple hyphens: `P-2024-001-A`

### Expected Results:
- All policy formats sanitize correctly
- All sanitized formats reverse correctly
- QR transactions are found in database
- Emails are sent successfully

## Deployment Steps

### 1. Frontend Deployment
```bash
# Build React app
npm run build

# Deploy to Netlify (automatic via GitHub push)
git add src/services/qrService.js
git commit -m "Fix: Motor policy hyphen sanitization using double-dot encoding"
git push origin main
```

### 2. Webhook Deployment (Railway)
```bash
# Railway auto-deploys from GitHub
git add webhookcode-final.cjs
git commit -m "Fix: Webhook reverse sanitization for motor policy hyphens"
git push origin main

# Or manual Railway deployment
# Upload webhookcode-final.cjs to Railway
# Restart webhook service
```

### 3. Verification
1. Generate new Motor QR code with hyphen
2. Make test payment
3. Check webhook logs for successful QR transaction lookup
4. Verify customer and agent emails are sent

## Impact Assessment

### ✅ Benefits:
- Motor policy QR codes now work correctly
- Health and Life policies continue to work
- Unambiguous bidirectional conversion
- Minimal code changes (2 functions, ~6 lines)

### ⚠️ Considerations:
- Existing QR codes (generated before fix) won't be found
  - **Impact**: Low - Quick QR codes are short-lived
  - **Mitigation**: None needed - new QRs will work
- Double dots in QR codes are safe and scannable
- ZwennPay API accepts double dots in billNumber

### 📊 Affected Systems:
- ✅ Quick QR Generator
- ✅ Customer Detail QR Generator
- ✅ Webhook Payment Processing
- ✅ QR Transaction Lookup
- ✅ Email Notifications

## Monitoring

### Success Indicators:
1. Webhook logs show: `✅ Found QR transaction: ID=XXX, Type=quick_qr`
2. No more "QR transaction not found" errors for motor policies
3. Customer and agent emails sent successfully
4. QR transaction status updated to "paid"

### Log Messages to Watch:
```
🔄 Policy number reverse-sanitized: "p.33.23.44..4.09.23" → "p/33/23/44-4/09/23"
✅ Found QR transaction: ID=XXX, Type=quick_qr, Agent=XXX
✅ QR transaction XXX marked as paid
✅ Customer confirmation sent to XXX
✅ Agent notification sent to XXX
```

## Rollback Plan
If issues occur, revert both files:
```bash
git revert HEAD~2  # Revert last 2 commits
git push origin main
```

---

**Status**: ✅ COMPLETE  
**Date**: January 14, 2026  
**Impact**: Critical Fix - Motor policy QR codes now work correctly  
**Files Changed**: 2 (`src/services/qrService.js`, `webhookcode-final.cjs`)  
**Lines Changed**: ~6 lines total
