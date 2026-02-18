# Brevo Support Ticket - Emails Silently Blocked

## Issue Summary

**Account:** _(Your Brevo account email)_  
**API Key:** _(Last 4 digits only)_  
**Issue:** Emails to specific addresses are being blocked by Brevo with no error reason  
**Impact:** Critical - Users cannot log in to production application  
**Date Started:** January 14-15, 2026

---

## Problem Description

We are sending OTP (One-Time Password) verification emails through Brevo's transactional API. Emails to specific `@nicl.mu` addresses are being blocked by Brevo's system with no error message or reason provided.

### Affected Email Addresses

1. `kgungulu@nicl.mu` - 14+ blocked events since Jan 15
2. `ibholla@nicl.mu` - 4+ blocked events since Jan 15  
3. `bbhugaloo@nicl.mu` - 13+ blocked events since Jan 14

### What We've Verified

✅ **API Calls Successful:** All API calls return HTTP 201 Created with message IDs  
✅ **Not in Transactional Blacklist:** Checked via API - all return 404 (not found)  
✅ **Not in Contacts Database:** Checked via API - all return 404 (not found)  
✅ **Domain Authentication:** Fully verified (SPF, DKIM, DMARC all configured)  
✅ **Other Recipients Work:** Emails to other `@nicl.mu` addresses deliver successfully  
✅ **Mailboxes Valid:** These users receive emails from Gmail successfully

❌ **Blocked by Brevo:** All emails show "blocked" event in statistics API  
❌ **No Error Reason:** Blocked events have no "reason" or "error" field  
❌ **Never Leave Brevo:** Recipient mail server admin confirms no hits on gateway

---

## Technical Details

### Sender Information
- **Sender Email:** `arrears@niclmauritius.site`
- **Sender Name:** NIC Life Insurance Mauritius
- **Domain:** `niclmauritius.site` (fully authenticated)

### API Endpoint Used
```
POST https://api.brevo.com/v3/smtp/email
```

### Sample API Response (Success)
```json
{
  "messageId": "<202601190516.13870220859@smtp-relay.mailin.fr>",
  "status": 201
}
```

### Sample Blocked Event (from Statistics API)
```json
{
  "email": "kgungulu@nicl.mu",
  "date": "2026-01-19T06:16:54.885+01:00",
  "subject": "Test Email - 2026-01-19T05:16:54.140Z",
  "messageId": "<202601190516.13870220859@smtp-relay.mailin.fr>",
  "event": "blocked",
  "tag": "diagnostic-test",
  "ip": "::",
  "from": "arrears@niclmauritius.site"
}
```

**Note:** The `"ip": "::"` suggests email was never attempted for delivery.

---

## Example Message IDs

### kgungulu@nicl.mu (Blocked)
- `<202601190516.13870220859@smtp-relay.mailin.fr>` - Jan 19, 2026
- `<202601190443.16334955483@smtp-relay.mailin.fr>` - Jan 19, 2026
- `<202601190425.86966904610@smtp-relay.mailin.fr>` - Jan 19, 2026
- `<202601190421.45813178629@smtp-relay.mailin.fr>` - Jan 19, 2026

### ibholla@nicl.mu (Blocked)
- `<202601160709.57341039057@smtp-relay.mailin.fr>` - Jan 16, 2026
- `<202601160704.70653682148@smtp-relay.mailin.fr>` - Jan 16, 2026

### bbhugaloo@nicl.mu (Blocked)
- `<202601190436.86827864154@smtp-relay.mailin.fr>` - Jan 19, 2026
- `<202601190429.97343573364@smtp-relay.mailin.fr>` - Jan 19, 2026

---

## What We Need from Brevo Support

### 1. Why Are These Emails Blocked?

Please investigate why these specific email addresses are being blocked when:
- They are NOT in the transactional blacklist
- They are NOT in the contacts database
- The domain is fully authenticated
- Other emails to the same domain work fine

### 2. Internal Blocking Rules

Are there internal Brevo rules blocking these addresses that are not visible via API?
- Spam filters?
- Rate limiting?
- Domain reputation issues?
- Recipient domain issues?

### 3. SMTP Logs

Can you provide SMTP logs for these message IDs showing:
- Why the emails were blocked
- What rule/filter triggered the block
- Whether delivery was attempted
- Destination IP address (if attempted)

### 4. How to Unblock

What steps do we need to take to unblock these email addresses?
- Remove from internal lists?
- Whitelist the addresses?
- Improve sender reputation?
- Contact recipient domain admin?

---

## Business Impact

**Critical:** These users cannot log in to our production call center application without OTP verification. This is blocking active employees from performing their job duties.

**Affected Users:** 3-4 employees  
**System:** NIC Life Insurance Call Center Application  
**Urgency:** High - Production system impacted

---

## Diagnostic Steps We've Taken

1. ✅ Checked transactional blacklist via API (`GET /smtp/blockedContacts/{email}`) - All return 404
2. ✅ Checked contacts database via API (`GET /contacts/{email}`) - All return 404  
3. ✅ Verified domain authentication in Brevo dashboard - All records verified
4. ✅ Tested with other `@nicl.mu` addresses - They work fine
5. ✅ Confirmed mailboxes are valid - They receive Gmail emails
6. ✅ Checked with recipient mail server admin - No hits on gateway (emails never arrive)
7. ✅ Reviewed blocked events via API (`GET /smtp/statistics/events`) - No error reason provided

---

## Questions

1. **Why are these emails blocked with no error reason?**
2. **Are there internal Brevo filters not visible via API?**
3. **Why does `"ip": "::"` appear in blocked events?**
4. **How can we unblock these addresses?**
5. **Is there a domain reputation issue with `nicl.mu`?**
6. **Are there rate limits being hit for these specific addresses?**

---

## Additional Information

### Working Email Addresses (Same Domain)

These `@nicl.mu` addresses receive our emails successfully:
- _(List other working nicl.mu addresses if available)_

This proves:
- Our sender domain is not blocked for the entire `nicl.mu` domain
- The issue is specific to these 3-4 email addresses
- Domain authentication is working correctly

### Timeline

- **Jan 14, 2026:** First blocked events appear
- **Jan 15, 2026:** Multiple blocked events (10+ per address)
- **Jan 16-17, 2026:** Continued blocking
- **Jan 19, 2026:** Investigated and confirmed blocking at Brevo level

---

## Request

Please investigate these message IDs and email addresses to determine:
1. Why they are being blocked
2. What internal rule/filter is triggering the block
3. How to unblock them
4. How to prevent this in the future

We need urgent assistance as this is impacting our production system.

---

## Contact Information

**Name:** _(Your name)_  
**Email:** _(Your email)_  
**Phone:** _(Your phone)_  
**Company:** NIC Life Insurance Mauritius  
**Brevo Account:** _(Your Brevo account email)_

**Preferred Contact Method:** Email  
**Timezone:** Mauritius (UTC+4)  
**Availability:** _(Your availability)_

---

## Attachments

If possible, attach:
1. Screenshot of blocked events from Brevo dashboard
2. API response showing 201 Created
3. API response showing 404 for blacklist check
4. Domain authentication verification screenshot

---

**Thank you for your urgent assistance with this matter.**
