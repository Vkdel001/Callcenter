#!/usr/bin/env node

/**
 * NIC Payment Notification Service
 * 
 * Monitors nic_cc_payment table for new payments and sends
 * SMS + Email notifications to customers automatically.
 * 
 * Features:
 * - Checks for new payments every 1 minute
 * - Sends SMS via Brevo API
 * - Sends Email via Brevo API
 * - Tracks notification status in database
 * - Prevents duplicate notifications
 * - Detailed logging
 */

const axios = require('axios')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config()

// Configuration
const CONFIG = {
  CHECK_INTERVAL: 60 * 1000,        // Check every 1 minute
  PAYMENT_WINDOW: 10 * 60 * 1000,   // Look back 10 minutes for new payments
  LOG_FILE: '/var/log/nic-payment-notification.log',
  BREVO_API_KEY: process.env.VITE_BREVO_API_KEY,
  XANO_BASE_URL: process.env.VITE_XANO_BASE_URL,
  XANO_PAYMENT_API: process.env.VITE_XANO_PAYMENT_API,
  XANO_CUSTOMER_API: process.env.VITE_XANO_CUSTOMER_API,
  XANO_QR_TRANSACTIONS_API: process.env.VITE_XANO_QR_TRANSACTIONS_API || '6MaKDJBx',
  SENDER_EMAIL: process.env.VITE_SENDER_EMAIL || 'arrears@niclmauritius.site',
  SENDER_NAME: process.env.VITE_SENDER_NAME || 'NIC Life Insurance Mauritius'
}

// Validate configuration
if (!CONFIG.BREVO_API_KEY) {
  console.error('❌ VITE_BREVO_API_KEY not found in environment variables')
  process.exit(1)
}

if (!CONFIG.XANO_BASE_URL || !CONFIG.XANO_PAYMENT_API || !CONFIG.XANO_CUSTOMER_API) {
  console.error('❌ Xano configuration not found in environment variables')
  process.exit(1)
}

// API Clients
const paymentApi = axios.create({
  baseURL: `${CONFIG.XANO_BASE_URL}/api:${CONFIG.XANO_PAYMENT_API}`,
  headers: { 'Content-Type': 'application/json' }
})

const customerApi = axios.create({
  baseURL: `${CONFIG.XANO_BASE_URL}/api:${CONFIG.XANO_CUSTOMER_API}`,
  headers: { 'Content-Type': 'application/json' }
})

const brevoApi = axios.create({
  baseURL: 'https://api.brevo.com/v3',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'api-key': CONFIG.BREVO_API_KEY
  }
})

// Logging utility
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString()
  const logMessage = `${timestamp} [${level}] ${message}`
  
  console.log(logMessage)
  
  try {
    fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\n')
  } catch (error) {
    // If log file write fails, just continue
  }
}

// Format phone number for SMS (Mauritius +230)
function formatPhoneForSMS(phoneNumber) {
  if (!phoneNumber) return null
  
  const cleaned = phoneNumber.toString().replace(/\D/g, '')
  
  if (cleaned.startsWith('230')) {
    return `+${cleaned}`
  }
  
  if (cleaned.length === 8) {
    return `+230${cleaned}`
  }
  
  if (cleaned.length === 7) {
    return `+2305${cleaned}`
  }
  
  return `+230${cleaned}`
}

// Send SMS via Brevo
async function sendPaymentSMS(payment, customer) {
  try {
    const formattedPhone = formatPhoneForSMS(payment.mobile_number)
    
    if (!formattedPhone) {
      throw new Error('Invalid phone number')
    }
    
    const message = `NIC Life Insurance
Payment Received: MUR ${parseFloat(payment.amount).toLocaleString()}
Policy: ${payment.policy_number}
New Balance: MUR ${parseFloat(payment.new_balance).toLocaleString()}
Thank you!
Ref: ${payment.transaction_reference}`

    const payload = {
      type: 'transactional',
      unicodeEnabled: false,
      sender: 'NIC Life',
      recipient: formattedPhone,
      content: message
    }

    log(`Sending SMS to ${formattedPhone} for payment ${payment.id}`)
    
    const response = await brevoApi.post('/transactionalSMS/sms', payload)
    
    log(`✅ SMS sent successfully. Message ID: ${response.data.reference}`)
    
    return {
      success: true,
      messageId: response.data.reference
    }
    
  } catch (error) {
    log(`❌ SMS sending failed: ${error.message}`, 'ERROR')
    return {
      success: false,
      error: error.message
    }
  }
}

