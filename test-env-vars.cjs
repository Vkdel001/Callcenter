require('dotenv').config();

console.log('🔍 Testing Environment Variable Loading\n');

console.log('📧 Email Configuration:');
console.log(`   VITE_BREVO_API_KEY: ${process.env.VITE_BREVO_API_KEY ? '✅ Found' : '❌ Missing'}`);
console.log(`   VITE_SENDER_EMAIL: ${process.env.VITE_SENDER_EMAIL || '❌ Missing'}`);
console.log(`   VITE_SENDER_NAME: ${process.env.VITE_SENDER_NAME || '❌ Missing'}`);

console.log('\n🗄️ Xano Configuration:');
console.log(`   VITE_XANO_BASE_URL: ${process.env.VITE_XANO_BASE_URL || '❌ Missing'}`);
console.log(`   VITE_XANO_CUSTOMER_API: ${process.env.VITE_XANO_CUSTOMER_API || '❌ Missing'}`);
console.log(`   VITE_XANO_PAYMENT_API: ${process.env.VITE_XANO_PAYMENT_API || '❌ Missing'}`);
console.log(`   VITE_XANO_QR_TRANSACTIONS_API: ${process.env.VITE_XANO_QR_TRANSACTIONS_API || '❌ Missing'}`);

console.log('\n🎯 Webhook Variables (as they will be used):');
const BREVO_API_KEY = process.env.VITE_BREVO_API_KEY;
const SENDER_EMAIL = process.env.VITE_SENDER_EMAIL || 'arrears@niclmauritius.site';
const XANO_QR_TRANSACTIONS_API_KEY = process.env.VITE_XANO_QR_TRANSACTIONS_API || '6MaKDJBx';

console.log(`   BREVO_API_KEY: ${BREVO_API_KEY ? '✅ Ready' : '❌ Will fail'}`);
console.log(`   SENDER_EMAIL: ${SENDER_EMAIL}`);
console.log(`   QR_TRANSACTIONS_API: ${XANO_QR_TRANSACTIONS_API_KEY}`);

if (BREVO_API_KEY) {
  console.log('\n✅ Email notifications will work!');
} else {
  console.log('\n⚠️ Email notifications will be skipped (missing BREVO_API_KEY)');
}

console.log('\n🚀 Ready to start webhook with these settings!');