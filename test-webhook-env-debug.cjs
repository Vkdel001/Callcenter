require('dotenv').config();

console.log('🔍 Webhook Environment Debug\n');

// Email configuration - Use VITE_ variables (matching your .env file)
const BREVO_API_KEY = process.env.VITE_BREVO_API_KEY;
const SENDER_EMAIL = process.env.VITE_SENDER_EMAIL || 'arrears@niclmauritius.site';
const SENDER_NAME = process.env.VITE_SENDER_NAME || 'NIC Life Insurance Mauritius';

console.log('📧 Email Configuration (as webhook sees it):');
console.log(`   BREVO_API_KEY: ${BREVO_API_KEY ? 'Found (' + BREVO_API_KEY.substring(0, 10) + '...)' : 'Missing'}`);
console.log(`   SENDER_EMAIL: ${SENDER_EMAIL}`);
console.log(`   SENDER_NAME: ${SENDER_NAME}`);

// Test the exact condition from webhook
const mockTransaction = {
  customer_email: 'vikas.khanna@zwennpay.com',
  agent_email: 'csr.rosehill@nic.mu',
  customer_name: 'vikas khanna',
  agent_name: 'CSR Rose Hill'
};

console.log('\n🧪 Testing webhook conditions:');
console.log(`   transaction.customer_email: ${mockTransaction.customer_email}`);
console.log(`   BREVO_API_KEY exists: ${!!BREVO_API_KEY}`);
console.log(`   Customer notification condition: ${!mockTransaction.customer_email || !BREVO_API_KEY ? 'FAIL' : 'PASS'}`);
console.log(`   Agent notification condition: ${!mockTransaction.agent_email || !BREVO_API_KEY ? 'FAIL' : 'PASS'}`);

if (!BREVO_API_KEY) {
  console.log('\n❌ BREVO_API_KEY is missing - this is why emails are failing!');
} else {
  console.log('\n✅ All conditions should pass - emails should work!');
}