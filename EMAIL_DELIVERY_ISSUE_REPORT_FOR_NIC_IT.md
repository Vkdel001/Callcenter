# Email Delivery Issue - Action Required by NIC IT Department

## Issue Summary

**Date Reported:** January 19, 2026  
**Affected System:** NIC Life Insurance Call Center Application  
**Sender Domain:** `arrears@niclmauritius.site`  
**Recipient Domain:** `nicl.mu` (Office 365)  
**Issue:** OTP emails being blocked by Office 365 security policies

---

## Problem Description

Our call center application sends OTP (One-Time Password) verification codes to agents for secure login. However, emails sent to specific `@nicl.mu` addresses are being rejected by the Office 365 mail server with the following error:

```
Security or policy settings at nicl.mu have rejected your message.
Action Required: Security or policy violation
```

### Affected Email Addresses

The following `@nicl.mu` email addresses are unable to receive OTP emails:

1. `kgungulu@nicl.mu`
2. `ibholla@nicl.mu`
3. `bbhugaloo@nicl.mu`
4. _(Add other affected emails here)_

### What We've Verified

✅ **Sender Domain Authentication:** Fully configured and verified
- SPF Record: ✅ Configured
- DKIM Records: ✅ Both keys configured
- DMARC Record: ✅ Configured
- All DNS records verified in Brevo dashboard

✅ **Email Service Provider (Brevo):** Working correctly
- API accepts emails successfully (HTTP 201 Created)
- Message IDs generated for all emails
- No blacklist or suppression issues
- Test emails to Gmail addresses deliver successfully

✅ **Recipient Mailboxes:** Valid and active
- These users can receive emails from Gmail
- Other `@nicl.mu` users receive our emails successfully
- Mailboxes are not full or disabled

❌ **Office 365 Security Policy:** Blocking our sender domain
- Bounce message clearly indicates "Security or policy settings at nicl.mu have rejected your message"
- This is a mail server-level block, not a user-level spam filter

---

## Technical Details

### Sender Information
- **Sender Email:** `arrears@niclmauritius.site`
- **Sender Name:** NIC Life Insurance Mauritius
- **Email Service:** Brevo (formerly Sendinblue) - Professional transactional email service
- **Email Type:** Transactional (OTP verification codes)
- **Domain:** `niclmauritius.site`

### Bounce Message Details
```
Your message to ibholla@nicl.mu couldn't be delivered.

Security or policy settings at nicl.mu have rejected your message.

Sender: vikas.khanna
Office 365: nicl.mu
Action Required: Security or policy violation
```

### Timeline
1. **Initial Issue:** These mailboxes had restrictions preventing external emails
2. **First Fix:** NIC IT removed external email restrictions
3. **Test Result:** Gmail emails now deliver successfully
4. **Current Issue:** Emails from `niclmauritius.site` domain are still blocked by Office 365 security policies

---

## Action Required from NIC IT Department

To resolve this issue, please perform the following actions in your Office 365 admin portal:

### 1. Whitelist Sender Domain in Exchange Online Protection (EOP)

**Steps:**
1. Log in to Microsoft 365 Admin Center
2. Navigate to: **Security & Compliance** → **Threat Management** → **Policy** → **Anti-spam**
3. Edit the **Connection filter policy**
4. Add `niclmauritius.site` to the **IP Allow List** or **Safe Sender List**

### 2. Check Transport Rules

**Steps:**
1. Go to **Exchange Admin Center**
2. Navigate to: **Mail flow** → **Rules**
3. Check if any rules are blocking emails from `niclmauritius.site`
4. If found, add an exception for our domain

### 3. Check Safe Attachments and Safe Links Policies

**Steps:**
1. In **Security & Compliance Center**
2. Navigate to: **Threat Management** → **Policy** → **Safe Attachments** / **Safe Links**
3. Ensure `niclmauritius.site` is not blocked

### 4. Add to Allowed Senders List (Per-User)

For the affected users specifically:
1. Go to **Exchange Admin Center**
2. Navigate to: **Recipients** → **Mailboxes**
3. Select each affected user
4. Edit **Mailbox features** → **Spam filter**
5. Add `arrears@niclmauritius.site` to **Allowed senders**

### 5. Check Advanced Threat Protection (ATP)

If ATP is enabled:
1. Navigate to **Security & Compliance Center**
2. Go to: **Threat Management** → **Policy** → **ATP Safe Attachments** / **ATP Safe Links**
3. Add `niclmauritius.site` to the allowed domains list

---

## Verification Steps

After making the changes, please:

1. **Wait 15-30 minutes** for policy propagation
2. **Test email delivery** by having affected users attempt to log in to the call center application
3. **Check mail flow logs** in Exchange Admin Center to confirm emails are no longer blocked
4. **Notify us** once changes are complete so we can verify from our end

---

## Business Impact

**Critical:** These users cannot log in to the call center application without OTP verification, preventing them from:
- Accessing customer records
- Processing customer inquiries
- Performing their daily duties

**Urgency:** High - This is blocking active users from accessing a production system

---

## Contact Information

For technical questions or verification, please contact:

**Application Team:**
- Email: _(Your contact email)_
- Phone: _(Your contact phone)_

**Email Service Provider:**
- Brevo Support: https://help.brevo.com/
- Our Brevo Account: _(Your Brevo account email)_

---

## Additional Information

### Why This Happens

Office 365 has strict security policies to protect against spam and phishing. When a new sender domain is detected, especially from external sources, it may be automatically blocked until explicitly whitelisted by the IT administrator.

### Why Other Users Work

Other `@nicl.mu` users may:
- Have different security policies applied to their mailboxes
- Have previously received emails from our domain (before policies were tightened)
- Be in different distribution groups with different security settings

### Why Gmail Works

Gmail uses different spam filtering algorithms and is not subject to your Office 365 security policies. This confirms the mailboxes are valid and can receive external emails.

---

## Appendix: Brevo API Response (Proof of Successful Send)

```json
{
  "messageId": "<generated-by-brevo>",
  "status": 201,
  "message": "Created"
}
```

This confirms Brevo successfully accepted and attempted to deliver the email. The rejection happens at the Office 365 mail server level.

---

**Thank you for your prompt attention to this matter.**