// Send Email via Brevo
async function sendPaymentEmail(payment, customer) {
  try {
    if (!customer.email) {
      throw new Error('Customer email not found')
    }
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #003366; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .info-box { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745; }
          .amount { font-size: 24px; font-weight: bold; color: #28a745; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NIC Life Insurance Mauritius</h1>
            <h2 style="margin: 10px 0 0 0; font-weight: normal;">Payment Confirmation</h2>
          </div>
          
          <div class="content">
            <p>Dear <strong>${customer.name}</strong>,</p>
            
            <p>Thank you for your payment! We have successfully received your payment.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #003366;">Payment Details</h3>
              <p><strong>Amount Paid:</strong> <span class="amount">MUR ${parseFloat(payment.amount).toLocaleString()}</span></p>
              <p><strong>Policy Number:</strong> ${payment.policy_number}</p>
              <p><strong>Payment Date:</strong> ${new Date(payment.payment_date).toLocaleString()}</p>
              <p><strong>Transaction Reference:</strong> ${payment.transaction_reference}</p>
              <p><strong>Previous Balance:</strong> MUR ${parseFloat(payment.old_balance).toLocaleString()}</p>
              <p><strong>New Balance:</strong> MUR ${parseFloat(payment.new_balance).toLocaleString()}</p>
            </div>
            
            <div style="background: #d4edda; padding: 15px; border-radius: 6px; border-left: 4px solid #28a745; margin: 20px 0;">
              <p style="margin: 0; color: #155724;">
                <strong>✅ Payment Confirmed</strong><br>
                Your payment has been successfully processed and your account has been updated.
              </p>
            </div>
            
            <p>If you have any questions about this payment, please contact our customer service team.</p>
            
            <p>Best regards,<br>
            <strong>NIC Life Insurance Mauritius</strong><br>
            Customer Service Team</p>
          </div>
          
          <div class="footer">
            <p>NIC Centre, 217 Royal Road, Curepipe, Mauritius</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const payload = {
      sender: {
        name: CONFIG.SENDER_NAME,
        email: CONFIG.SENDER_EMAIL
      },
      to: [{
        email: customer.email,
        name: customer.name
      }],
      subject: `Payment Confirmation - Policy ${payment.policy_number}`,
      htmlContent: htmlContent
    }

    log(`Sending email to ${customer.email} for payment ${payment.id}`)
    
    const response = await brevoApi.post('/smtp/email', payload)
    
    log(`✅ Email sent successfully. Message ID: ${response.data.messageId}`)
    
    return {
      success: true,
      messageId: response.data.messageId
    }
    
  } catch (error) {
    log(`❌ Email sending failed: ${error.message}`, 'ERROR')
    return {
      success: false,
      error: error.message
    }
  }
}

// Main function to check for new payments
async function checkForNewPayments() {
  try {
    log('🔍 Checking for new payments...')
    
    // Get all payments that haven't been notified
    const response = await paymentApi.get('/nic_cc_payment')
    const allPayments = response.data || []
    
    // Filter for unnotified successful payments
    const newPayments = allPayments.filter(payment => 
      payment.status === 'success' &&
      payment.notification_sent === false
    )
    
    if (newPayments.length === 0) {
      log('No new payments to notify')
      return
    }
    
    log(`📋 Found ${newPayments.length} new payment(s) to notify`)
    
    // Process each payment
    for (const payment of newPayments) {
      try {
        log(`\n💳 Processing payment ${payment.id}:`)
        log(`   Customer: ${payment.customer_name}`)
        log(`   Amount: MUR ${parseFloat(payment.amount).toLocaleString()}`)
        log(`   Policy: ${payment.policy_number}`)
        
        // Get customer details for email
        let customer;
        
        if (payment.customer) {
          // Regular payment - fetch from nic_cc_customer
          log(`   Fetching customer details from nic_cc_customer table`)
          const customerResponse = await customerApi.get(`/nic_cc_customer/${payment.customer}`)
          customer = customerResponse.data
        } else {
          // Quick QR payment - use data from payment record
          log(`   Using customer data from payment record (Quick QR payment)`)
          customer = {
            name: payment.customer_name,
            email: payment.customer_email
          }
        }
        
        // If no email found, try to get it from QR transaction
        if (!customer || !customer.email) {
          log(`   No email found, checking QR transactions for policy ${payment.policy_number}`)
          
          try {
            // Create QR API client
            const qrApi = axios.create({
              baseURL: `${CONFIG.XANO_BASE_URL}/api:6MaKDJBx`,
              headers: { 'Content-Type': 'application/json' }
            })
            
            const qrResponse = await qrApi.get('/nic_qr_transactions')
            const allTransactions = qrResponse.data || []
            
            const matchingTransaction = allTransactions.find(tx => 
              tx.policy_number === payment.policy_number
            )
            
            if (matchingTransaction && matchingTransaction.customer_email) {
              log(`   ✅ Found email in QR transaction: ${matchingTransaction.customer_email}`)
              customer = {
                name: matchingTransaction.customer_name || payment.customer_name,
                email: matchingTransaction.customer_email
              }
            } else {
              log(`   ❌ No email found in QR transactions for policy ${payment.policy_number}`)
            }
          } catch (qrError) {
            log(`   ❌ Failed to fetch QR transactions: ${qrError.message}`)
          }
        }
        
        if (!customer || !customer.email) {
          log(`❌ Customer email not available for payment ${payment.id}`, 'ERROR')
          continue
        }
        
        log(`   Customer: ${customer.name} (${customer.email})`)
        
        // Send SMS
        const smsResult = await sendPaymentSMS(payment, customer)
        
        // Send Email
        const emailResult = await sendPaymentEmail(payment, customer)
        
        // Update payment record
        const updateData = {
          notification_sent: smsResult.success || emailResult.success,
          notification_sent_at: new Date().toISOString(),
          sms_sent: smsResult.success,
          email_sent: emailResult.success
        }
        
        await paymentApi.patch(`/nic_cc_payment/${payment.id}`, updateData)
        
        log(`✅ Payment ${payment.id} notification complete`)
        log(`   SMS: ${smsResult.success ? '✅ Sent' : '❌ Failed'}`)
        log(`   Email: ${emailResult.success ? '✅ Sent' : '❌ Failed'}`)
        
      } catch (error) {
        log(`❌ Error processing payment ${payment.id}: ${error.message}`, 'ERROR')
      }
    }
    
    log(`\n✅ Payment notification cycle completed\n`)
    
  } catch (error) {
    log(`❌ Payment check failed: ${error.message}`, 'ERROR')
  }
}

// Startup
log('🚀 NIC Payment Notification Service Starting...')
log(`📊 Configuration:`)
log(`   Check Interval: ${CONFIG.CHECK_INTERVAL / 1000} seconds`)
log(`   Xano Base URL: ${CONFIG.XANO_BASE_URL}`)
log(`   Brevo API: Configured`)
log(`   Log File: ${CONFIG.LOG_FILE}`)

// Run immediately on startup
checkForNewPayments()

// Then run on interval
setInterval(checkForNewPayments, CONFIG.CHECK_INTERVAL)

log('✅ Payment notification service is running')
log(`⏰ Checking for new payments every ${CONFIG.CHECK_INTERVAL / 1000} seconds\n`)

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('🛑 Payment notification service stopping...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  log('🛑 Payment notification service stopping...')
  process.exit(0)
})
