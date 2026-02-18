# Webhook Branch Email Notification Update

## File to Update: `webhookcode-enhanced.js`

## Changes Required

Add branch email to CC list when sending payment confirmation emails.

### Location: Find the email sending function (around line 400-600)

Look for the function that sends customer payment confirmation emails. It should look similar to this:

```javascript
async function sendCustomerPaymentConfirmation(transaction, paymentData) {
  // ... existing code ...
  
  const emailData = {
    sender: {
      name: SENDER_NAME,
      email: SENDER_EMAIL
    },
    to: [
      {
        email: transaction.customer_email,
        name: transaction.customer_name || 'Customer'
      }
    ],
    subject: `Payment Confirmation - Policy ${transaction.policy_number}`,
    htmlContent: `...`
  }
}
```

### Update Required:

Add branch email to CC list BEFORE the agent email section:

```javascript
async function sendCustomerPaymentConfirmation(transaction, paymentData) {
  // ... existing code ...
  
  const emailData = {
    sender: {
      name: SENDER_NAME,
      email: SENDER_EMAIL
    },
    to: [
      {
        email: transaction.customer_email,
        name: transaction.customer_name || 'Customer'
      }
    ],
    
    // NEW: Add CC recipients (branch + agent)
    ...(transaction.branch_email || transaction.agent_email ? {
      cc: [
        // Branch email (if available)
        ...(transaction.branch_email ? [{
          email: transaction.branch_email,
          name: 'Branch Office'
        }] : []),
        // Agent email (if available)
        ...(transaction.agent_email ? [{
          email: transaction.agent_email,
          name: transaction.agent_name || 'Agent'
        }] : [])
      ]
    } : {}),
    
    subject: `Payment Confirmation - Policy ${transaction.policy_number}`,
    htmlContent: `...`
  }
  
  // ... rest of function ...
}
```

## Explanation:

1. **Check for branch_email**: If `transaction.branch_email` exists, add it to CC
2. **Check for agent_email**: If `transaction.agent_email` exists, add it to CC
3. **Array spreading**: Use spread operator to conditionally add emails
4. **Order**: Branch email first, then agent email

## Testing:

After making this change:

1. Generate a new policy QR with branch selected
2. Make a payment
3. Check that email is sent to:
   - Customer (TO)
   - Branch (CC)
   - Agent (CC)

## Verification:

Check Brevo logs to confirm all three recipients received the email.
