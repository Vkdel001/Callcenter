/**
 * Test Payment Notification System
 * 
 * This script helps test the payment notification service by:
 * 1. Creating a test payment in Xano
 * 2. Triggering the notification check
 * 3. Verifying notifications were sent
 */

const axios = require('axios')
require('dotenv').config()

const XANO_BASE_URL = process.env.VITE_XANO_BASE_URL
const XANO_PAYMENT_API = process.env.VITE_XANO_PAYMENT_API

const paymentApi = axios.create({
  baseURL: `${XANO_BASE_URL}/api:${XANO_PAYMENT_API}`,
  headers: { 'Content-Type': 'application/json' }
})

async function createTestPayment() {
  try {
    console.log('🧪 Creating test payment...\n')
    
    const testPayment = {
      customer: 1,  // Change to valid customer ID
      policy_number: 'TEST-001',
      customer_name: 'Test Customer',
      transaction_reference: Math.floor(Math.random() * 1000000),
      end_to_end_reference: 'TEST-REF',
      amount: 100.00,
      mobile_number: '57123456',  // Your test number
      payment_date: new Date().toISOString(),
      payment_status_code: '00',
      status: 'success',
      old_balance: 5000.00,
      new_balance: 4900.00,
      processed_at: new Date().toISOString(),
      notification_sent: false,
      sms_sent: false,
      email_sent: false
    }
    
    console.log('Test Payment Data:')
    console.log(JSON.stringify(testPayment, null, 2))
    console.log('\n')
    
    const response = await paymentApi.post('/nic_cc_payment', testPayment)
    
    console.log('✅ Test payment created successfully!')
    console.log(`Payment ID: ${response.data.id}`)
    console.log('\n')
    console.log('📱 The payment notification service will pick this up in the next check cycle (within 1 minute)')
    console.log('📧 You should receive SMS + Email notifications shortly')
    console.log('\n')
    console.log('To verify:')
    console.log('1. Check your phone for SMS')
    console.log('2. Check your email inbox')
    console.log('3. Check Xano: notification_sent should become true')
    console.log('4. Check service logs: tail -f /var/log/nic-payment-notification.log')
    
    return response.data
    
  } catch (error) {
    console.error('❌ Failed to create test payment:', error.message)
    if (error.response) {
      console.error('Response:', error.response.data)
    }
  }
}

// Run the test
console.log('🚀 Payment Notification Test Script\n')
console.log('=' .repeat(60))
console.log('\n')

createTestPayment()
