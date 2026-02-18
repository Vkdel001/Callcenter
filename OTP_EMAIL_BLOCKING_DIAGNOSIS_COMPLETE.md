# OTP Email Blocking Issue - Diagnosis Complete

## Issue Status: ✅ ROOT CAUSE IDENTIFIED

**Date:** January 19, 2026  
**Issue:** OTP emails blocked for specific `@nicl.mu` addresses  
**Root Cause:** Office 365 security policies at `nicl.mu` blocking `niclmauritius.site` domain

---

## Investigation Summary

### What We Tested

1. ✅ **Brevo Transactional Blacklist** - Email NOT blacklisted (404 response)
2. ✅ **Brevo Contacts Database** - Email NOT in contacts
3. ✅ **Domain Authentication** - SPF, DKIM, DMARC all verified
4. ✅ **Brevo API** - Accepts emails successfully (201 Created)
5. ✅ **Test Email Send** - Brevo sends successfully with message IDs
6. ✅ **Mailbox Validity** - Users receive Gmail emails fine
7. ❌ **Office 365 Security Policy** - **BLOCKING OUR DOMAIN**

### Diagnostic Scripts Created

1. `brevo-unblock-email.js` - Checks/removes from Brevo blacklist
2. `brevo-unblock-email.cjs` - CommonJS version
3. `test-otp-email-diagnostic.js` - Comprehensive diagnostic tool
4. `brevo-check-all-suppressions.js` - Checks all suppression lists
5. `fix-blocked-emails.js` - Attempts to fix blocked emails

### Key Finding: Bounce Message

```
Your message to ibholla@nicl.mu couldn't be delivered.

Security or policy settings at nicl.mu have rejected your message.

Sender: vikas.khanna
Office 365: nicl.mu
Action Required: Security or policy violation
```

**This proves:** The issue is NOT with Brevo - it's Office 365 at `nicl.mu` blocking our sender domain.

---

## Root Cause Analysis

### Why Emails Are Blocked

1. **Office 365 Security Policies:** The `nicl.mu` mail server (Office 365) has security policies that block emails from `arrears@niclmauritius.site`

2. **Recent Mailbox Changes:** These mailboxes initially had restrictions preventing external emails. After NIC IT removed those restrictions, Gmail works but our domain is still blocked by a separate security policy.

3. **Domain-Level Block:** This is not a user-level spam filter - it's a mail server-level security policy that requires IT administrator action to resolve.

### Why This Affects Only Some Users

- Different users may have different security policies applied
- Some users may have been grandfathered in before policies were tightened
- Distribution group memberships may affect policy application
- Per-user security settings may vary

### Why Gmail Works But We Don't

- Gmail has established reputation with Office 365
- Our domain `niclmauritius.site` is relatively new to these mailboxes
- Office 365 treats unknown sender domains with strict security policies
- Gmail is not subject to the same Office 365 security policies

---

## Solution

### Required Action: NIC IT Department

The NIC IT department must whitelist `arrears@niclmauritius.site` in their Office 365 security settings:

1. **Exchange Online Protection (EOP)** - Add to safe sender list
2. **Transport Rules** - Remove any blocking rules
3. **Safe Attachments/Links Policies** - Ensure domain is allowed
4. **Per-User Allowed Senders** - Add to affected users' allowed list
5. **Advanced Threat Protection (ATP)** - Whitelist if ATP is enabled

### Communication Template

A detailed email template has been created: `EMAIL_DELIVERY_ISSUE_REPORT_FOR_NIC_IT.md`

This document includes:
- Complete problem description
- Technical details and evidence
- Step-by-step resolution instructions
- Business impact statement
- Verification steps

---

## Affected Email Addresses

Based on user reports, the following `@nicl.mu` addresses are affected:

1. `kgungulu@nicl.mu`
2. `ibholla@nicl.mu`
3. `bbhugaloo@nicl.mu`
4. _(User mentioned 4-5 total emails)_

**Note:** Add any additional affected email addresses to the list.

---

## What We Cannot Fix

### Issues Outside Our Control

❌ **Office 365 Security Policies** - Only NIC IT administrators can modify these  
❌ **Mail Server Configuration** - Requires access to Office 365 admin portal  
❌ **Transport Rules** - Managed by NIC IT department  
❌ **Per-User Security Settings** - Requires mailbox administrator access

