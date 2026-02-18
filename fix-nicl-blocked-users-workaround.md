# Temporary Workaround for Blocked nicl.mu Users

## Problem
4-5 specific `nicl.mu` email addresses cannot receive OTP emails from `arrears@niclmauritius.site` due to per-user email filtering on the `nicl.mu` mail server.

## Root Cause
- NOT a Brevo issue (API working correctly)
- NOT a domain authentication issue (all DNS records verified)
- NOT an invalid mailbox issue (users receive Gmail emails)
- **Per-user email filtering** on recipient's mail server blocking this specific sender

## Temporary Solution

### Option 1: Use Personal Email (Recommended)
Ask affected users to provide a personal email address (Gmail, Outlook, etc.) for OTP delivery:

1. Update user record in database with personal email
2. OTP will be sent to personal email
3. User can still use their `nicl.mu` email as username

### Option 2: Request IT Whitelist
Contact NIC IT department to whitelist for affected users:
- Sender email: `arrears@niclmauritius.site`
- Sender domain: `niclmauritius.site`

## Affected Users
- kgungulu@nicl.mu
- [Add other 3-4 affected emails here]

## For NIC IT Department

### Investigation Checklist:
- [ ] Check each user's blocked senders list
- [ ] Review personal spam filter settings
- [ ] Check inbox rules and auto-delete rules
- [ ] Review mail server logs for rejection reasons
- [ ] Verify no user-specific transport rules blocking this sender
- [ ] Check if different spam filter profiles applied to these users
- [ ] Whitelist `arrears@niclmauritius.site` for these users
- [ ] Whitelist `niclmauritius.site` domain for these users

### Mail Server Commands (Exchange):
```powershell
# Check user's blocked senders
Get-MailboxJunkEmailConfiguration -Identity "kgungulu@nicl.mu" | Select BlockedSendersAndDomains

# Add to safe senders
Set-MailboxJunkEmailConfiguration -Identity "kgungulu@nicl.mu" -TrustedSendersAndDomains @{Add="arrears@niclmauritius.site","niclmauritius.site"}

# Check inbox rules
Get-InboxRule -Mailbox "kgungulu@nicl.mu"

# Check transport rules affecting this user
Get-TransportRule | Where-Object {$_.SentTo -contains "kgungulu@nicl.mu"}
```

## Verification After Fix
1. Run test script: `node fix-blocked-emails.js`
2. Check if test email is received
3. Try OTP login flow
4. Confirm OTP email arrives in inbox (not spam)

## Notes
- This is a recipient-side issue, not a sender-side issue
- Brevo is working correctly
- Domain authentication is perfect
- Other `nicl.mu` users receive emails fine
- These users CAN receive Gmail emails (mailbox is valid)
