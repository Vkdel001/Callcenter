require('dotenv').config();
const axios = require('axios');

const XANO_BASE_URL = process.env.VITE_XANO_BASE_URL || 'https://xbde-ekcn-8kg2.n7e.xano.io';
const XANO_CUSTOMER_API_KEY = process.env.VITE_XANO_CUSTOMER_API || 'Q4jDYUWL';
const XANO_QR_TRANSACTIONS_API_KEY = process.env.VITE_XANO_QR_TRANSACTIONS_API || '6MaKDJBx';

async function testQuickQRPaymentFallback() {
  try {
    console.log('🧪 Testing Quick QR Payment Fallback Logic\n');
    
    // Test policy number that exists in QR transactions but not in customers
    const testPolicy = '09889';
    
    console.log(`🔍 Step 1: Check if policy ${testPolicy} exists in nic_cc_customer`);
    const customersResponse = await axios.get(
      `${XANO_BASE_URL}/api:${XANO_CUSTOMER_API_KEY}/nic_cc_customer`
    );
    
    const customerExists = customersResponse.data.some(c => c.policy_number === testPolicy);
    console.log(`   Customer exists: ${customerExists ? '✅ Yes' : '❌ No'}`);
    
    console.log(`\n🔍 Step 2: Check if policy ${testPolicy} exists in nic_qr_transactions`);
    const qrResponse = await axios.get(
      `${XANO_BASE_URL}/api:${XANO_QR_TRANSACTIONS_API_KEY}/nic_qr_transactions`
    );
    
    const qrTransaction = qrResponse.data.find(t => t.policy_number === testPolicy);
    console.log(`   QR Transaction exists: ${qrTransaction ? '✅ Yes' : '❌ No'}`);
    
    if (qrTransaction) {
      console.log(`   QR Transaction Details:`);
      console.log(`     ID: ${qrTransaction.id}`);
      console.log(`     Customer: ${qrTransaction.customer_name}`);
      console.log(`     Email: ${qrTransaction.customer_email}`);
      console.log(`     Agent: ${qrTransaction.agent_name}`);
      console.log(`     Agent Email: ${qrTransaction.agent_email}`);
      console.log(`     Status: ${qrTransaction.status}`);
    }
    
    console.log(`\n📊 Test Scenario Analysis:`);
    if (!customerExists && qrTransaction) {
      console.log(`✅ Perfect Quick QR scenario detected!`);
      console.log(`   - Policy exists only in QR transactions`);
      console.log(`   - Webhook will use fallback logic`);
      console.log(`   - Payment will be logged with QR transaction data`);
      console.log(`   - Payment notification service will send emails`);
    } else if (customerExists && qrTransaction) {
      console.log(`ℹ️ Regular QR payment scenario`);
      console.log(`   - Policy exists in both tables`);
      console.log(`   - Normal customer balance update will work`);
    } else if (customerExists && !qrTransaction) {
      console.log(`ℹ️ Regular payment scenario`);
      console.log(`   - Policy exists only in customer table`);
      console.log(`   - Normal payment processing`);
    } else {
      console.log(`❌ Invalid scenario - policy not found anywhere`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testQuickQRPaymentFallback();