### What We've Already Fixed

✅ **Domain Authentication** - SPF, DKIM, DMARC fully configured  
✅ **Email Service Provider** - Brevo working correctly  
✅ **Application Code** - OTP service functioning properly  
✅ **Brevo Blacklists** - Verified emails are not blacklisted

---

## Timeline of Events

1. **Initial State:** Mailboxes had restrictions preventing external emails
2. **First Fix:** NIC IT removed external email restrictions
3. **Test 1:** Gmail emails now deliver successfully ✅
4. **Test 2:** Our emails still blocked ❌
5. **Investigation:** Comprehensive Brevo diagnostics - all clear ✅
6. **Bounce Message:** Revealed Office 365 security policy block ❌
7. **Root Cause:** Office 365 at `nicl.mu` blocking `niclmauritius.site` domain

---

## Next Steps

### Immediate Actions

1. ✅ **Document Created:** `EMAIL_DELIVERY_ISSUE_REPORT_FOR_NIC_IT.md`
2. ⏳ **Send to NIC IT:** Forward the report to NIC IT department
3. ⏳ **Wait for Changes:** NIC IT implements whitelisting (15-30 minutes)
4. ⏳ **Verify Resolution:** Test OTP delivery after changes

### Verification Process

After NIC IT makes changes:

1. Have affected users attempt to log in
2. Check if OTP emails are received
3. Monitor Brevo dashboard for delivery status
4. Confirm no more bounce messages
5. Document resolution for future reference

### Temporary Workaround

If immediate access is needed before IT fixes the issue:

1. Use test accounts with fixed OTP (123456) for testing
2. Temporarily use personal Gmail addresses for affected users
3. Have IT create email forwarding rules to Gmail as interim solution

---

## Technical Evidence

### Brevo API Response (Success)

```json
{
  "messageId": "<generated-message-id>",
  "status": 201,
  "statusText": "Created"
}
```

### Office 365 Bounce Message (Rejection)

```
Security or policy settings at nicl.mu have rejected your message.
Action Required: Security or policy violation
```

### Domain Authentication Status

```
✅ SPF Record: Configured and verified
✅ DKIM 1 Record: Configured and verified
✅ DKIM 2 Record: Configured and verified
✅ DMARC Record: Configured and verified
```

---

## Lessons Learned

### For Future Reference

1. **Office 365 Security:** New sender domains may be automatically blocked
2. **Whitelisting Required:** External applications need explicit whitelisting
3. **Multi-Layer Security:** Office 365 has multiple security layers that must all allow the sender
4. **Testing Strategy:** Always test with both internal and external email addresses
5. **Documentation:** Bounce messages provide critical diagnostic information

### Prevention

For future deployments:

1. Request sender domain whitelisting BEFORE going live
2. Provide IT department with sender domain details in advance
3. Test email delivery during UAT phase
4. Have IT department monitor mail flow logs during initial rollout
5. Maintain list of approved sender domains in IT documentation

---

## Conclusion

**Issue:** OTP emails blocked by Office 365 security policies at `nicl.mu`  
**Cause:** Sender domain `niclmauritius.site` not whitelisted  
**Solution:** NIC IT must whitelist domain in Office 365 admin portal  
**Status:** Awaiting IT department action  
**ETA:** 15-30 minutes after IT implements changes

**This is NOT a Brevo issue - it's an Office 365 security policy that requires IT administrator intervention.**

---

## Files Created

1. `EMAIL_DELIVERY_ISSUE_REPORT_FOR_NIC_IT.md` - Formal report for IT department
2. `OTP_EMAIL_BLOCKING_DIAGNOSIS_COMPLETE.md` - This diagnostic summary
3. `brevo-unblock-email.js` - Diagnostic script (ES module)
4. `brevo-unblock-email.cjs` - Diagnostic script (CommonJS)
5. `test-otp-email-diagnostic.js` - Comprehensive diagnostic tool
6. `brevo-check-all-suppressions.js` - Suppression checker
7. `fix-blocked-emails.js` - Attempted fix script (confirmed Brevo is working)

---

**Investigation Complete - Ready for IT Department Action**
